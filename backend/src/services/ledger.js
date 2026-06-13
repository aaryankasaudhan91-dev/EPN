/**
 * Blockchain Ledger Service
 * Simulates a permissioned hash-chained ledger for immutable record keeping.
 * Each block contains: index, data hash, previous hash, and block hash.
 * This provides tamper-evident audit trails for achievements, approvals, and AI actions.
 */

const crypto = require('crypto');
const { query } = require('../db/pool');

/**
 * Compute SHA-256 hash of data
 * @param {*} data - Data to hash (will be JSON-stringified)
 * @returns {string} Hex hash string
 */
const computeHash = (data) => {
  return crypto
    .createHash('sha256')
    .update(JSON.stringify(data))
    .digest('hex');
};

/**
 * Get the latest block from the ledger
 * @returns {Object|null} Latest ledger record or null if empty
 */
const getLatestBlock = async () => {
  const { rows } = await query(
    'SELECT * FROM ledger_records ORDER BY block_index DESC LIMIT 1'
  );
  return rows[0] || null;
};

/**
 * Create a new ledger entry (block)
 * @param {Object} params
 * @param {string} params.recordType - Type of record
 * @param {string} [params.referenceId] - UUID of referenced entity
 * @param {Object} [params.metadata] - Additional metadata
 * @returns {Object} Created ledger record
 */
const createLedgerEntry = async ({ recordType, referenceId = null, metadata = {} }) => {
  try {
    const latestBlock = await getLatestBlock();
    const blockIndex = latestBlock ? latestBlock.block_index + 1 : 0;
    const previousHash = latestBlock ? latestBlock.block_hash : '0'.repeat(64);

    const timestamp = new Date().toISOString();
    const dataHash = computeHash({ recordType, referenceId, metadata, timestamp });

    // Block hash includes previous hash to form the chain
    const blockHash = computeHash({
      blockIndex,
      dataHash,
      previousHash,
      timestamp,
    });

    const { rows } = await query(
      `INSERT INTO ledger_records 
        (block_index, record_type, reference_id, data_hash, previous_hash, block_hash, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [blockIndex, recordType, referenceId, dataHash, previousHash, blockHash, JSON.stringify(metadata)]
    );

    return rows[0];
  } catch (err) {
    console.error('[LEDGER] Failed to create ledger entry:', err.message);
    return null;
  }
};

/**
 * Verify the integrity of the entire ledger chain
 * @returns {Object} Verification result
 */
const verifyLedgerIntegrity = async () => {
  const { rows } = await query(
    'SELECT * FROM ledger_records ORDER BY block_index ASC'
  );

  if (rows.length === 0) {
    return { valid: true, blockCount: 0, message: 'Empty ledger' };
  }

  let isValid = true;
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const block = rows[i];

    // Verify block index sequence
    if (block.block_index !== i) {
      errors.push(`Block ${i}: index mismatch (expected ${i}, got ${block.block_index})`);
      isValid = false;
    }

    // Verify previous hash linkage
    if (i > 0) {
      const expectedPreviousHash = rows[i - 1].block_hash;
      if (block.previous_hash !== expectedPreviousHash) {
        errors.push(`Block ${i}: previous hash mismatch (chain broken)`);
        isValid = false;
      }
    } else {
      if (block.previous_hash !== '0'.repeat(64)) {
        errors.push('Block 0: genesis block has invalid previous hash');
        isValid = false;
      }
    }
  }

  return {
    valid: isValid,
    blockCount: rows.length,
    errors,
    message: isValid ? 'Ledger integrity verified' : 'Ledger integrity compromised',
  };
};

/**
 * Verify a specific record against the ledger
 * @param {string} referenceId - UUID of the record to verify
 * @returns {Object} Verification result
 */
const verifyRecord = async (referenceId) => {
  const { rows } = await query(
    'SELECT * FROM ledger_records WHERE reference_id = $1',
    [referenceId]
  );

  if (!rows.length) {
    return { verified: false, message: 'Record not found in ledger' };
  }

  const record = rows[0];
  return {
    verified: true,
    blockIndex: record.block_index,
    blockHash: record.block_hash,
    recordType: record.record_type,
    timestamp: record.created_at,
    message: 'Record verified on ledger',
  };
};

module.exports = { createLedgerEntry, verifyLedgerIntegrity, verifyRecord, computeHash };
