// frontend/src/api/client.js
// Axios-style fetch wrapper with JWT auto-attach & refresh handling

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

let _token = localStorage.getItem('erp_token') || null;
let _wsInstance = null;

export const setToken = (t) => {
  _token = t;
  if (t) localStorage.setItem('erp_token', t);
  else    localStorage.removeItem('erp_token');
};

export const getToken = () => _token;

const request = async (method, path, body, isFormData = false) => {
  const headers = {};
  if (_token) headers['Authorization'] = `Bearer ${_token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (res.status === 401) {
    setToken(null);
    window.location.href = '/login';
    throw new Error('Session expired');
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
};

export const api = {
  get:    (path)         => request('GET',    path),
  post:   (path, body)   => request('POST',   path, body),
  put:    (path, body)   => request('PUT',    path, body),
  patch:  (path, body)   => request('PATCH',  path, body),
  delete: (path)         => request('DELETE', path),
  upload: (path, formData) => request('POST', path, formData, true),
};

// Auth helpers
export const authApi = {
  login:          (email, password) => api.post('/auth/login', { email, password }),
  me:             ()                => api.get('/auth/me'),
  changePassword: (cur, next)       => api.post('/auth/change-password',
                                        { currentPassword: cur, newPassword: next }),
};

// WebSocket
export const connectWS = (onMessage) => {
  const wsBase = (import.meta.env.VITE_API_URL || 'http://localhost:3001')
    .replace('http', 'ws').replace('/api', '');
  _wsInstance = new WebSocket(`${wsBase}/ws`);
  _wsInstance.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)); } catch (_) {}
  };
  _wsInstance.onclose = () => {
    setTimeout(() => connectWS(onMessage), 5000);
  };
  return _wsInstance;
};

export default api;
