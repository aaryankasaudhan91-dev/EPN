/**
 * JWT Authentication Middleware
 * Verifies JWT tokens and attaches user to request
 */

const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'epn-dev-secret-change-in-production';

const admin = require('firebase-admin');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin if not already initialized
if (!admin.getApps().length) {
  admin.initializeApp({
    projectId: process.env.FIREBASE_PROJECT_ID || 'epns-dfb87'
  });
}

/**
 * Verify JWT token and attach user to req.user
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];
    
    // Verify Firebase token
    const decoded = await getAuth().verifyIdToken(token);

    // Fetch fresh user data from DB using email from Firebase token
    const { rows } = await query(
      'SELECT id, name, email, role, is_active FROM users WHERE email = $1',
      [decoded.email]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(401).json({ error: 'User not found or inactive in database' });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    console.error('Auth Error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

/**
 * Role-Based Access Control middleware factory
 * @param {...string} roles - Allowed roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: req.user.role,
      });
    }
    next();
  };
};

/**
 * Generate a JWT token for a user
 */
const generateToken = (userId, role) => {
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
};

module.exports = { authenticate, authorize, generateToken };
