/**
 * Student Routes
 * Student profile management and overview endpoints
 */

const express = require('express');
const { query } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/students - List students (teacher/admin)
router.get('/', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { grade, search, riskLevel, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (req.user.role === 'teacher') {
      params.push(req.user.id);
      whereClause += ` AND s.learning_profile->>'assignedTeacherId' = $${params.length}`;
    }

    if (grade) {
      params.push(grade);
      whereClause += ` AND s.grade = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }
    if (riskLevel === 'high') {
      whereClause += ' AND s.risk_score >= 70';
    } else if (riskLevel === 'medium') {
      whereClause += ' AND s.risk_score >= 40 AND s.risk_score < 70';
    } else if (riskLevel === 'low') {
      whereClause += ' AND s.risk_score < 40';
    }

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT s.id, s.grade, s.overall_mastery, s.risk_score, s.learning_profile,
              u.id as user_id, u.name, u.email, u.avatar_url, u.last_login
       FROM students s
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ORDER BY s.risk_score DESC, u.name ASC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM students s JOIN users u ON s.user_id = u.id ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({ students: rows, total: parseInt(countRows[0].count), page: parseInt(page) });
  } catch (err) {
    next(err);
  }
});

// GET /api/students/me - Get current student's profile
router.get('/me', authenticate, authorize('student'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.name, u.email, u.avatar_url
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE s.user_id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student profile not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// GET /api/students/:id - Get student by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.*, u.name, u.email, u.avatar_url, u.last_login
       FROM students s JOIN users u ON s.user_id = u.id
       WHERE s.id = $1`,
      [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Student not found' });

    // Check access: student can only see own profile, parent can see linked children
    const student = rows[0];
    if (req.user.role === 'student' && student.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (req.user.role === 'parent') {
      const { rows: linkRows } = await query(
        'SELECT id FROM parent_student_links WHERE parent_id = $1 AND student_id = $2',
        [req.user.id, req.params.id]
      );
      if (!linkRows.length) return res.status(403).json({ error: 'Access denied' });
    }

    res.json(student);
  } catch (err) {
    next(err);
  }
});

// GET /api/students/:id/overview - Full student overview (dashboard data)
router.get('/:id/overview', authenticate, async (req, res, next) => {
  try {
    const studentId = req.params.id;

    const [studentResult, assessmentsResult, knowledgeResult, plansResult, achievementsResult] = await Promise.all([
      query(
        `SELECT s.*, u.name, u.email, u.avatar_url FROM students s
         JOIN users u ON s.user_id = u.id WHERE s.id = $1`,
        [studentId]
      ),
      query(
        `SELECT subject, AVG(score) as avg_score, COUNT(*) as count,
                MAX(taken_at) as last_taken
         FROM assessments WHERE student_id = $1
         GROUP BY subject ORDER BY subject`,
        [studentId]
      ),
      query(
        `SELECT subject, AVG(mastery_level) as avg_mastery, COUNT(*) as concept_count
         FROM knowledge_graph WHERE student_id = $1
         GROUP BY subject`,
        [studentId]
      ),
      query(
        `SELECT id, title, status, approval_status, start_date, end_date
         FROM learning_plans WHERE student_id = $1
         ORDER BY created_at DESC LIMIT 3`,
        [studentId]
      ),
      query(
        `SELECT * FROM achievements WHERE student_id = $1 ORDER BY earned_at DESC LIMIT 10`,
        [studentId]
      ),
    ]);

    if (!studentResult.rows.length) return res.status(404).json({ error: 'Student not found' });

    res.json({
      student: studentResult.rows[0],
      subjectPerformance: assessmentsResult.rows,
      knowledgeGraph: knowledgeResult.rows,
      recentPlans: plansResult.rows,
      achievements: achievementsResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/students/parent/children - Get children for parent
router.get('/parent/children', authenticate, authorize('parent'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT s.id, s.grade, s.overall_mastery, s.risk_score,
              u.name, u.email, u.avatar_url
       FROM parent_student_links psl
       JOIN students s ON psl.student_id = s.id
       JOIN users u ON s.user_id = u.id
       WHERE psl.parent_id = $1`,
      [req.user.id]
    );
    res.json({ children: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
