// 前端與後端 API 設定
const API_BASE = 'http://localhost:3000/api'; // 你的後端是 /api 不是 /api/v1

(function () {
  const $form = $('#js-register');
  const $btn  = $('#js-register-btn');

  $btn.on('click', async function (e) {
    e.preventDefault();

    if (!$form[0].checkValidity()) {
      e.stopPropagation();
      $form.addClass('was-validated');
      return;
    }

    const name  = $('#name').val().trim();
    const email = $('#mail').val().trim();
    const pwd   = $('#userpassword').val();
    const pwd2  = $('#userpassword2').val();

    if (pwd !== pwd2) {
      $form.addClass('was-validated');
      alert('兩次輸入的密碼不一致');
      return;
    }

    const payload = {
      name,
      email,
      password: pwd,
      confirmPassword: pwd2, // 多數驗證會要求
      role: 'user',          // 後端允許 user|admin|reviewer
    };

    $btn.prop('disabled', true);

    try {
      const resp = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || data?.success === false) {
        throw new Error(data?.message || `${resp.status} ${resp.statusText}`);
      }

      alert(data?.message || '註冊成功，請前往登入');
      $form[0].reset();
      $form.removeClass('was-validated');
      // location.href = 'page_login.html';
    } catch (err) {
      console.error(err);
      alert(err.message || '註冊失敗');
    } finally {
      $btn.prop('disabled', false);
      $form.addClass('was-validated');
    }
  });
})();