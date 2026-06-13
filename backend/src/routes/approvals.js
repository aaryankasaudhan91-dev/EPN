/**
 * Approvals Routes - HITL (Human-in-the-Loop) workflow
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getPendingApprovals } = require('../agents/orchestratorAgent');

const router = express.Router();

// GET /api/approvals/pending - Get all pending approvals for teacher
router.get('/pending', authenticate, authorize('teacher', 'admin'), async (req, res, next) => {
  try {
    const approvals = await getPendingApprovals(req.user.id);
    res.json(approvals);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
