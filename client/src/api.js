const BASE = '/api';
const token = () => localStorage.getItem('bx_token') || '';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Request failed'), { status: res.status, data });
  return data;
}

export const api = {
  login:         (u, p)  => req('POST',   '/auth/login',       { username: u, password: p }),
  tokenLogin:    (t)     => req('POST',   '/auth/token-login', { token: t }),
  me:            ()      => req('GET',    '/auth/me'),
  attachSession: (id)    => req('POST',   '/session/attach',   { sessionId: id }),
  detachSession: ()      => req('DELETE', '/session/detach'),
  start:         ()      => req('POST',   '/runtime/start'),
  stop:          ()      => req('POST',   '/runtime/stop'),
  restart:       ()      => req('POST',   '/runtime/restart'),
  status:        ()      => req('GET',    '/runtime/status'),
  validate:      ()      => req('GET',    '/runtime/validate'),
  logs:          ()      => req('GET',    '/runtime/logs'),
  events:        ()      => req('GET',    '/runtime/events'),
};
