// =================== Config（沿用 my_scrap.js 風格） ===================
const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
const API_BASE =
  (window.location.origin.includes(':8080') ? 'http://localhost:3000' : '') + '/api';
const API_SCRAP_BY_ID = (id) => `${API_BASE}/scrap/${encodeURIComponent(id)}`; // GET / PUT
const OVERVIEW_PAGE = '/manager/scrap_overview';
const LOGIN_PAGE = '/page_login';

// =================== Utils（與 my_scrap.js 一致） ===================
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

// =================== DOM Refs ===================
const $ = (sel) => document.querySelector(sel);
const elId       = $('#f-id');
const elDeviceId = $('#f-deviceId');
const elStatus   = $('#f-status');
const elType     = $('#f-type');
const elWeight   = $('#f-weight');
const elVolume   = $('#f-volume');
const elHumidity = $('#f-humidity');
const btnSave    = $('#btn-save');

// =================== Main ===================
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');

  if (!id) {
    Swal.fire({ icon: 'error', title: '缺少參數', text: 'URL 需要 ?id=<number>' });
    return;
  }

  loadScrap(id);

  if (btnSave) {
    btnSave.addEventListener('click', async () => {
      try {
        const payload = collectForm();
        await fetchJSON(API_SCRAP_BY_ID(id), {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        await Swal.fire({ icon: 'success', title: '已儲存', timer: 1000, showConfirmButton: false });
        // 回到總覽（或改成 history.back()）
        location.href = OVERVIEW_PAGE;
      } catch (e) {
        Swal.fire({ icon: 'error', title: '儲存失敗', text: e.message || '請稍後再試' });
      }
    });
  }
});

// =================== Functions ===================
async function loadScrap(id) {
  try {
    const resp = await fetchJSON(API_SCRAP_BY_ID(id)); // 期望 { success:true, data:{...} }
    const r = (resp && (resp.data || resp)) || {};
    // 填入欄位（與你的 HBS input id 對齊）
    if (elId)       elId.value       = r.id ?? id;
    if (elDeviceId) elDeviceId.value = r.deviceId ?? '';
    if (elStatus)   elStatus.value   = String(r.status ?? '1');
    if (elType)     elType.value     = r.type ?? '';
    if (elWeight)   elWeight.value   = r.weight ?? '';
    if (elVolume)   elVolume.value   = r.volume ?? '';
    if (elHumidity) elHumidity.value = r.humidity ?? '';
  } catch (e) {
    // 404 也在這裡處理
    Swal.fire({
      icon: 'error',
      title: '載入失敗',
      text: e.message || `無法取得資料（id=${id}）`,
    });
  }
}

function toNumOrNull(v) {
  if (v === '' || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function collectForm() {
  // 欄位白名單：僅允許以下欄位被更新（與後端一致）
  const payload = {};
  if (elDeviceId) payload.deviceId = toNumOrNull(elDeviceId.value);
  if (elStatus)   payload.status   = toNumOrNull(elStatus.value);
  if (elType)     payload.type     = elType.value.trim();
  if (elWeight)   payload.weight   = toNumOrNull(elWeight.value);
  if (elVolume)   payload.volume   = toNumOrNull(elVolume.value);
  if (elHumidity) payload.humidity = toNumOrNull(elHumidity.value);

  // 刪除 null / 空字串
  for (const k of Object.keys(payload)) {
    const v = payload[k];
    if (v === null || v === '') delete payload[k];
  }
  return payload;
}
