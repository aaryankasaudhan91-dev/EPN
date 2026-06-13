/**
 * Database Migration Runner
 * Runs SQL migration files in order
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

async function runMigrations() {
  const client = await pool.connect();
  try {
    // Create migrations tracking table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    const migrationsDir = path.join(__dirname, 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    for (const file of files) {
      const { rows } = await client.query(
        'SELECT id FROM schema_migrations WHERE filename = $1',
        [file]
      );

      if (rows.length === 0) {
        console.log(`[MIGRATE] Running: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        console.log(`[MIGRATE] ✓ Completed: ${file}`);
      } else {
        console.log(`[MIGRATE] Skipping (already run): ${file}`);
      }
    }

    console.log('[MIGRATE] All migrations complete.');
  } catch (err) {
    console.error('[MIGRATE] Error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations().catch(err => {
  console.error(err);
  process.exit(1);
});
