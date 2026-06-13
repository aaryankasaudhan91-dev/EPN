/**
 * Assessment Routes
 * CRUD for student assessments + triggers AI pipeline
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const { processAssessmentSubmission } = require('../agents/orchestratorAgent');

const router = express.Router();

// GET /api/assessments - List assessments
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { studentId, subject, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE 1=1';

    // Students can only see their own assessments
    if (req.user.role === 'student') {
      const { rows } = await query('SELECT id FROM students WHERE user_id = $1', [req.user.id]);
      if (!rows.length) return res.json({ assessments: [], total: 0 });
      params.push(rows[0].id);
      whereClause += ` AND a.student_id = $${params.length}`;
    } else if (studentId) {
      params.push(studentId);
      whereClause += ` AND a.student_id = $${params.length}`;
    }

    if (subject) {
      params.push(subject);
      whereClause += ` AND a.subject = $${params.length}`;
    }

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT a.*, u.name as student_name
       FROM assessments a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ORDER BY a.taken_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM assessments a ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({ assessments: rows, total: parseInt(countRows[0].count) });
  } catch (err) {
    next(err);
  }
});

// POST /api/assessments - Submit a new assessment
router.post('/', authenticate, [
  body('studentId').isUUID().withMessage('Valid student ID required'),
  body('subject').notEmpty().withMessage('Subject is required'),
  body('score').isFloat({ min: 0, max: 100 }).withMessage('Score must be 0-100'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { studentId, subject, topic, score, maxScore = 100, timeSpent, assessmentType = 'quiz', metadata = {} } = req.body;

    // Verify student exists
    const { rows: studentRows } = await query('SELECT id FROM students WHERE id = $1', [studentId]);
    if (!studentRows.length) return res.status(404).json({ error: 'Student not found' });

    const { rows } = await query(
      `INSERT INTO assessments (student_id, subject, topic, score, max_score, time_spent, assessment_type, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [studentId, subject, topic, score, maxScore, timeSpent, assessmentType, JSON.stringify(metadata)]
    );

    const assessment = rows[0];

    // Trigger AI pipeline asynchronously (don't block response)
    const teacherId = req.user.role === 'teacher' ? req.user.id : null;
    processAssessmentSubmission({
      studentId,
      assessment: { subject, topic, score, metadata },
      teacherId,
    }).catch(err => console.error('[Orchestrator] Pipeline error:', err.message));

    res.status(201).json(assessment);
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/:id - Get assessment by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT a.*, u.name as student_name FROM assessments a
       JOIN students s ON a.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE a.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Assessment not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/assessments/student/:studentId/timeline - Progress timeline
router.get('/student/:studentId/timeline', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT subject, score, taken_at, assessment_type
       FROM assessments WHERE student_id = $1
       ORDER BY taken_at ASC`,
      [req.params.studentId]
    );
    res.json({ timeline: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
