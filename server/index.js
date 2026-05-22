require('dotenv').config();
const express   = require('express');
const http      = require('http');
const path      = require('path');
const cors      = require('cors');
const helmet    = require('helmet');
const rateLimit = require('express-rate-limit');
const { Server: SocketServer } = require('socket.io');
const jwt       = require('jsonwebtoken');

const REQUIRED = ['DATABASE_URL', 'JWT_SECRET', 'CORE_URL', 'CORE_API_KEY'];
const missing  = REQUIRED.filter(k => !process.env[k]);
if (missing.length) {
  console.error('[FATAL] Missing required env vars:', missing.join(', '));
  process.exit(1);
}

const { query }     = require('./db');
const authRoutes    = require('./routes/auth');
const sessionRoutes = require('./routes/session');
const runtimeRoutes = require('./routes/runtime');

const app        = express();
const httpServer = http.createServer(app);

const io = new SocketServer(httpServer, { cors: { origin: '*' }, path: '/socket.io' });
io.use((socket, next) => {
  try {
    const p = jwt.verify(socket.handshake.auth?.token, process.env.JWT_SECRET);
    socket.userId = p.userId;
    next();
  } catch { next(new Error('Invalid token')); }
});
io.on('connection', (socket) => { socket.join('user:' + socket.userId); });
app.set('io', io);

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());
app.use('/api/',      rateLimit({ windowMs: 15*60*1000, max: 150, standardHeaders: true, legacyHeaders: false }));
app.use('/api/auth/', rateLimit({ windowMs: 15*60*1000, max: 20,  standardHeaders: true, legacyHeaders: false }));

app.use('/api/auth',    authRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/runtime', runtimeRoutes);
app.get('/api/healthz', (_, res) => res.json({ ok: true }));

if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '../client/dist');
  app.use(express.static(dist));
  app.get('*', (req, res) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) return;
    res.sendFile(path.join(dist, 'index.html'));
  });
}

async function migrate() {
  const sql = require('fs').readFileSync(path.join(__dirname, 'migrations/001_init.sql'), 'utf8');
  try { await query(sql); console.log('[db] migrated'); }
  catch (err) { console.error('[db] migration error:', err.message); }
}

const PORT = Number(process.env.PORT || 3000);
migrate().then(() => httpServer.listen(PORT, () => console.log('[panel] port ' + PORT)));

function shutdown(sig) {
  console.log('[panel] ' + sig + ' — shutting down...');
  httpServer.close(() => { process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  err => console.error('[panel] Uncaught:', err.message));
process.on('unhandledRejection', r   => console.error('[panel] Rejection:', r instanceof Error ? r.message : String(r)));
