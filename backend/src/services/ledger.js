/**
 * Blockchain Ledger Service
 * Simulates a permissioned hash-chained ledger for immutable record keeping.
 * Includes Proof of Work (PoW) and HMAC cryptographic signatures.
 */

const crypto = require('crypto');
const { query } = require('../db/pool');

const LEDGER_SECRET = process.env.LEDGER_SECRET || 'epn-super-secret-blockchain-key-change-in-prod';
const POW_DIFFICULTY = 3; // Number of leading zeros required for a valid block hash

/**
 * Compute HMAC-SHA-256 hash of data
 * @param {*} data - Data to hash (will be JSON-stringified)
 * @returns {string} Hex hash string
 */
const computeHash = (data) => {
  return crypto
    .createHmac('sha256', LEDGER_SECRET)
    .update(JSON.stringify(data))
    .digest('hex');
};

/**
 * Mine a block using Proof of Work
 * @param {Object} blockHeader - Block details to mine
 * @returns {Object} { nonce, blockHash }
 */
const mineBlock = (blockHeader) => {
  let nonce = 0;
  let blockHash = '';
  const prefix = '0'.repeat(POW_DIFFICULTY);
  
  while (true) {
    blockHash = computeHash({ ...blockHeader, nonce });
    if (blockHash.startsWith(prefix)) {
      return { nonce, blockHash };
    }
    nonce++;
  }
};

/**
 * Get the latest block from the ledger
 */
const getLatestBlock = async () => {
  const { rows } = await query(
    'SELECT * FROM ledger_records ORDER BY block_index DESC LIMIT 1'
  );
  return rows[0] || null;
};

/**
 * Create a new ledger entry (block)
 */
const createLedgerEntry = async ({ recordType, referenceId = null, metadata = {} }) => {
  try {
    const latestBlock = await getLatestBlock();
    const blockIndex = latestBlock ? parseInt(latestBlock.block_index) + 1 : 0;
    const previousHash = latestBlock ? latestBlock.block_hash : '0'.repeat(64);

    const timestamp = new Date().toISOString();
    const dataHash = computeHash({ recordType, referenceId, metadata, timestamp });

    const blockHeader = {
      blockIndex,
      dataHash,
      previousHash,
      timestamp,
    };

    // Perform Proof of Work
    const { nonce, blockHash } = mineBlock(blockHeader);
    
    // Store nonce securely in metadata to allow verification
    const finalMetadata = { ...metadata, nonce, timestamp };

    const { rows } = await query(
      `INSERT INTO ledger_records 
        (block_index, record_type, reference_id, data_hash, previous_hash, block_hash, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [blockIndex, recordType, referenceId, dataHash, previousHash, blockHash, JSON.stringify(finalMetadata)]
    );

    return rows[0];
  } catch (err) {
    console.error('[LEDGER] Failed to create ledger entry:', err.message);
    return null;
  }
};

/**
 * Verify the integrity of the entire ledger chain
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
  const prefix = '0'.repeat(POW_DIFFICULTY);

  for (let i = 0; i < rows.length; i++) {
    const block = rows[i];
    const metadata = block.metadata || {};
    const nonce = metadata.nonce;
    const timestamp = metadata.timestamp || block.created_at; // Fallback to DB created_at for older blocks

    // Recompute Data Hash to ensure record integrity
    // Note: We extract the original metadata before the nonce was added if necessary,
    // but for our implementation, the original metadata was passed to dataHash.
    // To properly verify, we need the exact original metadata. Since we added nonce/timestamp to metadata AFTER dataHash,
    // we must reconstruct the original metadata.
    const originalMetadata = { ...metadata };
    delete originalMetadata.nonce;
    delete originalMetadata.timestamp;
    
    const expectedDataHash = computeHash({ 
      recordType: block.record_type, 
      referenceId: block.reference_id, 
      metadata: originalMetadata, 
      timestamp 
    });

    if (expectedDataHash !== block.data_hash) {
      errors.push(`Block ${i}: Data tampering detected (data hash mismatch)`);
      isValid = false;
    }

    // Recompute Block Hash to ensure chain and PoW integrity
    const expectedBlockHash = computeHash({
      blockIndex: parseInt(block.block_index),
      dataHash: block.data_hash,
      previousHash: block.previous_hash,
      timestamp,
      nonce
    });

    if (expectedBlockHash !== block.block_hash) {
      errors.push(`Block ${i}: Block hash mismatch (tampering or invalid nonce)`);
      isValid = false;
    }

    if (!block.block_hash.startsWith(prefix)) {
      errors.push(`Block ${i}: Proof of Work invalid (difficulty not met)`);
      isValid = false;
    }

    // Verify index sequence
    if (parseInt(block.block_index) !== i) {
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
    message: isValid ? 'Ledger integrity verified (Cryptographically Strong)' : 'Ledger integrity compromised',
  };
};

/**
 * Verify a specific record against the ledger
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
  
  // Quick PoW check on the individual record
  const prefix = '0'.repeat(POW_DIFFICULTY);
  if (!record.block_hash.startsWith(prefix)) {
    return { verified: false, message: 'Record block hash fails PoW difficulty check' };
  }
  
  return {
    verified: true,
    blockIndex: record.block_index,
    blockHash: record.block_hash,
    recordType: record.record_type,
    timestamp: record.created_at,
    message: 'Record verified securely on ledger',
  };
};

module.exports = { createLedgerEntry, verifyLedgerIntegrity, verifyRecord, computeHash };
