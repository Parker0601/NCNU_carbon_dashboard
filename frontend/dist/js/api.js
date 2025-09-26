// frontend/src/api/api.js
const API_BASE = 'http://localhost:3000/api';

// 從 localStorage 取 token（登入時存）
function getToken() {
  return localStorage.getItem('token');
}

// 封裝 fetch
export async function apiFetch(path, { method = 'GET', headers = {}, body } = {}) {
  const token = getToken();

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    credentials: 'include',
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || data.success === false) {
    throw new Error(data.message || `${res.status} ${res.statusText}`);
  }
  return data;
}