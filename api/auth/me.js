const auth = require('../_lib/auth');

module.exports = async (req, res) => {
  try {
    const user = await auth.getCurrentUser(req);
    res.status(200).json({ username: user ? user.username : null });
  } catch (err) {
    console.error('me error', err);
    res.status(200).json({ username: null });
  }
};
