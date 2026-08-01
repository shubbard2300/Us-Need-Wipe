const db = require('../_lib/db');
const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    const { rows } = await db.query(
      'SELECT id, username, password_hash FROM unw_users WHERE LOWER(username) = LOWER($1)',
      [username]
    );
    const user = rows[0];
    if (!user || !auth.verifyPassword(password, user.password_hash)) {
      res.status(401).json({ error: 'Incorrect username or password.' });
      return;
    }
    const token = auth.signSession(user.id);
    auth.setSessionCookie(res, token);
    res.status(200).json({ username: user.username });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'Something went wrong signing you in.' });
  }
};
