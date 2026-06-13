/**
 * API Service
 * Centralized Axios instance with JWT auth interceptors
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// Request interceptor: attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('epn_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle auth errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('epn_token');
      localStorage.removeItem('epn_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) =>
    api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ─── Users API ─────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: any) => api.get('/users', { params }),
  get: (id: string) => api.get(`/users/${id}`),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  toggleStatus: (id: string, isActive: boolean) =>
    api.patch(`/users/${id}/status`, { isActive }),
  getNotifications: () => api.get('/users/me/notifications'),
  markNotificationRead: (id: string) => api.patch(`/users/notifications/${id}/read`),
};

// ─── Students API ──────────────────────────────────────────────────────────────
export const studentsApi = {
  list: (params?: any) => api.get('/students', { params }),
  me: () => api.get('/students/me'),
  get: (id: string) => api.get(`/students/${id}`),
  overview: (id: string) => api.get(`/students/${id}/overview`),
  children: () => api.get('/students/parent/children'),
};

// ─── Assessments API ───────────────────────────────────────────────────────────
export const assessmentsApi = {
  list: (params?: any) => api.get('/assessments', { params }),
  get: (id: string) => api.get(`/assessments/${id}`),
  create: (data: any) => api.post('/assessments', data),
  timeline: (studentId: string) => api.get(`/assessments/student/${studentId}/timeline`),
};

// ─── Knowledge Graph API ───────────────────────────────────────────────────────
export const knowledgeGraphApi = {
  get: (studentId: string) => api.get(`/knowledge-graph/${studentId}`),
  weakAreas: (studentId: string) => api.get(`/knowledge-graph/${studentId}/weak-areas`),
  subject: (studentId: string, subject: string) =>
    api.get(`/knowledge-graph/${studentId}/subject/${subject}`),
};

// ─── Learning Plans API ────────────────────────────────────────────────────────
export const learningPlansApi = {
  list: (params?: any) => api.get('/learning-plans', { params }),
  get: (id: string) => api.get(`/learning-plans/${id}`),
  generate: (studentId: string, forceApproval?: boolean) =>
    api.post('/learning-plans/generate', { studentId, forceApproval }),
  approve: (id: string, notes?: string) =>
    api.post(`/learning-plans/${id}/approve`, { notes }),
  reject: (id: string, reason: string) =>
    api.post(`/learning-plans/${id}/reject`, { reason }),
};

// ─── Content API ───────────────────────────────────────────────────────────────
export const contentApi = {
  list: (params?: any) => api.get('/content', { params }),
  get: (id: string) => api.get(`/content/${id}`),
  generate: (data: any) => api.post('/content/generate', data),
  miraGenerate: (data: { contentType: string, subject: string, syllabus: string }) => api.post('/content/mira-generate', data),
  approve: (id: string, notes?: string) =>
    api.post(`/content/${id}/approve`, { notes }),
  reject: (id: string, reason: string) =>
    api.post(`/content/${id}/reject`, { reason }),
};

// ─── Approvals API ─────────────────────────────────────────────────────────────
export const approvalsApi = {
  pending: () => api.get('/approvals/pending'),
};

// ─── Audit API ─────────────────────────────────────────────────────────────────
export const auditApi = {
  list: (params?: any) => api.get('/audit', { params }),
  agentSummary: () => api.get('/audit/agents'),
};

// ─── Ledger API ────────────────────────────────────────────────────────────────
export const ledgerApi = {
  list: (params?: any) => api.get('/ledger', { params }),
  verify: () => api.get('/ledger/verify'),
  verifyRecord: (referenceId: string) => api.get(`/ledger/verify/${referenceId}`),
};

// ─── Analytics API ─────────────────────────────────────────────────────────────
export const analyticsApi = {
  class: (params?: any) => api.get('/analytics/class', { params }),
  student: (studentId: string) => api.get(`/analytics/student/${studentId}`),
  system: () => api.get('/analytics/system'),
  parent: (studentId: string) => api.get(`/analytics/parent/${studentId}`),
};

// ─── Agents API ────────────────────────────────────────────────────────────────
export const agentsApi = {
  health: () => api.get('/agents/health'),
  runMonitoring: () => api.post('/agents/monitor/run'),
};

// ─── Chat API ──────────────────────────────────────────────────────────────────
export const chatApi = {
  /**
   * Send a conversation history to the EPN support chatbot.
   * @param messages Array of { role: 'user'|'assistant', content: string }
   */
  send: (messages: Array<{ role: 'user' | 'assistant'; content: string }>) =>
    api.post('/chat', { messages }),
};

// ─── Users (extended) API ──────────────────────────────────────────────────────
export const profileApi = {
  /** GET /api/users/me — full profile including student data */
  getMe: () => api.get('/users/me'),
  /** PUT /api/users/me — update name / email */
  updateMe: (data: { name?: string; email?: string; avatarUrl?: string }) =>
    api.put('/users/me', data),
  /** PUT /api/users/me/password — change password */
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/me/password', { currentPassword, newPassword }),
  /** GET /api/users/me/preferences */
  getPreferences: () => api.get('/users/me/preferences'),
  /** PUT /api/users/me/preferences */
  savePreferences: (preferences: any) =>
    api.put('/users/me/preferences', { preferences }),
};

// ─── Cognitive API (Adaptive Architecture) ───────────────────────────────────
export const cognitiveApi = {
  getMood: (studentId: string) => api.get(`/cognitive/mood`, { params: { student_id: studentId } }),
  logMood: (data: any) => api.post(`/cognitive/mood`, data),
  getMicroTasks: (studentId: string) => api.get(`/cognitive/micro-tasks`, { params: { student_id: studentId } }),
  completeMicroTask: (taskId: string) => api.post(`/cognitive/micro-tasks/complete/${taskId}`),
  createMicroTask: (data: any) => api.post(`/cognitive/micro-tasks`, data),
};

export default api;
