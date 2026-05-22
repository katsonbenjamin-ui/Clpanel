import React, { useState } from 'react';
import { useAuth } from '../App.jsx';
import { api } from '../api.js';

const S = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: 'radial-gradient(ellipse at 50% 0%, #1a0533 0%, #060611 60%)',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: 'rgba(15,10,30,0.85)',
    border: '1px solid rgba(124,58,237,0.25)',
    borderRadius: 20,
    padding: '40px 36px',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 24px 80px rgba(91,33,182,0.25)',
    animation: 'fadeIn 0.4s ease',
  },
  logo: { textAlign: 'center', marginBottom: 32 },
  logoIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    animation: 'glow 3s ease infinite',
  },
  title:    { fontSize: 22, fontWeight: 700, color: '#f5f3ff', letterSpacing: '-0.3px' },
  subtitle: { fontSize: 13, color: '#7c6fa0', marginTop: 4 },
  label: {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#a78bfa',
    marginBottom: 8,
    letterSpacing: '0.05em',
    textTransform: 'uppercase',
  },
  input: {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(124,58,237,0.2)',
    borderRadius: 10,
    padding: '12px 14px',
    color: '#f5f3ff',
    fontSize: 14,
    outline: 'none',
    marginBottom: 20,
    transition: 'border-color 0.2s',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    letterSpacing: '0.02em',
  },
  btn: {
    width: '100%',
    padding: '13px',
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 700,
    background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
    color: '#fff',
    letterSpacing: '0.02em',
    transition: 'opacity 0.2s, transform 0.1s',
  },
  error: {
    background: 'rgba(239,68,68,0.1)',
    border: '1px solid rgba(239,68,68,0.25)',
    borderRadius: 10,
    padding: '10px 14px',
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 16,
    lineHeight: 1.5,
  },
  infoBox: {
    marginTop: 20,
    padding: '12px 16px',
    background: 'rgba(124,58,237,0.07)',
    border: '1px solid rgba(124,58,237,0.15)',
    borderRadius: 10,
    fontSize: 12,
    color: '#6d5a9c',
    lineHeight: 1.65,
    textAlign: 'center',
  },
};

export default function Login() {
  const { login } = useAuth();
  const [inviteToken, setInviteToken] = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const tok = inviteToken.trim();
    if (!tok) { setError('Please enter your invite token.'); return; }

    // Basic UUID format check
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID_RE.test(tok)) {
      setError('Invalid token format. It should look like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const { token, user } = await api.tokenLogin(tok);
      login(token, user);
    } catch (err) {
      setError(err.message || 'Invalid or expired invite token. Contact your admin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={S.logo}>
          <div style={S.logoIcon}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
          </div>
          <div style={S.title}>BOTIFY X</div>
          <div style={S.subtitle}>Client Panel</div>
        </div>

        {error && <div style={S.error}>{error}</div>}

        <form onSubmit={submit} autoComplete="off">
          <label style={S.label}>Invite Token</label>
          <input
            style={S.input}
            type="text"
            value={inviteToken}
            onChange={e => setInviteToken(e.target.value)}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            required
            autoFocus
            spellCheck={false}
            onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
            onBlur={e  => e.target.style.borderColor = 'rgba(124,58,237,0.2)'}
          />
          <button
            style={{ ...S.btn, opacity: loading ? 0.6 : 1 }}
            type="submit"
            disabled={loading}
          >
            {loading ? 'Verifying...' : 'Access Panel'}
          </button>
        </form>

        <div style={S.infoBox}>
          Your invite token was sent to you by your admin.<br/>
          It looks like: <strong style={{color:'#a78bfa',fontFamily:'monospace'}}>xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx</strong><br/><br/>
          If you received a link, just open it directly — you'll be logged in automatically.
        </div>
      </div>
    </div>
  );
}
