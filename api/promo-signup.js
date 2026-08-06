const db = require('./_lib/db');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { email } = req.body || {};
    const trimmed = typeof email === 'string' ? email.trim() : '';
    if (!trimmed || trimmed.length > 200 || !EMAIL_RE.test(trimmed)) {
      res.status(400).json({ error: 'Enter a valid email address.' });
      return;
    }
    await db.query(
      'INSERT INTO unw_promo_signups (email) VALUES ($1) ON CONFLICT (LOWER(email)) DO NOTHING',
      [trimmed]
    );
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('promo signup error', err);
    res.status(500).json({ error: 'Something went wrong. Try again.' });
  }
};
