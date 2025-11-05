// ====================================================
// 後端 API
// ====================================================
const API_BASE = 'http://localhost:3000/api';
const API_DEVICES_PRIMARY  = `${API_BASE}/devices`;        // 需 requireAdmin
const API_DEVICES_FALLBACK = `${API_BASE}/devices/status`; // 一般使用者可用
const API_WASTE_BY_DEVICE  = (deviceId) => `${API_BASE}/scrap/device/${deviceId}/history?limit=30`;
const API_MY_SCRAPS        = `${API_BASE}/scrap/my-data`;
const API_DELETE_SCRAP     = (id) => `${API_BASE}/scrap/${encodeURIComponent(id)}`;
const PAGES_BASE =
  window.location.origin.includes(':8080') ? 'http://localhost:3000' : '';
const WASTE_INPUT_PAGE = (deviceId, scrapId = null) => {
  const params = new URLSearchParams();
  if (deviceId) params.append('deviceId', deviceId);
  if (scrapId) params.append('id', scrapId);
  return `${PAGES_BASE}/waste_input${params.toString() ? '?' + params.toString() : ''}`;
};

// ===== 版面/格式小工具 =====
const nf0 = new Intl.NumberFormat('zh-TW', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtKg(x, digits = 2) {
  return (digits === 0 ? nf0 : nf2).format(Number(x) || 0) + ' kg';
}

function statusBadge(status) {
  const s = String(status);
  if (s === '1') return { text: '正常運行',  cls: 'badge-success', icon: 'fa-check-circle' };
  if (s === '2') return { text: '維護中',    cls: 'badge-warning', icon: 'fa-tools' };
  if (s === '3') return { text: '故障',      cls: 'badge-danger',  icon: 'fa-exclamation-triangle' };
  return { text: '未知', cls: 'badge-secondary', icon: 'fa-question-circle' };
}


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
  
  if (resp.status === 401) {
    await Swal.fire({ icon: 'warning', title: '請先登入', text: '登入逾時或尚未登入' });
    window.location.href = '/page_login';
    throw new Error('Unauthorized');
  }
  
  if (!resp.ok || (data && data.success === false)) {
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
const elMyScrapsView  = document.getElementById('waste-my-scraps-view');
const elCardList      = document.getElementById('waste-card-list');
const elBtnCardView   = document.getElementById('btn-card-view');
const elBtnReportView = document.getElementById('btn-report-view');
const elBtnMyScrapsView = document.getElementById('btn-my-scraps-view');
const elBtnRefresh    = document.getElementById('btn-waste-refresh');
const elBtnMyScrapsRefresh = document.getElementById('btn-my-scraps-refresh');
const elReportSelect  = document.getElementById('waste-report-selector');
const elReportCanvas  = document.getElementById('waste-report-canvas');
const elMyScrapsTable = document.getElementById('my-scraps-table');
const elMyScrapsTbody = elMyScrapsTable ? elMyScrapsTable.querySelector('tbody') : null;

// ====================================================
// 狀態
// ====================================================
let devicesCache = [];     // [{ id, name, code, status }, ...]
let recentMap = new Map(); // deviceId -> [{id, amount, type}, ...]
let chartRef = null;
const scrapCache = {};     // 我的紀錄快取

// ====================================================
// 初始化
// ====================================================
document.addEventListener('DOMContentLoaded', () => {
  bindUI();
  boot();
  
  // 檢查 URL 參數，如果有 view=my-scraps，自動切換到我的紀錄視圖
  const urlParams = new URLSearchParams(window.location.search);
  const viewParam = urlParams.get('view');
  if (viewParam === 'my-scraps') {
    toggleView('my-scraps').then(() => loadMyScraps());
  }
});

function bindUI() {
  elBtnCardView?.addEventListener('click', () => toggleView('card'));
  elBtnReportView?.addEventListener('click', async () => {
    toggleView('report');
    if (!chartRef) {
      await ensureChart();
      renderReportChart(elReportSelect?.value || 'daily_trend');
    }
  });
  elBtnMyScrapsView?.addEventListener('click', async () => {
    toggleView('my-scraps');
    await loadMyScraps();
  });
  
  elBtnRefresh?.addEventListener('click', async () => {
    try {
      await boot(true);
      Swal.fire({ icon: 'success', title: '已刷新', timer: 900, showConfirmButton: false });
    } catch (e) {
      Swal.fire({ icon: 'error', title: '刷新失敗', text: e.message || String(e) });
    }
  });
  
  elBtnMyScrapsRefresh?.addEventListener('click', async () => {
    await loadMyScraps();
  });
  
  elReportSelect?.addEventListener('change', () => renderReportChart(elReportSelect.value));

  elCardList?.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-fill-input');
    if (!btn) return;
    const deviceId = btn.getAttribute('data-device-id');
    if (!deviceId) return;
    window.location.href = WASTE_INPUT_PAGE(deviceId);
  });

  // 我的紀錄表格操作
  if (elMyScrapsTbody) {
    elMyScrapsTbody.addEventListener('click', (e) => {
      const btn = e.target.closest('button');
      if (!btn) return;
      const tr = btn.closest('tr');
      const id = tr?.dataset.id;
      if (!id) return;

      if (btn.classList.contains('js-view')) onViewScrap(id);
      else if (btn.classList.contains('js-edit')) onEditScrap(id);
      else if (btn.classList.contains('js-del')) onDeleteScrap(id);
    });
  }
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
  const isCard = view === 'card';
  const isReport = view === 'report';
  const isMyScraps = view === 'my-scraps';
  
  elCardView.style.display = isCard ? '' : 'none';
  elReportView.style.display = isReport ? '' : 'none';
  elMyScrapsView.style.display = isMyScraps ? '' : 'none';
  
  elBtnCardView?.classList.toggle('active', isCard);
  elBtnReportView?.classList.toggle('active', isReport);
  elBtnMyScrapsView?.classList.toggle('active', isMyScraps);
  
  if (isReport && !chartRef) {
    await ensureChart();
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
      const sb = statusBadge(dev.status);
col.innerHTML = `
  <div class="card shadow-sm mb-3 h-100">
    <div class="card-header d-flex justify-content-between align-items-center bg-white">
      <div class="d-flex align-items-center">
        <div class="rounded-circle bg-primary-100 d-inline-flex align-items-center justify-content-center mr-2" style="width:36px;height:36px;">
          <i class="fal fa-recycle text-primary-600"></i>
        </div>
        <div>
          <h5 class="card-title mb-0">${escapeHtml(cardData.deviceName)}</h5>
          <small class="text-muted">設備代碼：${escapeHtml(cardData.deviceCode)}</small>
        </div>
      </div>
      <span class="badge ${sb.cls} d-inline-flex align-items-center">
        <i class="fal ${sb.icon} mr-1"></i>${sb.text}
      </span>
    </div>

    <div class="card-body">
      <div class="d-flex justify-content-between align-items-center mb-3">
        <div>
          <div class="text-muted small">近 30 筆入料總量</div>
          <div class="font-weight-bold">${fmtKg(cardData.recentTotal, 2)}</div>
        </div>
        <div class="text-right">
          <div class="text-muted small">最新入料</div>
          <div class="font-weight-bold">${fmtKg(cardData.lastInputAmount, 2)}</div>
          <div class="small text-muted">#${escapeHtml(cardData.lastInputAt)}</div>
        </div>
      </div>

      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <small class="text-muted">近期使用率（估算）</small>
          <small class="text-muted">${nf0.format(cardData.utilPercent)}%</small>
        </div>
        <div class="progress" style="height:8px;">
          <div class="progress-bar bg-success" role="progressbar" style="width:${cardData.utilPercent}%"></div>
        </div>
      </div>

      <div class="row text-center mb-3">
        <div class="col-4">
          <div class="small text-muted">狀態</div>
          <div class="font-weight-600">${sb.text}</div>
        </div>
        <div class="col-4">
          <div class="small text-muted">總量</div>
          <div class="font-weight-600">${fmtKg(cardData.recentTotal, 2)}</div>
        </div>
        <div class="col-4">
          <div class="small text-muted">最新</div>
          <div class="font-weight-600">${fmtKg(cardData.lastInputAmount, 2)}</div>
        </div>
      </div>

      <div class="d-flex justify-content-end">
        <button
          class="btn btn-sm btn-primary btn-fill-input"
          data-device-id="${cardData.deviceId}"
          data-device-name="${escapeHtml(cardData.deviceName)}"
        >
          <i class="fal fa-plus mr-1"></i>填寫入料資訊
        </button>
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

// ====================================================
// 我的紀錄功能
// ====================================================
function renderStatus(status) {
  const map = {
    '0': ['草稿', 'badge badge-secondary'],
    '1': ['已提交', 'badge badge-primary'],
    '2': ['已審核', 'badge badge-success'],
    '3': ['作廢', 'badge badge-danger'],
  };
  const [text, cls] = map[String(status)] || [status, 'badge badge-light'];
  return `<span class="${cls}">${text}</span>`;
}

async function loadMyScraps() {
  if (!elMyScrapsTbody) return;
  elMyScrapsTbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center">
        <span class="spinner-border spinner-border-sm"></span>&nbsp;載入中...
      </td>
    </tr>`;
  try {
    const resp = await fetchJSON(API_MY_SCRAPS);
    const list = Array.isArray(resp) ? resp : (resp.data || []);
    if (!list.length) {
      elMyScrapsTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">目前沒有紀錄</td></tr>`;
      return;
    }
    renderMyScrapsRows(list);
  } catch (e) {
    elMyScrapsTbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">載入失敗：${escapeHtml(e.message)}</td></tr>`;
    Swal.fire({ icon: 'error', title: '載入失敗', text: e.message || '請稍後再試' });
  }
}

function renderMyScrapsRows(list) {
  elMyScrapsTbody.innerHTML = list.map(r => {
    scrapCache[r.id] = r;
    return `
      <tr data-id="${escapeHtml(r.id)}">
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.deviceName || r.deviceId || '')}</td>
        <td>${escapeHtml(r.type ?? '')}</td>
        <td>${escapeHtml(r.weight ?? '')}</td>
        <td>${renderStatus(r.status)}</td>
        <td class="text-right pr-3">
          <button class="btn btn-sm btn-outline-primary js-view">查看</button>
          <button class="btn btn-sm btn-outline-warning js-edit">編輯</button>
          <button class="btn btn-sm btn-outline-danger js-del">刪除</button>
        </td>
      </tr>`;
  }).join('');
}

function onViewScrap(id) {
  const r = scrapCache[id];
  if (!r) return;
  const html = `
    <div class="text-start">
      <div><b>ID：</b>${escapeHtml(r.id)}</div>
      <div><b>設備：</b>${escapeHtml(r.deviceName || r.deviceId)}</div>
      <div><b>類型：</b>${escapeHtml(r.type ?? '')}</div>
      <div><b>重量：</b>${escapeHtml(r.weight ?? '')}</div>
      ${r.volume != null ? `<div><b>體積：</b>${escapeHtml(r.volume)}</div>` : ''}
      ${r.humidity != null ? `<div><b>含水率：</b>${escapeHtml(r.humidity)}</div>` : ''}
      <div><b>狀態：</b>${renderStatus(r.status)}</div>
    </div>`;
  Swal.fire({ title: '紀錄詳情', html, width: 600, confirmButtonText: '關閉' });
}

function onEditScrap(id) {
  const r = scrapCache[id];
  if (!r) return;
  window.location.href = WASTE_INPUT_PAGE(r.deviceId, id);
}

async function onDeleteScrap(id) {
  const c = await Swal.fire({
    icon: 'warning',
    title: `確定要刪除？`,
    text: `ID=${id}`,
    showCancelButton: true,
    confirmButtonText: '刪除',
    cancelButtonText: '取消',
  });
  if (!c.isConfirmed) return;

  try {
    await fetchJSON(API_DELETE_SCRAP(id), { method: 'DELETE' });
    await Swal.fire({ icon: 'success', title: '已刪除', timer: 1000, showConfirmButton: false });
    // 直接更新 UI
    const tr = elMyScrapsTbody.querySelector(`tr[data-id="${CSS.escape(String(id))}"]`);
    if (tr) tr.remove();
    if (!elMyScrapsTbody.children.length) {
      elMyScrapsTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">目前沒有紀錄</td></tr>`;
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: '刪除失敗', text: e.message || '請稍後再試' });
  }
}
