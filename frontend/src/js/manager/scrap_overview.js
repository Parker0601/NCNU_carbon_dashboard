// ==============================
// API Endpoints
// ==============================
const API_BASE = 'http://localhost:3000/api';

const API_DEVICES_PRIMARY  = `${API_BASE}/devices`;
const API_DEVICES_FALLBACK = `${API_BASE}/devices/status`;

const API_WASTE_HISTORY   = (deviceId) => `${API_BASE}/scrap/device/${deviceId}/history?limit=30`;
const API_SCRAP_BY_DEVICE = (deviceId) => `${API_BASE}/scrap/device/${deviceId}`;
const API_SCRAP_LATEST    = (deviceId) => `${API_BASE}/scrap/device/${deviceId}/latest`;
const API_SCRAP_BY_ID     = (id) => `${API_BASE}/scrap/${id}`;

// 依你的專案調整：前端 8080 靜態站 → 連回 3000 的頁面
const PAGES_BASE = window.location.origin.includes(':8080') ? 'http://localhost:3000' : '';
const WASTE_INPUT_PAGE = (deviceId) => `${PAGES_BASE}/waste_input?deviceId=${encodeURIComponent(deviceId)}`;
const SCRAP_EDIT_PAGE  = (id) => `${PAGES_BASE}/scrap_edit?id=${encodeURIComponent(id)}`;

// ==============================
// Helpers
// ==============================
async function fetchJSON(url, options = {}) {
  const token =
    localStorage.getItem('authToken') ||
    localStorage.getItem('access_token') ||
    localStorage.getItem('token');

  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {},
    token ? { Authorization: `Bearer ${token}` } : {}
  );

  const resp = await fetch(url, { ...options, headers });
  let data = null;
  try { data = await resp.json(); } catch {}
  if (!resp.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

const sum = (arr, key = 'amount') =>
  (arr || []).reduce((acc, x) => acc + (Number(x[key]) || 0), 0);

function statusToBadge(s) {
  const str = String(s);
  if (str === '1') return { text: '正常運行', cls: 'badge-success' };
  if (str === '2') return { text: '維護中', cls: 'badge-warning' };
  if (str === '3') return { text: '故障', cls: 'badge-danger' };
  return { text: '未知', cls: 'badge-secondary' };
}

// ==============================
// DOM Refs
// ==============================
const elCardView       = document.getElementById('waste-card-view');
const elReportView     = document.getElementById('waste-report-view');
const elCardList       = document.getElementById('waste-card-list');
const elBtnCardView    = document.getElementById('btn-card-view');
const elBtnReportView  = document.getElementById('btn-report-view');
const elBtnRefresh     = document.getElementById('btn-waste-refresh');
const elReportSelect   = document.getElementById('waste-report-selector');
const elReportCanvas   = document.getElementById('waste-report-canvas');

const elDetailView     = document.getElementById('scrap-detail-view');
const elDetailContent  = document.getElementById('scrap-detail-content');
const elDetailBadge    = document.getElementById('scrap-detail-badge');
const elBtnCloseDetail = document.getElementById('btn-close-detail');
const elBtnEditScrap   = document.getElementById('btn-edit-scrap');

// ==============================
// State
// ==============================
let devicesCache = [];
let recentMap = new Map();    // key: deviceId, val: recent history array
let chartRef = null;
let currentScrapId = null;

// ==============================
document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  boot();
});

