// ==============================
// auth.js  (前端共用認證/授權工具)
// ==============================

(function () {
  const API_BASE = '/api/v1/auth';
  const PROFILE_ENDPOINT = '/profile';
  const LOGIN_PAGE = '/page_login';
  const FORBIDDEN_PAGE = '/403';
  const STORAGE_KEY = 'access_token';

  // 後端目前 role: '1' | '2' | '3'
  const ROLE_MAP = {
    '1': 'staff',
    '2': 'manager',
    '3': 'boss',
    staff: 'staff',
    manager: 'manager',
    boss: 'boss',
  };

  const PAGE_BY_ROLE = {
    staff: '/staff_dashboard',
    manager: '/manager_dashboard',
    boss: '/boss_dashboard',
  };

  function getToken() { return localStorage.getItem(STORAGE_KEY); }
  function setToken(t) { localStorage.setItem(STORAGE_KEY, t); }
  function clearToken() { localStorage.removeItem(STORAGE_KEY); }

  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && !e.newValue && location.pathname !== LOGIN_PAGE) {
      location.href = LOGIN_PAGE;
    }
  });

  async function fetchWithAuth(input, init = {}) {
    const token = getToken();
    const headers = new Headers(init.headers || {});
    if (token) headers.set('Authorization', 'Bearer ' + token);

    const resp = await fetch(input, { ...init, headers });

    if (resp.status === 401) {
      clearToken();
      if (location.pathname !== LOGIN_PAGE) location.href = LOGIN_PAGE;
      throw new Error('Unauthorized');
    }
    if (resp.status === 403) {
      if (location.pathname !== FORBIDDEN_PAGE) location.href = FORBIDDEN_PAGE;
      throw new Error('Forbidden');
    }
    return resp;
  }

  function normalizeRole(roleValue) {
    return ROLE_MAP[String(roleValue)] || String(roleValue);
  }

  function redirectByRole(roleValue) {
    const role = normalizeRole(roleValue);
    const target = PAGE_BY_ROLE[role] || LOGIN_PAGE;
    location.href = target;
  }

  async function getCurrentUser(forceRefresh = false) {
    if (!forceRefresh && window.CURRENT_USER) return window.CURRENT_USER;
    const res = await fetchWithAuth(API_BASE + PROFILE_ENDPOINT, { method: 'GET' });
    const json = await res.json();
    const data = json?.data || json?.user || json;
    if (!data) throw new Error('Profile parse error');
    const user = {
      id: data.id,
      name: data.name,
      role: normalizeRole(data.role),
      mail: data.mail,
      createTime: data.createTime,
    };
    window.CURRENT_USER = user;
    return user;
  }

  async function ensureAuth(requiredRoles = []) {
    const token = getToken();
    if (!token) {
      if (location.pathname !== LOGIN_PAGE) location.href = LOGIN_PAGE;
      return;
    }
    try {
      const user = await getCurrentUser();
      if (requiredRoles.length > 0) {
        const normalized = requiredRoles.map(normalizeRole);
        if (!normalized.includes(user.role)) {
          redirectByRole(user.role);
          return;
        }
      }
    } catch (err) {
      clearToken();
      if (location.pathname !== LOGIN_PAGE) location.href = LOGIN_PAGE;
    }
  }

  async function login({ email, password }) {
    const res = await fetch(API_BASE + '/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Login failed');

    const token = json?.data?.token || json?.token;
    const user = json?.data?.user || json?.user;
    if (!token || !user) throw new Error('Malformed login response');

    setToken(token);
    window.CURRENT_USER = { ...user, role: normalizeRole(user.role) };
    redirectByRole(window.CURRENT_USER.role);
  }

  async function logout({ callServer = false } = {}) {
    try {
      if (callServer) await fetchWithAuth(API_BASE + '/logout', { method: 'POST' });
    } catch {}
    clearToken();
    window.CURRENT_USER = null;
    if (location.pathname !== LOGIN_PAGE) location.href = LOGIN_PAGE;
  }

  async function requestPasswordReset(email) {
    const res = await fetch(API_BASE + '/forget-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Failed to request password reset');
    return json;
  }

  async function resetPassword({ token, newPassword }) {
    const res = await fetch(API_BASE + '/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json?.message || 'Failed to reset password');
    return json;
  }

  window.Auth = {
    getToken, setToken, clearToken,
    fetchWithAuth, ensureAuth, getCurrentUser,
    normalizeRole, redirectByRole,
    login, logout,
    requestPasswordReset, resetPassword,
  };
})();
