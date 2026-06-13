/**
 * Help / Help Center Page
 *
 * Sections:
 *  1. Hero / search bar (decorative — no backend search yet)
 *  2. FAQ accordion — common questions about EPN
 *  3. Contact / feedback form (mailto fallback; backend endpoint optional)
 *  4. Embedded AI chatbot (ChatBot component in inline mode)
 *  5. Floating ChatBot widget (available on all pages via App.tsx)
 *
 * This page is accessible to both authenticated and unauthenticated users.
 * When accessed from within the dashboard it renders inside DashboardLayout;
 * when accessed publicly it renders a standalone layout.
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  HelpCircle, ChevronDown, ChevronUp, Send, Mail,
  MessageCircle, BookOpen, Shield, Brain, Users,
  CheckCircle, AlertCircle, Loader, Sun, Moon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import DashboardLayout from '../components/layout/DashboardLayout';
import ChatBot from '../components/ui/ChatBot';

// ─── FAQ data ──────────────────────────────────────────────────────────────────

interface FaqItem {
  question: string;
  answer: string;
  category: string;
}

const FAQ_ITEMS: FaqItem[] = [
  // Getting started
  {
    category: 'Getting Started',
    question: 'How do I create an EPN account?',
    answer: 'Click "Get Started" on the login page and fill in your details. Select your role (Student, Teacher, Parent, or Admin). Your account will be active immediately. Demo accounts are available for testing: student@epn.edu, teacher@epn.edu, parent@epn.edu, admin@epn.edu (password: Password123!).',
  },
  {
    category: 'Getting Started',
    question: 'What roles are available on EPN?',
    answer: 'EPN has four roles: **Student** (access personalised learning plans and materials), **Teacher** (monitor students, approve AI content, generate materials), **Parent** (view child\'s progress and verify achievements), and **Admin** (manage users, configure AI agents, view system analytics).',
  },
  // Learning & AI
  {
    category: 'Learning & AI',
    question: 'How does the AI personalise my learning plan?',
    answer: 'The Diagnostic Agent analyses your assessment results and knowledge graph to identify gaps. The Curriculum Planner then generates a personalised learning plan targeting those gaps. Your teacher reviews and approves the plan before it\'s delivered to you.',
  },
  {
    category: 'Learning & AI',
    question: 'What are the 5 AI agents?',
    answer: '1. **Monitor Agent** — tracks your progress in real time. 2. **Diagnostic Agent** — identifies knowledge gaps from assessments. 3. **Curriculum Planner** — creates personalised learning plans. 4. **Content Generation Agent** — produces quizzes, worksheets, and flashcards. 5. **Orchestrator** — coordinates all agents and enforces policies.',
  },
  {
    category: 'Learning & AI',
    question: 'Is AI-generated content safe and accurate?',
    answer: 'Yes. All AI-generated content and learning plans go through a Human-in-the-Loop (HITL) review process. A qualified teacher must approve every piece of content before it reaches students. Every action is also logged to an immutable audit trail.',
  },
  // Account & Settings
  {
    category: 'Account & Settings',
    question: 'How do I change my password?',
    answer: 'Go to **Profile** (accessible from the sidebar) and scroll to the "Change Password" section. Enter your current password and your new password (minimum 8 characters), then click "Update Password".',
  },
  {
    category: 'Account & Settings',
    question: 'How do I switch between dark and light mode?',
    answer: 'Click the sun/moon icon in the top header bar, or go to **Settings → Appearance** and click the theme toggle. Your preference is saved automatically.',
  },
  {
    category: 'Account & Settings',
    question: 'Can I change my notification preferences?',
    answer: 'Yes. Go to **Settings → Notifications** to toggle email alerts, push notifications, weekly digest, achievement alerts, and (for teachers) plan approval alerts.',
  },
  // Teachers & Admins
  {
    category: 'Teachers & Admins',
    question: 'How do I approve AI-generated content?',
    answer: 'In the Teacher Portal, navigate to **Approvals**. You\'ll see all pending AI-generated content and learning plans. Click on an item to review it, then choose to Approve or Reject (with a reason). Approved content is immediately available to the relevant student.',
  },
  {
    category: 'Teachers & Admins',
    question: 'How do I configure AI agent autonomy as an admin?',
    answer: 'Go to **Admin → AI Configuration**. You can set autonomy levels for each agent (Supervised, Semi-Autonomous, or Autonomous) and configure budget limits. Changes take effect immediately and are logged to the audit trail.',
  },
  // Parents
  {
    category: 'Parents',
    question: 'How do I view my child\'s progress?',
    answer: 'In the Parent Portal, go to **Progress Reports**. You\'ll see mastery scores by subject, recent assessment results, and a timeline of activity. You can also view earned achievements and verify them on the blockchain ledger.',
  },
  {
    category: 'Parents',
    question: 'What is the blockchain ledger?',
    answer: 'EPN records key events (achievements, approved plans, etc.) on an immutable blockchain-style ledger. This gives you tamper-proof verification of your child\'s educational records. Go to **Verify Records** in the Parent Portal to check any record.',
  },
];

// ─── FAQ Accordion ─────────────────────────────────────────────────────────────

const FaqAccordion: React.FC<{ items: FaqItem[] }> = ({ items }) => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('All');

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];
  const filtered = activeCategory === 'All' ? items : items.filter(i => i.category === activeCategory);

  // Simple bold renderer
  const renderAnswer = (text: string) =>
    text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
      part.startsWith('**') && part.endsWith('**')
        ? <strong key={i}>{part.slice(2, -2)}</strong>
        : <span key={i}>{part}</span>
    );

  return (
    <div>
      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Accordion items */}
      <div className="space-y-2">
        {filtered.map((item, i) => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              aria-expanded={openIndex === i}
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white pr-4">
                {item.question}
              </span>
              {openIndex === i
                ? <ChevronUp size={16} className="text-blue-500 flex-shrink-0" />
                : <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
              }
            </button>
            {openIndex === i && (
              <div className="px-5 pb-4 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed pt-3">
                  {renderAnswer(item.answer)}
                </p>
                <span className="inline-block mt-2 text-xs text-blue-500 dark:text-blue-400 font-medium">
                  {item.category}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Contact Form ──────────────────────────────────────────────────────────────

const ContactForm: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    subject: '',
    message: '',
    type: 'question',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      // In production this would POST to /api/support/contact
      // For now, open a mailto as a reliable fallback
      const body = encodeURIComponent(
        `Name: ${form.name}\nEmail: ${form.email}\nType: ${form.type}\n\n${form.message}`
      );
      window.open(`mailto:support@epn.edu?subject=${encodeURIComponent(form.subject)}&body=${body}`);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
          <input
            type="text"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
          <input
            type="email"
            value={form.email}
            onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
        <select
          value={form.type}
          onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="question">General Question</option>
          <option value="bug">Bug Report</option>
          <option value="feature">Feature Request</option>
          <option value="feedback">Feedback</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Subject</label>
        <input
          type="text"
          value={form.subject}
          onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
          required
          placeholder="Brief description of your issue"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Message</label>
        <textarea
          value={form.message}
          onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          required
          rows={5}
          placeholder="Describe your question or issue in detail…"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      </div>

      {status === 'success' && (
        <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-4 py-3 rounded-lg">
          <CheckCircle size={16} /> Your email client has been opened. Send the email to complete your request.
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-3 rounded-lg">
          <AlertCircle size={16} /> Something went wrong. Please email us directly at support@epn.edu.
        </div>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
      >
        {status === 'sending' ? <Loader size={16} className="animate-spin" /> : <Send size={16} />}
        Send Message
      </button>
    </form>
  );
};

// ─── Quick links ───────────────────────────────────────────────────────────────

const quickLinks = [
  { icon: <BookOpen size={20} className="text-blue-500" />, label: 'Getting Started Guide', desc: 'New to EPN? Start here.' },
  { icon: <Brain size={20} className="text-purple-500" />, label: 'AI Agents Explained', desc: 'How the 5 agents work together.' },
  { icon: <Shield size={20} className="text-green-500" />, label: 'Privacy & Safety', desc: 'HITL, GDPR, and data security.' },
  { icon: <Users size={20} className="text-orange-500" />, label: 'Role Guides', desc: 'Guides for students, teachers, parents, admins.' },
];

// ─── Main Component ────────────────────────────────────────────────────────────

const HelpPageContent: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto space-y-10">

      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <HelpCircle size={32} className="text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">How can we help?</h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
          Browse our FAQ, chat with EPN Assistant, or send us a message. We're here to help.
        </p>
      </div>

      {/* ── Quick links ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickLinks.map(link => (
          <div
            key={link.label}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow cursor-default"
          >
            <div className="mb-2">{link.icon}</div>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{link.label}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{link.desc}</p>
          </div>
        ))}
      </div>

      {/* ── Main grid: FAQ + Chat ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* FAQ — takes 2/3 width */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
              <HelpCircle size={20} className="text-blue-500" />
              Frequently Asked Questions
            </h2>
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
        </div>

        {/* Chat panel — takes 1/3 width */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <MessageCircle size={18} className="text-blue-500" />
                Chat with EPN Assistant
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                AI-powered support, available 24/7
              </p>
            </div>
            {/* Inline (non-floating) chatbot */}
            <ChatBot floating={false} defaultOpen={true} />
          </div>
        </div>
      </div>

      {/* ── Contact form ──────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
          <Mail size={20} className="text-blue-500" />
          Contact Us
        </h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          Can't find what you're looking for? Send us a message and we'll get back to you within 1 business day.
        </p>
        <ContactForm />
      </div>

      {/* ── Additional resources ───────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-blue-200 dark:border-blue-800">
        <h3 className="font-bold text-gray-900 dark:text-white mb-3">Still need help?</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <a
            href="mailto:support@epn.edu"
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <Mail size={14} /> support@epn.edu
          </a>
          <Link
            to="/about"
            className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
          >
            <BookOpen size={14} /> About EPN
          </Link>
        </div>
      </div>

    </div>
  );
};

// ─── Wrapper: authenticated vs public ─────────────────────────────────────────

const HelpPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  if (isAuthenticated) {
    return (
      <DashboardLayout title="Help Center">
        <HelpPageContent />
        {/* Floating chatbot also available on this page */}
        <ChatBot floating={true} />
      </DashboardLayout>
    );
  }

  // Public layout (unauthenticated)
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Simple public nav */}
      <nav className="sticky top-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 px-6 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <Brain size={14} className="text-white" />
          </div>
          EPN
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <Link to="/login" className="text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline">Sign In</Link>
        </div>
      </nav>

      <div className="px-4 py-8">
        <HelpPageContent />
      </div>

      {/* Floating chatbot */}
      <ChatBot floating={true} />
    </div>
  );
};

export default HelpPage;
