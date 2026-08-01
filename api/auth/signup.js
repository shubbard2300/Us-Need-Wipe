const db = require('../_lib/db');
const auth = require('../_lib/auth');

const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      res.status(400).json({ error: 'Username must be 3-20 characters: letters, numbers, underscore.' });
      return;
    }
    if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
      res.status(400).json({ error: 'Password must be at least 6 characters.' });
      return;
    }

    const existing = await db.query('SELECT id FROM unw_users WHERE LOWER(username) = LOWER($1)', [username]);
    if (existing.rows.length) {
      res.status(409).json({ error: 'That username is already taken.' });
      return;
    }

    const passwordHash = auth.hashPassword(password);
    const inserted = await db.query(
      'INSERT INTO unw_users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
      [username, passwordHash]
    );
    const user = inserted.rows[0];
    const token = auth.signSession(user.id);
    auth.setSessionCookie(res, token);
    res.status(200).json({ username: user.username });
  } catch (err) {
    console.error('signup error', err);
    res.status(500).json({ error: 'Something went wrong creating your account.' });
  }
};
