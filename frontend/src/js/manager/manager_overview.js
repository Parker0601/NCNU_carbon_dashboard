$(document).ready(function () {
  // ===================== 基本設定 & 小工具 =====================
  const API_ROOT = document.getElementById('app-config')?.dataset?.apiRoot || 'http://localhost:3000/api';
  const LOGIN_URL = document.getElementById('app-config')?.dataset?.login || '/index.html';

  const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
  function getToken() {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
    return null;
  }
  async function fetchJSON(url, opts = {}) {
    const token = getToken();
    const res = await fetch(url, {
      method: opts.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(opts.headers || {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: 'omit',
    });
    if (res.status === 401) {
      await Swal.fire('請重新登入', '登入逾時或權限不足', 'warning');
      location.href = LOGIN_URL;
      throw new Error('Unauthorized');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  }
  const DEVICE_STATUS_LABEL = { '1':'正常運行','2':'維護中','3':'故障','4':'已指派未處理' };
  const DEVICE_STATUS_BADGE = { '1':'badge-success','2':'badge-warning','3':'badge-danger','4':'badge-info' };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));

  // ===================== 1) KPI 趨勢圖（寫死假資料, 原本程式保留） =====================
  (function initKPI(){
    const ctx = document.getElementById('kpiTrendChart')?.getContext('2d');
    if (!ctx) return;
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'],
        datasets: [{ label:'KPI 達成率', data:[85,88,92,90,95,93,96,98,97,99,100,102],
          borderColor:'rgb(75, 192, 192)', tension:0.1, fill:false }]
      },
      options: {
        responsive:true, maintainAspectRatio:false,
        scales:{ y:{ beginAtZero:true, title:{display:true,text:'達成率 (%)'} }, x:{ title:{display:true,text:'月份'} } },
        plugins:{ legend:{ position:'top' } }
      }
    });
  })();

// 取裝置 + 一次抓全部 issue，前端彙整「待處理(=1)」數量
async function loadDevicesStatusWithPending() {
  const [devResp, issueResp] = await Promise.all([
    fetchJSON(`${API_ROOT}/devices/status`),  // { success, data:[...] }
    fetchJSON(`${API_ROOT}/devices/issues`)   // { success, data:[...] }
  ]);

  const devs = Array.isArray(devResp?.data) ? devResp.data : (Array.isArray(devResp) ? devResp : []);
  const issues = Array.isArray(issueResp?.data) ? issueResp.data : (Array.isArray(issueResp) ? issueResp : []);

  // 建立 deviceId -> 待處理(=1)數 的 map
  const pendingMap = new Map();
  for (const r of issues) {
    if (String(r.status) === '1' && r.deviceId != null) {
      pendingMap.set(r.deviceId, (pendingMap.get(r.deviceId) || 0) + 1);
    }
  }

  return devs.map(d => ({
    id: d.id,
    name: d.name || `設備#${d.id}`,
    status: String(d.status),
    ratio: isFinite(+d.ratio) ? Math.max(0, Math.min(100, +d.ratio)) : null,
    bootTime: d.boot_time || d.bootTime || null,
    issueCount: pendingMap.get(d.id) || 0,              // ★ 正確帶入待處理數
  }));
}


  function renderDeviceStatus(list) {
    const host = document.getElementById('device-status-list');
    if (!host) return;
    if (!list.length) {
      host.innerHTML = `<div class="text-muted">目前沒有設備資料</div>`;
      return;
    }
    host.innerHTML = list.map(d => {
      const badge = DEVICE_STATUS_BADGE[d.status] || 'badge-secondary';
      const label = DEVICE_STATUS_LABEL[d.status] || d.status;
      const bootText = d.bootTime ? String(d.bootTime).toString().replace('T',' ').slice(0,16) : '—';
      const ratioText = d.ratio == null ? '—' : `${Math.round(d.ratio)}%`;
      return `
        <div class="mb-2 p-2 border rounded d-flex justify-content-between align-items-center">
          <div>
            <div><strong>${esc(d.name)}</strong></div>
            <small class="text-muted">
              狀態：<span class="badge ${badge}">${label}</span>
              &nbsp;｜&nbsp; 開機：${esc(bootText)} &nbsp;｜&nbsp; 待處理問題：${d.issueCount}
            </small>
          </div>
          <div class="text-primary">${ratioText}</div>
        </div>
      `;
    }).join('');
  }

  // ===================== 3) 碳排放概況（沿用你 Manager Carbon 的 API） =====================
  // 3-1 熱點圓餅圖（來源占比）
  const COLORS = ['#fd3995','#1dc9b7','#ffc241','#5b6be8','#39a2fd','#6f42c1','#20c997','#f7b924','#868e96'];

function renderPieLegend(labels, colors){
  const el = document.getElementById('carbon-legend');
  if (!el) return;
  el.innerHTML = labels.map((lbl,i)=>(
    `<div class="item"><span class="swatch" style="background:${colors[i%colors.length]}"></span>${esc(lbl)}</div>`
  )).join('');
}

