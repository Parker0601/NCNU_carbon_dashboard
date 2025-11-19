$(document).ready(function () {
    // ========= 小工具 =========
    function escapeHtml(str) {
      return String(str ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }
    function safeAlert(title, text, icon) {
      if (window.Swal && Swal.fire) return Swal.fire(title, text, icon);
      // 後備：沒載入 SweetAlert2 就用原生 alert
      alert([title, text].filter(Boolean).join('\n'));
    }

    // ========= 狀態對照 =========
// 後端 enum: 1:正常運行, 2:維護中, 3:故障, 4:已指派未處理
const DEVICE_STATUS_LABEL = {
    '1': '正常運行',
    '2': '維護中',
    '3': '故障',
    '4': '已指派未處理'
  };
  
  function deviceStatusLabel(x) {
    const k = String(x).toLowerCase();
    // 既支援數字字串，也保底支援少數文字狀態
    if (DEVICE_STATUS_LABEL[k]) return DEVICE_STATUS_LABEL[k];
    const alt = {
      normal: '正常運行',
      maintain: '維護中',
      maintenance: '維護中',
      fault: '故障',
      error: '故障',
      assigned: '已指派未處理'
    };
    return alt[k] || String(x);
  }
  
  
    // ========= 基本設定 =========
    const API_ROOT = document.getElementById('app-config')?.dataset?.apiRoot || 'http://localhost:3000/api';
    const LOGIN_URL = document.getElementById('app-config')?.dataset?.login || '/index.html';
  
    async function apiFetch(url, opts = {}) {
      const token = localStorage.getItem('access_token');
      const res = await fetch(url, {
        method: opts.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(opts.headers || {})
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
        credentials: 'omit'
      });
      if (res.status === 401) {
        await safeAlert('請重新登入', '登入逾時或權限不足', 'warning');
        location.href = LOGIN_URL;
        throw new Error('Unauthorized');
      }
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
      return data;
    }
  
    // ========= 資料抓取 =========
    async function fetchDevicesStatus() {
      const { data = [] } = await apiFetch(`${API_ROOT}/devices/status`);
      return data.map(d => ({
        id: d.id,
        name: d.name || `設備#${d.id}`,
        status: String(d.status),
        statusZh: deviceStatusLabel(d.status),
        bootTime: d.boot_time || d.bootTime,
        ratio: isFinite(+d.ratio) ? Math.max(0, Math.min(100, +d.ratio)) : 0,
        issueCount: d.issue_count ?? d.issueCount ?? 0
      }));
    }
  
    // ========= UI & 圖表 =========
    function colorByRatio(r) {
      return r >= 70 ? '#1dc9b7' : (r >= 40 ? '#ffc241' : '#fd3995'); // 綠 / 黃 / 紅
    }
  
    function setOverallEfficiency(devs) {
      const avg = devs.length ? Math.round(devs.reduce((s, x) => s + x.ratio, 0) / devs.length) : 0;
      const block = $('.bg-primary-300 .display-4').first();
      if (block.length) {
        const node = block.contents().filter(function () {
          return this.nodeType === 3 || (this.nodeType === 1 && this.tagName === 'SPAN');
        }).first();
        if (node.length && node[0].nodeType === 3) {
          node[0].nodeValue = `${avg}% `;
        } else if (node.length) {
          node.text(`${avg}%`);
        }
      }
    }
  
    function buildDevicePanels(devs) {
      const $container = $('#device-panels');
      if (!$container.length) return;
      $container.empty();

      devs.forEach((d, idx) => {
        const barColor = colorByRatio(d.ratio);
        const hdrClass = (function (s) {
          const k = String(s);
          if (k === '1') return 'bg-success-700';  // 正常運行
          if (k === '2') return 'bg-warning-500';  // 維護中
          if (k === '3') return 'bg-danger-700';   // 故障
          if (k === '4') return 'bg-info-600';     // 已指派未處理
          return 'bg-fusion-100';
        })(d.status);
        const panelId = `panel-${d.id || (idx + 1)}`;
        const $col = $(`
          <div class="col-xl-6">
            <div id="${panelId}" class="panel">
              <div class="panel-hdr ${hdrClass}">
                <h2 class="text-white">
                  ${escapeHtml(d.name || ('設備 #' + d.id))} <span class="fw-300"><i>轉換效率</i></span>
                </h2>
                <div class="panel-toolbar">
                  <button class="btn btn-panel hover-effect-dot" data-action="panel-collapse" data-toggle="tooltip" title="收合"></button>
                  <button class="btn btn-panel hover-effect-dot" data-action="panel-fullscreen" data-toggle="tooltip" title="全螢幕"></button>
                </div>
              </div>
              <div class="panel-container show">
                <div class="panel-content">
                  <div class="d-flex flex-column align-items-center">
                    <div class="js-easy-pie-chart position-relative d-inline-flex align-items-center justify-content-center"
                         data-percent="${d.ratio}" data-piesize="250" data-linewidth="20" data-linecap="butt" data-scalelength="7"
                         data-barcolor="${barColor}" data-toggle="tooltip" title="當前效率">
                      <div class="d-flex flex-column align-items-center">
                        <span class="display-3 font-weight-bold">${d.ratio}%</span>
                        <span class="fs-xl" style="color:${barColor}">
                          ${d.ratio >= 70 ? '<i class="fal fa-arrow-up"></i> 良好' : (d.ratio >= 40 ? '<i class="fal fa-minus"></i> 待觀察' : '<i class="fal fa-arrow-down"></i> 需改善')}
                        </span>
                      </div>
                    </div>
                    <div class="mt-4 w-100">
                      <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">設備名稱</span>
                        <span class="text-success">${escapeHtml(d.name)}</span>
                      </div>
                      <div class="d-flex justify-content-between mb-2">
                        <span class="text-muted">目前狀態</span>
                        <span class="text-success">${escapeHtml(d.statusZh)}</span>
                      </div>
                      <div class="d-flex justify-content-between">
                        <span class="text-muted">運行時間</span>
                        <span class="text-success">${escapeHtml((d.bootTime || '').toString().replace('T',' ').slice(0,16))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `);
        $container.append($col);
      });

      // 啟動 easyPieChart
      $('.js-easy-pie-chart').each(function () {
        const $el = $(this);
        const percent = +($el.data('percent') || 0);
        const barColor = $el.data('barcolor') || colorByRatio(percent);
        $el.easyPieChart({
          barColor,
          trackColor: '#eee',
          scaleColor: false,
          lineCap: 'butt',
          lineWidth: 20,
          size: 250,
          animate: 1200,
          onStep: function (_, __, p) {
            $(this.el).find('span.display-3').text(Math.round(p) + '%');
          }
        });
      });
    }
  
    let trendChart = null;
    function renderTrend(devs) {
      const labels = ['00:00','03:00','06:00','09:00','12:00','15:00','18:00','21:00'];
      const colors = ['#fd3995','#1dc9b7','#ffc241','#5b6be8','#39a2fd','#6f42c1'];
  
      const datasets = devs.slice(0, 4).map((d, i) => {
        const base = d.ratio;
        const series = labels.map((_, k) => Math.max(0, Math.min(100, base + (k-3)*0.3)));
        return {
          label: d.name,
          data: series,
          borderColor: colors[i % colors.length],
          fill: false,
          tension: 0.25
        };
      });
  
      const ctx = document.getElementById('efficiencyTrendChart')?.getContext('2d');
      if (!ctx) return;
  
      if (trendChart) trendChart.destroy();
      trendChart = new Chart(ctx, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: 'bottom' } },
          scales: {
            y: {
              beginAtZero: true,
              max: 100,
              ticks: { callback: v => v + '%' },
              title: { display: true, text: '效率 (%)' }
            },
            x: { grid: { display: false } }
          }
        }
      });
    }
  
    // ========= 入口 =========
    async function init() {
      try {
        const devices = await fetchDevicesStatus();
        setOverallEfficiency(devices);
        buildDevicePanels(devices);
        renderTrend(devices);
      } catch (e) {
        console.error(e);
        safeAlert('載入失敗', e.message || '請稍後再試', 'error');
      }
    }
  
    init();
    setInterval(init, 5 * 60 * 1000);
  });
  