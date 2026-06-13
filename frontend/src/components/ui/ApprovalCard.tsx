/**
 * Approval Card Component
 * Used in teacher dashboard for HITL approval workflow
 */

import React, { useState } from 'react';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface ApprovalCardProps {
  id: string;
  title: string;
  subtitle?: string;
  type: 'plan' | 'content';
  studentName: string;
  grade?: string;
  createdAt: string;
  details?: any;
  onApprove: (id: string, notes?: string) => Promise<void>;
  onReject: (id: string, reason: string) => Promise<void>;
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({
  id, title, subtitle, type, studentName, grade, createdAt, details,
  onApprove, onReject,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState<'approve' | 'reject' | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await onApprove(id, notes);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setLoading('reject');
    try {
      await onReject(id, rejectReason);
    } finally {
      setLoading(null);
      setShowRejectForm(false);
    }
  };

  return (
    <div className="card border border-yellow-200 dark:border-yellow-800/50 bg-yellow-50/30 dark:bg-yellow-900/10">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge ${type === 'plan' ? 'badge-purple' : 'badge-blue'}`}>
              {type === 'plan' ? 'Learning Plan' : 'Content'}
            </span>
            <span className="badge badge-yellow">
              <Clock size={10} className="mr-1" /> Pending
            </span>
          </div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h3>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Student: <span className="font-medium text-gray-700 dark:text-gray-300">{studentName}</span>
            {grade && <span> · Grade {grade}</span>}
            <span> · {new Date(createdAt).toLocaleDateString()}</span>
          </p>
        </div>

        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 flex-shrink-0"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Expanded details */}
      {expanded && details && (
        <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700">
          <pre className="whitespace-pre-wrap font-mono text-xs overflow-auto max-h-40">
            {JSON.stringify(details, null, 2)}
          </pre>
        </div>
      )}

      {/* Notes input */}
      <div className="mt-3">
        <input
          type="text"
          placeholder="Add approval notes (optional)..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className="input text-sm py-1.5"
        />
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={handleApprove}
          disabled={loading !== null}
          className="btn-success flex items-center gap-1.5 text-sm py-1.5 flex-1"
        >
          <CheckCircle size={14} />
          {loading === 'approve' ? 'Approving...' : 'Approve'}
        </button>
        <button
          onClick={() => setShowRejectForm(!showRejectForm)}
          disabled={loading !== null}
          className="btn-danger flex items-center gap-1.5 text-sm py-1.5 flex-1"
        >
          <XCircle size={14} />
          Reject
        </button>
      </div>

      {/* Reject form */}
      {showRejectForm && (
        <div className="mt-2 space-y-2">
          <textarea
            placeholder="Reason for rejection (required)..."
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            className="input text-sm py-1.5 resize-none"
            rows={2}
          />
          <button
            onClick={handleReject}
            disabled={!rejectReason.trim() || loading !== null}
            className="btn-danger w-full text-sm py-1.5"
          >
            {loading === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
          </button>
        </div>
      )}
    </div>
  );
};

export default ApprovalCard;