async function loadBreakdownAndRender() {
  const now = new Date();
  const start = `${now.getFullYear()}-01-01`;
  const end   = `${now.getFullYear()}-12-31`;
  const json = await fetchJSON(`${API_ROOT}/carbon/emissions-breakdown?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`);
  const items = (json?.data?.breakdown) || [];
  const labels = items.map(i => i.fuelName);
  const data = items.map(i => i.totalEmission || 0);

  const ctx = document.getElementById('pieChart')?.getContext('2d');
  if (!ctx) return;
  if (pieChart) pieChart.destroy();
  pieChart = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data, backgroundColor: COLORS }] },
    options: {
      responsive:true, maintainAspectRatio:false,
      plugins:{ legend:{ display:false } }   // ★ 自己做 legend
    }
  });

  renderPieLegend(labels, COLORS);           // ★ 產生可換行的圖例
}


  // 3-2 趨勢折線圖（依右上 select 的 7/30/365 或 month/year 模式）
  let trendChart;
  async function loadTrendAndRender(rangeValue) {
    let url;
    if (rangeValue === '30') url = `${API_ROOT}/carbon/daily-emissions-summary?mode=month`;
    else if (rangeValue === '365') url = `${API_ROOT}/carbon/daily-emissions-summary?mode=year`;
    else url = `${API_ROOT}/carbon/daily-emissions-summary?days=${rangeValue || 7}`;

    const json = await fetchJSON(url);
    const rows = (json?.data?.dailyEmissionsSummary) || [];
    const labels = rows.map(i => i.dateLabel || i.date);
    const daily = rows.map(i => i.dailyTotalEmission || 0);

    const ctx = document.getElementById('trendChart')?.getContext('2d');
    if (!ctx) return;
    if (trendChart) trendChart.destroy();
    trendChart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets: [{ label:'碳排放量 (kgCO₂e)', data: daily, borderColor:'#fd3995', backgroundColor:'rgba(253,57,149,0.1)', fill:true, tension:0.35 }] },
      options: { responsive:true, maintainAspectRatio:false, plugins:{ legend:{ position:'top' } } }
    });
  }
  // 切換 7/30/365
  $('#timeRange').on('change', () => loadTrendAndRender($('#timeRange').val()));

  // ===================== 4) 即時異常通知（沿用 Manager Monitor 的快照 API） =====================
  async function refreshAlertToast() {
    try {
      const snap = await fetchJSON(`${API_ROOT}/schedule/assign-human-resource`);
      const faulty = snap?.data?.faultyDevices || []; // 內含 3/4/2 的設備
      const $toast = $('#alert-toast');

      if (faulty.length) {
        const names = faulty.map(d => d.deviceName || `設備#${d.deviceId}`).slice(0, 3).join('、');
        $toast.find('strong').text('即時異常通知：');
        $toast.contents().filter((_,n)=>n.nodeType===3).remove(); // 清掉原本文字節點
        $toast.append(` ${names} 有異常，請立即處理！`);
        // 只在第一次開頁顯示一次；若你想每次 API 有異常就顯示，可拿掉 sessionStorage 判斷
        if (!sessionStorage.getItem('manager_overview_alert')) {
          $toast.fadeIn();
        }
      } else {
        $('#alert-toast').hide();
      }
    } catch (e) {
      // 失敗就靜靜地略過，不要吵
      console.warn('alert-toast refresh failed:', e.message);
    }
  }
  // 點整個彈窗 → 跳轉到即時異常監控
  $('#alert-toast').on('click', function (e) {
    if (!$(e.target).hasClass('close')) {
      sessionStorage.setItem('manager_overview_alert', 'hidden');
      window.location.href = 'manager_monitor.html';
    }
  });
  // 關閉按鈕只關閉
  $('#alert-toast .close').on('click', function (e) {
    e.stopPropagation();
    $('#alert-toast').fadeOut();
    sessionStorage.setItem('manager_overview_alert', 'hidden');
  });

  // ===================== 啟動 & 排程 =====================
  async function init() {
    try {
      const devices = await loadDevicesStatusWithPending();
      renderDeviceStatus(devices);
      await loadBreakdownAndRender();
      await loadTrendAndRender($('#timeRange').val() || '7');
      await refreshAlertToast();
    } catch (e) {
      console.error(e);
      Swal.fire('載入失敗', e.message || '請稍後再試', 'error');
    }
  }

  init();
  // 每 30 秒刷一次設備 & 異常彈窗；碳排放概況 5 分鐘刷一次（可自行調整）
  setInterval(async () => {
    const devices = await loadDevicesStatusWithPending();
    renderDeviceStatus(devices);
    await refreshAlertToast();
  }, 30 * 1000);

  setInterval(async () => {
    try {
      await loadBreakdownAndRender();
      await loadTrendAndRender($('#timeRange').val() || '7');
    } catch(_) {}
  }, 5 * 60 * 1000);
});
