const express  = require('express');
const { authenticate } = require('../middleware/auth');
const { callCore }     = require('../middleware/coreProxy');
const { query }        = require('../db');

const router = express.Router();

function requireSession(req, res, next) {
  if (!req.user.session_id)
    return res.status(400).json({ error: 'No session ID attached. Paste your BOTIFY-X session ID first.' });
  next();
}

async function logEvent(userId, event, message) {
  try { await query('INSERT INTO runtime_events (user_id, event, message) VALUES ($1,$2,$3)', [userId, event, message]); } catch {}
}

function expiresAt(user) { return user.expiry_date ? new Date(user.expiry_date).toISOString() : null; }

router.post('/start', authenticate, requireSession, async (req, res) => {
  const exp = expiresAt(req.user);
  if (exp && new Date(exp) < new Date())
    return res.status(403).json({ error: 'Your account has expired. Contact your admin to renew.' });
  await callCore('POST', '/runtime/' + req.user.session_id + '/register', { expiresAt: exp });
  const result = await callCore('POST', '/runtime/' + req.user.session_id + '/start', { expiresAt: exp });
  await logEvent(req.user.id, 'start', result.ok ? 'Bot started' : (result.data?.error || 'Failed'));
  return res.status(result.status).json(result.data);
});

router.post('/restart', authenticate, requireSession, async (req, res) => {
  const exp = expiresAt(req.user);
  if (exp && new Date(exp) < new Date())
    return res.status(403).json({ error: 'Your account has expired. Contact your admin to renew.' });
  const result = await callCore('POST', '/runtime/' + req.user.session_id + '/restart', { expiresAt: exp });
  await logEvent(req.user.id, 'restart', result.ok ? 'Bot restarted' : (result.data?.error || 'Failed'));
  return res.status(result.status).json(result.data);
});

router.post('/stop', authenticate, requireSession, async (req, res) => {
  const result = await callCore('POST', '/runtime/' + req.user.session_id + '/stop', {});
  await logEvent(req.user.id, 'stop', result.ok ? 'Bot stopped' : (result.data?.error || 'Failed'));
  return res.status(result.status).json(result.data);
});

router.get('/status', authenticate, requireSession, async (req, res) => {
  const exp = expiresAt(req.user);
  if (exp && new Date(exp) < new Date()) return res.json({ status: 'expired', connected: false });
  const result = await callCore('GET', '/runtime/' + req.user.session_id + '/status');
  return res.status(result.status).json(result.data);
});

router.get('/validate', authenticate, requireSession, async (req, res) => {
  const result = await callCore('GET', '/runtime/' + req.user.session_id + '/validate');
  return res.status(result.status).json(result.data);
});

router.get('/logs', authenticate, requireSession, async (req, res) => {
  const result = await callCore('GET', '/runtime/' + req.user.session_id + '/logs');
  return res.status(result.status).json(result.data);
});

router.get('/events', authenticate, async (req, res) => {
  try {
    const { rows } = await query(
      'SELECT event, message, created_at FROM runtime_events WHERE user_id=$1 ORDER BY created_at DESC LIMIT 30',
      [req.user.id]
    );
    return res.json({ events: rows });
  } catch { return res.status(500).json({ error: 'Failed to fetch events' }); }
});

module.exports = router;
