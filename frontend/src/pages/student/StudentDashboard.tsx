/**
 * Student Dashboard
 * Shows learning progress, mastery scores, study recommendations,
 * generated materials, progress timeline, and achievement badges.
 */

import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import {
  TrendingUp, BookOpen, Award, Brain, Target,
  Clock, CheckCircle, AlertTriangle, Star,
} from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import StatCard from '../../components/ui/StatCard';
import MasteryBar from '../../components/ui/MasteryBar';
import PerformanceChart from '../../components/charts/PerformanceChart';
import SubjectRadarChart from '../../components/charts/SubjectRadarChart';
import { studentsApi, analyticsApi, contentApi, assessmentsApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StudentProgress from './StudentProgress';
import StudentMaterials from './StudentMaterials';
import StudentAchievements from './StudentAchievements';
import StudentMira from './StudentMira';

// ─── Student Home ──────────────────────────────────────────────────────────────
const StudentHome: React.FC = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<unknown[]>([]);
  const [content, setContent] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentRes = await studentsApi.me();
        const studentId = studentRes.data.id;

        const [overviewRes, analyticsRes, timelineRes, contentRes] = await Promise.all([
          studentsApi.overview(studentId),
          analyticsApi.student(studentId),
          assessmentsApi.timeline(studentId),
          contentApi.list({ studentId, approvalStatus: 'approved', limit: 6 }),
        ]);

        setOverview(overviewRes.data);
        setAnalytics(analyticsRes.data);
        setTimeline(timelineRes.data.timeline || []);
        setContent(contentRes.data.content || []);
      } catch (err) {
        console.error('Failed to load student data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const student = (overview as any)?.student as any | undefined;
  const subjectPerf = ((overview as any)?.subjectPerformance as unknown[]) || [];
  const achievements = ((overview as any)?.achievements as unknown[]) || [];
  const subjectBreakdown = ((analytics as any)?.subjectBreakdown as unknown[]) || [];

  // Build chart data from timeline
  const chartData = buildChartData(timeline as Array<{ date: string; subject: string; avg_score: number }>);

  // Build radar data
  const radarData = subjectBreakdown.map((s: unknown) => {
    const sub = s as { subject: string; avg_score: number };
    return { subject: sub.subject, mastery: Math.round(parseFloat(String(sub.avg_score))) };
  });

  const overallMastery = parseFloat(String(student?.overall_mastery || 0));
  const riskScore = parseFloat(String(student?.risk_score || 0));

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold">Welcome back, {user?.name?.split(' ')[0]}! 👋</h2>
        <p className="text-blue-100 mt-1 text-sm">
          Grade {student?.grade as string} · Keep up the great work on your learning journey
        </p>
        <div className="flex items-center gap-4 mt-4">
          <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold">{Math.round(overallMastery)}%</div>
            <div className="text-xs text-blue-100">Overall Mastery</div>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
            <div className="text-2xl font-bold">{achievements.length}</div>
            <div className="text-xs text-blue-100">Badges Earned</div>
          </div>
          <div className="bg-white/20 rounded-lg px-4 py-2 text-center">
            <div className={`text-2xl font-bold ${riskScore >= 70 ? 'text-red-300' : riskScore >= 40 ? 'text-yellow-300' : 'text-green-300'}`}>
              {riskScore < 40 ? '🟢' : riskScore < 70 ? '🟡' : '🔴'}
            </div>
            <div className="text-xs text-blue-100">Risk Level</div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Overall Mastery"
          value={`${Math.round(overallMastery)}%`}
          icon={<Target size={20} />}
          color="blue"
          subtitle="Across all subjects"
        />
        <StatCard
          title="Subjects Tracked"
          value={subjectPerf.length}
          icon={<BookOpen size={20} />}
          color="purple"
        />
        <StatCard
          title="Achievements"
          value={achievements.length}
          icon={<Award size={20} />}
          color="orange"
        />
        <StatCard
          title="Study Materials"
          value={content.length}
          icon={<Brain size={20} />}
          color="green"
          subtitle="Approved & ready"
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance timeline */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            Performance Timeline
          </h3>
          {chartData.length > 0 ? (
            <PerformanceChart data={chartData} height={250} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No assessment data yet
            </div>
          )}
        </div>

        {/* Subject radar */}
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target size={18} className="text-purple-600" />
            Subject Mastery Overview
          </h3>
          {radarData.length > 0 ? (
            <SubjectRadarChart data={radarData} height={250} />
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
              No mastery data yet
            </div>
          )}
        </div>
      </div>

      {/* Subject mastery bars */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <BookOpen size={18} className="text-green-600" />
          Subject Performance
        </h3>
        <div className="space-y-4">
          {subjectPerf.map((s: unknown) => {
            const sub = s as { subject: string; avg_score: number };
            return (
              <MasteryBar
                key={sub.subject}
                label={sub.subject}
                value={parseFloat(String(sub.avg_score))}
              />
            );
          })}
          {subjectPerf.length === 0 && (
            <p className="text-gray-400 text-sm text-center py-4">No assessments yet</p>
          )}
        </div>
      </div>

      {/* Study materials */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Brain size={18} className="text-blue-600" />
          Your Study Materials
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(content as any[]).map((item) => (
            <ContentCard key={item.id as string} item={item} />
          ))}
          {content.length === 0 && (
            <p className="text-gray-400 text-sm col-span-3 text-center py-4">
              No approved study materials yet. Your teacher will review AI-generated content soon.
            </p>
          )}
        </div>
      </div>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award size={18} className="text-yellow-500" />
            Achievements
          </h3>
          <div className="flex flex-wrap gap-3">
            {(achievements as any[]).map((a) => (
              <div key={a.id as string} className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg px-3 py-2">
                <Star size={16} className="text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{a.title as string}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{a.description as string}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Content type icons and colors
const contentTypeConfig: Record<string, { icon: string; color: string }> = {
  quiz: { icon: '📝', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' },
  worksheet: { icon: '📄', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800' },
  flashcard: { icon: '🃏', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' },
  explanation: { icon: '💡', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800' },
  revision_notes: { icon: '📋', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' },
  study_plan: { icon: '🗓️', color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800' },
};

const ContentCard: React.FC<{ item: any }> = ({ item }) => {
  const config = contentTypeConfig[item.content_type as string] || contentTypeConfig.quiz;
  return (
    <div className={`border rounded-xl p-4 ${config.color}`}>
      <div className="text-2xl mb-2">{config.icon}</div>
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
        {(item.content_type as string).replace('_', ' ')}
      </p>
      <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 line-clamp-2">
        {item.title as string || `${item.topic as string} ${item.content_type as string}`}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{item.subject as string}</p>
    </div>
  );
};

// Build chart data from timeline
const buildChartData = (timeline: Array<{ date: string; subject: string; avg_score: number }>) => {
  const byDate: Record<string, Record<string, number>> = {};
  for (const entry of timeline) {
    const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!byDate[date]) byDate[date] = {};
    byDate[date][entry.subject] = Math.round(parseFloat(String(entry.avg_score)));
  }
  return Object.entries(byDate).slice(-14).map(([date, subjects]) => ({ date, ...subjects }));
};

// ─── Student Dashboard Router ──────────────────────────────────────────────────
const StudentDashboard: React.FC = () => {
  return (
    <DashboardLayout title="Student Dashboard">
      <Routes>
        <Route path="/" element={<StudentHome />} />
        <Route path="/progress" element={<StudentProgress />} />
        <Route path="/materials" element={<StudentMaterials />} />
        <Route path="/achievements" element={<StudentAchievements />} />
        <Route path="/mira" element={<StudentMira />} />
      </Routes>
    </DashboardLayout>
  );
};

export default StudentDashboard;
