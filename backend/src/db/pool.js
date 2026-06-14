/**
 * PostgreSQL Connection Pool
 * Manages database connections for the EPN application
 */

const { Pool } = require('pg');

// Supabase Postgres connection
const pool = new Pool({
  connectionString: process.env.SUPABASE_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Required for Supabase
  max: 20,                  // max pool connections
  idleTimeoutMillis: 30000, // close idle connections after 30s
  connectionTimeoutMillis: 15000,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err);
});

/**
 * Execute a parameterized query
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a client from the pool (for transactions)
 */
const getClient = () => pool.connect();

module.exports = { query, getClient, pool };
