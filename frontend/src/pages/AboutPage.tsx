/**
 * About Us Page — Scrollytelling
 *
 * A public, scroll-driven storytelling page that covers:
 *  1. Hero / Mission statement
 *  2. The Problem EPN solves
 *  3. The 5 AI Agents (Monitor, Diagnostic, Curriculum Planner, Content Gen, Orchestrator)
 *  4. Human-in-the-Loop (HITL) safety
 *  5. The Team
 *  6. Call to action
 *
 * Animations are driven by IntersectionObserver via the useScrollReveal hook —
 * no heavy animation library required.  A sticky progress bar at the top
 * shows how far the user has scrolled.
 */

import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Brain, Eye, Stethoscope, BookOpen, Sparkles, Network,
  Shield, Users, ArrowRight, CheckCircle, ChevronDown,
  GraduationCap, BarChart2, Lightbulb,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import useScrollReveal from '../hooks/useScrollReveal';

// ─── Scroll-progress hook ──────────────────────────────────────────────────────

function useScrollProgress() {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    const onScroll = () => {
      const el = document.documentElement;
      const scrolled = el.scrollTop || document.body.scrollTop;
      const total = el.scrollHeight - el.clientHeight;
      setProgress(total > 0 ? (scrolled / total) * 100 : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return progress;
}

// ─── Reveal section wrapper ────────────────────────────────────────────────────

const RevealSection: React.FC<{
  children: React.ReactNode;
  animation?: 'fade' | 'slide-up' | 'slide-left' | 'slide-right';
  delay?: number;
  className?: string;
}> = ({ children, animation = 'slide-up', delay = 0, className = '' }) => {
  const ref = useScrollReveal<HTMLDivElement>({ threshold: 0.12 });
  return (
    <div
      ref={ref}
      className={`scroll-reveal-${animation} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// ─── Agent card data ───────────────────────────────────────────────────────────

const agents = [
  {
    name: 'Monitor Agent',
    icon: <Eye size={28} />,
    color: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    description:
      'Continuously tracks student engagement, attendance, and performance signals in real time. Flags anomalies and triggers the Diagnostic Agent when a student shows signs of struggle.',
    capabilities: ['Real-time progress tracking', 'Anomaly detection', 'Engagement scoring', 'Risk flagging'],
  },
  {
    name: 'Diagnostic Agent',
    icon: <Stethoscope size={28} />,
    color: 'from-purple-500 to-purple-700',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    description:
      'Analyses assessment data and knowledge-graph gaps to pinpoint exactly where a student is struggling. Produces a structured diagnostic report that feeds the Curriculum Planner.',
    capabilities: ['Knowledge-gap analysis', 'Misconception identification', 'Root-cause mapping', 'Diagnostic reports'],
  },
  {
    name: 'Curriculum Planner',
    icon: <BookOpen size={28} />,
    color: 'from-green-500 to-green-700',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    description:
      'Generates personalised, adaptive learning plans based on diagnostic findings, curriculum standards, and each student\'s learning profile. All plans require teacher approval before delivery.',
    capabilities: ['Personalised learning paths', 'Standards alignment', 'Adaptive sequencing', 'HITL approval gate'],
  },
  {
    name: 'Content Generation Agent',
    icon: <Sparkles size={28} />,
    color: 'from-orange-500 to-orange-700',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800',
    description:
      'Creates quizzes, worksheets, flashcards, explanations, and revision notes tailored to each student\'s level and learning style. Content is reviewed and approved by teachers before release.',
    capabilities: ['Quiz & worksheet generation', 'Flashcard creation', 'Adaptive difficulty', 'Multi-format output'],
  },
  {
    name: 'Orchestrator',
    icon: <Network size={28} />,
    color: 'from-red-500 to-red-700',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    description:
      'The central coordinator that manages the workflow between all agents, enforces policy constraints, maintains audit logs, and ensures the system operates within approved autonomy boundaries.',
    capabilities: ['Agent coordination', 'Policy enforcement', 'Audit logging', 'Autonomy management'],
  },
];

// ─── Team data ─────────────────────────────────────────────────────────────────

const team = [
  { name: 'Aaryan Kasaudhan', role: 'Founder & CEO', initials: 'AK', gradient: 'from-blue-500 to-purple-600', bio: 'EdTech researcher in adaptive learning systems.' },
  { name: 'Rudra Khargaokar', role: 'CTO', initials: 'RK', gradient: 'from-purple-500 to-pink-600', bio: 'AI/ML engineer specialising in educational NLP and knowledge graphs.' },
  { name: 'Jitendra Chaudhary', role: 'Head of Pedagogy', initials: 'JC', gradient: 'from-green-500 to-teal-600', bio: 'Former teacher and curriculum designer with a passion for equity in education.' },
  { name: 'Akshay Paswan', role: 'Lead Engineer', initials: 'AP', gradient: 'from-orange-500 to-red-600', bio: 'Full-stack engineer building the EPN platform from the ground up.' },
  { name: 'Rupesh Gore', role: 'Data Scientist', initials: 'RG', gradient: 'from-teal-500 to-blue-600', bio: 'Specialises in learning analytics and predictive modelling for at-risk students.' },
];

// ─── Main Component ────────────────────────────────────────────────────────────

const AboutPage: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const progress = useScrollProgress();
  const heroRef = useRef<HTMLDivElement>(null);

  const scrollToContent = () => {
    const el = document.getElementById('mission');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-gray-900 dark:text-white">

      {/* ── Sticky progress bar ──────────────────────────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 transition-all duration-100"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Sticky nav ───────────────────────────────────────────────────────── */}
      <nav className="fixed top-1 left-0 right-0 z-40 flex items-center justify-between px-6 py-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain size={16} className="text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-white">EPN</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link
            to="/login"
            className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline"
          >
            Sign In
          </Link>
          <Link
            to="/register"
            className="text-sm font-medium px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section
        ref={heroRef}
        className="relative min-h-screen flex flex-col items-center justify-center text-center px-6 pt-20 overflow-hidden"
      >
        {/* Background gradient blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pink-400/10 dark:bg-pink-600/5 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium mb-6">
            <Sparkles size={14} />
            AI-Powered Adaptive Learning
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
            Every student deserves a personalised education
          </h1>

          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            The Educational Productivity Network (EPN) uses five collaborative AI agents to
            monitor, diagnose, plan, and deliver adaptive learning — always with a human teacher
            in the loop.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/25"
            >
              Get Started Free <ArrowRight size={18} />
            </Link>
            <button
              onClick={scrollToContent}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-900 dark:text-white font-semibold rounded-xl border border-gray-200 dark:border-gray-700 transition-colors"
            >
              Learn More <ChevronDown size={18} />
            </button>
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown size={24} className="text-gray-400" />
        </div>
      </section>

      {/* ── Mission ──────────────────────────────────────────────────────────── */}
      <section id="mission" className="py-24 px-6 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-5xl mx-auto">
          <RevealSection animation="slide-up">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Our Mission</span>
              <h2 className="text-4xl font-bold mt-2 mb-4">Closing the learning gap with AI</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                Millions of students fall behind not because they lack ability, but because
                one-size-fits-all education can't adapt to their individual needs. EPN changes that.
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <GraduationCap size={32} className="text-blue-500" />,
                title: 'Personalised at Scale',
                desc: 'AI-generated learning plans and content tailored to each student\'s knowledge gaps, learning style, and pace — for every student, every day.',
              },
              {
                icon: <Shield size={32} className="text-purple-500" />,
                title: 'Safe & Accountable',
                desc: 'Every AI decision is logged, auditable, and requires human approval. Teachers stay in control; AI amplifies their impact.',
              },
              {
                icon: <BarChart2 size={32} className="text-green-500" />,
                title: 'Evidence-Driven',
                desc: 'Real-time analytics and blockchain-verified achievement records give parents and administrators transparent insight into student progress.',
              },
            ].map((item, i) => (
              <RevealSection key={item.title} animation="slide-up" delay={i * 150}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 h-full">
                  <div className="mb-4">{item.icon}</div>
                  <h3 className="text-lg font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Problem ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <RevealSection animation="slide-left">
              <div>
                <span className="text-sm font-semibold text-red-500 uppercase tracking-widest">The Problem</span>
                <h2 className="text-4xl font-bold mt-2 mb-6">Traditional education can't keep up</h2>
                <div className="space-y-4">
                  {[
                    'A single teacher manages 30+ students with vastly different needs',
                    'Knowledge gaps compound silently until they become crises',
                    'Content is rarely adapted to individual learning styles',
                    'Parents and administrators lack real-time visibility',
                    'At-risk students are identified too late to intervene effectively',
                  ].map(point => (
                    <div key={point} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-red-500" />
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 text-sm">{point}</p>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>

            <RevealSection animation="slide-right">
              {/* Sticky visual: stat cards */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { value: '40%', label: 'of students fall behind by Grade 4', color: 'text-red-500' },
                  { value: '1:30', label: 'average teacher-to-student ratio', color: 'text-orange-500' },
                  { value: '68%', label: 'of teachers report insufficient time for personalisation', color: 'text-yellow-500' },
                  { value: '3×', label: 'better outcomes with adaptive learning', color: 'text-green-500' },
                ].map(stat => (
                  <div key={stat.label} className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700">
                    <p className={`text-3xl font-extrabold ${stat.color}`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-snug">{stat.label}</p>
                  </div>
                ))}
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ── The 5 AI Agents ──────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-6xl mx-auto">
          <RevealSection animation="slide-up">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-widest">The Technology</span>
              <h2 className="text-4xl font-bold mt-2 mb-4">Five AI agents, one mission</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                EPN's agents work in concert — each specialised, each accountable, all coordinated
                by the Orchestrator to deliver a seamless adaptive learning experience.
              </p>
            </div>
          </RevealSection>

          {/* Agent pipeline diagram */}
          <RevealSection animation="fade" delay={200}>
            <div className="flex flex-wrap justify-center items-center gap-2 mb-12 text-xs font-medium text-gray-500 dark:text-gray-400">
              {agents.map((agent, i) => (
                <React.Fragment key={agent.name}>
                  <div className={`px-3 py-1.5 rounded-full bg-gradient-to-r ${agent.color} text-white text-xs font-semibold`}>
                    {agent.name}
                  </div>
                  {i < agents.length - 1 && <ArrowRight size={14} className="text-gray-400" />}
                </React.Fragment>
              ))}
            </div>
          </RevealSection>

          {/* Agent cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {agents.map((agent, i) => (
              <RevealSection key={agent.name} animation="slide-up" delay={i * 100}>
                <div className={`${agent.bg} border ${agent.border} rounded-2xl p-6 h-full`}>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agent.color} flex items-center justify-center text-white mb-4`}>
                    {agent.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{agent.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 leading-relaxed">{agent.description}</p>
                  <ul className="space-y-1.5">
                    {agent.capabilities.map(cap => (
                      <li key={cap} className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                        <CheckCircle size={12} className="text-green-500 flex-shrink-0" />
                        {cap}
                      </li>
                    ))}
                  </ul>
                </div>
              </RevealSection>
            ))}

            {/* Orchestrator spans full width on large screens */}
          </div>
        </div>
      </section>

      {/* ── HITL Safety ──────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <RevealSection animation="slide-right">
              {/* Visual: approval flow */}
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-3xl p-8 border border-blue-200 dark:border-blue-800">
                <h4 className="font-bold text-gray-900 dark:text-white mb-6 text-center">HITL Approval Flow</h4>
                {[
                  { step: '1', label: 'AI generates content or plan', icon: <Brain size={16} />, color: 'bg-blue-500' },
                  { step: '2', label: 'Submitted for teacher review', icon: <Eye size={16} />, color: 'bg-purple-500' },
                  { step: '3', label: 'Teacher approves or rejects', icon: <CheckCircle size={16} />, color: 'bg-green-500' },
                  { step: '4', label: 'Delivered to student', icon: <GraduationCap size={16} />, color: 'bg-orange-500' },
                  { step: '5', label: 'Logged to immutable ledger', icon: <Shield size={16} />, color: 'bg-gray-500' },
                ].map((item, i) => (
                  <div key={item.step} className="flex items-center gap-4 mb-4 last:mb-0">
                    <div className={`w-8 h-8 rounded-full ${item.color} flex items-center justify-center text-white flex-shrink-0`}>
                      {item.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{item.label}</p>
                    </div>
                    {i < 4 && (
                      <div className="absolute ml-4 mt-8 w-0.5 h-4 bg-gray-300 dark:bg-gray-600" style={{ marginLeft: '15px', marginTop: '32px', position: 'relative' }} />
                    )}
                  </div>
                ))}
              </div>
            </RevealSection>

            <RevealSection animation="slide-left">
              <div>
                <span className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-widest">Safety First</span>
                <h2 className="text-4xl font-bold mt-2 mb-6">Human-in-the-Loop by design</h2>
                <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                  EPN's AI agents are powerful, but they never act alone. Every learning plan and
                  piece of generated content must be reviewed and approved by a qualified teacher
                  before it reaches a student.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: <Shield size={18} className="text-green-500" />, title: 'Configurable autonomy', desc: 'Admins set autonomy levels per agent — from fully supervised to semi-autonomous.' },
                    { icon: <Lightbulb size={18} className="text-blue-500" />, title: 'Full audit trail', desc: 'Every AI action is logged with actor, timestamp, and policy version for complete accountability.' },
                    { icon: <CheckCircle size={18} className="text-purple-500" />, title: 'Blockchain verification', desc: 'Key events are recorded on an immutable ledger, giving parents and auditors tamper-proof records.' },
                  ].map(item => (
                    <div key={item.title} className="flex items-start gap-3">
                      <div className="mt-0.5">{item.icon}</div>
                      <div>
                        <p className="font-semibold text-sm">{item.title}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ── Team ─────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 bg-gray-50 dark:bg-gray-800/50">
        <div className="max-w-5xl mx-auto">
          <RevealSection animation="slide-up">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-widest">The Team</span>
              <h2 className="text-4xl font-bold mt-2 mb-4">Built by engineers</h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 max-w-xl mx-auto">
                Our diverse team combines deep expertise in education, AI, and software engineering
                to build a platform that truly serves students.
              </p>
            </div>
          </RevealSection>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member, i) => (
              <RevealSection key={member.name} animation="slide-up" delay={i * 80}>
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-400 dark:border-gray-600 text-center">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${member.gradient} flex items-center justify-center text-white text-xl font-bold mx-auto mb-4`}>
                    {member.initials}
                  </div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{member.name}</h3>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-2">{member.role}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">{member.bio}</p>
                </div>
              </RevealSection>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <RevealSection animation="slide-up">
          <div className="max-w-3xl mx-auto text-center">
            <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 rounded-3xl p-12 text-white shadow-2xl">
              <Users size={48} className="mx-auto mb-6 opacity-90" />
              <h2 className="text-4xl font-extrabold mb-4">Ready to transform learning?</h2>
              <p className="text-blue-100 text-lg mb-8 max-w-xl mx-auto">
                Join thousands of students, teachers, and parents already using EPN to unlock
                every student's potential.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white text-blue-700 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
                >
                  Get Started Free <ArrowRight size={18} />
                </Link>
                <Link
                  to="/help"
                  className="inline-flex items-center gap-2 px-8 py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl border border-white/30 transition-colors"
                >
                  Visit Help Centre
                </Link>
              </div>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="py-8 px-6 border-t border-gray-200 dark:border-gray-700 text-center text-sm text-gray-500 dark:text-gray-400">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Brain size={16} className="text-blue-500" />
          <span className="font-semibold text-gray-900 dark:text-white">EPN</span>
          <span>— Educational Productivity Network</span>
        </div>
        <p>© {new Date().getFullYear()} EPN. All rights reserved. &nbsp;·&nbsp;
          <Link to="/help" className="hover:underline">Help</Link> &nbsp;·&nbsp;
          <Link to="/about" className="hover:underline">About</Link> &nbsp;·&nbsp;
          <a href="mailto:support@epn.edu" className="hover:underline">support@epn.edu</a>
        </p>
      </footer>

    </div>
  );
};

export default AboutPage;
