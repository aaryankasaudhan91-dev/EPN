/**
 * Knowledge Graph Routes
 */

const express = require('express');
const { query } = require('../db/pool');
const { authenticate } = require('../middleware/auth');
const { getStudentKnowledgeGraph, identifyWeakAreas } = require('../agents/diagnosticAgent');

const router = express.Router();

// GET /api/knowledge-graph/:studentId - Get full knowledge graph
router.get('/:studentId', authenticate, async (req, res, next) => {
  try {
    const graph = await getStudentKnowledgeGraph(req.params.studentId);
    res.json({ graph });
  } catch (err) {
    next(err);
  }
});

// GET /api/knowledge-graph/:studentId/weak-areas - Get weak areas
router.get('/:studentId/weak-areas', authenticate, async (req, res, next) => {
  try {
    const weakAreas = await identifyWeakAreas(req.params.studentId);
    res.json({ weakAreas });
  } catch (err) {
    next(err);
  }
});

// GET /api/knowledge-graph/:studentId/subject/:subject - Get subject-specific graph
router.get('/:studentId/subject/:subject', authenticate, async (req, res, next) => {
  try {
    const { rows } = await query(
      `SELECT * FROM knowledge_graph
       WHERE student_id = $1 AND subject = $2
       ORDER BY mastery_level ASC`,
      [req.params.studentId, req.params.subject]
    );
    res.json({ concepts: rows });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
