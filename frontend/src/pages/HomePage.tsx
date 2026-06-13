import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';

const HomePage: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Show splash screen for 3 seconds
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="fixed inset-0 bg-blue-600 flex flex-col items-center justify-center transition-opacity duration-1000 z-50">
        <div 
          className="animate-bounce cursor-pointer transform transition-transform hover:scale-125 hover:rotate-12 active:scale-95"
          onClick={() => setShowSplash(false)}
          title="Click to enter"
        >
          <BookOpen className="w-24 h-24 text-white animate-pulse" />
        </div>
        <h1 className="mt-8 text-4xl font-extrabold text-white tracking-widest animate-pulse">
          EPN
        </h1>
        <p className="mt-4 text-blue-100 font-medium tracking-wider">
          Educational Productivity Network
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center transform hover:scale-105 transition-transform">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">EPN</span>
          </div>
          <div className="flex space-x-4">
            {isAuthenticated ? (
              <button
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
              >
                Go to Dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => navigate('/login')}
                  className="px-6 py-2 text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
                >
                  Log In
                </button>
                <button
                  onClick={() => navigate('/register')}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md"
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-5xl md:text-6xl font-extrabold text-gray-900 dark:text-white mb-6 tracking-tight">
          Welcome to the <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Future of Learning</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mb-10 leading-relaxed">
          The Educational Productivity Network connects students, teachers, and parents in a unified, AI-powered ecosystem designed to maximize potential.
        </p>
        {!isAuthenticated && (
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => navigate('/register')}
              className="px-8 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 hover:shadow-lg transform hover:-translate-y-1 transition-all text-lg font-semibold"
            >
              Get Started for Free
            </button>
            <button
              onClick={() => navigate('/about')}
              className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 hover:shadow-lg transform hover:-translate-y-1 transition-all text-lg font-semibold"
            >
              Learn More
            </button>
          </div>
        )}
      </main>

      {/* Decorative Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl" />
      </div>
    </div>
  );
};

export default HomePage;
