/**
 * Generated Content Routes
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const { generateStudentContent, approveContent, rejectContent } = require('../agents/contentGenerationAgent');

const router = express.Router();

// GET /api/content - List generated content
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { studentId, contentType, approvalStatus, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (req.user.role === 'student') {
      // Force filter for students: only their own, approved content
      params.push('approved');
      whereClause += ` AND gc.approval_status = $${params.length}`;
      params.push(req.user.id);
      whereClause += ` AND u.id = $${params.length}`;
    } else {
      if (studentId) {
        params.push(studentId);
        whereClause += ` AND gc.student_id = $${params.length}`;
      }
      if (contentType) {
        params.push(contentType);
        whereClause += ` AND gc.content_type = $${params.length}`;
      }
      if (approvalStatus) {
        params.push(approvalStatus);
        whereClause += ` AND gc.approval_status = $${params.length}`;
      }
      if (req.user.role === 'teacher') {
        params.push(req.user.id);
        whereClause += ` AND s.learning_profile->>'assignedTeacherId' = $${params.length}`;
      }
    }

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT gc.id, gc.content_type, gc.subject, gc.topic, gc.title,
              gc.approval_status, gc.ai_model, gc.created_at, gc.approved_at, gc.deadline,
              u.name as student_name, s.grade
       FROM generated_content gc
       JOIN students s ON gc.student_id = s.id
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ORDER BY gc.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM generated_content gc ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({ content: rows, total: parseInt(countRows[0].count) });
  } catch (err) {
    next(err);
  }
});

// POST /api/content/generate - Generate new content
router.post('/generate', authenticate, authorize('teacher', 'admin'), [
  body('studentId').isUUID(),
  body('contentType').isIn(['worksheet', 'quiz', 'flashcard', 'explanation', 'revision_notes', 'study_plan']),
  body('subject').notEmpty(),
  body('topic').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { studentId, contentType, subject, topic, context, deadline } = req.body;

    const contentRecord = await generateStudentContent({
      studentId,
      contentType,
      subject,
      topic,
      teacherId: req.user.id,
      context,
      deadline,
    });

    res.status(201).json(contentRecord);
  } catch (err) {
    next(err);
  }
});

// POST /api/content/mira-generate - Generate content directly via Mira AI Teacher
router.post('/mira-generate', authenticate, authorize('student'), [
  body('contentType').isIn(['worksheet', 'quiz', 'flashcard', 'explanation', 'revision_notes', 'study_plan']),
  body('subject').notEmpty(),
  body('syllabus').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { contentType, subject, syllabus } = req.body;
    const studentId = req.user.student_id; // Actually, the student profile ID needs to be fetched
    
    // Get student profile ID and verify Mira assignment
    const { rows: studentRows } = await query(
      "SELECT id, learning_profile FROM students WHERE user_id = $1",
      [req.user.id]
    );
    
    if (studentRows.length === 0) return res.status(404).json({ error: 'Student profile not found' });
    const studentRecord = studentRows[0];
    const profile = studentRecord.learning_profile || {};
    
    // Find Mira teacher ID
    const { rows: miraRows } = await query(
      "SELECT id FROM users WHERE role = 'teacher' AND name = 'Mira'"
    );
    
    const teacherId = miraRows.length > 0 ? miraRows[0].id : null;

    // Generate content using AI
    const contentRecord = await generateStudentContent({
      studentId: studentRecord.id,
      contentType,
      subject,
      topic: syllabus, // We'll use topic field to store the syllabus context
      teacherId: teacherId,
      context: `Generate based on this syllabus: ${syllabus}`,
    });

    // Auto-approve since it's from Mira
    await approveContent(contentRecord.id, teacherId || req.user.id, 'Automatically approved by AI Teacher Mira');
    
    res.status(201).json({ message: 'Content generated successfully', contentId: contentRecord.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/content/:id - Get content by ID (with full content body)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT gc.*, u.id as user_id, u.name as student_name, s.grade
       FROM generated_content gc
       JOIN students s ON gc.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE gc.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Content not found' });
    
    const content = rows[0];
    
    // Security check: students can only view their own approved content
    if (req.user.role === 'student') {
      if (content.approval_status !== 'approved' || content.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied. Content is pending approval.' });
      }
    }

    res.json(content);
  } catch (err) {
    next(err);
  }
});

// POST /api/content/:id/approve - Approve content
router.post('/:id/approve', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const content = await approveContent(req.params.id, req.user.id, req.body.notes);
    res.json(content);
  } catch (err) {
    next(err);
  }
});

// POST /api/content/:id/reject - Reject content
router.post('/:id/reject', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });
    const content = await rejectContent(req.params.id, req.user.id, reason);
    res.json(content);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
