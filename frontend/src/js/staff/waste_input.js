// ====================================================
// API
// ====================================================
const API_BASE = 'http://localhost:3000/api';
const API_DEVICE_DETAIL = (id) => `${API_BASE}/devices/${id}`;
const API_WASTE_CREATE  = (id) => `${API_BASE}/scrap/device/${id}`;

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
      // window.location.href = '/login';
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
// 初始化
// ====================================================
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const deviceId = getQueryParam('deviceId');
    if (!deviceId) {
      await Swal.fire({ icon: 'error', title: '缺少參數', text: '未提供 deviceId' });
      return;
    }
    elDeviceId.value = deviceId;

    // 若 UI 要顯示當下時間，可預填
    if (elProcessDT && !elProcessDT.value) {
      const now = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      elProcessDT.value = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    }

    await loadDevice(deviceId);
  } catch (e) {
    Swal.fire({ icon: 'error', title: '初始化失敗', text: e.message || String(e) });
  }
});

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
// 送出
// ====================================================
let submitting = false;

elBtnSubmit?.addEventListener('click', async () => {
  try {
    if (submitting) return;
    if (!validateForm()) return;

    submitting = true;
    elBtnSubmit.disabled = true;
    elBtnSubmit.innerHTML = `<span class="spinner-border spinner-border-sm mr-2" role="status" aria-hidden="true"></span>送出中...`;

    const deviceId = elDeviceId.value;
    const payload  = buildPayload();

    const res = await fetchJSON(API_WASTE_CREATE(deviceId), {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const msg = res?.message || '入料資訊已新增';
    await Swal.fire({ icon: 'success', title: '成功', text: msg, timer: 1200, showConfirmButton: false });
    window.location.href = '/waste_management';
  } catch (e) {
    Swal.fire({ icon: 'error', title: '送出失敗', text: e.message || String(e) });
  } finally {
    submitting = false;
    elBtnSubmit.disabled = false;
    elBtnSubmit.innerHTML = `<i class="fal fa-paper-plane"></i> 送出`;
  }
});

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
  // 目前後端 schema 沒時間欄位，這裡先不送時間（保留取值邏輯，日後若加欄位可直接帶）
  // const when = elProcessDT?.value || null;

  return {
    type: elWasteType.value,          // text
    weight: toInt(weight, 0),         // integer
    status: '1',                      // enum: '1' | '2' | '3'（預設正常）
    humidity: 0,                      // integer
    volume: 0,                        // integer
    note: elNote?.value || '',
    // 若未來後端加入 processDate / create_time，再打開：
    // processDate: when,
  };
}
