// ====================================================
// 後端 API
// ====================================================
const API_BASE = 'http://localhost:3000/api';
const API_DEVICES_PRIMARY  = `${API_BASE}/devices`;        // 需 requireAdmin
const API_DEVICES_FALLBACK = `${API_BASE}/devices/status`; // 一般使用者可用
const API_WASTE_BY_DEVICE  = (deviceId) => `${API_BASE}/scrap/device/${deviceId}/history?limit=30`; // ← 補這行
const PAGES_BASE =
  window.location.origin.includes(':8080') ? 'http://localhost:3000' : '';
const WASTE_INPUT_PAGE = (deviceId) =>
  `${PAGES_BASE}/waste_input?deviceId=${encodeURIComponent(deviceId)}`;
const MY_SCRAPS_PAGE = () => `${PAGES_BASE}/my_scraps`;

// ====================================================
// 小工具
// ====================================================
const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
function getToken() {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
    return '';
  } catch (_) { return ''; }
}
async function fetchJSON(url, options = {}) {
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {},
    getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}
  );
  const resp = await fetch(url, { ...options, headers });
  let data = null;
  try { data = await resp.json(); } catch {}
  if (!resp.ok) {
    const err = new Error((data && (data.message || data.error)) || `HTTP ${resp.status}`);
    // @ts-ignore
    err.status = resp.status;
    // @ts-ignore
    err.body = data;
    throw err;
  }
  return data ?? {};
}
function sum(arr, key = 'amount') {
  return (arr || []).reduce((acc, x) => acc + (Number(x[key]) || 0), 0);
}
function escapeHtml(str) {
  return String(str).replace(/[&<>"'`=\/]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'
  }[s]));
}

async function ensureChart() {
  if (window.Chart) return;
  await new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = '/js/vendor/chart.4.4.3.min.js'; // 與上面 head-block 保持一致
    s.onload = resolve;
    s.onerror = () => reject(new Error('Chart.js 載入失敗'));
    document.head.appendChild(s);
  });
}

// ====================================================
// DOM
// ====================================================
const elCardView      = document.getElementById('waste-card-view');
const elReportView    = document.getElementById('waste-report-view');
const elCardList      = document.getElementById('waste-card-list');
const elBtnCardView   = document.getElementById('btn-card-view');
const elBtnReportView = document.getElementById('btn-report-view');
const elBtnRefresh    = document.getElementById('btn-waste-refresh');
const elReportSelect  = document.getElementById('waste-report-selector');
const elReportCanvas  = document.getElementById('waste-report-canvas');

// ====================================================
// 狀態
// ====================================================
let devicesCache = [];     // [{ id, name, code, status }, ...]
let recentMap = new Map(); // deviceId -> [{id, amount, type}, ...]
let chartRef = null;

// ====================================================
// 初始化
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  boot();
});

function bindUI() {
  elBtnCardView?.addEventListener('click', () => toggleView('card'));
  elBtnReportView?.addEventListener('click', async () => {
    toggleView('report');
    if (!chartRef) {
      await ensureChart(); // ← 新增
      renderReportChart(elReportSelect?.value || 'daily_trend');
    }
  });
  elBtnRefresh?.addEventListener('click', async () => {
    try {
      await boot(true);
      Swal.fire({ icon: 'success', title: '已刷新', timer: 900, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: '刷新失敗', text: e.message || String(e) });
    }
  });
  elReportSelect?.addEventListener('change', () => renderReportChart(elReportSelect.value));

  elCardList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-fill-input');
    if (!btn) return;
    const deviceId = btn.getAttribute('data-device-id');
    if (!deviceId) return;
    window.location.href = WASTE_INPUT_PAGE(deviceId);
  });

  const elBtnMyScraps = document.getElementById('btn-my-scraps-link');
  elBtnMyScraps?.addEventListener('click', () => {
    window.location.href = MY_SCRAPS_PAGE();
  });
}

