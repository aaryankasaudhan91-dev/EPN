import React, { useState } from 'react';
import { Brain, Sparkles, Send, Loader2, BookOpen, AlertCircle } from 'lucide-react';
import { contentApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';

const StudentMira: React.FC = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    subject: '',
    contentType: 'worksheet',
    syllabus: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.syllabus) {
      setError('Please provide both the subject and the syllabus details.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      await contentApi.miraGenerate({
        subject: formData.subject,
        contentType: formData.contentType,
        syllabus: formData.syllabus,
      });

      setSuccessMsg('Your study material has been generated and approved successfully!');
      
      // Clear form
      setFormData({
        subject: '',
        contentType: 'worksheet',
        syllabus: '',
      });
      
      // Redirect to materials after short delay
      setTimeout(() => {
        navigate('/student/materials');
      }, 2000);
      
    } catch (err: any) {
      console.error('Error generating content with Mira:', err);
      setError(err.response?.data?.error || 'Failed to generate content. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Brain className="text-purple-500" size={28} />
            AI Teacher Mira
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Provide your syllabus and I will instantly generate study materials for you.
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col md:flex-row">
        {/* Mira's Avatar and Intro */}
        <div className="bg-gradient-to-br from-purple-600 to-blue-600 p-8 md:w-1/3 flex flex-col justify-center items-center text-center text-white">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-6 border-4 border-white/30">
            <Brain size={48} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold mb-2 flex items-center justify-center gap-2">
            Hi, I'm Mira <Sparkles size={20} className="text-yellow-300" />
          </h2>
          <p className="text-purple-100 mb-6">
            I'm your dedicated AI teacher. Tell me what you're studying today, and I'll create personalized, high-quality materials to help you learn faster.
          </p>
        </div>

        {/* Input Form */}
        <div className="p-8 md:w-2/3">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
              <AlertCircle size={20} className="text-red-600 dark:text-red-400 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-start gap-3">
              <BookOpen size={20} className="text-green-600 dark:text-green-400 mt-0.5" />
              <p className="text-sm text-green-800 dark:text-green-300">{successMsg}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Subject Name
                </label>
                <input
                  type="text"
                  name="subject"
                  value={formData.subject}
                  onChange={handleChange}
                  placeholder="e.g., Biology, Physics, History"
                  className="input w-full"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Material Type
                </label>
                <select
                  name="contentType"
                  value={formData.contentType}
                  onChange={handleChange}
                  className="input w-full"
                >
                  <option value="worksheet">Practice Worksheet</option>
                  <option value="quiz">Interactive Quiz</option>
                  <option value="flashcard">Flashcards</option>
                  <option value="explanation">Detailed Explanation</option>
                  <option value="revision_notes">Revision Notes</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Your Syllabus / Topics to Cover
              </label>
              <textarea
                name="syllabus"
                value={formData.syllabus}
                onChange={handleChange}
                placeholder="Paste your syllabus, chapters, or specific topics you want to learn here..."
                rows={5}
                className="input w-full resize-none"
                required
              />
              <p className="text-xs text-gray-500 mt-2">
                The more detailed your syllabus, the more accurate and helpful the materials will be!
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2 text-lg"
            >
              {loading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Mira is thinking and generating...
                </>
              ) : (
                <>
                  <Send size={20} />
                  Generate Material
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default StudentMira;
