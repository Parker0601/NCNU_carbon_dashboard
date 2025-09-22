(function () {
  var PUBLIC_PAGES = ['/page_login', '/page_register', '/403', '/404'];

  function showNav() {
    if (document.body) document.body.setAttribute('data-loaded', 'true');
    var menu = document.getElementById('js-nav-menu');
    if (menu && menu.style) menu.style.visibility = 'visible';
  }

  function getRequiredRoles() {
    var rr = (document.body && document.body.getAttribute('data-required-roles')) || '';
    return rr.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
  }

  async function boot() {
    if (PUBLIC_PAGES.includes(location.pathname)) { showNav(); return; }
    try {
      // 等 Auth.ensureAuth 出現
      var tries = 0;
      while (!(window.Auth && typeof window.Auth.ensureAuth === 'function') && tries < 50) {
        await new Promise(function (r) { setTimeout(r, 20); });
        tries++;
      }
      var requiredRoles = getRequiredRoles();
      if (window.Auth && typeof window.Auth.ensureAuth === 'function') {
        await window.Auth.ensureAuth(requiredRoles);
      }
      showNav();
    } catch (e) {
      console.warn('ensureAuth early init error:', e);
      showNav();
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
