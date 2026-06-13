/**
 * Settings Page
 *
 * Sections:
 *  - Appearance: dark / light theme toggle (uses existing ThemeContext)
 *  - Notifications: email / push / weekly digest toggles
 *  - Language & Region: language preference
 *  - Account: data export, account deletion warning
 *  - Admin-only: links to AI autonomy / budget configuration
 *
 * Preferences are persisted to localStorage immediately and synced to the
 * backend (PUT /api/users/me/preferences) when available.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Sun, Moon, Bell, Globe, Shield, Settings,
  ChevronRight, CheckCircle, Loader, Brain, DollarSign,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/layout/DashboardLayout';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface NotificationPrefs {
  emailAlerts: boolean;
  pushNotifications: boolean;
  weeklyDigest: boolean;
  achievementAlerts: boolean;
  planApprovalAlerts: boolean;
}

interface Preferences {
  language: string;
  notifications: NotificationPrefs;
  compactMode: boolean;
  showTips: boolean;
}

const DEFAULT_PREFS: Preferences = {
  language: 'en',
  notifications: {
    emailAlerts: true,
    pushNotifications: false,
    weeklyDigest: true,
    achievementAlerts: true,
    planApprovalAlerts: true,
  },
  compactMode: false,
  showTips: true,
};

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'fr', label: 'Français' },
  { code: 'es', label: 'Español' },
  { code: 'de', label: 'Deutsch' },
  { code: 'ar', label: 'العربية' },
  { code: 'zh', label: '中文' },
];

// ─── Section wrapper ───────────────────────────────────────────────────────────

const Section: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title, icon, children,
}) => (
  <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
    <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5 flex items-center gap-2">
      <span className="text-blue-500">{icon}</span>
      {title}
    </h3>
    {children}
  </div>
);

// ─── Toggle row ────────────────────────────────────────────────────────────────

const ToggleRow: React.FC<{
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}> = ({ label, description, checked, onChange }) => (
  <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0">
    <div>
      <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
      {description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
    </div>
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
        checked ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

// ─── Main Component ────────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFS);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // ─── Load preferences ──────────────────────────────────────────────────────

  const loadPrefs = useCallback(async () => {
    // Try backend first, fall back to localStorage
    try {
      const res = await api.get('/users/me/preferences');
      const backendPrefs = res.data.preferences || {};
      const merged = { ...DEFAULT_PREFS, ...backendPrefs };
      setPrefs(merged);
      localStorage.setItem('epn_preferences', JSON.stringify(merged));
    } catch {
      const stored = localStorage.getItem('epn_preferences');
      if (stored) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) }); } catch { /* ignore */ }
      }
    }
  }, []);

  useEffect(() => { loadPrefs(); }, [loadPrefs]);

  // ─── Persist preferences ───────────────────────────────────────────────────

  const savePrefs = useCallback(async (updated: Preferences) => {
    // Always save to localStorage immediately
    localStorage.setItem('epn_preferences', JSON.stringify(updated));

    setSaving(true);
    try {
      await api.put('/users/me/preferences', { preferences: updated });
    } catch {
      // Backend unavailable — localStorage is the fallback, no error shown
    } finally {
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, []);

  const updatePref = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    savePrefs(updated);
  };

  const updateNotif = (key: keyof NotificationPrefs, value: boolean) => {
    const updated = {
      ...prefs,
      notifications: { ...prefs.notifications, [key]: value },
    };
    setPrefs(updated);
    savePrefs(updated);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <DashboardLayout title="Settings">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Save indicator */}
        {(saving || saved) && (
          <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg">
            {saving
              ? <><Loader size={14} className="animate-spin" /> Saving…</>
              : <><CheckCircle size={14} /> Preferences saved</>
            }
          </div>
        )}

        {/* ── Appearance ──────────────────────────────────────────────────── */}
        <Section title="Appearance" icon={<Sun size={18} />}>
          {/* Theme toggle */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Theme</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Currently using {isDark ? 'dark' : 'light'} mode
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark
                  ? 'bg-gray-700 text-yellow-300 hover:bg-gray-600'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {isDark ? <><Sun size={16} /> Light mode</> : <><Moon size={16} /> Dark mode</>}
            </button>
          </div>

          <ToggleRow
            label="Compact Mode"
            description="Reduce spacing for a denser layout"
            checked={prefs.compactMode}
            onChange={v => updatePref('compactMode', v)}
          />
          <ToggleRow
            label="Show Tips & Hints"
            description="Display contextual tips throughout the app"
            checked={prefs.showTips}
            onChange={v => updatePref('showTips', v)}
          />
        </Section>

        {/* ── Notifications ────────────────────────────────────────────────── */}
        <Section title="Notifications" icon={<Bell size={18} />}>
          <ToggleRow
            label="Email Alerts"
            description="Receive important updates via email"
            checked={prefs.notifications.emailAlerts}
            onChange={v => updateNotif('emailAlerts', v)}
          />
          <ToggleRow
            label="Push Notifications"
            description="Browser push notifications (requires permission)"
            checked={prefs.notifications.pushNotifications}
            onChange={v => updateNotif('pushNotifications', v)}
          />
          <ToggleRow
            label="Weekly Digest"
            description="A summary of your week's activity every Monday"
            checked={prefs.notifications.weeklyDigest}
            onChange={v => updateNotif('weeklyDigest', v)}
          />
          <ToggleRow
            label="Achievement Alerts"
            description="Notify when a badge or milestone is earned"
            checked={prefs.notifications.achievementAlerts}
            onChange={v => updateNotif('achievementAlerts', v)}
          />
          {(user?.role === 'teacher' || user?.role === 'admin') && (
            <ToggleRow
              label="Plan Approval Alerts"
              description="Notify when a learning plan or content needs review"
              checked={prefs.notifications.planApprovalAlerts}
              onChange={v => updateNotif('planApprovalAlerts', v)}
            />
          )}
        </Section>

        {/* ── Language & Region ────────────────────────────────────────────── */}
        <Section title="Language & Region" icon={<Globe size={18} />}>
          <div className="py-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Display Language
            </label>
            <select
              value={prefs.language}
              onChange={e => updatePref('language', e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>{lang.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Full localisation is coming soon. Currently English only.
            </p>
          </div>
        </Section>

        {/* ── Account ──────────────────────────────────────────────────────── */}
        <Section title="Account" icon={<Shield size={18} />}>
          <div className="space-y-3">
            <Link
              to="/profile"
              className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-sm"
            >
              <span className="text-gray-900 dark:text-white font-medium">Edit Profile & Password</span>
              <ChevronRight size={16} className="text-gray-400" />
            </Link>

            <div className="px-4 py-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-sm">
              <p className="font-medium text-gray-900 dark:text-white mb-1">Export My Data</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                Download a copy of your EPN data (GDPR / POPIA compliant).
              </p>
              <button
                disabled
                className="text-xs px-3 py-1.5 bg-blue-600 text-white rounded-lg opacity-50 cursor-not-allowed"
              >
                Request Export (coming soon)
              </button>
            </div>

            <div className="px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm">
              <p className="font-medium text-red-800 dark:text-red-300 mb-1">Danger Zone</p>
              <p className="text-xs text-red-600 dark:text-red-400 mb-2">
                Account deletion is permanent and cannot be undone. Contact your administrator.
              </p>
              <button
                disabled
                className="text-xs px-3 py-1.5 bg-red-600 text-white rounded-lg opacity-50 cursor-not-allowed"
              >
                Delete Account (contact admin)
              </button>
            </div>
          </div>
        </Section>

        {/* ── Admin-only: AI & Budget config ───────────────────────────────── */}
        {user?.role === 'admin' && (
          <Section title="Admin Configuration" icon={<Settings size={18} />}>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Quick links to system-level configuration panels.
            </p>
            <div className="space-y-2">
              <Link
                to="/admin/ai-config"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <Brain size={16} className="text-orange-600 dark:text-orange-400" />
                  <span className="font-medium text-orange-800 dark:text-orange-300">AI Agent Autonomy</span>
                </div>
                <ChevronRight size={16} className="text-orange-400" />
              </Link>
              <Link
                to="/admin/ledger"
                className="flex items-center justify-between w-full px-4 py-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors text-sm"
              >
                <div className="flex items-center gap-2">
                  <DollarSign size={16} className="text-orange-600 dark:text-orange-400" />
                  <span className="font-medium text-orange-800 dark:text-orange-300">Budget & Ledger</span>
                </div>
                <ChevronRight size={16} className="text-orange-400" />
              </Link>
            </div>
          </Section>
        )}

      </div>
    </DashboardLayout>
  );
};

export default SettingsPage;
