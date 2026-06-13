/**
 * Sidebar Navigation Component
 * Role-aware navigation sidebar with dark mode support
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, BarChart2,
  Users, Settings, LogOut, Shield, FileText,
  Brain, CheckSquare, TrendingUp, Award, Link,
  User, HelpCircle, Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: Record<UserRole, NavItem[]> = {
  student: [
    { label: 'Dashboard', path: '/student', icon: <LayoutDashboard size={18} /> },
    { label: 'My Progress', path: '/student/progress', icon: <TrendingUp size={18} /> },
    { label: 'Study Materials', path: '/student/materials', icon: <BookOpen size={18} /> },
    { label: 'Achievements', path: '/student/achievements', icon: <Award size={18} /> },
    { label: 'AI Teacher Mira', path: '/student/mira', icon: <Brain size={18} /> },
  ],
  teacher: [
    { label: 'Dashboard', path: '/teacher', icon: <LayoutDashboard size={18} /> },
    { label: 'My Students', path: '/teacher/students', icon: <Users size={18} /> },
    { label: 'Approvals', path: '/teacher/approvals', icon: <CheckSquare size={18} /> },
    { label: 'Analytics', path: '/teacher/analytics', icon: <BarChart2 size={18} /> },
    { label: 'Generate Content', path: '/teacher/generate', icon: <Brain size={18} /> },
    { label: 'Audit Logs', path: '/teacher/audit', icon: <FileText size={18} /> },
  ],
  parent: [
    { label: 'Dashboard', path: '/parent', icon: <LayoutDashboard size={18} /> },
    { label: 'Progress Reports', path: '/parent/progress', icon: <TrendingUp size={18} /> },
    { label: 'Achievements', path: '/parent/achievements', icon: <Award size={18} /> },
    { label: 'Verify Records', path: '/parent/verify', icon: <Link size={18} /> },
  ],
  admin: [
    { label: 'Dashboard', path: '/admin', icon: <LayoutDashboard size={18} /> },
    { label: 'User Management', path: '/admin/users', icon: <Users size={18} /> },
    { label: 'System Analytics', path: '/admin/analytics', icon: <BarChart2 size={18} /> },
    { label: 'AI Configuration', path: '/admin/ai-config', icon: <Brain size={18} /> },
    { label: 'Audit Logs', path: '/admin/audit', icon: <FileText size={18} /> },
    { label: 'Ledger Records', path: '/admin/ledger', icon: <Shield size={18} /> },
  ],
};

/** Shared nav items shown for every role below the role-specific items */
const sharedNavItems: NavItem[] = [
  { label: 'Profile', path: '/profile', icon: <User size={18} /> },
  { label: 'Settings', path: '/settings', icon: <Settings size={18} /> },
  { label: 'Help Center', path: '/help', icon: <HelpCircle size={18} /> },
  { label: 'About EPN', path: '/about', icon: <Info size={18} /> },
];

const roleColors: Record<UserRole, string> = {
  student: 'from-blue-600 to-blue-700',
  teacher: 'from-purple-600 to-purple-700',
  parent: 'from-green-600 to-green-700',
  admin: 'from-orange-600 to-orange-700',
};

const roleLabels: Record<UserRole, string> = {
  student: 'Student Portal',
  teacher: 'Teacher Portal',
  parent: 'Parent Portal',
  admin: 'Admin Portal',
};

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const items = navItems[user.role] || [];
  const gradient = roleColors[user.role];
  const portalLabel = roleLabels[user.role];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-30 transform transition-transform duration-300
          bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-700/50
          flex flex-col shadow-2xl lg:shadow-none
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto
        `}
      >
        {/* Logo / Brand */}
        <div className={`bg-gradient-to-r ${gradient} p-5`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center transform hover:rotate-3 transition-all duration-300">
              <img src="/logo.svg" alt="EPN Logo" className="w-full h-full object-contain drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">EPN</h1>
              <p className="text-white/70 text-xs">{portalLabel}</p>
            </div>
          </div>
        </div>

        {/* User info */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-semibold text-sm`}>
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* Role-specific items */}
          {items.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === `/${user.role}`}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}

          {/* Divider */}
          <div className="my-2 border-t border-gray-200 dark:border-gray-700" />

          {/* Shared items (Profile, Settings, Help, About) */}
          {sharedNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                }`
              }
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
