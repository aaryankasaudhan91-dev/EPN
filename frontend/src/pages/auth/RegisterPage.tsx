/**
 * Registration Page
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Brain, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    role: 'student', grade: '9', parentEmail: '', teacherName: '', useAiTeacher: false,
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        grade: formData.grade,
        parentEmail: formData.parentEmail || undefined,
        teacherName: formData.useAiTeacher ? 'Mira' : (formData.teacherName || undefined),
      });
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string; errors?: Array<{ msg: string }> } } };
      const apiErrors = axiosErr.response?.data?.errors;
      setError(apiErrors ? apiErrors[0].msg : axiosErr.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 mb-4 transform hover:scale-105 transition-all duration-500 ease-out">
            <img src="/logo.svg" alt="EPN Logo" className="w-full h-full object-contain drop-shadow-xl" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Create your account</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1 text-sm">Join the EPN learning platform</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 p-8">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4 text-sm text-red-700 dark:text-red-400">
              <AlertCircle size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <input name="name" type="text" value={formData.name} onChange={handleChange} className="input" placeholder="Your full name" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input name="email" type="email" value={formData.email} onChange={handleChange} className="input" placeholder="you@example.com" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className="input">
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="parent">Parent/Guardian</option>
              </select>
            </div>

            {formData.role === 'student' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Grade</label>
                  <select name="grade" value={formData.grade} onChange={handleChange} className="input">
                    {['6','7','8','9','10','11','12'].map(g => (
                      <option key={g} value={g}>Grade {g}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Parent Email <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input name="parentEmail" type="email" value={formData.parentEmail} onChange={handleChange} className="input" placeholder="parent@example.com" />
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-3 mb-3">
                    <input 
                      type="checkbox" 
                      id="useAiTeacher"
                      name="useAiTeacher" 
                      checked={formData.useAiTeacher} 
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <label htmlFor="useAiTeacher" className="text-sm font-medium text-blue-900 dark:text-blue-100 cursor-pointer">
                      I don't have a teacher. Assign me to AI Teacher "Mira" 🤖
                    </label>
                  </div>
                  
                  {!formData.useAiTeacher && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Teacher Name <span className="text-red-500">*</span></label>
                      <input name="teacherName" type="text" value={formData.teacherName} onChange={handleChange} className="input" placeholder="Enter your teacher's exact name" required={formData.role === 'student' && !formData.useAiTeacher} />
                    </div>
                  )}
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
              <input name="password" type="password" value={formData.password} onChange={handleChange} className="input" placeholder="Min. 8 characters" required />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
              <input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleChange} className="input" placeholder="Repeat password" required />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </span>
              ) : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
            Already have an account?{' '}
            <Link to="/login" className="text-blue-600 dark:text-blue-400 hover:underline font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
