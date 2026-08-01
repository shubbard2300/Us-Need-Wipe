const db = require('./_lib/db');
const auth = require('./_lib/auth');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const user = await auth.getCurrentUser(req);
    if (!user) {
      res.status(401).json({ error: 'Sign in to submit a score.' });
      return;
    }
    const { score, wipes } = req.body || {};
    const scoreNum = Number(score);
    const wipesNum = Number(wipes) || 0;
    if (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > 100000) {
      res.status(400).json({ error: 'Invalid score.' });
      return;
    }
    await db.query('INSERT INTO unw_scores (user_id, score, wipes) VALUES ($1, $2, $3)', [
      user.id,
      Math.round(scoreNum),
      Math.round(wipesNum)
    ]);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('scores error', err);
    res.status(500).json({ error: 'Could not save your score.' });
  }
};
