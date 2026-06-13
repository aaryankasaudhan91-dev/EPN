/**
 * Admin Dashboard
 * User management, AI configuration, audit logs, ledger records, system analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Users, BarChart2, Brain, FileText, Shield,
  Settings, CheckCircle, XCircle, RefreshCw,
  TrendingUp, Activity, Database,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import { analyticsApi, usersApi, auditApi, ledgerApi, agentsApi } from '../../services/api';

// ─── Admin Home ────────────────────────────────────────────────────────────────
const AdminHome: React.FC = () => {
  const [systemData, setSystemData] = useState<any | null>(null);
  const [agentHealth, setAgentHealth] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [sysRes, healthRes] = await Promise.all([
        analyticsApi.system(),
        agentsApi.health(),
      ]);
      setSystemData(sysRes.data);
      setAgentHealth(healthRes.data);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userStats = (systemData?.userStats as unknown[]) || [];
  const agentActivity = (systemData?.agentActivity as unknown[]) || [];
  const ledgerStats = (systemData?.ledgerStats as any) || {};
  const agents = (agentHealth?.agents as Record<string, any>) || {};

  const totalUsers = userStats.reduce((sum: number, s: unknown) => sum + parseInt(String((s as any).count || 0)), 0);
  const activeUsers = userStats.reduce((sum: number, s: unknown) => sum + parseInt(String((s as any).active || 0)), 0);

  const agentStatusColors: Record<string, string> = {
    healthy: 'badge-green',
    circuit_open: 'badge-red',
  };

  const agentNames: Record<string, string> = {
    monitor_agent: 'Monitor Agent',
    diagnostic_agent: 'Diagnostic Agent',
    curriculum_planner_agent: 'Curriculum Planner',
    content_generation_agent: 'Content Generator',
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Users" value={totalUsers} icon={<Users size={20} />} color="orange" />
        <StatCard title="Active Users" value={activeUsers} icon={<Activity size={20} />} color="green" />
        <StatCard title="Ledger Blocks" value={parseInt(String(ledgerStats.block_count || 0))} icon={<Shield size={20} />} color="blue" />
        <StatCard title="Agent Actions (7d)" value={agentActivity.reduce((s: number, a: unknown) => s + parseInt(String((a as any).action_count || 0)), 0)} icon={<Brain size={20} />} color="purple" />
      </div>

      {/* Agent health */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Activity size={18} className="text-orange-500" />
            AI Agent Health
          </h3>
          <button onClick={loadData} className="btn-secondary text-xs py-1.5 flex items-center gap-1">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(agents).map(([key, agent]) => (
            <div key={key} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
              <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">{agentNames[key] || key}</p>
              <span className={`badge ${agentStatusColors[agent.status as string] || 'badge-gray'}`}>
                {agent.status as string}
              </span>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Failures: {agent.failureCount as number}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* User breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Users size={18} className="text-blue-600" />
            Users by Role
          </h3>
          <div className="space-y-3">
            {(userStats as any[]).map(s => (
              <div key={s.role as string} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`badge ${s.role === 'student' ? 'badge-blue' : s.role === 'teacher' ? 'badge-purple' : s.role === 'admin' ? 'badge-red' : 'badge-green'}`}>
                    {s.role as string}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.count as number}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({s.active as number} active)</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Brain size={18} className="text-purple-600" />
            Agent Activity (Last 7 Days)
          </h3>
          <div className="space-y-3">
            {(agentActivity as any[]).map(a => (
              <div key={a.agent as string} className="flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  {(a.agent as string).replace(/_/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="h-1.5 bg-purple-500 rounded-full"
                      style={{ width: `${Math.min(100, (parseInt(String(a.action_count)) / 50) * 100)}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white w-8 text-right">
                    {a.action_count as number}
                  </span>
                </div>
              </div>
            ))}
            {agentActivity.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-4">No agent activity in the last 7 days</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── User Management Page ──────────────────────────────────────────────────────
const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const loadUsers = useCallback(() => {
    setLoading(true);
    usersApi.list({ search, role: roleFilter || undefined, limit: 50 })
      .then(res => setUsers(res.data.users || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search, roleFilter]);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const toggleStatus = async (id: string, isActive: boolean) => {
    await usersApi.toggleStatus(id, !isActive);
    loadUsers();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="text"
          placeholder="Search users..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)} className="input max-w-xs">
          <option value="">All roles</option>
          <option value="student">Students</option>
          <option value="teacher">Teachers</option>
          <option value="parent">Parents</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      <div className="card overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">User</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Role</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Status</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Last Login</th>
              <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {loading ? (
              <tr><td colSpan={5} className="text-center py-8"><div className="w-6 h-6 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
            ) : (users as any[]).map(u => (
              <tr key={u.id as string} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 dark:text-white">{u.name as string}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{u.email as string}</div>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'student' ? 'badge-blue' : u.role === 'teacher' ? 'badge-purple' : u.role === 'admin' ? 'badge-red' : 'badge-green'}`}>
                    {u.role as string}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.is_active ? 'badge-green' : 'badge-gray'}`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400">
                  {u.last_login ? new Date(u.last_login as string).toLocaleDateString() : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleStatus(u.id as string, u.is_active as boolean)}
                    className={`text-xs px-2 py-1 rounded-lg font-medium transition-colors ${u.is_active ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400'}`}
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && users.length === 0 && (
          <p className="text-center text-gray-400 py-8 text-sm">No users found</p>
        )}
      </div>
    </div>
  );
};

// ─── Audit Logs Page ───────────────────────────────────────────────────────────
const AuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [agentFilter, setAgentFilter] = useState('');

  useEffect(() => {
    auditApi.list({ agent: agentFilter || undefined, limit: 100 })
      .then(res => setLogs(res.data.logs || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentFilter]);

  return (
    <div className="space-y-4">
      <select value={agentFilter} onChange={e => setAgentFilter(e.target.value)} className="input max-w-xs">
        <option value="">All agents</option>
        <option value="monitor_agent">Monitor Agent</option>
        <option value="diagnostic_agent">Diagnostic Agent</option>
        <option value="curriculum_planner_agent">Curriculum Planner</option>
        <option value="content_generation_agent">Content Generator</option>
        <option value="orchestrator_agent">Orchestrator</option>
        <option value="auth">Auth</option>
      </select>

      <div className="card overflow-hidden p-0">
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (logs as any[]).map(log => (
            <div key={log.id as string} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <div className="flex items-center gap-2 mb-1">
                <span className="badge badge-gray text-xs">{(log.agent as string).replace(/_/g, ' ')}</span>
                <span className="text-xs text-gray-400">{new Date(log.created_at as string).toLocaleString()}</span>
              </div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{log.action as string}</p>
              {log.actor_name && <p className="text-xs text-gray-500 dark:text-gray-400">Actor: {log.actor_name as string}</p>}
              {log.target_type && <p className="text-xs text-gray-400">Target: {log.target_type as string}</p>}
            </div>
          ))}
          {!loading && logs.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No audit logs found</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Ledger Page ───────────────────────────────────────────────────────────────
const LedgerPage: React.FC = () => {
  const [records, setRecords] = useState<unknown[]>([]);
  const [integrity, setIntegrity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ledgerApi.list({ limit: 50 }),
      ledgerApi.verify(),
    ]).then(([recordsRes, integrityRes]) => {
      setRecords(recordsRes.data.records || []);
      setIntegrity(integrityRes.data);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      {/* Integrity status */}
      {integrity && (
        <div className={`card border ${integrity.valid ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'}`}>
          <div className="flex items-center gap-3">
            {integrity.valid ? (
              <CheckCircle size={24} className="text-green-600" />
            ) : (
              <XCircle size={24} className="text-red-600" />
            )}
            <div>
              <p className={`font-semibold ${integrity.valid ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {integrity.message as string}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {integrity.blockCount as number} blocks verified
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Records table */}
      <div className="card overflow-hidden p-0">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Database size={18} className="text-blue-600" />
            Ledger Records
          </h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-4 border-orange-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {(records as any[]).map(r => (
              <div key={r.id as string} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                <div className="flex items-center justify-between mb-1">
                  <span className="badge badge-blue">Block #{r.block_index as number}</span>
                  <span className="text-xs text-gray-400">{new Date(r.created_at as string).toLocaleString()}</span>
                </div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{r.record_type as string}</p>
                <p className="text-xs font-mono text-gray-400 truncate mt-0.5">{r.block_hash as string}</p>
              </div>
            ))}
            {records.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">No ledger records</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── AI Config Page ────────────────────────────────────────────────────────────
const AIConfigPage: React.FC = () => {
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Brain size={18} className="text-purple-600" />
          AI System Configuration
        </h3>
        <div className="space-y-4">
          {[
            { label: 'AI Autonomy Level', value: 'Medium (requires teacher approval)', desc: 'Controls how much the AI can act without human oversight' },
            { label: 'Daily Content Limit', value: '10 per student', desc: 'Maximum AI-generated content items per student per day' },
            { label: 'Risk Alert Threshold', value: 'High: 70, Medium: 40', desc: 'Risk score thresholds that trigger teacher notifications' },
            { label: 'OpenAI Model', value: import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o-mini (configurable)', desc: 'AI model used for content generation' },
            { label: 'Circuit Breaker', value: '5 failures / 60s reset', desc: 'Automatically disables agents after repeated failures' },
          ].map(config => (
            <div key={config.label} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{config.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{config.desc}</p>
              </div>
              <span className="badge badge-blue ml-4 flex-shrink-0">{config.value}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Configuration changes require environment variable updates and server restart.
          See .env.example for all configurable options.
        </p>
      </div>
    </div>
  );
};

// ─── Admin Dashboard Router ────────────────────────────────────────────────────
const AdminDashboard: React.FC = () => {
  return (
    <DashboardLayout title="Admin Dashboard">
      <Routes>
        <Route path="/" element={<AdminHome />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/analytics" element={<AdminHome />} />
        <Route path="/ai-config" element={<AIConfigPage />} />
        <Route path="/audit" element={<AuditLogsPage />} />
        <Route path="/ledger" element={<LedgerPage />} />
        <Route path="/settings" element={<AIConfigPage />} />
      </Routes>
    </DashboardLayout>
  );
};

export default AdminDashboard;
