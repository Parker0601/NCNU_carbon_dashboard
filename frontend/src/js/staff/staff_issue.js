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
        <label>設備</label>
        <select id="issue-device" class="form-control"></select>
        <small class="form-text text-muted">從設備清單選擇要回報的機台</small>
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
          const label = `${d.name || ('設備#' + d.id)}（目前狀態：${d.status}）`;
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
const STATUS_LABEL = { '1': '待處理', '2': '處理中', '3': '已解決' };

async function fetchIssues() {
  const { routes } = getConfig();
  const json = await apiFetch(routes.listIssues);
  return (json.data || []).map(r => ({
    id: r.id,
    desc: r.description || '',
    assigned: r.assigneeName || '-',
    status: String(r.status ?? '1'),
    level: r.level || '-',
    deviceName: r.deviceName || `設備#${r.deviceId}`
  }));
}

function renderIssues(issues) {
  const $tbody = $('#issue-table tbody');
  $tbody.empty();
  issues.forEach(issue => {
    const statusText = STATUS_LABEL[issue.status] || issue.status || '-';
    const statusColor = issue.status === '3' ? 'badge-success'
                    : issue.status === '2' ? 'badge-warning'
                    : 'badge-danger';
    $tbody.append(`
      <tr>
        <td>${issue.desc}</td>
        <td>${issue.assigned}</td>
        <td><span class="badge ${statusColor}">${statusText}</span></td>
        <td>${issue.level || '-'}</td>
        <td class="text-center"></td>
      </tr>
    `);
  });
}

async function refreshIssues() {
  try {
    const issues = await fetchIssues();
    renderIssues(issues);
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
