// ======================== 全域常數與工具 ========================
// 1) 狀態對照（設備）
const DEVICE_STATUS_LABEL = { '1': '正常運行', '2': '維護中', '3': '故障', '4': '已指派未處理' };

// 2) API Root & Routes
const API_ROOT = document.getElementById('app-config')?.dataset?.apiRoot || 'http://localhost:3000/api';
const SCHEDULE_API_BASE = `${API_ROOT}/schedule`;
const ROUTES = {
  assignSnapshot: `${API_ROOT}/schedule/assign-human-resource`,
  // 主管分派：一次更新 Device / Schedule / MaintainRecord
  assign:        `${API_ROOT}/schedule/assign-human-resource`,
  maintenanceHistory: `${SCHEDULE_API_BASE}/maintenance-history`,
};

// 3) 共用 fetch（帶 JWT）
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
    body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
    credentials: 'omit',
  });

  // 401 統一導回登入
  if (res.status === 401) {
    const login = document.getElementById('app-config')?.dataset?.login || '/index.html';
    await Swal.fire('請重新登入', '登入逾時或權限不足', 'warning');
    location.href = login;
    throw new Error('Unauthorized');
  }

  let data = null;
  try { data = await res.json(); } catch {}
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}

// ======================== Model（右側人員資料） ========================
const staffModel = []; // [{id,name,status:'idle'|'busy', task?:string}, ...]

// ★ 新增：依 deviceId 快取 issue 描述（員工回報）
const issuesByDevice = new Map();// deviceId -> { id: issueId, desc: string }

// 新增：一次載入「故障清單 + 人員清單 + 問題清單」
async function loadSnapshot() {
  const { data } = await apiFetch(ROUTES.assignSnapshot);
  // 左側：異常機台（包含故障、維護中、已指派未處理）
  const faultyDevices = data?.faultyDevices ?? [];
  renderAlertList(faultyDevices.map(d => ({
    id: d.deviceId,
    name: d.deviceName,
    status: Number(d.deviceStatus)  // 你的回傳是 '3' 字串，轉一下也可
  })));

  // 右側：人員（用 users.status 判斷 idle/busy）
  const staff = data?.availableStaff ?? [];
  staffModel.length = 0;
  staff.forEach(s => {
    // 規則：userStatus === 'busy' 視為忙碌，其餘視為空閒
    const status = String(s.userStatus).toLowerCase() === 'busy' ? 'busy' : 'idle';
    staffModel.push({
      id:   s.userId,
      name: s.userName,
      status,
      task: '-' // 你的 existingIssues 目前沒有「受指派者」欄位，先留空
    });
  });
// ★ 新增：把「待處理中的 issue」快取為 deviceId -> issue
const issues = data?.existingIssues ?? [];
issuesByDevice.clear();
issues.forEach(it => {
  const list = issuesByDevice.get(it.deviceId) || [];
  list.push({
    id: it.issueId,
    desc: it.description || '',
    status: String(it.status || ''),
    createTime: it.createTime || null
  });
  issuesByDevice.set(it.deviceId, list);
});
}

function renderAlertList(list) {
  if (!Array.isArray(list) || !list.length) {
    $('#alert-list').html('<div class="text-muted">目前沒有異常。</div>');
    return;
  }

  const html = list.map(d => {
    const name = d.name || `設備#${d.id}`;
    const s = String(d.status ?? '');
    const sLabel = DEVICE_STATUS_LABEL[s] || s || '-';
    const badgeClass = s === '3' ? 'badge-danger' 
                     : s === '4' ? 'badge-info' 
                     : s === '2' ? 'badge-warning' 
                     : 'badge-secondary';

    return `
      <div class="d-flex justify-content-between align-items-center border p-2 mb-2 rounded">
        <div>
          <div><strong>${name}</strong></div>
          <small class="text-muted">狀態：<span class="badge ${badgeClass}">${sLabel}</span></small>
        </div>
        <button class="btn btn-sm btn-primary btn-assign"
                data-device-id="${d.id}"
                data-device-name="${name}">
          指派處理
        </button>
      </div>
    `;
  }).join('');

  $('#alert-list').html(html);
}

// 事件委派（確保動態渲染也能點）
function bindLeftPanelEvents() {
  $('#alert-list').on('click', '.btn-assign', (e) => {
    const id = Number(e.currentTarget.dataset.deviceId);
    const name = e.currentTarget.dataset.deviceName || `設備#${id}`;
    openAssignDialog({ id, name }).catch(err => {
      console.error(err);
      Swal.fire('錯誤', err.message || '無法開啟指派視窗', 'error');
    });
  });
}


// ======================== 右側人員表 ========================

// 綁定右上角排序下拉
function bindStaffEvents() {
  $('#staff-sort-order').on('change', renderStaffTable);
}

