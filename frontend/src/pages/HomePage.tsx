import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { Brain, Sparkles, Target, Activity, Users, ArrowRight, Shield, Zap } from 'lucide-react';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const HomePage: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    // Fallback: hide splash after 12 seconds in case video fails or is very long
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 12000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <AnimatePresence>
        {showSplash && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50 cursor-pointer overflow-hidden"
            onClick={() => setShowSplash(false)}
          >
            <video 
              src="/splash-video.mp4"
              className="w-full h-full object-cover opacity-90"
              autoPlay
              muted
              playsInline
              onEnded={() => setShowSplash(false)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent pointer-events-none" />
            <div className="absolute bottom-12 text-white/60 text-sm font-medium tracking-[0.2em] animate-pulse pointer-events-none">
              Click anywhere to skip
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.5, delay: 0.5, ease: "easeOut" }}
        className="min-h-screen bg-[#0A0A0F] text-white overflow-hidden selection:bg-purple-500/30 relative"
      >
        {/* Dynamic Background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-600/20 blur-[120px] mix-blend-screen" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-600/20 blur-[120px] mix-blend-screen" />
          <div className="absolute top-[40%] left-[60%] w-[30%] h-[30%] rounded-full bg-indigo-500/10 blur-[100px] mix-blend-screen animate-pulse" />
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light pointer-events-none" />
        </div>

        {/* Header */}
        <header className="relative z-40 border-b border-white/5 bg-black/20 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => window.scrollTo({top: 0, behavior: 'smooth'})}>
              <div className="w-12 h-12 flex items-center justify-center transform hover:scale-110 transition-all duration-300 ease-out">
                <img src="/logo.svg" alt="EPN Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]" />
              </div>
              <span className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">EPN</span>
            </div>
            <div className="flex space-x-4 items-center">
              {isAuthenticated ? (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-full transition-all font-medium backdrop-blur-md flex items-center gap-2 group"
                >
                  Enter Dashboard
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>
              ) : (
                <>
                  <button
                    onClick={() => navigate('/login')}
                    className="px-6 py-2.5 text-white/80 hover:text-white transition-colors font-medium"
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all font-medium flex items-center gap-2 transform hover:-translate-y-0.5"
                  >
                    Sign Up Free
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="relative z-10 pt-20 pb-32">
          {/* Hero Section */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-20 pb-24">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              className="max-w-4xl mx-auto"
            >
              <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md mb-8 text-sm font-medium text-blue-200">
                <Sparkles size={16} className="text-blue-400" />
                <span>Next-Generation Adaptive Learning Engine</span>
              </motion.div>
              
              <motion.div variants={fadeInUp}>
                <h1 className="text-6xl md:text-8xl font-extrabold mb-8 tracking-tight leading-[1.1]">
                  Education, <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                    Redefined by AI.
                  </span>
                </h1>
              </motion.div>

              <motion.p variants={fadeInUp} className="text-xl md:text-2xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed font-light">
                The Educational Productivity Network integrates a 5-agent AI architecture to deliver real-time cognitive profiling, personalized micro-tasks, and deep analytics.
              </motion.p>

              <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <button
                  onClick={() => navigate('/register')}
                  className="px-8 py-4 w-full sm:w-auto bg-white text-black rounded-full hover:bg-gray-100 hover:scale-105 transition-all text-lg font-bold flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                >
                  Start Your Journey <ArrowRight size={20} />
                </button>
                <button
                  onClick={() => navigate('/about')}
                  className="px-8 py-4 w-full sm:w-auto bg-white/5 border border-white/10 rounded-full hover:bg-white/10 backdrop-blur-md transition-all text-lg font-medium"
                >
                  Explore the Technology
                </button>
              </motion.div>
            </motion.div>
          </section>

          {/* Features Bento Grid */}
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
            >
              {/* Large Feature */}
              <motion.div variants={fadeInUp} className="md:col-span-2 bg-gradient-to-br from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-lg relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px] group-hover:bg-blue-500/30 transition-colors" />
                <Brain className="w-12 h-12 text-blue-400 mb-6" />
                <h3 className="text-3xl font-bold mb-4">Autonomous AI Teachers</h3>
                <p className="text-gray-400 text-lg max-w-md leading-relaxed">
                  Interact with state-of-the-art conversational agents that dynamically adapt to your emotional state and learning pace.
                </p>
              </motion.div>

              {/* Square Feature */}
              <motion.div variants={fadeInUp} className="bg-gradient-to-bl from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg relative overflow-hidden group">
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-[50px] group-hover:bg-purple-500/30 transition-colors" />
                <Activity className="w-10 h-10 text-purple-400 mb-6" />
                <h3 className="text-2xl font-bold mb-3">Cognitive Profiling</h3>
                <p className="text-gray-400 leading-relaxed">
                  Deep analytics that map knowledge structures rather than just test scores.
                </p>
              </motion.div>

              {/* Square Feature */}
              <motion.div variants={fadeInUp} className="bg-gradient-to-tr from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-lg relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-[50px] group-hover:bg-indigo-500/30 transition-colors" />
                <Target className="w-10 h-10 text-indigo-400 mb-6" />
                <h3 className="text-2xl font-bold mb-3">Micro-Tasks</h3>
                <p className="text-gray-400 leading-relaxed">
                  Continuous, low-stakes assessment built invisibly into the learning flow.
                </p>
              </motion.div>

              {/* Large Feature */}
              <motion.div variants={fadeInUp} className="md:col-span-2 bg-gradient-to-tl from-white/10 to-white/5 border border-white/10 rounded-3xl p-8 md:p-12 backdrop-blur-lg relative overflow-hidden group flex flex-col md:flex-row gap-8 items-center">
                <div className="flex-1">
                  <Shield className="w-12 h-12 text-teal-400 mb-6" />
                  <h3 className="text-3xl font-bold mb-4">Immutable Blockchain Ledger</h3>
                  <p className="text-gray-400 text-lg leading-relaxed">
                    Every milestone and achievement is permanently recorded, providing verifiable credentials and unparalleled data security.
                  </p>
                </div>
                <div className="w-full md:w-1/3 aspect-square rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center p-6 relative">
                  <div className="absolute inset-0 bg-teal-500/10 blur-xl rounded-full animate-pulse" />
                  <div className="w-full h-full border border-teal-500/30 rounded-xl flex items-center justify-center bg-black/40 backdrop-blur-sm z-10">
                    <Zap className="text-teal-400 w-16 h-16" />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </section>

          {/* Social Proof / Footer CTA */}
          <section className="border-t border-white/10 bg-black/40 backdrop-blur-2xl py-20 mt-12">
            <div className="max-w-7xl mx-auto px-4 text-center">
              <h2 className="text-3xl font-bold mb-8">Ready to transform education?</h2>
              <button
                onClick={() => navigate('/register')}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:shadow-[0_0_30px_rgba(124,58,237,0.5)] transition-all text-lg font-bold inline-flex items-center gap-2 transform hover:-translate-y-1"
              >
                Join the Network <Users size={20} />
              </button>
            </div>
          </section>
        </div>
      </motion.div>
    </>
  );
};

export default HomePage;
