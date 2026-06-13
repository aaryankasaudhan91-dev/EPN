import React, { useState, useEffect } from 'react';
import { BookOpen, Brain, Download, ExternalLink, Search, Clock } from 'lucide-react';
import { studentsApi, contentApi } from '../../services/api';

const contentTypeConfig: Record<string, { icon: string; color: string; label: string }> = {
  quiz: { icon: '📝', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-600', label: 'Quiz' },
  worksheet: { icon: '📄', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-600', label: 'Worksheet' },
  flashcard: { icon: '🃏', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-600', label: 'Flashcards' },
  explanation: { icon: '💡', color: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-600', label: 'Explanation' },
  revision_notes: { icon: '📋', color: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800 text-orange-600', label: 'Revision Notes' },
  study_plan: { icon: '🗓️', color: 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800 text-pink-600', label: 'Study Plan' },
};

const StudentMaterials: React.FC = () => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    const loadData = async () => {
      try {
        const studentRes = await studentsApi.me();
        const studentId = studentRes.data.id;
        
        // Fetch only approved content for this student
        const contentRes = await contentApi.list({ studentId, approvalStatus: 'approved', limit: 50 });
        setMaterials(contentRes.data.content || []);
      } catch (err) {
        console.error('Failed to load study materials:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = (m.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) || 
                          (m.topic?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
                          (m.subject?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || m.content_type === filterType;
    return matchesSearch && matchesType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-white/20 rounded-full">
            <Brain size={40} className="text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">My Study Materials</h2>
            <p className="text-blue-100 mt-1">
              Access your personalized AI-generated worksheets, quizzes, and notes.
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-8">
          <div className="relative w-full md:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search subjects, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full md:w-auto rounded-lg border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Content Types</option>
            <option value="worksheet">Worksheets</option>
            <option value="quiz">Quizzes</option>
            <option value="flashcard">Flashcards</option>
            <option value="explanation">Explanations</option>
            <option value="revision_notes">Revision Notes</option>
          </select>
        </div>

        {filteredMaterials.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((item) => {
              const config = contentTypeConfig[item.content_type] || contentTypeConfig.quiz;
              return (
                <div key={item.id} className="group flex flex-col justify-between bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  <div className={`h-2 w-full ${config.color.split(' ')[0]}`}></div>
                  <div className="p-5 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-md flex items-center gap-1.5 ${config.color}`}>
                        <span>{config.icon}</span> {config.label}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2 line-clamp-2">
                      {item.title || `${item.topic} ${config.label}`}
                    </h4>
                    
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-4">
                      <BookOpen size={14} className="text-gray-400" />
                      <span>{item.subject}</span>
                      <span className="text-gray-300 dark:text-gray-600">&bull;</span>
                      <span className="truncate">{item.topic}</span>
                    </div>
                    {item.deadline && (
                      <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 mt-2 font-medium bg-red-50 dark:bg-red-900/10 p-1.5 rounded-lg border border-red-100 dark:border-red-900/30 w-fit">
                        <Clock size={12} />
                        <span>Due: {new Date(item.deadline).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                      Approved by Teacher
                    </span>
                    <button className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium text-sm flex items-center gap-1">
                      Open <ExternalLink size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No materials found</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-sm mx-auto">
              {searchQuery || filterType !== 'all' 
                ? "We couldn't find any materials matching your filters. Try adjusting your search."
                : "You don't have any approved study materials yet. Ask your teacher to generate some for you!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMaterials;
