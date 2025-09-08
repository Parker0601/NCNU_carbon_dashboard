// js/role-nav.js
(function () {
  const API_BASE = 'http://localhost:3000/api';
  const NAV_URL  = API_BASE + '/nav';

  function getToken() {
    return localStorage.getItem('token') || localStorage.getItem('access_token') || '';
  }

  // 綁定群組開合（使用 .force-open，不跟主題搶 .open）
  function bindRoleGroups(navRoot) {
    var groups = navRoot.querySelectorAll('li[data-role]');
    groups.forEach(function (li) {
      var link = li.querySelector(':scope > a');
      var submenu = li.querySelector(':scope > ul');
      if (!link || !submenu) return;

      // 補箭頭
      if (!link.querySelector('.collapse-sign')) {
        var b = document.createElement('b');
        b.className = 'collapse-sign';
        b.innerHTML = '<em class="fal fa-angle-down"></em>';
        link.appendChild(b);
      }

      // 一律預設收起（**不管**主題是否幫你加了 .open）
      li.classList.remove('force-open');
      submenu.style.display = 'none';

      // 點擊切換
      link.addEventListener('click', function (e) {
        e.preventDefault();
        var opened = li.classList.toggle('force-open');
        submenu.style.display = opened ? '' : 'none';
        var em = link.querySelector('.collapse-sign em');
        if (em) em.className = opened ? 'fal fa-angle-up' : 'fal fa-angle-down';
      }, { passive: false });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    var nav = document.getElementById('js-nav-menu');
    if (!nav) return;
    var anchor = document.getElementById('role-nav-anchor');

    var headers = {};
    var token = getToken();
    if (token) headers['Authorization'] = 'Bearer ' + token;

    fetch(NAV_URL, { headers })
      .then(function (res) {
        if (res.status === 401 || res.status === 403) {
          window.location.href = 'page_login.html';
          throw new Error('UNAUTH');
        }
        if (!res.ok) throw new Error('NAV_NOT_OK');
        return res.text();
      })
      .then(function (html) {
        if (anchor) {
          anchor.insertAdjacentHTML('afterend', html);
          anchor.remove();
        } else {
          nav.insertAdjacentHTML('afterbegin', html);
        }
        // 綁定並強制收合
        bindRoleGroups(nav);
      })
      .catch(function () { /* 忽略其它錯誤，不導頁 */ })
      .finally(function () {
        nav.style.visibility = 'visible';
      });
  });
})();