// ==============================
function bindUI() {
  elBtnCardView?.addEventListener('click', () => toggleView('card'));
  elBtnReportView?.addEventListener('click', () => {
    toggleView('report');
    if (!chartRef) renderReportChart(elReportSelect?.value || 'daily_trend');
  });
  elBtnRefresh?.addEventListener('click', async () => {
    await boot(true);
    Swal.fire({ icon: 'success', title: '已刷新', timer: 900, showConfirmButton: false });
  });
  elReportSelect?.addEventListener('change', () => renderReportChart(elReportSelect.value));

  // 卡片事件代理
  elCardList?.addEventListener('click', async (e) => {
    const btnLatest = e.target.closest('.btn-view-latest');
    const btnList   = e.target.closest('.btn-view-list');
    const btnFill   = e.target.closest('.btn-fill-input');

    if (btnLatest) {
      const id = btnLatest.getAttribute('data-device-id');
      try {
        const resp = await fetchJSON(API_SCRAP_LATEST(id));
        const d = Array.isArray(resp) ? resp[0] : (resp.data || resp);
        Swal.fire({
          icon: 'info',
          title: `設備 #${id} 最新入料`,
          html: d
            ? `<div>類型：${d.type}</div><div>重量：${d.weight ?? d.amount ?? 0} kg</div><div>狀態：${d.status}</div>`
            : '無資料',
        });
      } catch (err) {
        Swal.fire({ icon: 'error', title: '讀取失敗', text: err.message });
      }
      return;
    }

    if (btnList) {
      const id = btnList.getAttribute('data-device-id');
      await openDeviceListModal(id);
      return;
    }

    if (btnFill) {
      const id = btnFill.getAttribute('data-device-id');
      window.location.href = WASTE_INPUT_PAGE(id);
      return;
    }
  });

  // 詳細區塊
  elBtnCloseDetail?.addEventListener('click', () => {
    elDetailView.style.display = 'none';
    currentScrapId = null;
  });
  elBtnEditScrap?.addEventListener('click', () => {
    if (currentScrapId) window.location.href = SCRAP_EDIT_PAGE(currentScrapId);
  });

  // 由清單 modal 內「檢視」按鈕觸發
  document.addEventListener('click', async (e) => {
    const viewBtn = e.target.closest('.btn-view-scrap');
    if (viewBtn) {
      const scrapId = viewBtn.getAttribute('data-id');
      await showScrapDetail(scrapId);
    }
  });
}

// ==============================
async function boot(force = false) {
  await loadDevices(force);
  await loadRecentForAll(force);
  renderCards();
  if (elReportView && elReportView.style.display !== 'none') {
    renderReportChart(elReportSelect?.value || 'daily_trend');
  }
}

function toggleView(view) {
  const showCard = view === 'card';
  elCardView.style.display = showCard ? '' : 'none';
  elReportView.style.display = showCard ? 'none' : '';
  elBtnCardView?.classList.toggle('active', showCard);
  elBtnReportView?.classList.toggle('active', !showCard);
  if (!showCard) renderReportChart(elReportSelect?.value || 'daily_trend');
}

// ==============================
// Data loading
// ==============================
async function loadDevices(force = false) {
  if (!force && devicesCache.length) return;
  try {
    const resp = await fetchJSON(API_DEVICES_PRIMARY);
    const arr = Array.isArray(resp) ? resp : (resp.data || []);
    devicesCache = arr;
  } catch (e) {
    // 後備
    const resp2 = await fetchJSON(API_DEVICES_FALLBACK);
    devicesCache = Array.isArray(resp2) ? resp2 : (resp2.data || []);
  }
}

async function loadRecentForAll(force = false) {
  if (!force && recentMap.size === devicesCache.length && devicesCache.length) return;
  recentMap.clear();
  await Promise.all(
    devicesCache.map(async (dev) => {
      try {
        const resp = await fetchJSON(API_WASTE_HISTORY(dev.id));
        const data = Array.isArray(resp) ? resp : (resp.data || []);
        const norm = data.map((r) => ({
          id: r.id,
          amount: Number(r.amount ?? r.weight ?? 0),
          type: r.type ?? 'unknown',
          status: r.status ?? '1',
        }));
        recentMap.set(dev.id, norm);
      } catch {
        recentMap.set(dev.id, []);
      }
    })
  );
}

