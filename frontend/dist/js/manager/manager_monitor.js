// ======================== 全域常數與工具 ========================
// 1) 狀態對照（設備）
const DEVICE_STATUS_LABEL = { '1': '正常運行', '2': '維護中', '3': '故障' };

// 2) API Root & Routes
const API_ROOT = document.getElementById('app-config')?.dataset?.apiRoot || 'http://localhost:3000/api';
const ROUTES = {
  // 左側異常清單：如果你已做 /devices/abnormal?in=2,3 更好；沒做就先用 /devices/status 然後前端過濾
  devicesStatus: `${API_ROOT}/devices/status`,
  // 右側人員清單：若後端尚未提供，會自動 fallback demo
  staffList:     `${API_ROOT}/schedules/assignees`,
  // 主管分派：一次更新 Device / Schedule / MaintainRecord
  assign:        `${API_ROOT}/devices/assign`,
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


// ======================== 左側：異常清單 ========================
async function loadAlerts() {
  // 取得全部設備狀態
  const { data = [] } = await apiFetch(ROUTES.devicesStatus);
  // 只保留 2(維護中) 與 3(故障)
  const abnormal = data.filter(d => String(d.status) === '2' || String(d.status) === '3');
  renderAlertList(abnormal);
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
    const badgeClass = s === '3' ? 'badge-danger' : s === '2' ? 'badge-warning' : 'badge-secondary';

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


// ======================== 右側：人員清單 ========================
async function loadAssignPageData() {
  // 讀人員（API 存在則用，否則 fallback demo）
  try {
    const { data = [] } = await apiFetch(ROUTES.staffList);
    staffModel.length = 0;
    staffModel.push(...data);
  } catch (err) {
    console.warn('staffList API 不可用，使用 demo 資料。', err?.message || err);
    staffModel.length = 0;
    staffModel.push(
      { id: 1, name: '王小明', status: 'idle', task: '' },
      { id: 2, name: '林小華', status: 'busy', task: '設備#12 維修' },
      { id: 3, name: '趙小美', status: 'idle', task: '' }
    );
  }
}

function renderStaffTable() {
  const order = $('#staff-sort-order').val();
  const arr = [...staffModel];
  // 排序：空閒優先 / 執行中優先
  arr.sort((a, b) => {
    if (order === 'idleFirst') {
      return (a.status === 'idle') === (b.status === 'idle') ? 0 : (a.status === 'idle' ? -1 : 1);
    }
    if (order === 'busyFirst') {
      return (a.status === 'busy') === (b.status === 'busy') ? 0 : (a.status === 'busy' ? -1 : 1);
    }
    return 0;
  });

  const rows = arr.map(s => `
    <tr>
      <td>${s.name}</td>
      <td>${s.status === 'idle'
        ? '<span class="status-badge-idle">空閒</span>'
        : '<span class="status-badge-busy">執行中</span>'}</td>
      <td>${s.task || '-'}</td>
    </tr>
  `).join('');

  $('#tbl-staff tbody').html(rows);
}

function bindStaffEvents() {
  $('#staff-sort-order').on('change', renderStaffTable);
}


// ======================== 指派：Swal 表單 + 呼叫後端 ========================
async function openAssignDialog(device) {
  // 將人員分組（空閒/執行中）
  const idle = staffModel.filter(s => s.status === 'idle');
  const busy = staffModel.filter(s => s.status === 'busy');

  const idleOptions = idle.map(s => `<option value="${s.id}">${s.name}（空閒）</option>`).join('');
  const busyOptions = busy.map(s => `<option value="${s.id}" disabled>${s.name}（執行中）</option>`).join('');

  await Swal.fire({
    title: `指派處理：${device.name}`,
    html: `
      <div class="form-group text-left">
        <label>指派人員</label>
        <select id="assign-staff" class="form-control">
          <optgroup label="空閒">${idleOptions || '<option disabled>目前沒有空閒人員</option>'}</optgroup>
          <optgroup label="執行中">${busyOptions || '<option disabled>—</option>'}</optgroup>
        </select>
        <small class="form-text text-muted">建議優先指派「空閒」人員</small>
      </div>
      <div class="form-group text-left">
        <label>說明 / 指示</label>
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
    preConfirm: () => {
      const staffId = Number(document.getElementById('assign-staff')?.value);
      const desc = (document.getElementById('assign-desc')?.value || '').trim();
      const etaRaw = document.getElementById('assign-eta')?.value || '';
      if (!staffId) return Swal.showValidationMessage('請選擇指派人員');
      // 轉 ISO（datetime-local 沒有時區，視為本地時間）
      const eta = etaRaw ? new Date(etaRaw.replace(' ', 'T')).toISOString() : null;
      return { staffId, desc, eta };
    }
  }).then(async (ret) => {
    if (!ret.isConfirmed) return;

    const { staffId, desc, eta } = ret.value;

    // 後端一次處理：Device / Schedule / MaintainRecord
    const payload = {
      deviceId: device.id,
      staffId,
      description: desc,
      eta,                      // 主管設定的截止 (ISO string 或 null)
      nextDeviceStatus: 2,      // 分派後進入維護中
      schedule: {
        startTime: 'now',       // 用 'now' 提示後端以伺服器時間寫入
        endTime: 'eta',         // 表示使用上方 eta
        status: '維護中'
      },
      maintainRecord: {
        startTime: 'now',
        endTime: null
      }
    };

    try {
      await apiFetch(ROUTES.assign, { method: 'POST', body: payload });
      await Swal.fire('已指派', '已同步更新裝置/排程/維護紀錄', 'success');

      // 成功後刷新左右資料
      await Promise.all([ loadAlerts(), loadAssignPageData() ]);
      renderStaffTable();
    } catch (e) {
      Swal.fire('指派失敗', e.message || '請稍後再試', 'error');
    }
  });
}


// ======================== 自動刷新 ========================
function startAutoRefresh() {
  stopAutoRefresh?.();
  window.__monitorTimer = setInterval(async () => {
    try {
      await Promise.all([ loadAlerts(), loadAssignPageData() ]);
      renderStaffTable();
    } catch (e) {
      console.error('[auto-refresh]', e);
    }
  }, 30000); // 30s 一次
}
function stopAutoRefresh() { clearInterval(window.__monitorTimer); }


// ======================== 初始化 ========================
async function init() {
  bindLeftPanelEvents();   // 左側「指派」按鈕（事件委派）
  bindStaffEvents();       // 右上排序下拉
  await Promise.all([
    loadAlerts(),          // 左側異常
    loadAssignPageData(),  // 右側人員
  ]);
  renderStaffTable();
  startAutoRefresh();
}

// 启动
document.addEventListener('DOMContentLoaded', () => { init().catch(console.error); });
