console.log('login.js loaded');

(function () {
  const API_BASE = 'http://localhost:3000/api';

  // 示範帳號下拉選單填充
  $('.dropdown-item').click(function (e) {
    e.preventDefault();
    const username = $(this).data('username');
    const password = $(this).data('password');
    $('#username').val(username);
    $('#password').val(password);
    $('#login-info').html('已自動填充 <strong>' + $(this).text() + '</strong> 的登入資訊').show();
  });

  // 老闆快速登入
  $('#boss-quick-login').click(function (e) {
    e.preventDefault();
    localStorage.setItem('currentRole', 'boss');
    localStorage.setItem('userName', '老闆');
    localStorage.setItem('userID', 'B123');
    window.location.href = 'boss_dashboard.html';
  });

  // 登入按鈕
  $('#js-login-btn').click(async function (event) {
    event.preventDefault();
    const form = $('#js-login');
    form.addClass('was-validated');
    if (form[0].checkValidity() === false) return;

    const email = $('#username').val();
    const password = $('#password').val();

    try {
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await resp.json();

      if (!resp.ok || data?.success === false) {
        throw new Error(data?.message || `${resp.status} ${resp.statusText}`);
      }

      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));

      $('#login-info')
        .html('<strong>登入成功!</strong> 正在跳轉到主頁...')
        .removeClass('alert-danger')
        .addClass('alert-success')
        .show();

      setTimeout(() => {
        window.location.href = 'boss_carbon_trading.html';
      }, 1000);
    } catch (err) {
      console.error(err);
      $('#login-info')
        .html('<strong>登入失敗!</strong> ' + (err.message || '請稍後再試'))
        .removeClass('alert-success')
        .addClass('alert-danger')
        .show();
    }
  });
})();
