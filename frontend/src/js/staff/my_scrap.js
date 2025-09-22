// ------------------- Config -------------------
const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
const API_BASE =
  (window.location.origin.includes(':8080') ? 'http://localhost:3000' : '') + '/api';
const API_MY_SCRAPS   = `${API_BASE}/scrap/my-data`;
const API_DELETE_SCRAP = (id) => `${API_BASE}/scrap/${encodeURIComponent(id)}`;
const EDIT_PAGE  = '/waste_input';
const LOGIN_PAGE = '/page_login';

// ------------------- Utils -------------------
function getToken() {
  try {
    for (const k of TOKEN_KEYS) {
      const v = localStorage.getItem(k);
      if (v) return v;
    }
  } catch (_) {}
  return '';
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
    window.location.href = LOGIN_PAGE;
    throw new Error('Unauthorized');
  }
  if (!resp.ok || (data && data.success === false)) {
    const msg = (data && (data.message || data.error)) || `HTTP ${resp.status}`;
    const err = new Error(msg);
    // @ts-ignore
    err.status = resp.status;
    throw err;
  }
  return data ?? {};
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"'`=\/]/g, s => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;','/':'&#x2F;','`':'&#x60;','=':'&#x3D;'
  }[s]));
}

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

// ------------------- DOM refs -------------------
const elTable = document.getElementById('my-scraps-table');
const elTbody = elTable ? elTable.querySelector('tbody') : null;

// 本地快取，供「查看」使用
const scrapCache = {};

// ------------------- Main -------------------
document.addEventListener('DOMContentLoaded', () => {
  bindTableActions();
  loadMyScraps();
});

async function loadMyScraps() {
  if (!elTbody) return;
  elTbody.innerHTML = `
    <tr>
      <td colspan="6" class="text-center">
        <span class="spinner-border spinner-border-sm"></span>&nbsp;載入中...
      </td>
    </tr>`;
  try {
    const resp = await fetchJSON(API_MY_SCRAPS);
    const list = Array.isArray(resp) ? resp : (resp.data || []);
    if (!list.length) {
      elTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">目前沒有紀錄</td></tr>`;
      return;
    }
    renderRows(list);
  } catch (e) {
    elTbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">載入失敗：${escapeHtml(e.message)}</td></tr>`;
    Swal.fire({ icon: 'error', title: 'Failed to get scrap data', text: e.message || '請稍後再試' });
  }
}

function renderRows(list) {
  elTbody.innerHTML = list.map(r => {
    scrapCache[r.id] = r;
    return `
      <tr data-id="${escapeHtml(r.id)}">
        <td>${escapeHtml(r.id)}</td>
        <td>${escapeHtml(r.deviceName || r.deviceId || '')}</td>
        <td>${escapeHtml(r.type ?? '')}</td>
        <td>${escapeHtml(r.weight ?? '')}</td>
        <td>${renderStatus(r.status)}</td>
        <td>
          <button class="btn btn-sm btn-outline-primary js-view">查看</button>
          <button class="btn btn-sm btn-outline-warning js-edit">編輯</button>
          <button class="btn btn-sm btn-outline-danger js-del">刪除</button>
        </td>
      </tr>`;
  }).join('');
}

function bindTableActions() {
  if (!elTbody) return;
  elTbody.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const tr = btn.closest('tr');
    const id = tr?.dataset.id;
    if (!id) return;

    if (btn.classList.contains('js-view')) onView(id);
    else if (btn.classList.contains('js-edit')) onEdit(id);
    else if (btn.classList.contains('js-del')) onDelete(id);
  });
}

function onView(id) {
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
      <div><b>狀態：</b>${escapeHtml(r.status ?? '')}</div>
    </div>`;
  Swal.fire({ title: '紀錄詳情', html, width: 600, confirmButtonText: '關閉' });
}

function onEdit(id) {
  const r = scrapCache[id];
  if (!r) return;
  window.location.href = `${EDIT_PAGE}?id=${encodeURIComponent(id)}&deviceId=${encodeURIComponent(r.deviceId)}`;
}

async function onDelete(id) {
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
    const tr = elTbody.querySelector(`tr[data-id="${CSS.escape(String(id))}"]`);
    if (tr) tr.remove();
    if (!elTbody.children.length) {
      elTbody.innerHTML = `<tr><td colspan="6" class="text-center text-muted">目前沒有紀錄</td></tr>`;
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: '刪除失敗', text: e.message || '請稍後再試' });
  }
}
