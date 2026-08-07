const { Pool } = require('pg');

// The Neon-via-Vercel integration can prefix its injected env vars with the
// project name (e.g. "us_need_wipe_POSTGRES_URL") instead of using the plain
// names, depending on how the connection was set up. Check every variant.
const CONNECTION_STRING_KEYS = [
  'POSTGRES_URL',
  'DATABASE_URL',
  'POSTGRES_URL_NON_POOLING',
  'POSTGRES_PRISMA_URL',
  'us_need_wipe_POSTGRES_URL',
  'us_need_wipe_DATABASE_URL',
  'us_need_wipe_POSTGRES_URL_NON_POOLING',
  'us_need_wipe_POSTGRES_PRISMA_URL',
  'usneedwipe_POSTGRES_URL',
  'usneedwipe_DATABASE_URL',
  'usneedwipe_PRISMA_DATABASE_URL'
];

function getConnectionString() {
  for (let i = 0; i < CONNECTION_STRING_KEYS.length; i++) {
    const value = process.env[CONNECTION_STRING_KEYS[i]];
    if (value) return value;
  }
  return null;
}

let pool;
function getPool() {
  if (!pool) {
    const connectionString = getConnectionString();
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
          email TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      await p.query(`
        ALTER TABLE unw_users ADD COLUMN IF NOT EXISTS email TEXT;
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
      await p.query(`
        CREATE TABLE IF NOT EXISTS unw_promo_signups (
          id SERIAL PRIMARY KEY,
          email TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
      `);
      await p.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS unw_promo_signups_email_lower_idx ON unw_promo_signups (LOWER(email));
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

module.exports = { query, ensureSchema, getPool, getConnectionString };
