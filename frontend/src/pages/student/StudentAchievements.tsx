import React, { useState, useEffect } from 'react';
import { Award, Star } from 'lucide-react';
import { studentsApi } from '../../services/api';

const StudentAchievements: React.FC = () => {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentRes = await studentsApi.me();
        const studentId = studentRes.data.id;
        const overviewRes = await studentsApi.overview(studentId);
        
        setAchievements(overviewRes.data.achievements || []);
      } catch (err) {
        console.error('Failed to load achievements:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-full">
            <Award size={40} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">My Achievements</h2>
            <p className="text-yellow-100 mt-1">
              You have earned {achievements.length} badges! Keep up the great work.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-6 flex items-center gap-2 text-lg">
          <Star className="text-yellow-500" /> Earned Badges
        </h3>
        
        {achievements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {achievements.map((a) => (
              <div key={a.id} className="flex flex-col items-center justify-center text-center bg-gradient-to-b from-yellow-50 to-white dark:from-gray-800 dark:to-gray-900 border border-yellow-200 dark:border-yellow-800/30 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mb-4 ring-4 ring-yellow-50 dark:ring-gray-800">
                  <Award size={32} className="text-yellow-600 dark:text-yellow-400" />
                </div>
                <h4 className="font-bold text-gray-900 dark:text-white text-lg">{a.title}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{a.description}</p>
                <div className="mt-4 text-xs font-medium text-yellow-600 dark:text-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1 rounded-full">
                  Earned on {new Date(a.earned_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Award size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No achievements yet</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              Complete lessons, score high on assessments, and finish study materials to earn your first badge!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAchievements;
