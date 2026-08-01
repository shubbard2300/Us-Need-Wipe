const { Pool } = require('pg');

let pool;
function getPool() {
  if (!pool) {
    const connectionString =
      process.env.POSTGRES_URL ||
      process.env.DATABASE_URL ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.POSTGRES_PRISMA_URL;
    if (!connectionString) {
      throw new Error('No Postgres connection string found in environment variables.');
    }
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false }
    });
  }
  return pool;
}

let schemaReady = null;
function ensureSchema() {
  if (!schemaReady) {
    schemaReady = (async () => {
      const p = getPool();
      await p.query(`
        CREATE TABLE IF NOT EXISTS unw_users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL,
          password_hash TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      await p.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS unw_users_username_lower_idx ON unw_users (LOWER(username));
      `);
      await p.query(`
        CREATE TABLE IF NOT EXISTS unw_scores (
          id SERIAL PRIMARY KEY,
          user_id INTEGER NOT NULL REFERENCES unw_users(id) ON DELETE CASCADE,
          score INTEGER NOT NULL,
          wipes INTEGER NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
    })();
  }
  return schemaReady;
}

async function query(text, params) {
  await ensureSchema();
  const p = getPool();
  return p.query(text, params);
}

module.exports = { query, ensureSchema, getPool };
