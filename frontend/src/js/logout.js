// src/js/logout.js
console.log('logout.js loaded (minimal)');

(function () {
  const API_BASE   = 'http://localhost:3000/api';
  const STORAGE_KEY = 'access_token';
  const ROLE_KEYS   = ['userRole', 'currentRole'];
  // 用「絕對路徑」比較穩：gulp/靜態伺服器多半掛在根目錄
  const LOGIN_PAGE  = '/page_login.html';
  
  function clearLocalAuth() {
    if (window.Auth && typeof Auth.clearToken === 'function') {
        Auth.clearToken();
    } else {
        [
        'access_token',
        'token',
        'user',
        'userRole',
        'currentRole',
        'userName',
        'userID'
        ].forEach(k => { try { localStorage.removeItem(k); } catch {} });
    }
    document.documentElement && document.documentElement.removeAttribute('data-user-role');
    }

  async function apiLogout() {
    const token = localStorage.getItem(STORAGE_KEY);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    try {
      await fetch(`${API_BASE}/auth/logout`, { method: 'POST', headers });
    } catch (e) {
      console.warn('[logout] API failed (ignored):', e);
    }
  }

  // 任何下列元素都視為 logout 觸發點
  const CLICK_SELECTOR = [
    '#btn-logout',
    '[data-action="logout"]',
    'a[title="Logout"]',
    'a[href$="page_login.html"]',
    'a[href="/page_login.html"]'
  ].join(',');

  // 用捕獲階段，避免被其他冒泡階段 handler 抢先攔掉
  document.addEventListener('click', async function (e) {
    const el = e.target.closest(CLICK_SELECTOR);
    if (!el) return;

    e.preventDefault();
    e.stopPropagation();

    if (el.__logoutPending) return;
    el.__logoutPending = true;

    await apiLogout();
    clearLocalAuth();

    console.log('[logout] redirect ->', LOGIN_PAGE);
    window.location.assign(LOGIN_PAGE);
  }, true);
})();
