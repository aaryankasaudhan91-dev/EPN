/**
 * EPN TypeScript Type Definitions
 */

export type UserRole = 'student' | 'teacher' | 'admin' | 'parent';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type ContentType = 'worksheet' | 'quiz' | 'flashcard' | 'explanation' | 'revision_notes' | 'study_plan';
export type PlanStatus = 'active' | 'completed' | 'paused' | 'pending_approval';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status?: string;
  avatarUrl?: string;
  lastLogin?: string;
  createdAt: string;
  studentProfile?: StudentProfile;
}

export interface StudentProfile {
  id: string;
  grade: string;
  overallMastery: number;
  riskScore: number;
  learningProfile?: any;
}

export interface Student {
  id: string;
  userId: string;
  name: string;
  email: string;
  grade: string;
  overallMastery: number;
  riskScore: number;
  learningProfile: any;
  avatarUrl?: string;
  lastLogin?: string;
}

export interface Assessment {
  id: string;
  studentId: string;
  studentName?: string;
  subject: string;
  topic?: string;
  score: number;
  maxScore: number;
  timeSpent?: number;
  assessmentType: string;
  takenAt: string;
}

export interface KnowledgeConcept {
  concept: string;
  masteryLevel: number;
  masteryLabel: string;
  misconceptions: string[];
  rootCauses: string[];
  lastAssessed?: string;
}

export interface KnowledgeSubject {
  concepts: KnowledgeConcept[];
  avgMastery: number;
  weakConcepts: KnowledgeConcept[];
  strongConcepts: KnowledgeConcept[];
}

export interface LearningTask {
  id: string;
  type: 'remedial' | 'enrichment' | 'review';
  subject: string;
  concept: string;
  title: string;
  description?: string;
  priority: 'high' | 'medium' | 'low';
  estimatedDuration: number;
  status: 'pending' | 'in_progress' | 'completed';
  resources: Array<{ type: string; title: string }>;
  masteryTarget?: number;
  currentMastery?: number;
}

export interface LearningPlan {
  id: string;
  studentId: string;
  studentName?: string;
  teacherId?: string;
  teacherName?: string;
  title: string;
  description?: string;
  tasks: LearningTask[];
  status: PlanStatus;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  aiGenerated: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  grade?: string;
}

export interface GeneratedContent {
  id: string;
  studentId: string;
  studentName?: string;
  teacherId?: string;
  contentType: ContentType;
  subject?: string;
  topic?: string;
  title?: string;
  content: any;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  deadline?: string;
  aiModel: string;
  createdAt: string;
  grade?: string;
}

export interface AuditLog {
  id: string;
  agent: string;
  action: string;
  actorId?: string;
  actorName?: string;
  targetId?: string;
  targetType?: string;
  details: any;
  policyVersion: string;
  createdAt: string;
}

export interface LedgerRecord {
  id: string;
  blockIndex: number;
  recordType: string;
  referenceId?: string;
  dataHash: string;
  blockHash: string;
  createdAt: string;
}

export interface Achievement {
  id: string;
  studentId: string;
  badgeType: string;
  title: string;
  description?: string;
  earnedAt: string;
  ledgerId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'alert' | 'success';
  isRead: boolean;
  link?: string;
  createdAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  errors?: Array<{ msg: string; param: string }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// Analytics types
export interface ClassOverview {
  totalStudents: number;
  avgMastery: number;
  avgRisk: number;
  highRiskCount: number;
}

export interface SubjectPerformance {
  subject: string;
  avgScore: number;
  assessmentCount: number;
}

export interface DailyTrend {
  date: string;
  avgScore: number;
  count: number;
}
