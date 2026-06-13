const express = require('express');
const router = express.Router();
const { query } = require('../db/pool');

// ─── MOOD CHECK-IN (Feature 2) ────────────────────────────────────────────────
// GET /api/cognitive/mood
router.get('/mood', async (req, res, next) => {
  try {
    const studentId = req.query.student_id;
    if (!studentId) return res.status(400).json({ error: 'Missing student_id' });

    const result = await query(
      'SELECT * FROM student_mood_logs WHERE student_id = $1 ORDER BY logged_at DESC LIMIT 1',
      [studentId]
    );
    res.json({ moodLog: result.rows[0] || null });
  } catch (err) {
    next(err);
  }
});

// POST /api/cognitive/mood
router.post('/mood', async (req, res, next) => {
  try {
    const { student_id, mood, energy_level, notes } = req.body;
    
    if (!student_id || !mood || energy_level == null) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      `INSERT INTO student_mood_logs (student_id, mood, energy_level, notes) 
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [student_id, mood, energy_level, notes]
    );

    res.json({ moodLog: result.rows[0], message: 'Mood logged successfully' });
  } catch (err) {
    next(err);
  }
});

// ─── MICRO-TASKS (Feature 4 & 18) ─────────────────────────────────────────────
// GET /api/cognitive/micro-tasks
router.get('/micro-tasks', async (req, res, next) => {
  try {
    const studentId = req.query.student_id;
    if (!studentId) return res.status(400).json({ error: 'Missing student_id' });

    const result = await query(
      'SELECT * FROM micro_tasks WHERE student_id = $1 AND is_completed = false ORDER BY created_at ASC',
      [studentId]
    );
    res.json({ microTasks: result.rows });
  } catch (err) {
    next(err);
  }
});

// POST /api/cognitive/micro-tasks/complete/:id
router.post('/micro-tasks/complete/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      `UPDATE micro_tasks SET is_completed = true, completed_at = NOW() 
       WHERE id = $1 RETURNING *`,
      [id]
    );
    if (result.rowCount === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ microTask: result.rows[0], message: 'Task completed' });
  } catch (err) {
    next(err);
  }
});

// POST /api/cognitive/micro-tasks
router.post('/micro-tasks', async (req, res, next) => {
  try {
    const { student_id, learning_plan_id, title, description, estimated_time, is_low_friction } = req.body;
    
    const result = await query(
      `INSERT INTO micro_tasks (student_id, learning_plan_id, title, description, estimated_time, is_low_friction) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [student_id, learning_plan_id, title, description, estimated_time || 5, is_low_friction || false]
    );

    res.json({ microTask: result.rows[0], message: 'Micro-task created' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
