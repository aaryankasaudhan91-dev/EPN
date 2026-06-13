/**
 * Authentication Routes
 * POST /api/auth/register - Register a new user
 * POST /api/auth/login    - Login and get JWT token
 * GET  /api/auth/me       - Get current user profile
 * POST /api/auth/logout   - Logout (client-side token removal)
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { query } = require('../db/pool');
const { generateToken, authenticate } = require('../middleware/auth');
const { writeAuditLog } = require('../middleware/auditLogger');

const router = express.Router();

// ─── Register ──────────────────────────────────────────────────────────────────
router.post('/register', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('role').isIn(['student', 'teacher', 'admin', 'parent']).withMessage('Invalid role'),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, password, role, grade, parentEmail, teacherName } = req.body;
    let initialProfile = null;

    // Check if email already exists
    const { rows: existing } = await query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // If student, verify teacher exists BEFORE creating the user
    if (role === 'student') {
      if (!teacherName) {
        return res.status(400).json({ error: 'Teacher name is required for student registration' });
      }

      let assignedTeacherId = null;
      initialProfile = JSON.stringify({ learningStyle: 'visual', pace: 'medium', assignedTeacherId: null });

      if (teacherName === 'Mira') {
        let { rows: miraRows } = await query(
          "SELECT id FROM users WHERE role = 'teacher' AND name = 'Mira'"
        );
        if (miraRows.length === 0) {
          const miraPass = await bcrypt.hash('MiraAI123!_secure', 12);
          const { rows: newMira } = await query(
            `INSERT INTO users (name, email, password_hash, role, is_active) VALUES ('Mira', 'mira.ai@epn.edu', $1, 'teacher', true) RETURNING id`,
            [miraPass]
          );
          assignedTeacherId = newMira[0].id;
        } else {
          assignedTeacherId = miraRows[0].id;
        }
      } else {
        const { rows: teacherRows } = await query(
          "SELECT id FROM users WHERE role = 'teacher' AND name ILIKE $1",
          [teacherName]
        );

        if (teacherRows.length === 0) {
          return res.status(400).json({ error: 'Teacher not found in our records. Please check the name.' });
        }
        assignedTeacherId = teacherRows[0].id;
      }
      
      // We will store the assigned teacher in the learning_profile JSONB for future use
      initialProfile = JSON.stringify({ learningStyle: 'visual', pace: 'medium', assignedTeacherId });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, $4) RETURNING id, name, email, role, created_at`,
      [name, email, passwordHash, role]
    );
    const user = rows[0];

    // Create student profile if role is student
    if (role === 'student') {
      const { rows: studentRows } = await query(
        `INSERT INTO students (user_id, grade, learning_profile)
         VALUES ($1, $2, $3) RETURNING id`,
        [user.id, grade || '9', initialProfile]
      );

      // Link to parent if parentEmail provided
      if (parentEmail) {
        const { rows: parentRows } = await query(
          "SELECT id FROM users WHERE email = $1 AND role = 'parent'",
          [parentEmail]
        );
        if (parentRows.length > 0) {
          await query(
            'INSERT INTO parent_student_links (parent_id, student_id) VALUES ($1, $2)',
            [parentRows[0].id, studentRows[0].id]
          );
        }
      }
    }

    const token = generateToken(user.id, user.role);

    await writeAuditLog({
      agent: 'auth',
      action: 'user_registered',
      actorId: user.id,
      targetId: user.id,
      targetType: 'user',
      details: { role },
      ipAddress: req.ip,
    });

    res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    next(err);
  }
});

// ─── Login ─────────────────────────────────────────────────────────────────────
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    const { rows } = await query(
      'SELECT id, name, email, role, password_hash, is_active FROM users WHERE email = $1',
      [email]
    );

    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken(user.id, user.role);

    await writeAuditLog({
      agent: 'auth',
      action: 'user_logged_in',
      actorId: user.id,
      targetId: user.id,
      targetType: 'user',
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
});

// ─── Get Current User ──────────────────────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT u.id, u.name, u.email, u.role, u.avatar_url, u.last_login, u.created_at,
              s.id as student_id, s.grade, s.overall_mastery, s.risk_score
       FROM users u
       LEFT JOIN students s ON s.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );

    if (!rows.length) return res.status(404).json({ error: 'User not found' });

    const user = rows[0];
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatarUrl: user.avatar_url,
      lastLogin: user.last_login,
      createdAt: user.created_at,
      ...(user.student_id && {
        studentProfile: {
          id: user.student_id,
          grade: user.grade,
          overallMastery: user.overall_mastery,
          riskScore: user.risk_score,
        },
      }),
    });
  } catch (err) {
    next(err);
  }
});

// ─── Logout (client-side) ──────────────────────────────────────────────────────
router.post('/logout', authenticate, async (req, res) => {
  await writeAuditLog({
    agent: 'auth',
    action: 'user_logged_out',
    actorId: req.user.id,
    ipAddress: req.ip,
  });
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
