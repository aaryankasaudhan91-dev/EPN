/**
 * Learning Plans Routes
 */

const express = require('express');
const { query } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const { generateLearningPlan, approveLearningPlan, rejectLearningPlan } = require('../agents/curriculumPlannerAgent');

const router = express.Router();

// GET /api/learning-plans - List learning plans
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { studentId, status } = req.query;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (studentId) {
      params.push(studentId);
      whereClause += ` AND lp.student_id = $${params.length}`;
    }
    if (status) {
      params.push(status);
      whereClause += ` AND lp.status = $${params.length}`;
    }
    if (req.user.role === 'teacher') {
      params.push(req.user.id);
      whereClause += ` AND s.learning_profile->>'assignedTeacherId' = $${params.length}`;
    }

    const { rows } = await query(
      `SELECT lp.*, u.name as student_name, s.grade,
              t.name as teacher_name
       FROM learning_plans lp
       JOIN students s ON lp.student_id = s.id
       JOIN users u ON s.user_id = u.id
       LEFT JOIN users t ON lp.teacher_id = t.id
       ${whereClause}
       ORDER BY lp.created_at DESC`,
      params
    );

    res.json({ plans: rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/learning-plans/generate - Generate AI learning plan
router.post('/generate', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { studentId, forceApproval } = req.body;
    if (!studentId) return res.status(400).json({ error: 'studentId is required' });

    const result = await generateLearningPlan(studentId, {
      teacherId: req.user.id,
      forceApproval,
    });

    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/learning-plans/:id - Get plan by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT lp.*, u.name as student_name, s.grade
       FROM learning_plans lp
       JOIN students s ON lp.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE lp.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Plan not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// POST /api/learning-plans/:id/approve - Approve plan
router.post('/:id/approve', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const plan = await approveLearningPlan(req.params.id, req.user.id, req.body.notes);
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

// POST /api/learning-plans/:id/reject - Reject plan
router.post('/:id/reject', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason is required' });
    const plan = await rejectLearningPlan(req.params.id, req.user.id, reason);
    res.json(plan);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
