import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../App';
import { api } from '../api';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Play, Square, RotateCcw, Link2, LogOut, ChevronRight, Unlink, AlertTriangle, WifiOff } from 'lucide-react';

const STATUS_META = {
  running:     { label: 'ONLINE',       color: '#4ade80', pulse: true  },
  starting:    { label: 'STARTING',     color: '#a855f7', pulse: true  },
  restarting:  { label: 'RESTARTING',   color: '#a855f7', pulse: true  },
  connecting:  { label: 'CONNECTING',   color: '#fbbf24', pulse: true  },
  stopped:     { label: 'OFFLINE',      color: '#f87171', pulse: false },
  expired:     { label: 'EXPIRED',      color: '#f87171', pulse: false },
  disconnected:{ label: 'DISCONNECTED', color: '#fbbf24', pulse: false },
};

export default function Dashboard() {
  const { user, setUser, logout } = useAuth();
  const [status, setStatus]   = useState('stopped');
  const [logs, setLogs]       = useState([]);
  const [events, setEvents]   = useState([]);
  const [sessionInput, setSessionInput] = useState('');
  const [showAttach, setShowAttach]     = useState(false);
  const [msg, setMsg]         = useState({ text:'', ok:true });
  const [loading, setLoading] = useState({});
  const termRef = useRef(null);
  const pollRef = useRef(null);

  const isExpired  = user?.expiry_date && new Date(user.expiry_date) < new Date();
  const hasSession = !!user?.session_id;
  const canControl = hasSession && !isExpired;
  const setL = (k,v) => setLoading(p => ({ ...p, [k]:v }));

  const fetchStatus = useCallback(async () => {
    if (!user?.session_id) return;
    try { const d = await api.status(); setStatus(d.status || 'stopped'); }
    catch { setStatus('disconnected'); }
  }, [user?.session_id]);

  const fetchLogs = useCallback(async () => {
    if (!user?.session_id) return;
    try { const d = await api.logs(); if (d.logs?.length) setLogs(d.logs.slice(-60)); } catch {}
  }, [user?.session_id]);

  const fetchEvents = useCallback(async () => {
    try { const d = await api.events(); setEvents(d.events || []); } catch {}
  }, []);

  useEffect(() => {
    if (isExpired) { setStatus('expired'); return; }
    fetchStatus(); fetchLogs(); fetchEvents();
    pollRef.current = setInterval(() => { fetchStatus(); fetchLogs(); }, 4000);
    return () => clearInterval(pollRef.current);
  }, [fetchStatus, fetchLogs, fetchEvents, isExpired]);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [logs, events]);

  const showMsg = (text, ok=true) => {
    setMsg({ text, ok });
    setTimeout(() => setMsg({ text:'', ok:true }), 5000);
  };

  const action = async (key, fn, label) => {
    setL(key, true);
    try {
      const d = await fn();
      showMsg(d.message || label + ' successful.', true);
      setTimeout(() => { fetchStatus(); fetchEvents(); }, 800);
    } catch(e) { showMsg(e.message || label + ' failed.', false); }
    finally { setL(key, false); }
  };

  const attachSession = async () => {
    if (!sessionInput.trim()) return;
    setL('attach', true);
    try {
      await api.attachSession(sessionInput.trim());
      try {
        const v = await api.validate();
        if (!v.valid && v.reason !== 'expired') {
          showMsg('Session ID not found in Core. Complete pairing in the portal first.', false);
          setL('attach', false); return;
        }
      } catch {}
      const me = await api.me(); setUser(me.user);
      setShowAttach(false); setSessionInput('');
      showMsg('Session attached. You can now start your bot.', true);
      fetchStatus(); fetchEvents();
    } catch(e) { showMsg(e.message || 'Failed to attach.', false); }
    finally { setL('attach', false); }
  };

  const detachSession = async () => {
    if (!confirm('Detach session? Your bot will stop.')) return;
    await action('detach', api.detachSession, 'Detach');
    const me = await api.me(); setUser(me.user);
    setStatus('stopped');
  };

  const sm      = STATUS_META[status] || STATUS_META.stopped;
  const expiry  = user?.expiry_date ? new Date(user.expiry_date).toLocaleDateString() : 'No expiry';

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',background:'radial-gradient(ellipse at top,#1a0533 0%,#050507 60%)'}}>
      <style>{`
        @keyframes bxpulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes bxspin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>

      {/* Header */}
      <header style={{borderBottom:'1px solid rgba(255,255,255,0.06)',background:'rgba(0,0,0,0.5)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:40}}>
        <div style={{maxWidth:'480px',margin:'0 auto',padding:'0.75rem 1rem',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
            <div style={{background:'rgba(168,85,247,0.12)',border:'1px solid rgba(168,85,247,0.3)',borderRadius:'0.6rem',padding:'0.375rem'}}>
              <Bot size={18} color="#a855f7"/>
            </div>
            <div>
              <p style={{fontWeight:800,fontSize:'0.9rem',color:'#fff'}}>BOTIFY X</p>
              <p style={{fontSize:'0.6rem',color:'#475569'}}>@{user?.username}</p>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <div style={{textAlign:'right'}}>
              <p style={{fontSize:'0.6rem',color:'#475569',textTransform:'uppercase',letterSpacing:'0.06em'}}>{user?.plan}</p>
              <p style={{fontSize:'0.6rem',color:isExpired?'#f87171':'#334155'}}>exp {expiry}</p>
            </div>
            <button onClick={logout} style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.07)',borderRadius:'0.5rem',padding:'0.4rem',cursor:'pointer',color:'#475569',display:'flex'}}>
              <LogOut size={14}/>
            </button>
          </div>
        </div>
      </header>

      <main style={{flex:1,maxWidth:'480px',margin:'0 auto',width:'100%',padding:'1rem',display:'flex',flexDirection:'column',gap:'0.875rem'}}>

        {/* Expiry banner */}
        {isExpired && (
          <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}}
            style={{background:'rgba(248,113,113,0.08)',border:'1px solid rgba(248,113,113,0.25)',borderRadius:'0.75rem',
              padding:'0.875rem 1rem',display:'flex',gap:'0.75rem',alignItems:'flex-start'}}>
            <AlertTriangle size={16} color="#f87171" style={{marginTop:'1px',flexShrink:0}}/>
            <div>
              <p style={{color:'#f87171',fontWeight:700,fontSize:'0.85rem',marginBottom:'0.2rem'}}>Account Expired</p>
              <p style={{color:'#64748b',fontSize:'0.78rem',lineHeight:1.5}}>
                {user?.expiry_date ? 'Expired ' + new Date(user.expiry_date).toLocaleDateString() + '. ' : ''}
                Contact your admin to renew your subscription.
              </p>
            </div>
          </motion.div>
        )}

        {/* Status + controls */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} className="glass" style={{padding:'1rem'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'1rem'}}>
            <span style={{fontSize:'0.65rem',fontWeight:700,letterSpacing:'0.12em',color:'#475569',textTransform:'uppercase'}}>Bot Runtime</span>
            <div style={{display:'flex',alignItems:'center',gap:'0.5rem'}}>
              <span style={{width:'8px',height:'8px',borderRadius:'50%',display:'inline-block',
                background:sm.color,boxShadow:sm.pulse?`0 0 8px ${sm.color}`:'none',
                animation:sm.pulse?'bxpulse 2s infinite':'none'}}/>
              <span style={{fontSize:'0.7rem',fontWeight:700,color:sm.color,letterSpacing:'0.08em'}}>{sm.label}</span>
            </div>
          </div>

          {!hasSession ? (
            <div style={{textAlign:'center',padding:'0.75rem 0'}}>
              <WifiOff size={24} color="#1e293b" style={{margin:'0 auto 0.75rem'}}/>
              <p style={{color:'#475569',fontSize:'0.82rem',marginBottom:'0.875rem',lineHeight:1.5}}>
                No session attached.<br/>Paste your <strong style={{color:'#a855f7'}}>BOTIFY-X=...</strong> ID from the pairing portal.
              </p>
              <button onClick={()=>setShowAttach(true)} className="btn btn-primary" style={{fontSize:'0.82rem'}}>
                <Link2 size={13}/> Attach Session ID
              </button>
            </div>
          ) : (
            <>
              <div style={{background:'rgba(0,0,0,0.35)',borderRadius:'0.5rem',padding:'0.45rem 0.75rem',marginBottom:'0.875rem',
                display:'flex',alignItems:'center',gap:'0.5rem'}}>
                <span style={{fontSize:'0.68rem',fontFamily:'monospace',color:'#a855f7',flex:1,
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user.session_id}</span>
                <button onClick={detachSession} title="Detach"
                  style={{background:'none',border:'none',cursor:'pointer',color:'#334155',padding:'0.1rem',flexShrink:0}}>
                  <Unlink size={12}/>
                </button>
              </div>

              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'0.5rem'}}>
                <button onClick={()=>action('start',api.start,'Start')}
                  disabled={!canControl||loading.start||['running','starting','connecting'].includes(status)}
                  className="btn btn-green" style={{flexDirection:'column',gap:'0.25rem',height:'3.25rem',fontSize:'0.78rem'}}>
                  <Play size={15}/><span>{loading.start?'...':'Start'}</span>
                </button>
                <button onClick={()=>action('restart',api.restart,'Restart')}
                  disabled={!canControl||loading.restart||['stopped','expired'].includes(status)}
                  className="btn btn-amber" style={{flexDirection:'column',gap:'0.25rem',height:'3.25rem',fontSize:'0.78rem'}}>
                  <RotateCcw size={15} style={loading.restart?{animation:'bxspin 1s linear infinite'}:undefined}/>
                  <span>{loading.restart?'...':'Restart'}</span>
                </button>
                <button onClick={()=>action('stop',api.stop,'Stop')}
                  disabled={!canControl||loading.stop||['stopped','expired'].includes(status)}
                  className="btn btn-red" style={{flexDirection:'column',gap:'0.25rem',height:'3.25rem',fontSize:'0.78rem'}}>
                  <Square size={15}/><span>{loading.stop?'...':'Stop'}</span>
                </button>
              </div>
            </>
          )}

          {msg.text && (
            <motion.p initial={{opacity:0}} animate={{opacity:1}} style={{
              marginTop:'0.75rem',fontSize:'0.78rem',textAlign:'center',
              color:msg.ok?'#4ade80':'#f87171'}}>
              {msg.text}
            </motion.p>
          )}
        </motion.div>

        {/* Attach panel */}
        <AnimatePresence>
          {showAttach && (
            <motion.div initial={{opacity:0,y:-8}} animate={{opacity:1,y:0}} exit={{opacity:0}}
              className="glass" style={{padding:'1rem',borderColor:'rgba(168,85,247,0.25)'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'0.75rem'}}>
                <span style={{fontSize:'0.7rem',fontWeight:700,letterSpacing:'0.1em',color:'#a855f7',textTransform:'uppercase'}}>Attach Session ID</span>
                <button onClick={()=>{setShowAttach(false);setSessionInput('');}} style={{background:'none',border:'none',color:'#475569',cursor:'pointer',fontSize:'1.25rem',lineHeight:1}}>×</button>
              </div>
              <p style={{fontSize:'0.78rem',color:'#475569',marginBottom:'0.75rem',lineHeight:1.55}}>
                Go to the <strong style={{color:'#fff'}}>Pairing Portal</strong>, link your WhatsApp,
                and copy the <strong style={{color:'#a855f7'}}>BOTIFY-X=...</strong> code sent to your phone.
              </p>
              <input className="input" placeholder="BOTIFY-X=abc123..."
                style={{fontFamily:'monospace',fontSize:'0.78rem',marginBottom:'0.625rem'}}
                value={sessionInput} onChange={e=>setSessionInput(e.target.value)}/>
              <button onClick={attachSession} disabled={loading.attach||!sessionInput.trim()}
                className="btn btn-primary" style={{width:'100%'}}>
                {loading.attach ? 'Validating...' : <><ChevronRight size={13}/> Attach</>}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Activity log */}
        <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:0.1}}
          className="glass" style={{padding:'1rem'}}>
          <p style={{fontSize:'0.6rem',fontWeight:700,letterSpacing:'0.12em',color:'#475569',textTransform:'uppercase',marginBottom:'0.75rem'}}>
            Activity Log
          </p>
          <div className="terminal" ref={termRef}>
            {events.length===0&&logs.length===0
              ? <span style={{color:'#1e293b'}}>No activity yet...</span>
              : <>
                  {[...events].reverse().map((e,i) => (
                    <div key={i} style={{marginBottom:'0.15rem'}}>
                      <span style={{color:'#1e293b'}}>[{new Date(e.created_at).toLocaleTimeString()}] </span>
                      <span style={{color:
                        e.event==='start'?'#4ade80':e.event==='stop'?'#f87171':
                        e.event==='restart'?'#fbbf24':e.event==='attach'?'#a855f7':'#64748b',
                        textTransform:'uppercase',fontSize:'0.7rem',marginRight:'0.4rem',fontWeight:700}}>
                        {e.event}
                      </span>
                      <span style={{color:'#64748b'}}>{e.message}</span>
                    </div>
                  ))}
                  {logs.map((l,i) => (
                    <div key={'l'+i} style={{marginBottom:'0.1rem'}}>
                      <span style={{color:'#1e293b'}}>[{new Date(l.ts).toLocaleTimeString()}] </span>
                      <span style={{color:'#334155'}}>{l.message}</span>
                    </div>
                  ))}
                </>
            }
          </div>
        </motion.div>
      </main>
    </div>
  );
}
