// role-nav.js
(function () {
  var OBSERVER_STARTED = false;

  function normRole(r) {
    var m = { '1': 'staff', '2': 'manager', '3': 'boss' };
    return m[String(r)] || String(r || '');
  }

  function applyRoleNavHard(role) {
    var nav = document.getElementById('js-nav-menu');
    if (!nav) return;

    var items = nav.querySelectorAll('.role-nav-item');
    items.forEach(function (li) {
      var r = li.getAttribute('data-role');
      li.style.display = (r === role) ? '' : 'none';
    });

    var title = nav.querySelector('.role-based-title');
    if (title) {
      var anyVisible = Array.prototype.some.call(items, function (li) {
        return li.style.display !== 'none';
      });
      title.style.display = anyVisible ? '' : 'none';
    }
  }

  function startNavObserver(role) {
    var nav = document.getElementById('js-nav-menu');
    if (!nav || OBSERVER_STARTED) return;
    OBSERVER_STARTED = true;

    var mo = new MutationObserver(function () {
      applyRoleNavHard(role);
    });
    mo.observe(nav, { childList: true, subtree: true, attributes: true });
  }

  window.addEventListener('load', async function () {
    try {
      if (typeof Auth?.ensureAuth !== 'function') {
        console.error('[role-nav] Auth.ensureAuth 不可用，請確認 js/auth.js 已在 <head> 載入');
        return;
      }
      await Auth.ensureAuth();
      var me = await Auth.getCurrentUser();
      var role = normRole(me && me.role);

      if (role) {
        document.documentElement.setAttribute('data-user-role', role);
        localStorage.setItem('userRole', role);
        applyRoleNavHard(role);
        startNavObserver(role);
      } else {
        localStorage.removeItem('userRole');
      }
    } catch (e) {
      // 未授權會被 auth.js 處理導回登入
    } finally {
      var nav = document.getElementById('js-nav-menu');
      if (nav) nav.style.visibility = '';
      document.body && document.body.setAttribute('data-loaded', 'true');
    }
  });

  // optional: 手動調用用於除錯
  window.RoleNav = { apply: applyRoleNavHard, normRole };
})();
