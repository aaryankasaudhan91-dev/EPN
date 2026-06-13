/**
 * Agent Management Routes
 * Trigger agent actions and get system health
 */

const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { getSystemHealth, processAssessmentSubmission } = require('../agents/orchestratorAgent');
const { runBatchMonitoring } = require('../agents/monitorAgent');

const router = express.Router();

// GET /api/agents/health - Get agent system health
router.get('/health', authenticate, authorize('admin'), async (req, res) => {
  const health = getSystemHealth();
  res.json(health);
});

// POST /api/agents/monitor/run - Trigger batch monitoring (admin)
router.post('/monitor/run', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const results = await runBatchMonitoring();
    res.json({ message: 'Batch monitoring completed', results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
