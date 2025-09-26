(function () {
  try {
    var cached = localStorage.getItem('userRole') || localStorage.getItem('currentRole');
    var map = { '1': 'staff', '2': 'manager', '3': 'boss' };
    var role = map[String(cached)] || cached;
    if (role) document.documentElement.setAttribute('data-user-role', role);
    if (document.body) document.body.setAttribute('data-loaded', 'false');
  } catch (_) {}
})();