// 根據 staffModel 重新渲染表格
function renderStaffTable() {
  const order = $('#staff-sort-order').val();
  const arr = [...staffModel];

  // 排序規則
  arr.sort((a, b) => {
    if (order === 'idleFirst') {
      return (a.status === 'idle') === (b.status === 'idle') ? 0 : (a.status === 'idle' ? -1 : 1);
    } else if (order === 'busyFirst') {
      return (a.status === 'busy') === (b.status === 'busy') ? -1 : 1;
    }
    return 0;
  });

  // 建出每一列
  const rows = arr.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${
        s.status === 'idle'
          ? '<span class="status-badge-idle">空閒</span>'
          : '<span class="status-badge-busy">執行中</span>'
      }</td>
      <td>${s.task || '-'}</td>
    </tr>
  `).join('');

  $('#tbl-staff tbody').html(rows || '<tr><td colspan="3" class="text-center text-muted">目前沒有人員資料</td></tr>');
}

// ======================== 小工具：HTML escape（防止文字中含 < > 或 & 出錯） ========================
function esc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, ch => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]));
}
// ======================== 指派：Swal 表單 + 呼叫後端 ========================
async function openAssignDialog(device) {
  const idle = staffModel.filter(s => s.status === 'idle');
  const busy  = staffModel.filter(s => s.status === 'busy');

  const idleOptions = idle.map(s => `<option value="${s.id}">${s.name}（空閒）</option>`).join('');
  const busyOptions = busy.map(s => `<option value="${s.id}" disabled>${s.name}（執行中）</option>`).join('');

  // 🔧取得該設備的 issues（可能 0~多筆）
  const issueList = issuesByDevice.get(device.id) || [];
  const makeIssueLabel = (it) => {
    const txt = esc(it.desc);
    const short = txt.length > 30 ? txt.slice(0, 30) + '…' : txt;
    return short;               // 🔴 不再回傳 "#${it.id} ..."
  };
  const issueOptions = issueList.length
    ? issueList.map(it => `<option value="${it.id}">${makeIssueLabel(it)}</option>`).join('')
    : '<option value="" disabled>（找不到此設備的問題）</option>';

    const ret = await Swal.fire({
      title: `指派處理：${device.name}`,
      html: `
        <div class="form-group text-left">
          <label>選擇問題（員工回報）</label>
          <select id="assign-issue" class="form-control">
            ${issueOptions}
          </select>
          <small class="form-text text-muted">可從多個回報中選擇要先處理的那一筆</small>
        </div>
    
        <div class="form-group text-left">
          <label>指派人員</label>
          <select id="assign-staff" class="form-control">
            <optgroup label="空閒">${idleOptions || '<option disabled>目前沒有空閒人員</option>'}</optgroup>
            <optgroup label="執行中">${busyOptions || '<option disabled>—</option>'}</optgroup>
          </select>
          <small class="form-text text-muted">建議優先指派「空閒」人員</small>
        </div>
    
        <div class="form-group text-left">
          <label>主管指示 / 備註</label>
          <textarea id="assign-desc" class="form-control" rows="3" placeholder="請填寫維護重點、備註等"></textarea>
        </div>
    
        <div class="form-group text-left">
          <label>截止日期 (ETA)</label>
          <input type="datetime-local" id="assign-eta" class="form-control" />
          <small class="form-text text-muted">不填代表暫無明確截止</small>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '確認指派',
      cancelButtonText: '取消',
      // 🔴 刪掉 didOpen
      preConfirm: () => {
        const issueId = Number(document.getElementById('assign-issue')?.value || 0);
        const staffId = Number(document.getElementById('assign-staff')?.value || 0);
        const desc = (document.getElementById('assign-desc')?.value || '').trim();
        const etaRaw = document.getElementById('assign-eta')?.value || '';
    
        if (!issueId) return Swal.showValidationMessage('請選擇要處理的問題');
        if (!staffId) return Swal.showValidationMessage('請選擇指派人員');
    
        const eta = etaRaw ? new Date(etaRaw.replace(' ', 'T')).toISOString() : null;
        return { issueId, staffId, desc, eta };
      }
    });
    if (!ret.isConfirmed) return;
    const { issueId, staffId, eta } = ret.value;

    // 🔧這裡修正 payload 欄位名：userId（不是 assignerId）
    const payload = {
      issueId,
      userId: staffId,
      endTime: eta || undefined
    };

    try {
      await apiFetch(ROUTES.assign, { method: 'POST', body: payload });
      await Swal.fire('已指派', '已同步更新裝置/排程/維護紀錄', 'success');
      await loadSnapshot();
      renderStaffTable();
    } catch (e) {
      Swal.fire('指派失敗', e.message || '請稍後再試', 'error');
    }
  
}


// ======================== 自動刷新 ========================
function startAutoRefresh() {
  stopAutoRefresh?.();
  window.__monitorTimer = setInterval(async () => {
    await loadSnapshot();
    renderStaffTable();
  }, 30000);
}
function stopAutoRefresh() { clearInterval(window.__monitorTimer); }


