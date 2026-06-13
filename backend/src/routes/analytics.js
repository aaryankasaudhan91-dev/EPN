/**
 * Analytics Routes
 * Provides aggregated data for dashboards
 */

const express = require('express');
const { query } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/analytics/class - Class-wide performance overview (teacher)
router.get('/class', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const { grade } = req.query;
    const params = [];
    let teacherFilter = '';

    if (req.user.role === 'teacher') {
      params.push(req.user.id);
      teacherFilter = ` AND s.learning_profile->>'assignedTeacherId' = $${params.length}`;
    }

    let gradeFilter = '';
    if (grade) {
      params.push(grade);
      gradeFilter = ` AND s.grade = $${params.length}`;
    }

    const [overviewResult, subjectResult, riskResult, recentResult] = await Promise.all([
      query(
        `SELECT COUNT(DISTINCT s.id) as total_students,
                AVG(s.overall_mastery) as avg_mastery,
                AVG(s.risk_score) as avg_risk,
                COUNT(CASE WHEN s.risk_score >= 70 THEN 1 END) as high_risk_count
         FROM students s JOIN users u ON s.user_id = u.id
         WHERE u.is_active = TRUE ${teacherFilter} ${gradeFilter}`,
        params
      ),
      query(
        `SELECT a.subject, AVG(a.score) as avg_score, COUNT(*) as assessment_count
         FROM assessments a
         JOIN students s ON a.student_id = s.id
         WHERE a.taken_at > NOW() - INTERVAL '30 days' ${teacherFilter} ${gradeFilter}
         GROUP BY a.subject ORDER BY avg_score ASC`,
        params
      ),
      query(
        `SELECT s.id, u.name, s.grade, s.risk_score, s.overall_mastery
         FROM students s JOIN users u ON s.user_id = u.id
         WHERE s.risk_score >= 60 ${teacherFilter} ${gradeFilter}
         ORDER BY s.risk_score DESC LIMIT 10`,
        params
      ),
      query(
        `SELECT DATE(a.taken_at) as date, AVG(a.score) as avg_score, COUNT(*) as count
         FROM assessments a
         JOIN students s ON a.student_id = s.id
         WHERE a.taken_at > NOW() - INTERVAL '30 days' ${teacherFilter} ${gradeFilter}
         GROUP BY DATE(a.taken_at) ORDER BY date ASC`,
        params
      ),
    ]);

    res.json({
      overview: overviewResult.rows[0],
      subjectPerformance: subjectResult.rows,
      atRiskStudents: riskResult.rows,
      dailyTrend: recentResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/student/:studentId - Student-specific analytics
router.get('/student/:studentId', authenticate, async (req, res, next) => {
  try {
    const { studentId } = req.params;

    const [progressResult, subjectResult, timelineResult, contentResult] = await Promise.all([
      query(
        `SELECT s.overall_mastery, s.risk_score, s.grade,
                COUNT(DISTINCT a.id) as total_assessments,
                AVG(a.score) as avg_score
         FROM students s
         LEFT JOIN assessments a ON a.student_id = s.id
         WHERE s.id = $1
         GROUP BY s.id, s.overall_mastery, s.risk_score, s.grade`,
        [studentId]
      ),
      query(
        `SELECT subject, AVG(score) as avg_score, COUNT(*) as count,
                MIN(score) as min_score, MAX(score) as max_score
         FROM assessments WHERE student_id = $1
         GROUP BY subject`,
        [studentId]
      ),
      query(
        `SELECT DATE(taken_at) as date, subject, AVG(score) as avg_score
         FROM assessments WHERE student_id = $1
         AND taken_at > NOW() - INTERVAL '60 days'
         GROUP BY DATE(taken_at), subject
         ORDER BY date ASC`,
        [studentId]
      ),
      query(
        `SELECT content_type, COUNT(*) as count,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved
         FROM generated_content WHERE student_id = $1
         GROUP BY content_type`,
        [studentId]
      ),
    ]);

    res.json({
      progress: progressResult.rows[0],
      subjectBreakdown: subjectResult.rows,
      timeline: timelineResult.rows,
      contentSummary: contentResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/system - System-wide analytics (admin)
router.get('/system', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const [usersResult, contentResult, auditResult, ledgerResult] = await Promise.all([
      query(
        `SELECT role, COUNT(*) as count, COUNT(CASE WHEN is_active THEN 1 END) as active
         FROM users GROUP BY role`
      ),
      query(
        `SELECT content_type, approval_status, COUNT(*) as count
         FROM generated_content GROUP BY content_type, approval_status`
      ),
      query(
        `SELECT agent, COUNT(*) as action_count
         FROM audit_logs WHERE created_at > NOW() - INTERVAL '7 days'
         GROUP BY agent ORDER BY action_count DESC`
      ),
      query('SELECT COUNT(*) as block_count FROM ledger_records'),
    ]);

    res.json({
      userStats: usersResult.rows,
      contentStats: contentResult.rows,
      agentActivity: auditResult.rows,
      ledgerStats: ledgerResult.rows[0],
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/analytics/parent/:studentId - Parent view of child analytics
router.get('/parent/:studentId', authenticate, authorize('parent'), async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Verify parent-child link
    const { rows: linkRows } = await query(
      'SELECT id FROM parent_student_links WHERE parent_id = $1 AND student_id = $2',
      [req.user.id, studentId]
    );
    if (!linkRows.length) return res.status(403).json({ error: 'Access denied' });

    const [progressResult, achievementsResult, recentResult] = await Promise.all([
      query(
        `SELECT s.overall_mastery, s.risk_score, s.grade, u.name,
                AVG(a.score) as avg_score, COUNT(a.id) as assessment_count
         FROM students s
         JOIN users u ON s.user_id = u.id
         LEFT JOIN assessments a ON a.student_id = s.id
         WHERE s.id = $1
         GROUP BY s.id, s.overall_mastery, s.risk_score, s.grade, u.name`,
        [studentId]
      ),
      query(
        `SELECT * FROM achievements WHERE student_id = $1 ORDER BY earned_at DESC`,
        [studentId]
      ),
      query(
        `SELECT subject, AVG(score) as avg_score
         FROM assessments WHERE student_id = $1
         AND taken_at > NOW() - INTERVAL '30 days'
         GROUP BY subject`,
        [studentId]
      ),
    ]);

    res.json({
      progress: progressResult.rows[0],
      achievements: achievementsResult.rows,
      recentPerformance: recentResult.rows,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