// ==============================
// Cards
// ==============================
function renderCards() {
  if (!elCardList) return;
  if (!devicesCache.length) {
    elCardList.innerHTML = `<div class="col-12 text-center text-muted">尚無設備資料</div>`;
    return;
  }
  const html = devicesCache
    .map((dev) => {
      const seq = recentMap.get(dev.id) || [];
      const latest = seq[seq.length - 1];
      const badge = statusToBadge(latest?.status ?? dev.status ?? '1');
      return `
        <div class="col-xl-4 col-md-6 mb-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="d-flex justify-content-between align-items-center">
                <h5 class="mb-0">${dev.name || `設備 #${dev.id}`}</h5>
                <span class="badge ${badge.cls}">${badge.text}</span>
              </div>
              <div class="mt-2 small text-muted">最近入料：${
                latest ? `${latest.amount} kg（${latest.type}）` : '無'
              }</div>
              <div class="mt-3 d-flex gap-2">
                <button class="btn btn-sm btn-primary btn-view-latest" data-device-id="${dev.id}">看最新</button>
                <button class="btn btn-sm btn-outline-secondary btn-view-list" data-device-id="${dev.id}">看清單</button>
                <button class="btn btn-sm btn-success btn-fill-input" data-device-id="${dev.id}">填入料</button>
              </div>
            </div>
          </div>
        </div>`;
    })
    .join('');
  elCardList.innerHTML = html;
}

// ==============================
// Report (Chart.js)
// ==============================
function destroyChart() {
  if (chartRef) {
    try { chartRef.destroy(); } catch {}
    chartRef = null;
  }
}

async function renderReportChart(kind) {
  if (!window.Chart) return; // Chart.js 未載入也不報錯
  const { labels, datasets, type, options } = await buildChartData(kind);
  destroyChart();
  const ctx = elReportCanvas.getContext('2d');
  chartRef = new Chart(ctx, {
    type,
    data: { labels, datasets },
    options: options || buildDefaultChartOptions(type),
  });
}

function buildDefaultChartOptions(type) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false } },
    scales:
      type === 'pie' || type === 'doughnut'
        ? {}
        : {
            x: { title: { display: true, text: '序列（舊→新）' } },
            y: { title: { display: true, text: '入料(kg)' }, beginAtZero: true },
          },
  };
}

async function buildChartData(kind) {
  const allByDevice = devicesCache.map((dev) => ({
    deviceId: dev.id,
    deviceName: dev.name || `設備 #${dev.id}`,
    seq: [...(recentMap.get(dev.id) || [])].reverse(), // 舊→新
  }));

  if (kind === 'by_device_total') {
    const labels = allByDevice.map((d) => d.deviceName);
    const totals = allByDevice.map((d) => sum(d.seq, 'amount'));
    return { type: 'bar', labels, datasets: [{ label: '各設備入料總量（kg）', data: totals }] };
  }

  if (kind === 'by_type_distribution') {
    const typeMap = new Map();
    for (const d of allByDevice) {
      for (const r of d.seq) {
        typeMap.set(r.type, (typeMap.get(r.type) || 0) + (Number(r.amount) || 0));
      }
    }
    return {
      type: 'pie',
      labels: Array.from(typeMap.keys()),
      datasets: [{ label: '廢料類型分布', data: Array.from(typeMap.values()) }],
    };
  }

  // daily_trend
  const maxLen = Math.max(0, ...allByDevice.map((d) => d.seq.length));
  const labels = Array.from({ length: maxLen }, (_, i) => i + 1);
  const datasets = allByDevice.map((d) => ({
    label: d.deviceName,
    data: labels.map((idx) => d.seq[idx - 1]?.amount || 0),
    fill: false,
    borderWidth: 2,
    tension: 0.2,
  }));
  return { type: 'line', labels, datasets };
}

// ==============================
// List modal & Detail
// ==============================
async function openDeviceListModal(deviceId) {
  try {
    const resp = await fetchJSON(API_SCRAP_BY_DEVICE(deviceId));
    const list = Array.isArray(resp) ? resp : resp.data || [];
    const rows = list
      .slice(0, 30)
      .map(
        (x) => `
        <tr>
          <td>${x.id}</td>
          <td>${x.type}</td>
          <td>${x.weight ?? x.amount ?? 0}</td>
          <td>${x.status}</td>
          <td><button class="btn btn-sm btn-info btn-view-scrap" data-id="${x.id}">檢視</button></td>
        </tr>`
      )
      .join('');

    await Swal.fire({
      width: 800,
      title: `設備 #${deviceId} 入料清單`,
      html: `
        <div class="table-responsive">
          <table class="table table-sm">
            <thead><tr><th>ID</th><th>類型</th><th>重量</th><th>狀態</th><th>操作</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="5" class="text-center">無資料</td></tr>'}</tbody>
          </table>
        </div>`,
    });
  } catch (err) {
    Swal.fire({ icon: 'error', title: '讀取失敗', text: err.message });
  }
}

async function showScrapDetail(id) {
  try {
    const resp = await fetchJSON(API_SCRAP_BY_ID(id));
    const scrap = Array.isArray(resp) ? resp[0] : resp.data || resp || {};
    currentScrapId = scrap.id;
    const badge = statusToBadge(scrap.status ?? '1');

    elDetailBadge.className = `badge ${badge.cls}`;
    elDetailBadge.textContent = badge.text;
    elDetailContent.innerHTML = `
      <div>ID：${scrap.id ?? ''}</div>
      <div>類型：${scrap.type ?? ''}</div>
      <div>重量：${scrap.weight ?? scrap.amount ?? 0} kg</div>
      <div>狀態：${scrap.status ?? ''}</div>
    `;
    elDetailView.style.display = '';
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
  } catch (err) {
    Swal.fire({ icon: 'error', title: '讀取失敗', text: err.message });
  }
}