async function boot(force = false) {
  await loadDevices(force);
  await loadRecentForAll(force);
  renderCards();
  if (elReportView && elReportView.style.display !== 'none') {
    renderReportChart(elReportSelect?.value || 'daily_trend');
  }
}

async function toggleView(view) {
  const showCard = view === 'card';
  elCardView.style.display = showCard ? '' : 'none';
  elReportView.style.display = showCard ? 'none' : '';
  elBtnCardView?.classList.toggle('active', showCard);
  elBtnReportView?.classList.toggle('active', !showCard);
  if (!showCard) {
    await ensureChart(); // ← 新增
    renderReportChart(elReportSelect?.value || 'daily_trend');
  }
}

// ====================================================
// 載入資料
// ====================================================
async function loadDevices(force = false) {
  if (!force && devicesCache.length) return;

  // 先嘗試管理員專用的完整列表
  try {
    const resp = await fetchJSON(API_DEVICES_PRIMARY);
    const arr = Array.isArray(resp) ? resp : (resp.data || []);
    devicesCache = arr.map(d => ({
      id: d.id,
      name: d.name,
      status: String(d.status),
      code: d.code || d.sn || undefined,
      bootTime: d.bootTime,
      ratio: d.ratio
    }));
    return;
  } catch (e) {
    // 若被權限擋下（401/403），再用 fallback
    if (!(e && e.status && (e.status === 401 || e.status === 403))) {
      throw e;
    }
  }

  // Fallback：一般使用者可用的精簡列表
  const resp2 = await fetchJSON(API_DEVICES_FALLBACK);
  const arr2 = Array.isArray(resp2) ? resp2 : (resp2.data || []);
  devicesCache = arr2.map(d => ({
    id: d.id,
    name: d.name,
    status: String(d.status),
    code: undefined,
    bootTime: undefined,
    ratio: undefined
  }));
}

async function loadRecentForAll(force = false) {
  if (!force && recentMap.size === devicesCache.length && devicesCache.length) return;
  recentMap.clear();
  await Promise.all(devicesCache.map(async (dev) => {
    try {
      const resp = await fetchJSON(API_WASTE_BY_DEVICE(dev.id));
      const data = Array.isArray(resp) ? resp : (resp.data || []);
      const norm = data.map(r => ({
        id: r.id,
        amount: Number(r.amount ?? r.weight ?? 0),
        type: r.type || '未知',
      }));
      recentMap.set(dev.id, norm);
    } catch (e) {
      console.warn(`load history failed for device ${dev.id}:`, e);
      recentMap.set(dev.id, []);
    }
  }));
}

