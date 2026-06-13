/**
 * ChatBot Widget
 *
 * A floating chat panel that lets users ask questions about the EPN platform.
 * Sends conversation history to POST /api/chat and displays the AI reply.
 *
 * Features:
 *  - Floating toggle button (bottom-right)
 *  - Conversation history maintained in component state (client-side only)
 *  - Markdown-style bold text rendering (** ... **)
 *  - Mock-mode indicator when no OpenAI key is configured
 *  - Accessible: keyboard-navigable, ARIA labels
 *
 * Props:
 *  - defaultOpen?: boolean  — start the panel open (default false)
 *  - floating?: boolean     — render as floating widget (default true)
 *                             set to false to embed inline
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader, Sparkles } from 'lucide-react';
import api from '../../services/api';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
  isMock?: boolean;
  timestamp: Date;
}

interface ChatBotProps {
  defaultOpen?: boolean;
  floating?: boolean;
}

// ─── Simple markdown bold renderer ────────────────────────────────────────────

const renderContent = (text: string): React.ReactNode => {
  // Replace **bold** with <strong>
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
};

// ─── Suggested questions ───────────────────────────────────────────────────────

const SUGGESTIONS = [
  'How do I reset my password?',
  'What are the 5 AI agents?',
  'How does HITL approval work?',
  'How do I view my learning plan?',
];

// ─── Main Component ────────────────────────────────────────────────────────────

const ChatBot: React.FC<ChatBotProps> = ({ defaultOpen = false, floating = true }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hi! I'm **EPN Assistant**. I can help you with learning plans, AI agents, approvals, account settings, and more. What would you like to know?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  // ─── Send message ──────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      // Send only role + content to the API (no timestamps)
      const payload = updatedMessages.map(m => ({ role: m.role, content: m.content }));
      const res = await api.post('/chat', { messages: payload });
      const { reply, isMock } = res.data;

      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: reply, isMock, timestamp: new Date() },
      ]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: "I'm sorry, I couldn't connect to the server right now. Please try again or email **support@epn.edu**.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestion = (suggestion: string) => {
    sendMessage(suggestion);
  };

  // ─── Chat panel ────────────────────────────────────────────────────────────

  const chatPanel = (
    <div
      className={`flex flex-col bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl overflow-hidden ${
        floating
          ? 'fixed bottom-20 right-4 w-80 sm:w-96 h-[480px] rounded-2xl z-50'
          : 'w-full h-[480px] rounded-2xl'
      }`}
      role="dialog"
      aria-label="EPN Support Chat"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={16} />
          </div>
          <div>
            <p className="text-sm font-semibold">EPN Assistant</p>
            <p className="text-xs text-blue-100">AI-powered support</p>
          </div>
        </div>
        {floating && (
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-white/20 rounded-lg transition-colors"
            aria-label="Close chat"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            {/* Avatar */}
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === 'user'
                ? 'bg-blue-600 text-white'
                : 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>

            {/* Bubble */}
            <div
              className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-sm'
              }`}
            >
              {renderContent(msg.content)}
              {msg.isMock && (
                <p className="text-xs opacity-60 mt-1 flex items-center gap-1">
                  <Sparkles size={10} /> demo mode
                </p>
              )}
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {loading && (
          <div className="flex gap-2">
            <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/40 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-purple-600 dark:text-purple-400" />
            </div>
            <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-sm px-4 py-3">
              <Loader size={14} className="animate-spin text-gray-400" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions (shown only when conversation is fresh) */}
      {messages.length === 1 && !loading && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => handleSuggestion(s)}
              className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors border border-blue-200 dark:border-blue-800"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 px-3 py-3 border-t border-gray-200 dark:border-gray-700 flex-shrink-0"
      >
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Ask a question…"
          disabled={loading}
          className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
          aria-label="Chat message input"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="p-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl transition-colors"
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );

  // ─── Floating mode ─────────────────────────────────────────────────────────

  if (floating) {
    return (
      <>
        {/* Toggle button */}
        <button
          onClick={() => setIsOpen(prev => !prev)}
          className="fixed bottom-4 right-4 z-50 w-14 h-14 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
          aria-label={isOpen ? 'Close chat' : 'Open EPN Assistant chat'}
        >
          {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        </button>

        {/* Panel */}
        {isOpen && chatPanel}
      </>
    );
  }

  // ─── Inline / embedded mode ────────────────────────────────────────────────
  return chatPanel;
};

export default ChatBot;
