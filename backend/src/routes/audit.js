/**
 * Audit Log Routes
 */

const express = require('express');
const { query } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// GET /api/audit - Get audit logs (admin/teacher)
router.get('/', authenticate, authorize('admin', 'teacher'), async (req, res, next) => {
  try {
    const { agent, targetType, page = 1, limit = 50, startDate, endDate } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (agent) {
      params.push(agent);
      whereClause += ` AND al.agent = $${params.length}`;
    }
    if (targetType) {
      params.push(targetType);
      whereClause += ` AND al.target_type = $${params.length}`;
    }
    if (startDate) {
      params.push(startDate);
      whereClause += ` AND al.created_at >= $${params.length}`;
    }
    if (endDate) {
      params.push(endDate);
      whereClause += ` AND al.created_at <= $${params.length}`;
    }

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT al.*, u.name as actor_name
       FROM audit_logs al
       LEFT JOIN users u ON al.actor_id = u.id
       ${whereClause}
       ORDER BY al.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({ logs: rows, total: parseInt(countRows[0].count) });
  } catch (err) {
    next(err);
  }
});

// GET /api/audit/agents - Get audit summary by agent
router.get('/agents', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT agent, COUNT(*) as action_count,
              MAX(created_at) as last_action
       FROM audit_logs
       GROUP BY agent
       ORDER BY action_count DESC`
    );
    res.json({ summary: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
