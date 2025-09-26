// frontend/src/js/forget.js
// 本檔負責「忘記密碼」流程：
// 1) 登入頁的「忘記密碼」按鈕：導向 page_forget.html
// 2) 忘記密碼頁：送出 email 到 /api/auth/forget-password 申請重置
// 3) （可選）重置密碼頁：帶著 token 送 newPassword 到 /api/auth/reset-password

console.log('forget.js loaded');

(function () {
  // 後端 API 的 base URL（開發預設：容器對外 http://localhost:3000/api）
  const API_BASE = 'http://localhost:3000/api';

  // 1) 登入頁的「忘記密碼」按鈕：導向忘記密碼頁
  document.addEventListener('DOMContentLoaded', function () {
    const forgetBtn = document.getElementById('js-forget-btn');
    if (forgetBtn) {
      forgetBtn.addEventListener('click', function () {
        // 導向已編譯輸出的 page_forget.html
        window.location.href = 'page_forget.html';
      });
    }
  });

  // 2) 忘記密碼頁：提交 email 到 /api/auth/forget-password
  document.addEventListener('DOMContentLoaded', function () {
    // page_forget.hbs 的輸入欄位與按鈕
    const emailInput = document.getElementById('lostaccount'); // 使用者輸入的 email
    const recoverBtn = document.getElementById('js-login-btn'); // 「Recover」按鈕（頁面中現有 ID）

    if (emailInput && recoverBtn) {
      recoverBtn.addEventListener('click', async function (event) {
        // 停止表單的預設提交行為，改為用 fetch 送 API
        event.preventDefault();
        event.stopPropagation();

        const email = emailInput.value.trim();
        if (!email) {
          alert('請輸入電子郵件');
          return;
        }

        try {
          const resp = await fetch(`${API_BASE}/auth/forget-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
          });

          const data = await resp.json();

          // 成功時，後端在開發模式會回傳 resetLink（含 token）
          // 正式環境通常只顯示「已寄送」訊息
          if (resp.ok) {
            // 顯示提示訊息
            alert(data.message || '已寄送重置密碼連結（若信箱存在）');
            // 開發中可直接展示 resetLink（方便測試）
            if (data?.data?.resetLink) {
              console.log('開發用 resetLink:', data.data.resetLink);
              // 你也可以直接導向 resetLink 以測試下一階段
              // window.location.href = data.data.resetLink;
            }
          } else {
            alert(data.error || '重置請求失敗');
          }
        } catch (err) {
          console.error(err);
          alert('無法連線到伺服器');
        }
      });
    }
  });

  // 3) （可選）重置密碼頁：若 URL 具有 token 參數，提交新密碼到 /api/auth/reset-password
  // 若你將重置密碼也放在 page_forget.html 或另一個 reset 頁，請在該頁放入：
  // - 新密碼欄位 id="new-password"
  // - 送出按鈕 id="js-reset-btn"
  document.addEventListener('DOMContentLoaded', function () {
    const newPasswordInput = document.getElementById('new-password');
    const resetBtn = document.getElementById('js-reset-btn');

    if (newPasswordInput && resetBtn) {
      // 從網址 query 讀 token，例如 reset-password?token=xxxx
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');

      resetBtn.addEventListener('click', async function (event) {
        event.preventDefault();
        event.stopPropagation();

        const newPassword = newPasswordInput.value.trim();
        if (!token) {
          alert('缺少重置 token');
          return;
        }
        if (!newPassword || newPassword.length < 6) {
          alert('新密碼至少 6 碼');
          return;
        }

        try {
          const resp = await fetch(`${API_BASE}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, newPassword })
          });

          const data = await resp.json();
          if (resp.ok) {
            alert(data.message || '密碼已更新，請重新登入');
            window.location.href = 'page_login.html';
          } else {
            alert(data.error || '重置密碼失敗');
          }
        } catch (err) {
          console.error(err);
          alert('無法連線到伺服器');
        }
      });
    }
  });
})();