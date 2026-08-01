module.exports = async (req, res) => {
  var candidates = [
    'POSTGRES_URL',
    'DATABASE_URL',
    'POSTGRES_URL_NON_POOLING',
    'POSTGRES_PRISMA_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NO_SSL',
    'PGHOST',
    'PGDATABASE',
    'PGUSER',
    'BLOB_READ_WRITE_TOKEN'
  ];
  var present = {};
  candidates.forEach(function (key) {
    present[key] = typeof process.env[key] === 'string' && process.env[key].length > 0;
  });
  var allEnvKeys = Object.keys(process.env).filter(function (k) {
    return /POSTGRES|DATABASE|PG[A-Z]|NEON|BLOB/i.test(k);
  });
  res.status(200).json({
    vercelEnv: process.env.VERCEL_ENV || null,
    present: present,
    matchingKeys: allEnvKeys
  });
};