// ======================== 維修紀錄功能 ========================
let maintenanceHistoryData = []; // 快取維修紀錄資料

// 載入維修紀錄
async function loadMaintenanceHistory(deviceId = null) {
  try {
    const url = deviceId ? 
      `${ROUTES.maintenanceHistory}?deviceId=${deviceId}` : 
      ROUTES.maintenanceHistory;
    
    const resp = await apiFetch(url, { method: 'GET' });
    maintenanceHistoryData = resp.data || [];
    renderMaintenanceHistoryTable();
  } catch (err) {
    console.error('載入維修紀錄失敗：', err);
    maintenanceHistoryData = [];
    renderMaintenanceHistoryTable();
  }
}

// 渲染維修紀錄表格
function renderMaintenanceHistoryTable() {
  const $tbody = document.querySelector('#maintenance-history-table tbody');
  if (!$tbody) return;

  if (maintenanceHistoryData.length === 0) {
    $tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">暫無維修紀錄</td></tr>';
    return;
  }

  $tbody.innerHTML = maintenanceHistoryData.map(record => `
    <tr>
      <td>${record.deviceName || '未知設備'}</td>
      <td>${record.userName || '未知人員'}</td>
      <td>${record.employeeDescription || '-'}</td>
      <td>${record.createTime ? new Date(record.createTime).toLocaleString('zh-TW') : '-'}</td>
      <td>${record.endTime ? new Date(record.endTime).toLocaleString('zh-TW') : '-'}</td>
      <td>${record.bossDescription || '-'}</td>
    </tr>
  `).join('');
}

// 載入設備選項到篩選器
async function loadDeviceFilter() {
  const $filter = document.querySelector('#maintenance-device-filter');
  if (!$filter) return;

  try {
    // 從現有的設備資料中取得設備列表
    const devices = Array.from(new Set(maintenanceHistoryData.map(record => ({
      id: record.deviceId,
      name: record.deviceName
    }))));

    $filter.innerHTML = '<option value="">全部設備</option>' + 
      devices.map(device => `<option value="${device.id}">${device.name}</option>`).join('');
  } catch (err) {
    console.error('載入設備篩選器失敗：', err);
  }
}

// 搜尋維修紀錄
function searchMaintenanceHistory() {
  const searchTerm = document.querySelector('#maintenance-search')?.value?.toLowerCase() || '';
  const deviceFilter = document.querySelector('#maintenance-device-filter')?.value || '';

  let filteredData = maintenanceHistoryData;

  // 設備篩選
  if (deviceFilter) {
    filteredData = filteredData.filter(record => record.deviceId == deviceFilter);
  }

  // 搜尋篩選
  if (searchTerm) {
    filteredData = filteredData.filter(record => 
      (record.userName && record.userName.toLowerCase().includes(searchTerm)) ||
      (record.employeeDescription && record.employeeDescription.toLowerCase().includes(searchTerm))
    );
  }

  // 更新表格顯示
  const $tbody = document.querySelector('#maintenance-history-table tbody');
  if (!$tbody) return;

  if (filteredData.length === 0) {
    $tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">沒有符合條件的維修紀錄</td></tr>';
    return;
  }

  $tbody.innerHTML = filteredData.map(record => `
    <tr>
      <td>${record.deviceName || '未知設備'}</td>
      <td>${record.userName || '未知人員'}</td>
      <td>${record.employeeDescription || '-'}</td>
      <td>${record.createTime ? new Date(record.createTime).toLocaleString('zh-TW') : '-'}</td>
      <td>${record.endTime ? new Date(record.endTime).toLocaleString('zh-TW') : '-'}</td>
      <td>${record.bossDescription || '-'}</td>
    </tr>
  `).join('');
}

// 綁定維修紀錄事件
function bindMaintenanceHistoryEvents() {
  // 設備篩選器變更事件
  const $deviceFilter = document.querySelector('#maintenance-device-filter');
  if ($deviceFilter) {
    $deviceFilter.addEventListener('change', searchMaintenanceHistory);
  }

  // 搜尋框輸入事件
  const $searchInput = document.querySelector('#maintenance-search');
  if ($searchInput) {
    $searchInput.addEventListener('input', searchMaintenanceHistory);
  }
}

// ======================== 初始化 ========================
async function init() {
  bindLeftPanelEvents();   // 左側「指派」按鈕（事件委派）
  bindStaffEvents();       // 右上排序下拉
  bindMaintenanceHistoryEvents(); // 維修紀錄事件
  await loadSnapshot();
  renderStaffTable();
  await loadMaintenanceHistory(); // 載入維修紀錄
  loadDeviceFilter(); // 載入設備篩選器
  startAutoRefresh();
}

// 启动
document.addEventListener('DOMContentLoaded', () => { init().catch(console.error); });
