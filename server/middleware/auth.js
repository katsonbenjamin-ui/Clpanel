const jwt   = require('jsonwebtoken');
const { query } = require('../db');

async function authenticate(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Missing auth token' });
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  try {
    const { rows } = await query(
      `SELECT id, username, session_id, expiry_date, is_active, plan, runtime_status
       FROM panel_users WHERE id = $1`,
      [payload.userId]
    );

    if (!rows.length || !rows[0].is_active) {
      return res.status(403).json({ error: 'Account inactive or not found' });
    }

    const user = rows[0];

    // Only block on expiry if expiry_date is actually set (NULL = no expiry)
    if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
      return res.status(403).json({ error: 'Account expired' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[auth/middleware]', err.message);
    return res.status(500).json({ error: 'Auth verification failed' });
  }
}

module.exports = { authenticate };
