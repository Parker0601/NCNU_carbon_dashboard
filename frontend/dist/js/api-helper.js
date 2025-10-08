// ==============================
// api-helper.js (統一API調用工具)
// ==============================

(function () {
  const API_BASE = 'http://localhost:3000/api';
  const STORAGE_KEY = 'token'; // 與login.js保持一致

  function getToken() {
    return localStorage.getItem(STORAGE_KEY);
  }

  function clearToken() {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem('user');
  }

  // 統一的API調用函數
  async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const url = `${API_BASE}${endpoint}`;
    
    const defaultOptions = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      ...options,
    };

    try {
      const response = await fetch(url, defaultOptions);
      const data = await response.json();

      // 處理認證錯誤
      if (response.status === 401) {
        clearToken();
        if (window.location.pathname !== '/page_login.html') {
          window.location.href = '/page_login.html';
        }
        throw new Error('Unauthorized - Please login again');
      }

      if (response.status === 403) {
        throw new Error('Forbidden - Insufficient permissions');
      }

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  // 檢查用戶是否已登入
  function isAuthenticated() {
    return !!getToken();
  }

  // 頁面載入時檢查身份驗證
  function requireAuth() {
    if (!isAuthenticated()) {
      window.location.href = '/page_login.html';
      return false;
    }
    return true;
  }

  // 導出到全局
  window.API = {
    call: apiCall,
    get: (endpoint, options) => apiCall(endpoint, { ...options, method: 'GET' }),
    post: (endpoint, body, options) => apiCall(endpoint, { ...options, method: 'POST', body: JSON.stringify(body) }),
    put: (endpoint, body, options) => apiCall(endpoint, { ...options, method: 'PUT', body: JSON.stringify(body) }),
    delete: (endpoint, options) => apiCall(endpoint, { ...options, method: 'DELETE' }),
    isAuthenticated,
    requireAuth,
    getToken,
    clearToken,
  };
})();
