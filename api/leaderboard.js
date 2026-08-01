const db = require('./_lib/db');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const { rows } = await db.query(
      `SELECT u.username AS username, MAX(s.score) AS score
       FROM unw_scores s
       JOIN unw_users u ON u.id = s.user_id
       GROUP BY u.username
       ORDER BY score DESC
       LIMIT 10`
    );
    res.status(200).json({
      leaderboard: rows.map((r) => ({ username: r.username, score: Number(r.score) }))
    });
  } catch (err) {
    console.error('leaderboard error', err);
    res.status(500).json({ error: 'Could not load the leaderboard.' });
  }
};
