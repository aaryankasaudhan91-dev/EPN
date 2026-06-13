/**
 * Parent Dashboard
 * Child progress summary, learning trend reports, achievement verification
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { TrendingUp, Award, Shield, CheckCircle, XCircle, Search } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import MasteryBar from '../../components/ui/MasteryBar';
import { studentsApi, analyticsApi, ledgerApi } from '../../services/api';

// ─── Parent Home ───────────────────────────────────────────────────────────────
const ParentHome: React.FC = () => {
  const [children, setChildren] = useState<unknown[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [childData, setChildData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    studentsApi.children()
      .then(res => {
        const kids = res.data.children || [];
        setChildren(kids);
        if (kids.length > 0) {
          setSelectedChild((kids[0] as any).id as string);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selectedChild) {
      analyticsApi.parent(selectedChild)
        .then(res => setChildData(res.data))
        .catch(() => {});
    }
  }, [selectedChild]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (children.length === 0) {
    return (
      <div className="card text-center py-12">
        <p className="text-gray-500 dark:text-gray-400">No children linked to your account.</p>
        <p className="text-sm text-gray-400 mt-2">Ask your child to add your email during registration.</p>
      </div>
    );
  }

  const progress = (childData?.progress as any) || {};
  const achievements = (childData?.achievements as unknown[]) || [];
  const recentPerf = (childData?.recentPerformance as unknown[]) || [];

  return (
    <div className="space-y-6">
      {/* Child selector */}
      {children.length > 1 && (
        <div className="flex gap-2">
          {(children as any[]).map(child => (
            <button
              key={child.id as string}
              onClick={() => setSelectedChild(child.id as string)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedChild === child.id
                  ? 'bg-green-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              }`}
            >
              {child.name as string}
            </button>
          ))}
        </div>
      )}

      {/* Child overview banner */}
      {progress.name && (
        <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-bold">{progress.name as string}'s Progress</h2>
          <p className="text-green-100 mt-1 text-sm">Grade {progress.grade as string}</p>
          <div className="flex items-center gap-4 mt-4">
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <div className="text-2xl font-bold">{Math.round(parseFloat(String(progress.overall_mastery || 0)))}%</div>
              <div className="text-xs text-green-100">Overall Mastery</div>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <div className="text-2xl font-bold">{progress.assessment_count as number || 0}</div>
              <div className="text-xs text-green-100">Assessments</div>
            </div>
            <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
              <div className="text-2xl font-bold">{achievements.length}</div>
              <div className="text-xs text-green-100">Badges</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Overall Mastery"
          value={`${Math.round(parseFloat(String(progress.overall_mastery || 0)))}%`}
          icon={<TrendingUp size={20} />}
          color="green"
        />
        <StatCard
          title="Achievements"
          value={achievements.length}
          icon={<Award size={20} />}
          color="orange"
        />
        <StatCard
          title="Risk Level"
          value={parseFloat(String(progress.risk_score || 0)) >= 70 ? 'High' : parseFloat(String(progress.risk_score || 0)) >= 40 ? 'Medium' : 'Low'}
          icon={<Shield size={20} />}
          color={parseFloat(String(progress.risk_score || 0)) >= 70 ? 'red' : parseFloat(String(progress.risk_score || 0)) >= 40 ? 'orange' : 'green'}
        />
      </div>

      {/* Recent performance */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Recent Subject Performance</h3>
        <div className="space-y-4">
          {recentPerf.map((s: unknown) => {
            const sub = s as { subject: string; avg_score: number };
            return (
              <MasteryBar key={sub.subject} label={sub.subject} value={parseFloat(String(sub.avg_score))} />
            );
          })}
          {recentPerf.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No recent assessments</p>
          )}
        </div>
      </div>

      {/* Achievements */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Award size={18} className="text-yellow-500" />
          Achievements & Badges
        </h3>
        {achievements.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">No achievements yet</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(achievements as any[]).map(a => (
              <div key={a.id as string} className="flex items-center gap-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="text-2xl">🏆</div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{a.title as string}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.description as string}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(a.earned_at as string).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Verify Records Page ───────────────────────────────────────────────────────
const VerifyPage: React.FC = () => {
  const [referenceId, setReferenceId] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referenceId.trim()) return;
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await ledgerApi.verifyRecord(referenceId.trim());
      setResult(res.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Shield size={18} className="text-green-600" />
          Verify Achievement on Ledger
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Enter a record ID to verify it against the immutable blockchain ledger.
        </p>

        <form onSubmit={handleVerify} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={referenceId}
              onChange={e => setReferenceId(e.target.value)}
              className="input flex-1"
              placeholder="Enter record UUID..."
            />
            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-1.5">
              <Search size={16} />
              {loading ? 'Verifying...' : 'Verify'}
            </button>
          </div>
        </form>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mt-3 text-sm text-red-700 dark:text-red-400">
            <XCircle size={16} /> {error}
          </div>
        )}

        {result && (
          <div className={`mt-4 p-4 rounded-xl border ${result.verified ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'}`}>
            <div className="flex items-center gap-2 mb-3">
              {result.verified ? (
                <CheckCircle size={20} className="text-green-600" />
              ) : (
                <XCircle size={20} className="text-red-600" />
              )}
              <span className={`font-semibold ${result.verified ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                {result.message as string}
              </span>
            </div>
            {result.verified && (
              <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <p><span className="font-medium">Block:</span> #{result.blockIndex as number}</p>
                <p><span className="font-medium">Type:</span> {result.recordType as string}</p>
                <p><span className="font-medium">Timestamp:</span> {new Date(result.timestamp as string).toLocaleString()}</p>
                <p className="font-mono text-xs break-all"><span className="font-medium font-sans">Hash:</span> {result.blockHash as string}</p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
        <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">About the EPN Ledger</h4>
        <p className="text-sm text-blue-700 dark:text-blue-400">
          The EPN uses a hash-chained ledger to create tamper-evident records of achievements, 
          approvals, and AI actions. Each block is cryptographically linked to the previous one, 
          ensuring data integrity and transparency.
        </p>
      </div>
    </div>
  );
};

// ─── Parent Dashboard Router ───────────────────────────────────────────────────
const ParentDashboard: React.FC = () => {
  return (
    <DashboardLayout title="Parent Dashboard">
      <Routes>
        <Route path="/" element={<ParentHome />} />
        <Route path="/progress" element={<ParentHome />} />
        <Route path="/achievements" element={<ParentHome />} />
        <Route path="/verify" element={<VerifyPage />} />
      </Routes>
    </DashboardLayout>
  );
};

export default ParentDashboard;
