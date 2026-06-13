/**
 * Teacher Dashboard
 * Class-wide performance overview, student alerts, pending approvals,
 * AI recommendation review panel, analytics reports.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  Users, AlertTriangle, CheckSquare, BarChart2,
  Brain, TrendingUp, TrendingDown, Clock, CheckCircle, XCircle,
  FileText, RefreshCw,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import MasteryBar from '../../components/ui/MasteryBar';
import ApprovalCard from '../../components/ui/ApprovalCard';
import PerformanceChart from '../../components/charts/PerformanceChart';
import ScrollSection from '../../components/ui/ScrollSection';
import {
  analyticsApi, approvalsApi, studentsApi,
  learningPlansApi, contentApi,
} from '../../services/api';
import { LearningPlan, GeneratedContent } from '../../types';

// ─── Teacher Home ──────────────────────────────────────────────────────────────
const TeacherHome: React.FC = () => {
  const [classData, setClassData] = useState<any | null>(null);
  const [approvals, setApprovals] = useState<{ learningPlans: LearningPlan[]; generatedContent: GeneratedContent[]; totalPending: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [classRes, approvalsRes] = await Promise.all([
        analyticsApi.class(),
        approvalsApi.pending(),
      ]);
      setClassData(classRes.data);
      setApprovals(approvalsRes.data);
    } catch (err) {
      console.error('Failed to load teacher data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleApprovePlan = async (id: string, notes?: string) => {
    await learningPlansApi.approve(id, notes);
    await loadData();
  };

  const handleRejectPlan = async (id: string, reason: string) => {
    await learningPlansApi.reject(id, reason);
    await loadData();
  };

  const handleApproveContent = async (id: string, notes?: string) => {
    await contentApi.approve(id, notes);
    await loadData();
  };

  const handleRejectContent = async (id: string, reason: string) => {
    await contentApi.reject(id, reason);
    await loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const overview = (classData?.overview as any) || {};
  const subjectPerf = (classData?.subjectPerformance as unknown[]) || [];
  const atRisk = (classData?.atRiskStudents as unknown[]) || [];
  const dailyTrend = (classData?.dailyTrend as unknown[]) || [];

  const chartData = dailyTrend.map((d: unknown) => {
    const day = d as { date: string; avg_score: number };
    return {
      date: new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      'Class Average': Math.round(parseFloat(String(day.avg_score))),
    };
  });

  return (
    <div className="space-y-6">
      {/* Stats */}
      <ScrollSection delay={0.1} direction="up">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={overview.total_students as number || 0}
            icon={<Users size={20} />}
            color="purple"
          />
          <StatCard
            title="Class Avg Mastery"
            value={`${Math.round(parseFloat(String(overview.avg_mastery || 0)))}%`}
            icon={<TrendingUp size={20} />}
            color="blue"
          />
          <StatCard
            title="At-Risk Students"
            value={overview.high_risk_count as number || 0}
            icon={<AlertTriangle size={20} />}
            color="red"
            subtitle="Risk score ≥ 70"
          />
          <StatCard
            title="Pending Approvals"
            value={approvals?.totalPending || 0}
            icon={<CheckSquare size={20} />}
            color="orange"
          />
        </div>
      </ScrollSection>

      {/* Main content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class performance chart */}
        <ScrollSection delay={0.2} direction="left" className="lg:col-span-2">
          <div className="card hover:shadow-lg transition-shadow duration-300">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <BarChart2 size={18} className="text-purple-600" />
              Class Performance (Last 30 Days)
            </h3>
            {chartData.length > 0 ? (
              <PerformanceChart data={chartData} height={250} />
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                No assessment data in the last 30 days
              </div>
            )}
          </div>
        </ScrollSection>

        {/* At-risk students */}
        <ScrollSection delay={0.3} direction="right">
          <div className="card hover:shadow-lg transition-shadow duration-300">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-red-500" />
              Knowledge Gap Alerts
            </h3>
            <div className="space-y-3">
              {atRisk.slice(0, 6).map((s: unknown) => {
                const student = s as { id: string; name: string; grade: string; risk_score: number; overall_mastery: number };
                return (
                  <div key={student.id} className="flex items-center justify-between p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 hover:bg-red-100 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Grade {student.grade} · Mastery: {Math.round(student.overall_mastery)}%</p>
                    </div>
                    <div className={`text-xs font-bold px-2 py-1 rounded-full ${student.risk_score >= 70 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'}`}>
                      Risk: {Math.round(student.risk_score)}
                    </div>
                  </div>
                );
              })}
              {atRisk.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No at-risk students 🎉</p>
              )}
            </div>
          </div>
        </ScrollSection>
      </div>

      {/* Subject performance */}
      <ScrollSection delay={0.4} direction="up">
        <div className="card hover:shadow-lg transition-shadow duration-300">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingDown size={18} className="text-blue-600" />
            Subject Performance (Class Average)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjectPerf.map((s: unknown) => {
              const sub = s as { subject: string; avg_score: number; assessment_count: number };
              return (
                <div key={sub.subject}>
                  <MasteryBar label={sub.subject} value={parseFloat(String(sub.avg_score))} />
                  <p className="text-xs text-gray-400 mt-0.5">{sub.assessment_count} assessments</p>
                </div>
              );
            })}
            {subjectPerf.length === 0 && (
              <p className="text-gray-400 text-sm col-span-2 text-center py-4">No subject data available</p>
            )}
          </div>
        </div>
      </ScrollSection>

      {/* Pending approvals */}
      <ScrollSection delay={0.5} direction="up">
        <div className="card border-orange-200 dark:border-orange-900/50 hover:shadow-lg transition-shadow duration-300">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <CheckSquare size={18} className="text-orange-500 animate-pulse" />
              Pending Approvals ({approvals?.totalPending || 0})
            </h3>
            <button onClick={loadData} className="btn-secondary text-xs py-1.5 flex items-center gap-1 hover:bg-orange-50 dark:hover:bg-orange-900/20">
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {approvals?.totalPending === 0 ? (
            <div className="text-center py-8">
              <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">All caught up! No pending approvals.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Learning plan approvals */}
              {approvals?.learningPlans.slice(0, 4).map(plan => (
                <div key={plan.id} className="transition-all hover:scale-[1.02]">
                  <ApprovalCard
                    id={plan.id}
                    title={plan.title}
                    subtitle={`${(plan.tasks || []).length} learning tasks`}
                    type="plan"
                    studentName={plan.studentName || 'Unknown'}
                    grade={plan.grade}
                    createdAt={plan.createdAt}
                    details={{ tasks: plan.tasks?.length, description: plan.description }}
                    onApprove={handleApprovePlan}
                    onReject={handleRejectPlan}
                  />
                </div>
              ))}

              {/* Content approvals */}
              {approvals?.generatedContent.slice(0, 4).map(content => (
                <div key={content.id} className="transition-all hover:scale-[1.02]">
                  <ApprovalCard
                    id={content.id}
                    title={content.title || `${content.topic} ${content.contentType}`}
                    subtitle={`${content.subject} · ${content.contentType?.replace('_', ' ')}`}
                    type="content"
                    studentName={content.studentName || 'Unknown'}
                    grade={content.grade}
                    createdAt={content.createdAt}
                    onApprove={handleApproveContent}
                    onReject={handleRejectContent}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </ScrollSection>
    </div>
  );
};

// ─── Students List Page ────────────────────────────────────────────────────────
const StudentsPage: React.FC = () => {
  const [students, setStudents] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    studentsApi.list({ search, limit: 50 })
      .then(res => setStudents(res.data.students || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input max-w-xs"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Student</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Grade</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Mastery</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-medium">Risk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {(students as any[]).map(s => (
                <tr key={s.id as string} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-white">{s.name as string}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{s.email as string}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Grade {s.grade as string}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20">
                        <MasteryBar label="" value={parseFloat(String(s.overall_mastery || 0))} showLabel={false} size="sm" />
                      </div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{Math.round(parseFloat(String(s.overall_mastery || 0)))}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`badge ${parseFloat(String(s.risk_score || 0)) >= 70 ? 'badge-red' : parseFloat(String(s.risk_score || 0)) >= 40 ? 'badge-yellow' : 'badge-green'}`}>
                      {parseFloat(String(s.risk_score || 0)) >= 70 ? 'High' : parseFloat(String(s.risk_score || 0)) >= 40 ? 'Medium' : 'Low'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {students.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No students found</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Generate Content Page ─────────────────────────────────────────────────────
const GenerateContentPage: React.FC = () => {
  const [students, setStudents] = useState<unknown[]>([]);
  const [form, setForm] = useState({
    studentId: '', contentType: 'quiz', subject: 'Mathematics', topic: '', deadline: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    studentsApi.list({ limit: 100 }).then(res => setStudents(res.data.students || [])).catch(() => {});
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentId || !form.topic) {
      setError('Please fill all required fields');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await contentApi.generate(form);
      setSuccess('Content generated successfully! It will appear in the approvals queue.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Generation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Brain size={18} className="text-blue-600" />
          Generate AI Study Content
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Generate personalized study materials for a student. Content will require your approval before delivery.
        </p>

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg mb-4 text-sm text-green-700 dark:text-green-400">
            <CheckCircle size={16} /> {success}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4 text-sm text-red-700 dark:text-red-400">
            <XCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleGenerate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Student *</label>
            <select value={form.studentId} onChange={e => setForm(p => ({ ...p, studentId: e.target.value }))} className="input">
              <option value="">Select a student...</option>
              {(students as any[]).map(s => (
                <option key={s.id as string} value={s.id as string}>{s.name as string} (Grade {s.grade as string})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Content Type *</label>
            <select value={form.contentType} onChange={e => setForm(p => ({ ...p, contentType: e.target.value }))} className="input">
              <option value="quiz">Quiz (MCQ)</option>
              <option value="worksheet">Worksheet</option>
              <option value="flashcard">Flashcards</option>
              <option value="explanation">Concept Explanation</option>
              <option value="revision_notes">Revision Notes</option>
              <option value="study_plan">Study Plan</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject *</label>
            <select value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className="input">
              {['Mathematics', 'Science', 'English', 'History', 'Computer Science'].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Topic *</label>
            <input
              type="text"
              value={form.topic}
              onChange={e => setForm(p => ({ ...p, topic: e.target.value }))}
              className="input"
              placeholder="e.g., Quadratic Equations, Photosynthesis..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deadline (Optional)</label>
            <input
              type="datetime-local"
              value={form.deadline}
              onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))}
              className="input"
            />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Generating...</>
            ) : (
              <><Brain size={16} /> Generate Content</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

// ─── Audit Logs Page ───────────────────────────────────────────────────────────
const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    import('../../services/api').then(({ auditApi }) => {
      auditApi.list({ limit: 50 }).then(res => setLogs(res.data.logs || [])).finally(() => setLoading(false));
    });
  }, []);

  const agentColors: Record<string, string> = {
    monitor_agent: 'badge-blue',
    diagnostic_agent: 'badge-purple',
    curriculum_planner_agent: 'badge-green',
    content_generation_agent: 'badge-yellow',
    orchestrator_agent: 'badge-red',
    auth: 'badge-gray',
    user_management: 'badge-gray',
  };

  return (
    <div className="card overflow-hidden p-0">
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <FileText size={18} className="text-gray-500" />
          AI Agent Audit Logs
        </h3>
      </div>
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-gray-700">
          {(logs as any[]).map(log => (
            <div key={log.id as string} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30">
              <div className="flex items-center gap-2 mb-1">
                <span className={`badge ${agentColors[log.agent as string] || 'badge-gray'}`}>
                  {(log.agent as string).replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(log.created_at as string).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-gray-900 dark:text-white font-medium">{log.action as string}</p>
              {log.actor_name && (
                <p className="text-xs text-gray-500 dark:text-gray-400">by {log.actor_name as string}</p>
              )}
            </div>
          ))}
          {logs.length === 0 && (
            <p className="text-center text-gray-400 py-8 text-sm">No audit logs found</p>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Teacher Dashboard Router ──────────────────────────────────────────────────
const TeacherDashboard: React.FC = () => {
  return (
    <DashboardLayout title="Teacher Dashboard">
      <Routes>
        <Route path="/" element={<TeacherHome />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/approvals" element={<TeacherHome />} />
        <Route path="/analytics" element={<TeacherHome />} />
        <Route path="/generate" element={<GenerateContentPage />} />
        <Route path="/audit" element={<AuditPage />} />
      </Routes>
    </DashboardLayout>
  );
};

export default TeacherDashboard;
