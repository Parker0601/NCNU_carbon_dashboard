(function () {
  // 不動你的 API_BASE
  const API_BASE = 'http://localhost:3000/api';

  // 示範帳號下拉選單填充（保留你的寫法）
  $('.dropdown-item').click(function (e) {
    e.preventDefault();
    const username = $(this).data('username');
    const password = $(this).data('password');
    $('#username').val(username);
    $('#password').val(password);
    $('#login-info')
      .html('已自動填充 <strong>' + $(this).text() + '</strong> 的登入資訊')
      .removeClass('alert-danger alert-success')
      .show();
  });

  // 送出表單或按鈕點擊皆可觸發
  $('#js-login').on('submit', onLoginSubmit);
  $('#js-login-btn').click(function (event) {
    event.preventDefault();
    $('#js-login').trigger('submit');
  });

  // 於表單內按下 Enter 時觸發登入
  $('#js-login').on('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      $('#js-login').trigger('submit');
    }
  });

  async function onLoginSubmit(event) {
    event.preventDefault();

    const form = $('#js-login');
    form.addClass('was-validated');
    if (form[0].checkValidity() === false) return;

    const email = String($('#username').val() || '').trim();
    const password = $('#password').val();

    const $btn = $('#js-login-btn');
    const originalText = $btn.text();
    $btn.prop('disabled', true).text('登入中...');
    $('#login-info').hide().removeClass('alert-danger alert-success').empty();

    try {
      // 後端路徑為 /api/v1/auth/login，所以在這裡補上 /v1/auth
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      // 先嘗試 parse JSON（就算 401/403 也會有訊息）
      let data = {};
      try { data = await resp.json(); } catch (_) {}

      if (!resp.ok || data?.success === false) {
        const msg = data?.message || `${resp.status} ${resp.statusText}`;
        throw new Error(msg);
      }

      // 兼容兩種回傳：{data:{user,token}} 或 {user,token}
      const token = data?.data?.token || data?.token;
      const user  = data?.data?.user  || data?.user;

      if (!token || !user) {
        throw new Error('回應格式異常：缺少 token 或 user');
      }

      // 映射角色（後端可能是 '1'|'2'|'3'）
      const roleMap = { '1': 'staff', '2': 'manager', '3': 'boss' };
      const role = roleMap[String(user.role)] || String(user.role);

      // 寫入 localStorage（同時存 access_token 與 token，兼容舊程式）
      localStorage.setItem('access_token', token);
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('userRole', role);

      $('#login-info')
        .html('<strong>登入成功！</strong> 正在跳轉到主頁…')
        .removeClass('alert-danger')
        .addClass('alert-success')
        .show();

      // 依角色導頁
      const roleHome = {
        staff:   'staff_device.html',
        manager: 'manager_overview.html',
        boss:    'boss_dashboard.html',
      };
      const target = roleHome[role] || 'staff_device.html';

      setTimeout(() => {
        window.location.href = target;
      }, 600);
    } catch (err) {
      console.error(err);
      $('#login-info')
        .html('<strong>登入失敗！</strong> ')
        .removeClass('alert-success')
        .addClass('alert-danger')
        .show();
    } finally {
      $btn.prop('disabled', false).text(originalText);
    }
  }
})();