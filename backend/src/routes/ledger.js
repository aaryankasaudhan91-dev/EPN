/**
 * Ledger Routes - Blockchain simulation
 */

const express = require('express');
const { query } = require('../db/pool');
const { authenticate, authorize } = require('../middleware/auth');
const { verifyLedgerIntegrity, verifyRecord } = require('../services/ledger');

const router = express.Router();

// GET /api/ledger - Get ledger records
router.get('/', authenticate, authorize('admin', 'teacher', 'parent'), async (req, res, next) => {
  try {
    const { recordType, page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    const params = [];
    let whereClause = 'WHERE 1=1';

    if (recordType) {
      params.push(recordType);
      whereClause += ` AND record_type = $${params.length}`;
    }

    params.push(limit, offset);
    const { rows } = await query(
      `SELECT id, block_index, record_type, reference_id, data_hash, block_hash, created_at
       FROM ledger_records ${whereClause}
       ORDER BY block_index DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({ records: rows });
  } catch (err) {
    next(err);
  }
});

// GET /api/ledger/verify - Verify entire ledger integrity
router.get('/verify', authenticate, authorize('admin'), async (req, res, next) => {
  try {
    const result = await verifyLedgerIntegrity();
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// GET /api/ledger/verify/:referenceId - Verify a specific record
router.get('/verify/:referenceId', authenticate, async (req, res, next) => {
  try {
    const result = await verifyRecord(req.params.referenceId);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
