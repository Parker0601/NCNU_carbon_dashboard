// ====================================================
// API
// ====================================================
const API_BASE = 'http://localhost:3000/api';
const API_DEVICE_DETAIL = (id) => `${API_BASE}/devices/${id}`;
const API_WASTE_CREATE  = (id) => `${API_BASE}/scrap/device/${id}`;

// 新增：Scrap 詳情與更新 API（編輯模式使用）
const API_SCRAP_DETAIL = (id) => `${API_BASE}/scrap/${id}`;
const API_SCRAP_UPDATE = (id) => `${API_BASE}/scrap/${id}`;

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
  } catch { return ''; }
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
    const msg = (data && (data.message || data.error)) || `HTTP ${resp.status}`;
    if (resp.status === 401 || resp.status === 403) {
      await Swal.fire({ icon: 'warning', title: '沒有權限', text: '請重新登入或確認身分權限。' });
      // 視需求導回登入頁
      // window.location.href = '/page_login';
    }
    throw new Error(msg);
  }
  return data ?? {};
}

function getQueryParam(key) {
  const url = new URL(window.location.href);
  return url.searchParams.get(key);
}

function toInt(n, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.round(v) : def;
}

// ====================================================
// DOM
// ====================================================
const elDeviceId    = document.getElementById('deviceId');
const elDeviceName  = document.getElementById('deviceName');
const elWasteType   = document.getElementById('wasteType');
const elWasteWeight = document.getElementById('wasteWeight');
const elProcessDT   = document.getElementById('processDateTime'); // 目前後端未用
const elNote        = document.getElementById('note');
const elBtnSubmit   = document.getElementById('btnSubmit');
const elForm        = document.getElementById('waste-input-form');

// ====================================================
// 狀態（是否為編輯模式）
// ====================================================
let EDITING_ID = null;   // 有 scrap id 時代表編輯模式
let submitting = false;

// ====================================================
// 初始化
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const deviceIdFromQuery = getQueryParam('deviceId'); // 可能由 onEdit 一併帶來
    const scrapIdFromQuery  = getQueryParam('id');       // my_scrap.js onEdit 帶的 scrap id

    EDITING_ID = scrapIdFromQuery ?? null;

    if (EDITING_ID) {
      // ===== 編輯模式 =====
      await initEditMode(EDITING_ID, deviceIdFromQuery);
      if (elBtnSubmit) elBtnSubmit.innerHTML = `<i class="fal fa-save"></i> 更新`;
    } else {
      // ===== 新增模式 =====
      if (!deviceIdFromQuery) {
        await Swal.fire({ icon: 'error', title: '缺少參數', text: '未提供 deviceId' });
        return;
      }
      elDeviceId.value = deviceIdFromQuery;

      // 預填當下時間（若 UI 想顯示）
      if (elProcessDT && !elProcessDT.value) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        elProcessDT.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
      }

      await loadDevice(deviceIdFromQuery);
    }
  } catch (e) {
    Swal.fire({ icon: 'error', title: '初始化失敗', text: e.message || String(e) });
  }
});

// 初始化：編輯模式
async function initEditMode(scrapId, deviceIdFromQuery) {
  // 1) 取 scrap 詳情
  const data = await fetchJSON(API_SCRAP_DETAIL(scrapId));
  // 依你後端回傳格式選擇適合的取值方式：
  // - 若回傳 { success, data: {...} }：用 data.data
  // - 若回傳 {...} 直接是物件：用 data
  const r = (data && data.data) ? data.data : data;
  if (!r) throw new Error('找不到該筆入料紀錄');

  // 2) 決定 deviceId（網址參數優先，其次取舊資料）
  const deviceId = deviceIdFromQuery || r.deviceId;
  if (!deviceId) throw new Error('該紀錄缺少 deviceId');

  // 3) 預填表單
  elDeviceId.value    = deviceId;
  elWasteType.value   = r.type ?? '';
  elWasteWeight.value = r.weight ?? '';
  if (elNote) elNote.value = r.note ?? '';

  // 視需求禁止更改設備（避免換設備造成資料歧義）
  // elDeviceId.setAttribute('readonly', 'readonly');

  // 4) 顯示設備名稱
  await loadDevice(deviceId);
}

// 載入設備資訊（只為了顯示名稱）
async function loadDevice(deviceId) {
  try {
    const resp = await fetchJSON(API_DEVICE_DETAIL(deviceId));
    const dev = Array.isArray(resp) ? resp[0] : (resp.data || resp);
    elDeviceName.value = dev?.name || `設備 #${deviceId}`;
  } catch (e) {
    elDeviceName.value = `設備 #${deviceId}`;
    console.warn('loadDevice failed:', e);
  }
}

// ====================================================
// 送出（新增 / 更新）
// ====================================================
elBtnSubmit?.addEventListener('click', async () => {
  try {
    if (submitting) return;
    if (!validateForm()) return;

    submitting = true;
    elBtnSubmit.disabled = true;
    elBtnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>${EDITING_ID ? '更新中...' : '送出中...'}`;

    const deviceId = elDeviceId.value;
    const payload  = buildPayload();

    let res;
    if (EDITING_ID) {
      // ===== 編輯：PUT /api/scrap/:id =====
      res = await fetchJSON(API_SCRAP_UPDATE(EDITING_ID), {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
    } else {
      // ===== 新增：POST /scrap/device/:deviceId =====
      res = await fetchJSON(API_WASTE_CREATE(deviceId), {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    }

    const msg = res?.message || (EDITING_ID ? '入料資訊已更新' : '入料資訊已新增');
    await Swal.fire({ icon: 'success', title: '成功', text: msg, timer: 1200, showConfirmButton: false });

    // 成功後導向：編輯回「我的紀錄」，新增回「入料作業」
    window.location.href = EDITING_ID ? '/my_scraps' : '/waste_management';
  } catch (e) {
    Swal.fire({ icon: 'error', title: EDITING_ID ? '更新失敗' : '送出失敗', text: e.message || String(e) });
  } finally {
    submitting = false;
    elBtnSubmit.disabled = false;
    elBtnSubmit.innerHTML = EDITING_ID ? `<i class="fal fa-save"></i> 更新` : `<i class="fal fa-paper-plane"></i> 送出`;
  }
});

// ====================================================
// 驗證 / 組裝 Payload
// ====================================================
function validateForm() {
  let valid = true;

  if (!elWasteType.value) {
    elWasteType.classList.add('is-invalid'); valid = false;
  } else {
    elWasteType.classList.remove('is-invalid');
  }

  const weight = Number(elWasteWeight.value);
  if (!(weight >= 0)) {
    elWasteWeight.classList.add('is-invalid'); valid = false;
  } else {
    elWasteWeight.classList.remove('is-invalid');
  }

  if (!valid) {
    Swal.fire({ icon: 'warning', title: '請完整填寫', text: '請確認廢料類型與重量。' });
  }
  return valid;
}

function buildPayload() {
  const weight = Number(elWasteWeight.value);
  // 目前後端 schema 沒時間欄位，保留邏輯方便未來擴充
  // const when = elProcessDT?.value || null;

  return {
    type: elWasteType.value,          // text
    weight: toInt(weight, 0),         // integer
    status: '1',                      // enum: '1' | '2' | '3'（預設正常）
    humidity: 0,                      // integer
    volume: 0,                        // integer
    note: elNote?.value || '',
    // 如果未來後端加入 processDate / create_time，再打開：
    // processDate: when,
  };
}
