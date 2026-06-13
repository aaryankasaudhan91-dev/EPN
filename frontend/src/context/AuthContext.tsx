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
    const storedToken = localStorage.getItem('epn_token');
    const storedUserStr = localStorage.getItem('epn_user');

    // Restore stored session (either backend JWT or demo token)
    if (storedToken && storedUserStr) {
      try {
        const user = JSON.parse(storedUserStr);
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token: storedToken } });
      } catch (e) {
        console.error('Failed to restore local session:', e);
      }
    }

    // Listen to Firebase auth state changes
    const unsubscribe = onAuthStateChanged(firebaseAuth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const token = await firebaseUser.getIdToken();
          const user: User = {
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: 'student', // Default role, should be fetched from DB
            status: 'active',
            createdAt: firebaseUser.metadata.creationTime || new Date().toISOString()
          };
          localStorage.setItem('epn_token', token);
          localStorage.setItem('epn_user', JSON.stringify(user));
          dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        } catch (error) {
          console.error("Firebase Auth Error", error);
          dispatch({ type: 'LOGOUT' });
        }
      } else {
        // Set loading false if we didn't have/restore a local session
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    });

    return () => unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      // 1. Try Backend API first (checks the Supabase DB)
      try {
        const response = await authApi.login(email, password);
        const { token, user } = response.data;
        localStorage.setItem('epn_token', token);
        localStorage.setItem('epn_user', JSON.stringify(user));
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        return;
      } catch (backendErr) {
        console.warn('Backend login failed, attempting fallback...', backendErr);
      }

      // 3. Fallback: Firebase Auth
      const userCredential = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const token = await userCredential.user.getIdToken();
      const user: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: userCredential.user.displayName || 'User',
        role: 'student',
        status: 'active',
        createdAt: userCredential.user.metadata.creationTime || new Date().toISOString()
      };
      
      localStorage.setItem('epn_token', token);
      localStorage.setItem('epn_user', JSON.stringify(user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
    } catch (err) {
      dispatch({ type: 'SET_LOADING', payload: false });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout().catch(() => {});
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
      // 1. Try Backend API registration first (inserts into Supabase DB)
      try {
        const response = await authApi.register(data);
        const { token, user } = response.data;
        localStorage.setItem('epn_token', token);
        localStorage.setItem('epn_user', JSON.stringify(user));
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
        return;
      } catch (backendErr) {
        console.warn('Backend registration failed, attempting fallback...', backendErr);
      }

      // 2. Fallback: Firebase Auth registration
      const email = data.email as string;
      const password = data.password as string;
      const userCredential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const token = await userCredential.user.getIdToken();
      const user: User = {
        id: userCredential.user.uid,
        email: userCredential.user.email || '',
        name: (data.name as string) || 'User',
        role: (data.role as 'student'|'teacher'|'parent'|'admin') || 'student',
        status: 'active',
        createdAt: userCredential.user.metadata.creationTime || new Date().toISOString()
      };
      
      localStorage.setItem('epn_token', token);
      localStorage.setItem('epn_user', JSON.stringify(user));
      dispatch({ type: 'LOGIN_SUCCESS', payload: { user, token } });
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
