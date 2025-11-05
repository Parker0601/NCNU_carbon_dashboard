// const STATUS_LABEL = { '1': '待處理', '2': '處理中', '3': '已解決' };
// const DEVICE_STATUS_LABEL = { '1': '正常運行', '2': '維護中', '3': '故障' };
// // ---- 狀態轉中文 + badge 顏色 ----
// function statusToText(s) {
//   const v = String(s).toLowerCase();
//   if (['0','pending','waiting','open','submitted','todo'].includes(v)) return '待處理';
//   if (['1','resolved','done','closed','approved','finished'].includes(v)) return '已解決';
//   if (['rejected','return','returned'].includes(v)) return '已退回';
//   return s || '—';
// }

// // 將後端的狀態值（英文/數字）轉成中文
// function statusToText(s) {
//   const v = String(s).toLowerCase().trim();

//   // 常見英文/代碼
//   if (['pending', 'waiting', 'open', 'submitted', 'todo'].includes(v)) return '待處理';
//   if (['resolved', 'done', 'closed', 'approved', 'finished'].includes(v)) return '已解決';
//   if (['rejected', 'return', 'returned'].includes(v)) return '已退回';

//   // 你後端的數字碼
//   if (v === '3') return '待處理';
//   if (v === '2') return '已解決';
//   if (v === '0') return '待處理';
//   if (v === '1') return '已解決';

//   return s || '—';
// }

// // 依中文狀態回傳對應 badge 類別
// function statusToBadgeClass(s) {
//   const t = statusToText(s);
//   if (t === '待處理') return 'badge-warning';
//   if (t === '已解決') return 'badge-success';
//   if (t === '已退回') return 'badge-danger';
//   return 'badge-secondary';
// }
// ======================== 狀態顯示（統一中文） ========================
const STATUS_LABEL = {               // ★ issueStatus 用
  '1': '待處理',
  '2': '處理中',
  '3': '已解決'
};

const DEVICE_STATUS_LABEL = {        // ★ deviceStatus 用
  '1': '正常運行',
  '2': '維護中',
  '3': '故障',
  '4': '已指派未處理'
};

/** 將各式狀態值（數字/英文/代碼）統一轉為中文顯示：給「問題清單」用（issues.status） */
function statusToText(s) {
  if (s === undefined || s === null) return '—';
  const v = String(s).trim().toLowerCase();

  // issueStatus 數字碼優先
  if (STATUS_LABEL[v]) return STATUS_LABEL[v];

  // 英文別名
  if (['0','pending','waiting','open','submitted','todo'].includes(v)) return '待處理';
  if (['processing','inprogress','working','doing','ongoing'].includes(v)) return '處理中';
  if (['resolved','done','closed','approved','finished','complete','completed'].includes(v)) return '已解決';
  if (['rejected','return','returned'].includes(v)) return '已退回';

  return s || '—';
}

/** 依中文狀態回傳 badge 類別（問題清單用） */
function statusToBadgeClass(s) {
  const t = statusToText(s);
  if (t === '待處理') return 'badge-warning';
  if (t === '處理中') return 'badge-info';
  if (t === '已解決') return 'badge-success';
  if (t === '已退回') return 'badge-danger';
  return 'badge-secondary';
}



// ======================== 基礎設定 ========================
function getConfig() {
  const el = document.getElementById('app-config');
  const apiRoot = (el?.dataset?.apiRoot || 'http://localhost:3000/api').replace(/\/+$/, '');
  const login = el?.dataset?.login || '/index.html';
  const BASE = `${apiRoot}`;
  return {
    apiRoot, login,
    routes: {
      deviceStatus: `${BASE}/devices/status`,        // 下拉設備清單
      reportIssue:  `${BASE}/devices/report-issue`,  // 回報 + 後端連動（狀態=3、issue+1、排程start）
      listIssues:   `${BASE}/devices/issues`         // 問題清單
    }
  };
}

// ======================== 共用 fetch（帶 token） ========================
async function apiFetch(url, { method = 'GET', body, headers = {} } = {}) {
  const token = localStorage.getItem('access_token');
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };
  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'omit'
  });

  if (res.status === 401) {
    const { login } = getConfig();
    await Swal.fire('請重新登入', '登入逾時或權限不足', 'warning');
    location.href = login;
    throw new Error('Unauthorized');
  }

  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ======================== JWT 解析：取得登入者名稱 ========================
