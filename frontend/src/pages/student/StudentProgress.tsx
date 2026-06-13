import React, { useState, useEffect } from 'react';
import { TrendingUp, Target, Activity, CheckCircle, AlertTriangle } from 'lucide-react';
import { studentsApi, analyticsApi, assessmentsApi, knowledgeGraphApi } from '../../services/api';
import PerformanceChart from '../../components/charts/PerformanceChart';
import SubjectRadarChart from '../../components/charts/SubjectRadarChart';
import MasteryBar from '../../components/ui/MasteryBar';

const StudentProgress: React.FC = () => {
  const [overview, setOverview] = useState<any | null>(null);
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [weakAreas, setWeakAreas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentRes = await studentsApi.me();
        const studentId = studentRes.data.id;

        const [overviewRes, analyticsRes, timelineRes, weakAreasRes] = await Promise.all([
          studentsApi.overview(studentId),
          analyticsApi.student(studentId),
          assessmentsApi.timeline(studentId),
          knowledgeGraphApi.weakAreas(studentId)
        ]);

        setOverview(overviewRes.data);
        setAnalytics(analyticsRes.data);
        setTimeline(timelineRes.data.timeline || []);
        setWeakAreas(weakAreasRes.data.weakAreas || []);
      } catch (err) {
        console.error('Failed to load progress data:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const student = overview?.student || {};
  const subjectBreakdown = analytics?.subjectBreakdown || [];
  const subjectPerf = overview?.subjectPerformance || [];

  // Build timeline chart data
  const chartData = (() => {
    const byDate: Record<string, Record<string, number>> = {};
    for (const entry of timeline) {
      const date = new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!byDate[date]) byDate[date] = {};
      byDate[date][entry.subject] = Math.round(parseFloat(String(entry.avg_score)));
    }
    return Object.entries(byDate).slice(-20).map(([date, subjects]) => ({ date, ...subjects }));
  })();

  // Build radar chart data
  const radarData = subjectBreakdown.map((s: any) => ({
    subject: s.subject,
    mastery: Math.round(parseFloat(String(s.avg_score)))
  }));

  const overallMastery = Math.round(parseFloat(String(student.overall_mastery || 0)));

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-full">
            <TrendingUp size={40} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">My Progress Analysis</h2>
            <p className="text-indigo-100 mt-1">
              Dive deep into your performance across all subjects.
            </p>
          </div>
        </div>
      </div>

      {/* High level stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <Target className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Mastery</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overallMastery}%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
            <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Subjects Mastered</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {subjectBreakdown.filter((s: any) => parseFloat(String(s.avg_score)) >= 80).length}
            </p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-orange-100 dark:bg-orange-900/50 flex items-center justify-center">
            <AlertTriangle className="text-orange-600 dark:text-orange-400" size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Areas to Review</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{weakAreas.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 text-lg">
              <Activity className="text-blue-500" /> Historical Performance
            </h3>
            {chartData.length > 0 ? (
              <PerformanceChart data={chartData} height={320} />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                Not enough historical data to show timeline.
              </div>
            )}
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-lg">
              <AlertTriangle className="text-orange-500" /> Focus Areas
            </h3>
            {weakAreas.length > 0 ? (
              <div className="space-y-3">
                {weakAreas.map((area: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-xl">
                    <div>
                      <h4 className="font-semibold text-gray-900 dark:text-white">{area.concept}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{area.subject}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider block mb-1">Mastery</span>
                      <span className="text-lg font-bold text-orange-600 dark:text-orange-400">{Math.round(area.masteryLevel)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle size={32} className="mx-auto text-green-500 mb-3" />
                <p className="text-gray-900 dark:text-white font-medium">No critical weak areas detected!</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">You're maintaining a great understanding across all subjects.</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2 text-lg">
              <Target className="text-purple-500" /> Subject Balance
            </h3>
            {radarData.length > 0 ? (
              <SubjectRadarChart data={radarData} height={280} />
            ) : (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
                No subject data available.
              </div>
            )}
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4 text-lg">Detailed Breakdown</h3>
            <div className="space-y-5">
              {subjectPerf.map((sub: any, idx: number) => (
                <MasteryBar
                  key={idx}
                  label={sub.subject}
                  value={parseFloat(String(sub.avg_score))}
                />
              ))}
              {subjectPerf.length === 0 && (
                <p className="text-gray-400 text-sm text-center py-4">No assessments yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProgress;
