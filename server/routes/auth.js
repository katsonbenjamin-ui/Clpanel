const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { query } = require('../db');

const router = express.Router();

function signToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '12h' });
}

// POST /api/auth/login — username + password (default: "user")
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'username and password are required' });
  }

  try {
    const { rows } = await query(
      `SELECT id, username, password_hash, session_id, expiry_date, is_active, plan, runtime_status
       FROM panel_users WHERE username = $1`,
      [username.trim()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact your admin.' });
    }

    // Only block on expiry if expiry_date is actually set
    if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
      return res.status(403).json({ error: 'Account has expired. Contact your admin to renew.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { password_hash, ...safeUser } = user;
    return res.json({ token: signToken(user.id), user: safeUser });
  } catch (err) {
    console.error('[auth/login]', err.message);
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/token-login — panel token auto-login (from panel link ?token=...)
router.post('/token-login', async (req, res) => {
  const { token } = req.body || {};
  if (!token) {
    return res.status(400).json({ error: 'token is required' });
  }

  try {
    const { rows } = await query(
      `SELECT id, username, session_id, expiry_date, is_active, plan, runtime_status
       FROM panel_users WHERE panel_token = $1`,
      [token.trim()]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Invalid or expired panel link' });
    }

    const user = rows[0];

    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact your admin.' });
    }

    if (user.expiry_date && new Date(user.expiry_date) < new Date()) {
      return res.status(403).json({ error: 'Account has expired. Contact your admin to renew.' });
    }

    return res.json({ token: signToken(user.id), user });
  } catch (err) {
    console.error('[auth/token-login]', err.message);
    return res.status(500).json({ error: 'Token login failed' });
  }
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth').authenticate, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
