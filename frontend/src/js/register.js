console.log('register.js loaded');

(function () {
  const API_BASE = 'http://localhost:3000/api'; // 後端 API

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
      confirmPassword: pwd2,
      role: '1',
    };

    $btn.prop('disabled', true);

    try {
      const resp = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || data?.success === false) {
        throw new Error(data?.message || `${resp.status} ${resp.statusText}`);
      }
      alert(data?.message || '註冊成功，請前往登入');
      $form[0].reset();
      $form.removeClass('was-validated');
      // window.location.href = 'page_login.html';
    } catch (err) {
      console.error(err);
      alert(err.message || '註冊失敗');
    } finally {
      $btn.prop('disabled', false);
      $form.addClass('was-validated');
    }
  });
})();