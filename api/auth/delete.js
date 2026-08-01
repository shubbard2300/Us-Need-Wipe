const db = require('../_lib/db');
const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const user = await auth.getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: 'Not signed in.' });
      return;
    }
    await db.query('DELETE FROM unw_users WHERE id = $1', [user.id]);
    auth.clearSessionCookie(res);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('delete account error', err);
    res.status(500).json({ error: 'Could not delete your account.' });
  }
};
