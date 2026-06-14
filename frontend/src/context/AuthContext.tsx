import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { User, AuthState } from '../types';
import { authApi } from '../services/api';
import { auth as firebaseAuth } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'LOGIN_SUCCESS'; payload: { user: User; token: string } }
  | { type: 'LOGOUT' }
  | { type: 'UPDATE_USER'; payload: User };

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
      };
    case 'LOGOUT':
      return { user: null, token: null, isAuthenticated: false, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: action.payload };
    default:
      return state;
  }
};

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('epn_token'),
  isAuthenticated: false,
  isLoading: true,
};



export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          localStorage.setItem('epn_token', token);
          
          // Fetch real user data from backend using the Firebase token
          const response = await authApi.me();
          const user = response.data;
          
          localStorage.setItem('epn_user', JSON.stringify(user));
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        } catch (error) {
          console.error("Auth sync error:", error);
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        localStorage.removeItem('epn_token');
        localStorage.removeItem('epn_user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 1. Firebase Auth handles the actual login
      await signInWithEmailAndPassword(firebaseAuth, email, password);
      // The onAuthStateChanged listener will handle syncing with the backend and updating state
    } catch (err: any) {
      // Auto-migrate legacy Postgres accounts to Firebase
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential' || err.code === 'auth/invalid-login-credentials') {
        try {
          // Attempt legacy authentication via backend
          await authApi.login(email, password);
          // If legacy login succeeds, create the Firebase account to migrate them
          await createUserWithEmailAndPassword(firebaseAuth, email, password);
        } catch (legacyErr: any) {
          // If legacy login fails too, throw the backend error or standard invalid credential error
          dispatch({ type: 'SET_LOADING', payload: false });
          const errorMessage = legacyErr.response?.data?.error || 'Invalid email or password';
          throw new Error(errorMessage);
        }
      } else {
        dispatch({ type: 'SET_LOADING', payload: false });
        throw err;
      }
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(firebaseAuth);
    } catch (e) {
      console.error(e);
    }
    localStorage.removeItem('epn_token');
    localStorage.removeItem('epn_user');
    dispatch({ type: 'LOGOUT' });
  }, []);

  const register = useCallback(async (data: any) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 1. Sync to Postgres DB FIRST so that the record exists when the listener fires
      await authApi.register(data);

      // 2. Firebase Auth creates the user account and signs them in
      await createUserWithEmailAndPassword(firebaseAuth, data.email, data.password);
      
      // State is updated by onAuthStateChanged
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