function b64urlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  const bin = atob(b64); // 單位元組字串
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 解析 JWT payload（正確處理 UTF-8）
function parseJwtPayload(token) {
  if (!token || token.split('.').length !== 3) return {};
  const payloadPart = token.split('.')[1];
  const bytes = b64urlToBytes(payloadPart);
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  try { return JSON.parse(utf8); } catch { return {}; }
}

function getCurrentUserName() {
  const token = localStorage.getItem('access_token');
  const payload = parseJwtPayload(token);
  // 常見欄位：name / username / preferred_username / given_name / email
  let name = payload.name || payload.username || payload.preferred_username || payload.given_name || payload.email || '';

  // 後備：從 data-user-name 補
  if (!name) {
    const el = document.getElementById('app-config');
    name = (el?.dataset?.userName || '').trim();
  }
  return name;
}

// ======================== 1) 取得設備清單（for 下拉） ========================
async function fetchDeviceStatus() {
  const { routes } = getConfig();
  const json = await apiFetch(routes.deviceStatus);
  // 期待：{ success, data:[{id,name,status,...}, ...] }
  return json.data || [];
}

// ======================== 2) 回報問題（含後端連動參數） ========================
async function reportIssue({ deviceId, reporterName, desc }) {
  const { routes } = getConfig();
  const payload = {
    deviceId: Number(deviceId),
    name: reporterName,          // 顯示用名稱（後端亦可改用 req.user）
    description: desc,

    // ★ 這三個交給後端一起處理：
    setStatusTo: 3,              // deviceStatus 設為 3
    bumpIssueCount: true,        // issue_count + 1
    scheduleStartNow: true       // 在 schedule 建立一筆 startTime=現在
  };
  return await apiFetch(routes.reportIssue, { method: 'POST', body: payload });
}

// ======================== UI：回報表單 ========================
function showReportForm() {
  const me = getCurrentUserName() || '';

  Swal.fire({
    title: '回報設備問題',
    html: `
      <div class="form-group text-left">
        <label>問題類型</label>
        <select id="issue-type" class="form-control">
          <option value="device">設備</option>
          <option value="hr" disabled>人事（尚未開放）</option>
          <option value="safety" disabled>安全（尚未開放）</option>
          <option value="admin" disabled>行政（尚未開放）</option>
        </select>
      </div>

      <div id="device-select-row" class="form-group text-left">
        <label>選擇設備</label>
        <select id="issue-device" class="form-control"></select>
      </div>
      <div class="form-group text-left">
        <label>回報者</label>
        <input id="issue-reporter" class="form-control" ${me ? 'readonly' : ''} placeholder="自動帶入登入者">
        <small class="form-text text-muted">預設為目前登入者</small>
      </div>
      <div class="form-group text-left">
        <label>問題描述</label>
        <textarea id="issue-desc" class="form-control" rows="3" placeholder="請輸入問題描述"></textarea>
      </div>
    `,
    didOpen: async () => {
      // 帶入回報者
      const $name = document.getElementById('issue-reporter');
      if (me) $name.value = me;

      // 載入設備清單
      const sel = document.getElementById('issue-device');
      sel.innerHTML = `<option disabled selected>載入設備中...</option>`;
      try {
        const list = await fetchDeviceStatus();
        if (!list.length) {
          sel.innerHTML = `<option disabled selected>目前沒有設備資料</option>`;
          return;
        }
        sel.innerHTML = list.map(d => {
        const s = String(d.status ?? '');
        const sLabel = DEVICE_STATUS_LABEL[s] || s || '-';
        const label = `${d.name || ('設備#' + d.id)}（目前狀態：${sLabel}）`;
        return `<option value="${d.id}">${label}</option>`;
        }).join('');
      } catch (e) {
        sel.innerHTML = `<option disabled selected>載入失敗：${e.message}</option>`;
      }
    },
    showCancelButton: true,
    confirmButtonText: '送出',
    cancelButtonText: '取消',
    preConfirm: () => {
      const deviceId = document.getElementById('issue-device')?.value;
      const name = document.getElementById('issue-reporter')?.value?.trim();
      const desc = document.getElementById('issue-desc')?.value?.trim();
      if (!deviceId) return Swal.showValidationMessage('請選擇設備');
      if (!name)     return Swal.showValidationMessage('請確認回報者名稱');
      if (!desc)     return Swal.showValidationMessage('請填寫問題描述');
      return { deviceId, reporterName: name, desc };
    }
  }).then(async (r) => {
    if (!r.isConfirmed) return;
    try {
      await reportIssue(r.value);
      await Swal.fire('已送出', '已建立問題並更新設備狀態與排程開始時間', 'success');
      refreshIssues(); // 重新載入清單
    } catch (e) {
      Swal.fire('送出失敗', e.message || '請稍後再試', 'error');
    }
  });
}

