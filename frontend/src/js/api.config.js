// frontend/src/js/api.config.js
// 如果有 dev-proxy，把 ORIGIN 留空，讓請求走相對路徑 `/api`
window.API_ORIGIN = '';     // 例如有 proxy：前端 8080 轉發 /api 到後端
window.API_PREFIX = '/api'; // 你現在後端的實際掛載點

// 統一產生 base，給所有前端用
(function () {
  var ORIGIN = (window.API_ORIGIN || '').replace(/\/+$/,'');
  var PREFIX = (window.API_PREFIX || '/api').replace(/^\/?/, '/');
  window.API_BASE = ORIGIN + PREFIX;   // 例如：'' + '/api' => '/api'
})();
