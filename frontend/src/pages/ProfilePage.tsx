/**
 * Profile Page
 *
 * Displays and allows editing of the current user's profile:
 *  - Avatar / initials display
 *  - Editable name & email
 *  - Change-password form
 *  - Role badge
 *  - Role-specific info (grade + learning profile for students)
 *
 * Wired to:
 *   GET  /api/users/me
 *   PUT  /api/users/me
 *   PUT  /api/users/me/password
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Mail, Lock, Shield, BookOpen, Eye, EyeOff,
  CheckCircle, AlertCircle, Edit2, Save, X, Loader,
} from 'lucide-react';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ProfileData {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar_url?: string;
  last_login?: string;
  created_at: string;
  // Student-specific
  grade?: string;
  overall_mastery?: number;
  risk_score?: number;
  learning_profile?: any;
}

interface FormState {
  name: string;
  email: string;
}

interface PasswordState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ─── Role badge colours ────────────────────────────────────────────────────────

const roleBadge: Record<string, string> = {
  student: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  teacher: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  parent: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  admin: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
};

const roleGradient: Record<string, string> = {
  student: 'from-blue-500 to-blue-700',
  teacher: 'from-purple-500 to-purple-700',
  parent: 'from-green-500 to-green-700',
  admin: 'from-orange-500 to-orange-700',
};

// ─── Inline alert helper ───────────────────────────────────────────────────────

const Alert: React.FC<{ type: 'success' | 'error'; message: string }> = ({ type, message }) => (
  <div
    className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
      type === 'success'
        ? 'bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300'
        : 'bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-300'
    }`}
  >
    {type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
    {message}
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const ProfilePage: React.FC = () => {
  const { user: authUser, login } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile edit state
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<FormState>({ name: '', email: '' });
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileAlert, setProfileAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Password state
  const [passwordForm, setPasswordForm] = useState<PasswordState>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordAlert, setPasswordAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ─── Load profile ────────────────────────────────────────────────────────────

  const loadProfile = useCallback(async () => {
    try {
      const res = await api.get('/users/me');
      setProfile(res.data);
      setProfileForm({ name: res.data.name, email: res.data.email });
    } catch {
      // Fallback to auth context data
      if (authUser) {
        setProfile(authUser as unknown as ProfileData);
        setProfileForm({ name: authUser.name, email: authUser.email });
      }
    } finally {
      setLoading(false);
    }
  }, [authUser]);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  // ─── Save profile ────────────────────────────────────────────────────────────

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    setProfileAlert(null);
    try {
      const res = await api.put('/users/me', profileForm);
      setProfile(prev => prev ? { ...prev, ...res.data } : res.data);
      setEditingProfile(false);
      setProfileAlert({ type: 'success', message: 'Profile updated successfully!' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setProfileAlert({ type: 'error', message: e.response?.data?.error || 'Failed to update profile.' });
    } finally {
      setProfileSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (profile) setProfileForm({ name: profile.name, email: profile.email });
    setEditingProfile(false);
    setProfileAlert(null);
  };

  // ─── Change password ─────────────────────────────────────────────────────────

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordAlert(null);

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordAlert({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordAlert({ type: 'error', message: 'New password must be at least 8 characters.' });
      return;
    }

    setPasswordSaving(true);
    try {
      await api.put('/users/me/password', {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordAlert({ type: 'success', message: 'Password changed successfully!' });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } };
      setPasswordAlert({ type: 'error', message: e.response?.data?.error || 'Failed to change password.' });
    } finally {
      setPasswordSaving(false);
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <DashboardLayout title="My Profile">
        <div className="flex items-center justify-center h-64">
          <Loader size={32} className="animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  const displayName = profile?.name || authUser?.name || 'User';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const role = profile?.role || authUser?.role || 'student';
  const gradient = roleGradient[role] || roleGradient.student;

  return (
    <DashboardLayout title="My Profile">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── Avatar + Identity card ─────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Gradient banner */}
          <div className={`h-24 bg-gradient-to-r ${gradient}`} />

          <div className="px-6 pb-6">
            {/* Avatar */}
            <div className="flex items-end gap-4 -mt-12 mb-4">
              <div
                className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white text-2xl font-bold shadow-lg border-4 border-white dark:border-gray-800`}
              >
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
                ) : (
                  initials
                )}
              </div>
              <div className="pb-1">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">{displayName}</h2>
                <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${roleBadge[role]}`}>
                  {role}
                </span>
              </div>
            </div>

            {/* Meta info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Mail size={14} className="flex-shrink-0" />
                <span className="truncate">{profile?.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={14} className="flex-shrink-0" />
                <span className="capitalize">{role} account</span>
              </div>
              {profile?.created_at && (
                <div className="flex items-center gap-2">
                  <User size={14} className="flex-shrink-0" />
                  <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              )}
              {profile?.last_login && (
                <div className="flex items-center gap-2">
                  <CheckCircle size={14} className="flex-shrink-0" />
                  <span>Last login {new Date(profile.last_login).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Student-specific info ──────────────────────────────────────────── */}
        {role === 'student' && (profile?.grade || profile?.overall_mastery !== undefined) && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-blue-500" />
              Learning Profile
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {profile.grade && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium uppercase tracking-wide mb-1">Grade</p>
                  <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{profile.grade}</p>
                </div>
              )}
              {profile.overall_mastery !== undefined && (
                <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium uppercase tracking-wide mb-1">Overall Mastery</p>
                  <p className="text-2xl font-bold text-green-700 dark:text-green-300">{profile.overall_mastery}%</p>
                  <div className="mt-2 h-1.5 bg-green-200 dark:bg-green-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full transition-all"
                      style={{ width: `${profile.overall_mastery}%` }}
                    />
                  </div>
                </div>
              )}
              {profile.risk_score !== undefined && (
                <div className={`rounded-xl p-4 text-center ${
                  profile.risk_score > 0.6
                    ? 'bg-red-50 dark:bg-red-900/20'
                    : profile.risk_score > 0.3
                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                    : 'bg-green-50 dark:bg-green-900/20'
                }`}>
                  <p className="text-xs font-medium uppercase tracking-wide mb-1 text-gray-500 dark:text-gray-400">Risk Level</p>
                  <p className={`text-2xl font-bold ${
                    profile.risk_score > 0.6
                      ? 'text-red-700 dark:text-red-300'
                      : profile.risk_score > 0.3
                      ? 'text-yellow-700 dark:text-yellow-300'
                      : 'text-green-700 dark:text-green-300'
                  }`}>
                    {profile.risk_score > 0.6 ? 'High' : profile.risk_score > 0.3 ? 'Medium' : 'Low'}
                  </p>
                </div>
              )}
            </div>

            {/* Learning profile JSON (collapsed) */}
            {profile.learning_profile && Object.keys(profile.learning_profile).length > 0 && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-blue-600 dark:text-blue-400 hover:underline">
                  View detailed learning profile
                </summary>
                <pre className="mt-2 text-xs bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto text-gray-700 dark:text-gray-300">
                  {JSON.stringify(profile.learning_profile, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}

        {/* ── Edit Profile ───────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <User size={18} className="text-blue-500" />
              Personal Information
            </h3>
            {!editingProfile && (
              <button
                onClick={() => { setEditingProfile(true); setProfileAlert(null); }}
                className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                <Edit2 size={14} /> Edit
              </button>
            )}
          </div>

          {profileAlert && <div className="mb-4"><Alert {...profileAlert} /></div>}

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Full Name
              </label>
              {editingProfile ? (
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {profile?.name}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              {editingProfile ? (
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={e => setProfileForm(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              ) : (
                <p className="text-sm text-gray-900 dark:text-white px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {profile?.email}
                </p>
              )}
            </div>

            {/* Role (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Role
              </label>
              <p className="text-sm px-3 py-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${roleBadge[role]}`}>
                  {role}
                </span>
                <span className="ml-2 text-gray-500 dark:text-gray-400 text-xs">(cannot be changed here)</span>
              </p>
            </div>
          </div>

          {/* Edit actions */}
          {editingProfile && (
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSaveProfile}
                disabled={profileSaving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {profileSaving ? <Loader size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
              <button
                onClick={handleCancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
              >
                <X size={14} /> Cancel
              </button>
            </div>
          )}
        </div>

        {/* ── Change Password ────────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Lock size={18} className="text-blue-500" />
            Change Password
          </h3>

          {passwordAlert && <div className="mb-4"><Alert {...passwordAlert} /></div>}

          <form onSubmit={handleChangePassword} className="space-y-4">
            {/* Current password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordForm.currentPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))}
                  required
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter current password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, current: !p.current }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* New password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))}
                  required
                  minLength={8}
                  className="w-full px-3 py-2 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, new: !p.new }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {/* Strength indicator */}
              {passwordForm.newPassword && (
                <div className="mt-1.5 flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`h-1 flex-1 rounded-full transition-colors ${
                        passwordForm.newPassword.length >= i * 3
                          ? i <= 1 ? 'bg-red-400' : i <= 2 ? 'bg-yellow-400' : i <= 3 ? 'bg-blue-400' : 'bg-green-400'
                          : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Confirm password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))}
                  required
                  className={`w-full px-3 py-2 pr-10 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Repeat new password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(p => ({ ...p, confirm: !p.confirm }))}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {passwordForm.confirmPassword && passwordForm.confirmPassword !== passwordForm.newPassword && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            <button
              type="submit"
              disabled={passwordSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {passwordSaving ? <Loader size={14} className="animate-spin" /> : <Lock size={14} />}
              Update Password
            </button>
          </form>
        </div>

      </div>
    </DashboardLayout>
  );
};

export default ProfilePage;
