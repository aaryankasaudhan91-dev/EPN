/**
 * User Management Routes
 * Admin-only user management endpoints
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { query } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/auditLogger');

const router = express.Router();

// GET /api/users - List all users (admin only)
router.get('/', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { role, page = 1, limit = 20, search } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (role) {
      params.push(role);
      whereClause += ` AND u.role = $${params.length}`;
    }

    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.last_login, u.created_at,
              s.grade, s.overall_mastery, s.risk_score
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       ${whereClause}
       ORDER BY u.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const { rows: countRows } = await query(
      `SELECT COUNT(*) FROM users u ${whereClause}`,
      params.slice(0, -2)
    );

    res.json({
      users: rows,
      total: parseInt(countRows[0].count),
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id - Get user by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    // Users can only view their own profile unless admin
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.is_active, u.last_login, u.created_at,
              s.id as student_id, s.grade, s.learning_profile, s.overall_mastery, s.risk_score
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/:id - Update user
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { name, avatarUrl } = req.body;
    const { rows } = await query(
      `UPDATE users SET name = COALESCE($1, name), avatar_url = COALESCE($2, avatar_url), updated_at = NOW()
       WHERE id = $3 RETURNING id, name, email, role, avatar_url`,
      [name, avatarUrl, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    await writeAuditLog({
      agent: 'user_management',
      action: 'user_updated',
      actorId: req.user.id,
      targetId: req.params.id,
      targetType: 'user',
      details: { fields: Object.keys(req.body) },
    });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/status - Toggle user active status (admin only)
router.patch('/:id/status', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const { isActive } = req.body;
    const { rows } = await query(
      'UPDATE users SET is_active = $1, updated_at = NOW() WHERE id = $2 RETURNING id, name, is_active',
      [isActive, req.params.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    await writeAuditLog({
      agent: 'user_management',
      action: isActive ? 'user_activated' : 'user_deactivated',
      actorId: req.user.id,
      targetId: req.params.id,
      targetType: 'user',
    });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// ─── /me endpoints ────────────────────────────────────────────────────────────

// GET /api/users/me - Get current user's full profile
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.is_active, u.last_login, u.created_at,
              s.id as student_id, s.grade, s.learning_profile, s.overall_mastery, s.risk_score
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me - Update current user's profile (name, email)
router.put('/me', authenticate, async (req, res, next) => {
  try {
    const { name, email, avatarUrl } = req.body;

    // If email is being changed, ensure it's not already taken
    if (email && email !== req.user.email) {
      const { rows: existing } = await query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, req.user.id]
      );
      if (existing.length) {
        return res.status(409).json({ error: 'Email already in use by another account' });
      }
    }

    const { rows } = await query(
      `UPDATE users
       SET name       = COALESCE($1, name),
           email      = COALESCE($2, email),
           avatar_url = COALESCE($3, avatar_url),
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, name, email, role, avatar_url`,
      [name || null, email || null, avatarUrl || null, req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    await writeAuditLog({
      agent: 'user_management',
      action: 'profile_updated',
      actorId: req.user.id,
      targetId: req.user.id,
      targetType: 'user',
      details: { fields: Object.keys(req.body) },
    });

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
});

// PUT /api/users/me/password - Change current user's password
router.put('/me/password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters' });
    }

    // Fetch current password hash
    const { rows } = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const valid = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });

    const newHash = await bcrypt.hash(newPassword, 12);
    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, req.user.id]
    );

    await writeAuditLog({
      agent: 'user_management',
      action: 'password_changed',
      actorId: req.user.id,
      targetId: req.user.id,
      targetType: 'user',
    });

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    next(err);
  }
});

// GET /api/users/me/preferences - Get user preferences
router.get('/me/preferences', authenticate, async (req, res, next) => {
  try {
    // Preferences are stored as a JSONB column; fall back gracefully if column absent
    const { rows } = await query(
      'SELECT preferences FROM users WHERE id = $1',
      [req.user.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'User not found' });
    res.json({ preferences: rows[0].preferences || {} });
  } catch (err) {
    // If the column doesn't exist yet, return empty object
    if (err.code === '42703') return res.json({ preferences: {} });
    next(err);
  }
});

// PUT /api/users/me/preferences - Save user preferences
router.put('/me/preferences', authenticate, async (req, res, next) => {
  try {
    const { preferences } = req.body;
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({ error: 'preferences object is required' });
    }

    // Merge with existing preferences
    await query(
      `UPDATE users
       SET preferences = COALESCE(preferences, '{}'::jsonb) || $1::jsonb,
           updated_at  = NOW()
       WHERE id = $2`,
      [JSON.stringify(preferences), req.user.id]
    );

    res.json({ success: true, preferences });
  } catch (err) {
    // If the column doesn't exist yet, silently succeed (localStorage fallback)
    if (err.code === '42703') return res.json({ success: true, preferences: req.body.preferences });
    next(err);
  }
});

// GET /api/users/notifications - Get notifications for current user
router.get('/me/notifications', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [req.user.id]
    );
    const unreadCount = rows.filter(n => !n.is_read).length;
    res.json({ notifications: rows, unreadCount });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/notifications/:id/read - Mark notification as read
router.patch('/notifications/:id/read', authenticate, async (req, res, next) => {
  try {
    await query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
