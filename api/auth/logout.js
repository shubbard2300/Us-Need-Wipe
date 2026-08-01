const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  auth.clearSessionCookie(res);
  res.status(200).json({ ok: true });
};