// ====================================================
// 渲染卡片
// ====================================================
function renderCards() {
  if (!elCardList) return;
  const tplEl = document.getElementById('waste-card-template');
  const hasHbsTpl = !!(tplEl && window.Handlebars);

  elCardList.innerHTML = '';

  for (const dev of devicesCache) {
    const recentsDesc = recentMap.get(dev.id) || [];
    const recentTotal = sum(recentsDesc, 'amount');
    const last = recentsDesc[0]; // id DESC 第一筆為最新
    const lastAmount = last ? (Number(last.amount) || 0) : 0;
    const lastHint = last ? `#${last.id}` : '—';

    const utilPercent = Math.max(0, Math.min(100, Math.round(recentTotal)));

    let statusText = '未知', statusClass = 'badge-secondary';
    const ds = String(dev.status);
    if (ds === '1') { statusText = '正常運行'; statusClass = 'badge-success'; }
    else if (ds === '2') { statusText = '維護中'; statusClass = 'badge-warning'; }
    else if (ds === '3') { statusText = '故障'; statusClass = 'badge-danger'; }

    const cardData = {
      deviceId: dev.id,
      deviceName: dev.name || `設備 #${dev.id}`,
      deviceCode: dev.code || dev.sn || `D-${String(dev.id).padStart(3,'0')}`,
      statusText,
      statusClass,
      recentTotal: recentTotal.toFixed(2),
      lastInputAmount: lastAmount.toFixed(2),
      lastInputAt: lastHint,
      utilPercent
    };

    if (hasHbsTpl) {
      const tpl = window.Handlebars.compile(tplEl.innerHTML);
      elCardList.insertAdjacentHTML('beforeend', tpl(cardData));
    } else {
      const col = document.createElement('div');
      col.className = 'col-xl-4 col-lg-6 col-md-6';
      col.innerHTML = `
        <div class="card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <div>
              <h5 class="card-title mb-0">${escapeHtml(cardData.deviceName)}</h5>
              <small class="text-muted">設備代碼：${escapeHtml(cardData.deviceCode)}</small>
            </div>
            <span class="badge ${cardData.statusClass}">${cardData.statusText}</span>
          </div>
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div>
                <div class="text-muted small">近30筆入料總量</div>
                <div class="font-weight-bold">${cardData.recentTotal} kg</div>
              </div>
              <div class="text-right">
                <div class="text-muted small">最新入料</div>
                <div class="font-weight-bold">${cardData.lastInputAmount} kg</div>
                <div class="small text-muted">${cardData.lastInputAt}</div>
              </div>
            </div>
            <div class="progress mb-3" style="height:8px;">
              <div class="progress-bar" role="progressbar" style="width: ${cardData.utilPercent}%;" aria-valuenow="${cardData.utilPercent}" aria-valuemin="0" aria-valuemax="100"></div>
            </div>
            <div class="d-flex justify-content-end">
              <button class="btn btn-sm btn-primary btn-fill-input" data-device-id="${cardData.deviceId}">填寫入料資訊</button>
            </div>
          </div>
        </div>
      `;
      elCardList.appendChild(col);
    }
  }

  if (!devicesCache.length) {
    elCardList.innerHTML = `
      <div class="col-12">
        <div class="alert alert-warning mb-0">目前沒有可用的設備資料。</div>
      </div>
    `;
  }
}

// ====================================================
// 報表 (Chart.js) - 用序列 X 軸 (第1筆…第N筆)
// ====================================================
function destroyChart() {
  if (chartRef) { chartRef.destroy(); chartRef = null; }
}

async function renderReportChart(kind) {
  if (!elReportCanvas) return;
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
    scales: (type === 'pie' || type === 'doughnut') ? {} : {
      x: { title: { display: true, text: '序列（舊→新）' } },
      y: { title: { display: true, text: '入料(kg)' }, beginAtZero: true }
    }
  };
}

async function buildChartData(kind) {
  const allByDevice = devicesCache.map(dev => ({
    deviceId: dev.id,
    deviceName: dev.name || `設備 #${dev.id}`,
    // 後端回 id DESC，畫圖改 ASC
    seq: [...(recentMap.get(dev.id) || [])].reverse(),
  }));

  if (kind === 'by_device_total') {
    const labels = allByDevice.map(d => d.deviceName);
    const totals = allByDevice.map(d => sum(d.seq, 'amount'));
    return { type: 'bar', labels, datasets: [{ label: '各設備入料總量（kg）', data: totals, borderWidth: 1 }] };
  }

  if (kind === 'by_type_distribution') {
    const typeMap = new Map();
    for (const d of allByDevice) {
      for (const r of d.seq) {
        const k = r.type || '未知';
        typeMap.set(k, (typeMap.get(k) || 0) + (Number(r.amount) || 0));
      }
    }
    const labels = Array.from(typeMap.keys());
    const data = Array.from(typeMap.values());
    return { type: 'pie', labels, datasets: [{ label: '廢料類型分布', data }] };
  }

  // 其餘：序列折線
  const maxLen = Math.max(0, ...allByDevice.map(d => d.seq.length));
  const labels = Array.from({ length: maxLen }, (_, i) => i + 1);
  const datasets = allByDevice.map(d => ({
    label: d.deviceName,
    data: labels.map(idx => (d.seq[idx - 1]?.amount) || 0),
    fill: false,
    borderWidth: 2,
    tension: 0.2
  }));
  return { type: 'line', labels, datasets };
}
