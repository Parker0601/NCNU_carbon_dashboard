// src/js/logout.js
console.log('logout.js loaded');

(function () {
  // 與 register.js 同一風格
  const API_BASE    = 'http://localhost:3000/api';
  const STORAGE_KEY = 'access_token';
  const ROLE_KEYS   = ['userRole', 'currentRole'];
  const LOGIN_PAGE  = '/page_login';

  // 清本地登入狀態
  function clearLocalAuth() {
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    ROLE_KEYS.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    document.documentElement && document.documentElement.removeAttribute('data-user-role');
  }

  // 發出後端登出
  async function callApiLogout() {
    const token = localStorage.getItem(STORAGE_KEY);
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;

    // 無論成功/失敗都不阻擋後續清除與導頁
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: 'POST',
        headers,
        // 如果你的後端還用 cookie/session，可開下面這行：
        // credentials: 'include',
      });
    } catch (e) {
      console.warn('logout API failed (ignored):', e);
    }
  }

  // 事件處理：支援任何帶 data-action="logout" 或 id="btn-logout" 的元素
  $(document).on('click', '#btn-logout, [data-action="logout"]', async function (e) {
    e.preventDefault();
    e.stopPropagation();

    // 防重複點擊
    const $el = $(this);
    if ($el.data('logoutPending')) return;
    $el.data('logoutPending', true);

    try {
      await callApiLogout();
    } finally {
      clearLocalAuth();
      window.location.href = LOGIN_PAGE;  // 與你的路由一致：/page_login
    }
  });
})();