// ======================== 問題清單（載入/渲染） ========================

// ---- 抓清單並正規化成：type / description / assigneeName / status ----
async function fetchIssuesNormalized() {
  const { routes } = getConfig();
  const json = await apiFetch(routes.listIssues); // /devices/issues
  const arr = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

  return arr.map(r => {
    const typeRaw =
      r.type ?? r.category ?? r.kind ?? r.issueType ?? '';
    const descRaw =
      r.description ?? r.desc ?? r.title ?? r.summary ?? '';

    // 分配員工：盡量把常見命名都兜住；也嘗試 nested 結構
    const assigneeRaw =
      r.assigneeName ??
      r.assignee_user_name ??
      r.assigneeUserName ??
      r.assignee ??
      r.assigneeUser ??
      r.ownerName ??
      r.owner ??
      r.employeeName ??
      r.employee ??
      r.handlerName ??
      r.handler ??
      r.staffName ??
      r.executorName ??
      (r.assignee && (r.assignee.name || r.assignee.username || r.assignee.displayName)) ??
      (r.owner && (r.owner.name || r.owner.username || r.owner.displayName)) ??
      '';

    const statusRaw =
      r.status ?? r.state ?? r.progress ?? r.issueStatus ?? r.workflowStatus ?? '';

    const typeZhMap = { device: '設備', hr: '人事', safety: '安全', admin: '行政' };
    const typeLower = String(typeRaw || '').toLowerCase();
    const typeZh = typeZhMap[typeLower] || (typeRaw || '設備');

    return {
      id: r.id ?? r.issueId ?? r._id ?? '',
      type: typeZh,
      description: descRaw || '—',
      assigneeName: assigneeRaw ? String(assigneeRaw) : '未分配',
      status: statusRaw
    };
  });
}

function applyVisibilityFilterIssues(list) {
  // 以顯示文字為準（同你的 badge 來源）
  return list.filter(item => statusToText(item.status) !== '已解決');
}


// ---- 渲染 4 欄：類型 / 問題描述 / 分配員工 / 狀態 ----
function renderIssuesNormalized(list) {
  const $tb = $('#issue-table tbody');
  $tb.empty();

  if (!list.length) {
    $tb.append(`<tr><td colspan="4" class="text-center text-muted">目前沒有問題</td></tr>`);
    return;
  }

  list.forEach(item => {
    const stText = statusToText(item.status);
    const stClass = statusToBadgeClass(item.status);
    $tb.append(`
      <tr>
        <td>${item.type}</td>
        <td>${item.description}</td>
        <td>${item.assigneeName}</td>
        <td><span class="badge ${stClass}">${stText}</span></td>
      </tr>
    `);
  });
}


async function refreshIssues() {
  try {
    let list = await fetchIssuesNormalized();
    list = applyVisibilityFilterIssues(list);   // ★ 加這行
    renderIssuesNormalized(list);
  } catch (err) {
    Swal.fire('載入失敗', err.message || '請稍後再試', 'error');
  }
}


// ======================== 綁定 ========================
$(document).ready(function () {
  $('#btn-report-issue').on('click', showReportForm);
  refreshIssues();
  // 如需自動刷新可打開：
  // setInterval(refreshIssues, 30000);
});


// ======================== 基礎設定 ========================
function getConfig() {
  const el = document.getElementById('app-config');
  const apiRoot = (el?.dataset?.apiRoot || 'http://localhost:3000/api').replace(/\/+$/, '');
  const login = el?.dataset?.login || '/index.html';
  const BASE = `${apiRoot}`;
  return {
    apiRoot, login,
    routes: {
      deviceStatus: `${BASE}/devices/status`,        // 下拉設備清單
      reportIssue:  `${BASE}/devices/report-issue`,  // 回報 + 後端連動（狀態=3、issue+1、排程start）
      listIssues:   `${BASE}/devices/issues`         // 問題清單
    }
  };
}

// ======================== 共用 fetch（帶 token） ========================
async function apiFetch(url, { method = 'GET', body, headers = {} } = {}) {
  const token = localStorage.getItem('access_token');
  const finalHeaders = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers
  };
  const res = await fetch(url, {
    method,
    headers: finalHeaders,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'omit'
  });

  if (res.status === 401) {
    const { login } = getConfig();
    await Swal.fire('請重新登入', '登入逾時或權限不足', 'warning');
    location.href = login;
    throw new Error('Unauthorized');
  }

  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) {
    const msg = data?.message || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ======================== JWT 解析：取得登入者名稱 ========================
function b64urlToBytes(b64url) {
  let b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  const bin = atob(b64); // 單位元組字串
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

// 解析 JWT payload（正確處理 UTF-8）
function parseJwtPayload(token) {
  if (!token || token.split('.').length !== 3) return {};
  const payloadPart = token.split('.')[1];
  const bytes = b64urlToBytes(payloadPart);
  const utf8 = new TextDecoder('utf-8').decode(bytes);
  try { return JSON.parse(utf8); } catch { return {}; }
}

function getCurrentUserName() {
  const token = localStorage.getItem('access_token');
  const payload = parseJwtPayload(token);
  // 常見欄位：name / username / preferred_username / given_name / email
  let name = payload.name || payload.username || payload.preferred_username || payload.given_name || payload.email || '';

  // 後備：從 data-user-name 補
  if (!name) {
    const el = document.getElementById('app-config');
    name = (el?.dataset?.userName || '').trim();
  }
  return name;
}

// ======================== 1) 取得設備清單（for 下拉） ========================
async function fetchDeviceStatus() {
  const { routes } = getConfig();
  const json = await apiFetch(routes.deviceStatus);
  // 期待：{ success, data:[{id,name,status,...}, ...] }
  return json.data || [];
}

// ======================== 2) 回報問題（含後端連動參數） ========================
async function reportIssue({ deviceId, reporterName, desc }) {
  const { routes } = getConfig();
  const payload = {
    deviceId: Number(deviceId),
    name: reporterName,          // 顯示用名稱（後端亦可改用 req.user）
    description: desc,

    // ★ 這三個交給後端一起處理：
    setStatusTo: 3,              // deviceStatus 設為 3
    bumpIssueCount: true,        // issue_count + 1
    scheduleStartNow: true       // 在 schedule 建立一筆 startTime=現在
  };
  return await apiFetch(routes.reportIssue, { method: 'POST', body: payload });
}

// ======================== UI：回報表單 ========================
function showReportForm() {
  const me = getCurrentUserName() || '';

  Swal.fire({
    title: '回報設備問題',
    html: `
      <div class="form-group text-left">
        <label>問題類型</label>
        <select id="issue-type" class="form-control">
          <option value="device">設備</option>
          <option value="hr" disabled>人事（尚未開放）</option>
          <option value="safety" disabled>安全（尚未開放）</option>
          <option value="admin" disabled>行政（尚未開放）</option>
        </select>
      </div>

      <div id="device-select-row" class="form-group text-left">
        <label>選擇設備</label>
        <select id="issue-device" class="form-control"></select>
      </div>
      <div class="form-group text-left">
        <label>回報者</label>
        <input id="issue-reporter" class="form-control" ${me ? 'readonly' : ''} placeholder="自動帶入登入者">
        <small class="form-text text-muted">預設為目前登入者</small>
      </div>
      <div class="form-group text-left">
        <label>問題描述</label>
        <textarea id="issue-desc" class="form-control" rows="3" placeholder="請輸入問題描述"></textarea>
      </div>
    `,
    didOpen: async () => {
      // 帶入回報者
      const $name = document.getElementById('issue-reporter');
      if (me) $name.value = me;

      // 載入設備清單
      const sel = document.getElementById('issue-device');
      sel.innerHTML = `<option disabled selected>載入設備中...</option>`;
      try {
        const list = await fetchDeviceStatus();
        if (!list.length) {
          sel.innerHTML = `<option disabled selected>目前沒有設備資料</option>`;
          return;
        }
        sel.innerHTML = list.map(d => {
          const s = String(d.status ?? '');
          const sLabel = DEVICE_STATUS_LABEL[s] || s || '-';  // ← 這裡會吃到「已指派未處理」
          const label = `${d.name || ('設備#' + d.id)}（目前狀態：${sLabel}）`;
          return `<option value="${d.id}">${label}</option>`;
        }).join('');
      } catch (e) {
        sel.innerHTML = `<option disabled selected>載入失敗：${e.message}</option>`;
      }
    },
    showCancelButton: true,
    confirmButtonText: '送出',
    cancelButtonText: '取消',
    preConfirm: () => {
      const deviceId = document.getElementById('issue-device')?.value;
      const name = document.getElementById('issue-reporter')?.value?.trim();
      const desc = document.getElementById('issue-desc')?.value?.trim();
      if (!deviceId) return Swal.showValidationMessage('請選擇設備');
      if (!name)     return Swal.showValidationMessage('請確認回報者名稱');
      if (!desc)     return Swal.showValidationMessage('請填寫問題描述');
      return { deviceId, reporterName: name, desc };
    }
  }).then(async (r) => {
    if (!r.isConfirmed) return;
    try {
      await reportIssue(r.value);
      await Swal.fire('已送出', '已建立問題並更新設備狀態與排程開始時間', 'success');
      refreshIssues(); // 重新載入清單
    } catch (e) {
      Swal.fire('送出失敗', e.message || '請稍後再試', 'error');
    }
  });
}

// ======================== 問題清單（載入/渲染） ========================

// ---- 抓清單並正規化成：type / description / deviceName / status ----
async function fetchIssuesNormalized() {
  const { routes } = getConfig();
  const json = await apiFetch(routes.listIssues); // /devices/issues
  const arr = Array.isArray(json?.data) ? json.data : (Array.isArray(json) ? json : []);

  return arr.map(r => {
    const typeRaw =
      r.type ?? r.category ?? r.kind ?? r.issueType ?? '';
    const descRaw =
      r.description ?? r.desc ?? r.title ?? r.summary ?? '';

    // ★ 關聯設備：優先使用後端 select 出來的 deviceName
    const deviceRaw =
      r.deviceName ??
      r.device_name ??
      r.deviceTitle ??
      r.deviceLabel ??
      (r.device && (r.device.name || r.device.title || r.device.label)) ??
      (r.deviceInfo && (r.deviceInfo.name || r.deviceInfo.title)) ??
      '';

    const deviceFallback = r.deviceId ? `#${r.deviceId}` : '—';

    const statusRaw =
      r.status ?? r.state ?? r.progress ?? r.issueStatus ?? r.workflowStatus ?? '';

    const typeZhMap = { device: '設備', hr: '人事', safety: '安全', admin: '行政' };
    const typeLower = String(typeRaw || '').toLowerCase();
    const typeZh = typeZhMap[typeLower] || (typeRaw || '設備');

    return {
      id: r.id ?? r.issueId ?? r._id ?? '',
      type: typeZh,
      description: descRaw || '—',
      deviceName: (deviceRaw || deviceFallback),
      status: statusRaw
    };
  });
}

function applyVisibilityFilterIssues(list) {
  // 以顯示文字為準（同你的 badge 來源）
  return list.filter(item => statusToText(item.status) !== '已解決');
}


// ---- 渲染 4 欄：類型 / 問題描述 / 關聯設備 / 狀態 ----
function renderIssuesNormalized(list) {
  const $tb = $('#issue-table tbody');
  $tb.empty();

  if (!list.length) {
    $tb.append(`<tr><td colspan="4" class="text-center text-muted">目前沒有問題</td></tr>`);
    return;
  }

  list.forEach(item => {
    const stText = statusToText(item.status);
    const stClass = statusToBadgeClass(item.status);
    $tb.append(`
      <tr>
        <td>${item.type}</td>
        <td>${item.description}</td>
        <td>${item.deviceName}</td>
        <td><span class="badge ${stClass}">${stText}</span></td>
      </tr>
    `);
  });
}



async function refreshIssues() {
  try {
    let list = await fetchIssuesNormalized();
    list = applyVisibilityFilterIssues(list);   // ★ 加這行
    renderIssuesNormalized(list);
  } catch (err) {
    Swal.fire('載入失敗', err.message || '請稍後再試', 'error');
  }
}



// ======================== 綁定 ========================
$(document).ready(function () {
  $('#btn-report-issue').on('click', showReportForm);
  refreshIssues();
  // 如需自動刷新可打開：
  // setInterval(refreshIssues, 30000);
});
