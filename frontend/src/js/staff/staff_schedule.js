/**
 * /js/staff/staff_schedule.js  (FullCalendar v5 + 接 accept-task / maintenance API)
 * 串接後端：
 *   - GET   /api/schedule/my-tasks
 *   - PATCH /api/schedule/accept-task/:scheduleId
 *   - POST  /api/schedule/maintenance
 *
 * - Calendar 與列表共用同一份資料 currentSchedule
 * - 狀態映射：assigned/accepted/submitted/approved/rejected
 *            → 未完成/進行中/申請中/完成/退回
 *
 * 需求（頁面已載入）：
 *   - /js/vendors.bundle.js（含 jQuery）
 *   - /js/notifications/sweetalert2/sweetalert2.bundle.js
 *   - /js/miscellaneous/fullcalendar/main.min.js（v5）
 *   - HTML 需有：#btn-calendar-view、#btn-list-view、#calendar-view（內含 #calendar）、#list-view（內含 #schedule-table tbody）
 */

// ==============================
// 小工具 & 常數
// ==============================
const API_BASE = 'http://localhost:3000/api';
const API_MY_TASKS = `${API_BASE}/schedule/my-tasks`;

const TOKEN_KEYS = ['authToken', 'access_token', 'token'];

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
  if (!resp.ok) {
    const err = new Error((data && (data.message || data.error)) || `HTTP ${resp.status}`);
    err.status = resp.status;
    err.body = data;
    throw err;
  }
  return data ?? {};
}

function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;')
    .replaceAll('"','&quot;').replaceAll("'","&#39;");
}

// 傳入物件 + 多個欄位名，回傳第一個有值的
function pick(o, ...keys) {
  for (const k of keys) {
    const v = o?.[k];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return undefined;
}

// e.id 可能長得像 "S-12" 或 "I-7"，只對 S-* 才需要打 accept API
function extractScheduleId(eventId) {
  if (!eventId || typeof eventId !== 'string') return null;
  const m = eventId.match(/^S-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * 把 (dateStr, timeStr) 轉成 FullCalendar 穩定可解析的本地 ISO（YYYY-MM-DDTHH:mm[:ss[.SSS]]）
 * 支援：
 *  - date='YYYY-MM-DD' + time='HH:mm'/'HH:mm:ss'/'HH:mm:ss.SSS'
 *  - timeStr='YYYY-MM-DD HH:mm[:ss[.SSS]]' / 'YYYY-MM-DDTHH:mm[:ss[.SSS]][Z]'
 *  - 只給 date -> 補 'T00:00:00'
 * 回傳 null 表示無法解析
 */
function toLocalIso(dateStr, timeStr) {
  if (!dateStr && !timeStr) return null;

  // 情境 A：只給 timeStr，但它其實是完整日期或日期時間
  if (!dateStr && timeStr) {
    let s = String(timeStr).trim().replace(' ', 'T');
    // YYYY-MM-DD 或 YYYY-MM-DDTHH:mm[:ss[.SSS]][Z]
    if (/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?(Z)?)?$/.test(s)) {
      if (!s.includes('T')) return `${s}T00:00:00`;
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00`; // 補秒
      return s;
    }
  }

  // 情境 B：date + time
  const d = String(dateStr || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;

  let t = String(timeStr || '00:00:00').trim();
  if (t.includes('T')) t = t.split('T')[1] || '00:00:00';
  // t 允許 HH:mm / HH:mm:ss / HH:mm:ss.SSS
  if (/^\d{2}:\d{2}$/.test(t)) t = `${t}:00`;
  if (!/^\d{2}:\d{2}(:\d{2}(\.\d{1,6})?)?$/.test(t)) t = '00:00:00';

  return `${d}T${t}`;
}

// ==============================
// 狀態映射與樣式
// ==============================
function statusText(status) {
  switch (String(status || '').toLowerCase()) {
    case 'assigned':  return '未完成';
    case 'accepted':  return '進行中';
    case 'submitted': return '申請中';
    case 'approved':  return '完成';
    case 'rejected':  return '退回';
    default:          return '未知';
  }
}

function badgeClassByStatus(text) {
  if (text === '退回') return 'badge-danger';
  if (text === '未完成') return 'badge-warning';
  if (text === '申請中') return 'badge-info';
  if (text === '完成') return 'badge-success';
  if (text === '進行中') return 'badge-primary';
  return 'badge-secondary';
}

function statusStyle(status) {
  switch (String(status).toLowerCase()) {
    case 'assigned':  return { bg: '#6c757d', border: '#6c757d', text: '#ffffff' }; // 灰：未完成
    case 'accepted':  return { bg: '#007bff', border: '#007bff', text: '#ffffff' }; // 藍：進行中
    case 'submitted': return { bg: '#ffc107', border: '#ffc107', text: '#212529' }; // 黃：申請中
    case 'approved':  return { bg: '#28a745', border: '#28a745', text: '#ffffff' }; // 綠：完成
    case 'rejected':  return { bg: '#dc3545', border: '#dc3545', text: '#ffffff' }; // 紅：退回
    default:          return { bg: '#adb5bd', border: '#adb5bd', text: '#ffffff' }; // 淺灰
  }
}

// ==============================
// API → 統一資料模型
// ==============================
/**
 * 後端回傳（可能包 data）：
 * {
 *   data?: {
 *     schedules: [{ scheduleId, title, description, date/start_date, start_time/startTime/start, end_time/endTime/end, status, deviceId/device_id, deviceName/device_name, rejectReason? }],
 *     issues:    [{ issueId/issue_id, deviceId/device_id, description, status, createTime/create_time, deviceName/device_name, title? }]
 *   }
 * }
 *
 * 轉為統一資料陣列：
 * {
 *   type: 'schedule' | 'issue',
 *   id: 'S-xxx' | 'I-xxx',
 *   title, desc, deviceName,
 *   start, end (ISO字串或 null),
 *   owner: '自己',
 *   statusText, rawStatus, returned(bool), rejectReason?
 * }
 */
function normalizeTasks(apiData) {
  const out = [];
  const payload = apiData?.data || apiData || {};
  const schedules = Array.isArray(payload.schedules) ? payload.schedules : [];
  const issues    = Array.isArray(payload.issues)    ? payload.issues    : [];

  // schedules
  for (const s of schedules) {
    // date 可能叫 date / startDate / start_date / workDate / work_date
    const dateVal = pick(s, 'date', 'startDate', 'start_date', 'workDate', 'work_date');

    // start/end 可能為多種命名，且有時候欄位本身就帶完整日期時間
    const directStart = pick(s, 'startTime', 'start', 'startAt', 'start_at');
    const directEnd   = pick(s, 'endTime',   'end',   'endAt',   'end_at');

    const startRaw = pick(s, 'startTime', 'start_time', 'start', 'startAt', 'start_at');
    const endRaw   = pick(s, 'endTime',   'end_time',   'end',   'endAt',   'end_at', 'deadline', 'due', 'dueTime', 'due_time');

    const start = directStart || toLocalIso(dateVal, startRaw) || toLocalIso(null, startRaw) || null;
    const end   = directEnd   || toLocalIso(dateVal, endRaw)   || toLocalIso(null, endRaw)   || null;

    const stxt  = statusText(pick(s, 'status', 'state'));

    out.push({
      type: 'schedule',
      id: `S-${pick(s, 'scheduleId', 'schedule_id', 'id')}`,
      title: pick(s, 'title') || (pick(s, 'deviceName', 'device_name') ? `設備：${pick(s, 'deviceName', 'device_name')}` : '工作任務'),
      desc: pick(s, 'description', 'desc') || '',
      deviceId: pick(s, 'deviceId', 'device_id'),
      deviceName: pick(s, 'deviceName', 'device_name') || '',
      start, end,
      owner: '自己',
      statusText: stxt,
      rawStatus: pick(s, 'status', 'state'),
      returned: stxt === '退回',
      rejectReason: pick(s, 'rejectReason', 'reject_reason', 'managerNote', 'manager_note')
    });
  }

  // issues（如需在員工端顯示）
  for (const i of issues) {
    const stxt = statusText(pick(i, 'status', 'state') || 'assigned');
    const start = toLocalIso(null, pick(i, 'createTime', 'create_time')) ||
                  toLocalIso(pick(i, 'date', 'issueDate', 'issue_date'), pick(i, 'time', 'issueTime', 'issue_time')) ||
                  null;
  }

  // 依開始時間排序（無開始時間者置後）
  out.sort((a,b) => {
    if (!a.start && !b.start) return 0;
    if (!a.start) return 1;
    if (!b.start) return -1;
    return a.start.localeCompare(b.start);
  });

  return out;
}

// ==============================
// FullCalendar v5 事件轉換
// ==============================
function toCalendarEvents(arr) {
  return arr
    .filter(e => !!e.start) // 沒開始時間的事件不丟日曆
    .map(e => {
      const color = statusStyle(e.rawStatus || e.statusText);
      return {
        id: e.id,
        title: e.title,
        start: e.start,
        end: e.end || null,
        display: 'block',
        backgroundColor: color.bg,
        borderColor: color.border,
        textColor: color.text,
        extendedProps: { raw: e }
      };
    });
}

// ==============================
// DOM 元素 & 狀態
// ==============================
let currentSchedule = [];
let calendar = null;

const $calendarViewBtn = $('#btn-calendar-view');
const $listViewBtn = $('#btn-list-view');
const $calendarWrap = $('#calendar-view');
const $listWrap = $('#list-view');
const $tableBody = $('#schedule-table tbody');

// 只顯示「非完成」的工作任務（issue 不受影響）
function applyVisibilityFilterSchedule(arr) {
  return arr.filter(e => !(e.type === 'schedule' && e.statusText === '完成'));
}

// 重新整理 FullCalendar 事件來源
function refreshCalendarEvents() {
  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(toCalendarEvents(currentSchedule));
  }
}

// ==============================
// UI：列表
// ==============================
function renderList(arr) {
  $tableBody.empty();
  arr.forEach(e => {
    const rowClass =
      (e.statusText === '退回') ? 'table-danger' :
      (e.statusText === '未完成') ? 'table-warning' :
      (e.statusText === '申請中') ? 'table-info' :
      (e.statusText === '進行中') ? 'table-primary' : '';

    const timeStr = (e.start ? e.start.replace('T',' ').slice(0,16) : '—') +
                    (e.end ? (' ~ ' + e.end.replace('T',' ').slice(0,16)) : '');

    // 按鈕規則：
    // - 未完成(assigned)   -> 顯示「接受任務」
    // - 進行中(accepted)   -> 顯示「申請」
    // - 退回(rejected)     -> 顯示「重新開始」
    let actionBtns = `<button class="btn btn-info btn-sm btn-task-detail" data-id="${e.id}">詳情</button>`;
    if (e.type === 'schedule') {
      if (e.statusText === '未完成' || e.statusText === '退回') {
        actionBtns += ` <button class="btn btn-primary btn-sm btn-accept-task" data-id="${e.id}">接受任務</button>`;
      } else if (e.statusText === '進行中') {
        actionBtns += ` <button class="btn btn-warning btn-sm btn-apply-task" data-id="${e.id}">申請</button>`;
      }
    }

    $tableBody.append(`
      <tr class="${rowClass}">
        <td>${escapeHtml(e.title)}</td>
        <td>${timeStr}</td>
        <td>${escapeHtml(e.owner)}</td>
        <td><span class="badge ${badgeClassByStatus(e.statusText)}">${e.statusText}</span></td>
        <td>${actionBtns}</td>
      </tr>
    `);
  });
}

// ==============================
// UI：詳情（SweetAlert2）
// ==============================
function showTaskDetail(e) {
  let extra = '';
  if (e.statusText === '退回' && e.rejectReason) {
    extra = `
      <p><strong>退回原因：</strong></p>
      <div style="background:#f8d7da;padding:8px;border-radius:4px;color:#842029;margin-bottom:8px;">
        ${escapeHtml(e.rejectReason)}
      </div>
    `;
  }
  Swal.fire({
    title: escapeHtml(e.title),
    html: `
      ${extra}
      <p><strong>類型：</strong>${e.type === 'issue' ? '問題' : '工作任務'}</p>
      <p><strong>設備：</strong>${escapeHtml(e.deviceName || '—')}</p>
      <p><strong>描述：</strong>${escapeHtml(e.desc || '—')}</p>
      <p><strong>時間：</strong>${e.start ? e.start.replace('T',' ') : '—'}${e.end ? (' ~ ' + e.end.replace('T',' ')) : ''}</p>
      <p><strong>狀態：</strong>${e.statusText}</p>
    `,
    showCloseButton: true,
    showConfirmButton: false
  });
}

// ==============================
// 本地更新（示範）；若有後端 API 再改成 fetch 後重載
// ==============================
function updateLocalStatus(id, toText) {
  const t = currentSchedule.find(x => x.id === String(id));
  if (!t) return;
  t.statusText = toText;
  t.returned = (toText === '退回');

  renderList(currentSchedule);
  refreshCalendarEvents();
}

// ==============================
// FullCalendar v5 初始化
// ==============================
function ensureCalendar() {
  if (calendar) return;

  if (!(window.FullCalendar && typeof window.FullCalendar.Calendar === 'function')) {
    console.error('FullCalendar v5 未正確載入：/js/miscellaneous/fullcalendar/main.min.js');
    Swal.fire({
      icon: 'error',
      title: '日曆元件載入失敗',
      text: '請檢查是否正確載入 FullCalendar v5 的 main.min.js'
    });
    return;
  }

  const el = document.getElementById('calendar');
  if (!el) {
    console.error('找不到 #calendar 容器');
    Swal.fire({ icon: 'error', title: '初始化失敗', text: '找不到 #calendar 容器' });
    return;
  }

  calendar = new FullCalendar.Calendar(el, {
    initialView: 'dayGridMonth',
    timeZone: 'local',
    locale: 'zh-tw',
    buttonText: { today: '今天', month: '月', week: '週', day: '日', list: '列表' },
    headerToolbar: { left: 'title', center: '', right: 'today prev,next' },
    footerToolbar: { left: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek', center: '', right: '' },
    editable: false,
    events: (fetchInfo, success) => success(toCalendarEvents(currentSchedule)),
    eventClick: (info) => {
      const raw = info.event.extendedProps.raw;
      if (raw) showTaskDetail(raw);
    }
  });
  calendar.render();
}

// ==============================
// 載入我的任務
// ==============================
async function loadMyTasks() {
  const resp = await fetchJSON(API_MY_TASKS);
  currentSchedule = applyVisibilityFilterSchedule(normalizeTasks(resp));
}

// ==============================
// 入口
// ==============================
$(document).ready(async function () {
  try {
    await loadMyTasks();
  } catch (e) {
    Swal.fire({ icon: 'error', title: '載入失敗', text: e.message || String(e) });
  }

  // 初始化日曆
  ensureCalendar();
  refreshCalendarEvents();

  // 初始化列表
  renderList(currentSchedule);

  // 視圖切換
  $calendarViewBtn.on('click', function () {
    $(this).addClass('active');
    $listViewBtn.removeClass('active');
    $calendarWrap.show();
    $listWrap.hide();
    refreshCalendarEvents();
    if (calendar) calendar.updateSize(); // 顯示後更新尺寸
  });

  $listViewBtn.on('click', function () {
    $(this).addClass('active');
    $calendarViewBtn.removeClass('active');
    $calendarWrap.hide();
    $listWrap.show();
    renderList(currentSchedule);
  });

  // 列表操作：詳情
  $(document).on('click', '.btn-task-detail', function () {
    const id = $(this).data('id');
    const e = currentSchedule.find(x => x.id === String(id));
    if (e) showTaskDetail(e);
  });

  // 列表操作：接受任務（PATCH /api/schedule/accept-task/:scheduleId）
  $(document).on('click', '.btn-accept-task', async function () {
    const eventId = $(this).data('id');            // e.g. "S-12"
    const sid = extractScheduleId(String(eventId)); // 解析出 12
    if (!sid) {
      return Swal.fire({ icon: 'error', title: '無法辨識任務', text: `事件編號 ${eventId} 格式不正確` });
    }

    const ok = await Swal.fire({
      title: '接受任務？',
      text: '將把此任務狀態從「未完成」改為「進行中」。',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '接受',
    }).then(r => r.isConfirmed);
    if (!ok) return;

    try {
      await fetchJSON(`${API_BASE}/schedule/accept-task/${sid}`, { method: 'PATCH' });

      await loadMyTasks();
      renderList(currentSchedule);
      refreshCalendarEvents();

      Swal.fire('已接受任務', '', 'success');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: '接受失敗',
        text: (err && err.message) ? err.message : '請稍後再試'
      });
    }
  });

  // 列表操作：申請（維修申請表單）
  $(document).on('click', '.btn-apply-task', async function () {
    const id = $(this).data('id');
    const task = currentSchedule.find(x => x.id === String(id));
    if (!task) return;
    const sid = extractScheduleId(task.id); // "S-12" -> 12
    if (!sid) {
      return Swal.fire({ icon: 'error', title: '無法辨識任務', text: `事件編號 ${task.id} 格式不正確` });
    }

    // 取得當前時間戳（顯示用）
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace('T', ' ');

    const result = await Swal.fire({
      title: '維修申請表單',
      html: `
        <div class="form-group text-left">
          <label class="font-weight-bold">1. 基本資訊</label>
          <input type="text" class="form-control" value="維修任務 - ${escapeHtml(task.title)}" readonly style="background-color: #f8f9fa; color: #6c757d;">
          <small class="form-text text-muted">任務基本資訊（不可編輯）</small>
        </div>

        <div class="form-group text-left">
          <label class="font-weight-bold">2. 維修描述 <span class="text-danger">*</span></label>
          <textarea id="maintenance-description" class="form-control" rows="4" placeholder="請詳細描述維修過程、發現的問題、解決方案等..."></textarea>
          <small class="form-text text-muted">請詳細描述維修過程和結果</small>
        </div>

        <div class="form-group text-left">
          <label class="font-weight-bold">3. 照片</label>
          <input type="text" class="form-control" value="照片" readonly style="background-color: #f8f9fa; color: #6c757d;">
          <small class="form-text text-muted">照片上傳功能（暫未開放）</small>
        </div>

        <div class="form-group text-left">
          <label class="font-weight-bold">4. 負責人簽名</label>
          <input type="text" class="form-control" value="負責人簽名" readonly style="background-color: #f8f9fa; color: #6c757d;">
          <small class="form-text text-muted">電子簽名功能（暫未開放）</small>
        </div>

        <div class="form-group text-left">
          <label class="font-weight-bold">5. 維修時間紀錄</label>
          <input type="text" class="form-control" value="${timestamp}" readonly style="background-color: #f8f9fa; color: #6c757d;">
          <small class="form-text text-muted">維修完成時間（自動記錄）</small>
        </div>
      `,
      width: '600px',
      showCancelButton: true,
      confirmButtonText: '送出申請',
      cancelButtonText: '取消',
      preConfirm: () => {
        const description = document.getElementById('maintenance-description')?.value?.trim();
        if (!description) {
          Swal.showValidationMessage('請填寫維修描述');
          return false;
        }
        return { description, timestamp };
      }
    });

    if (!result.isConfirmed) return;

    try {
      // 送給後端的 endTime = 現在（UTC ISO），表示維修完成時間
      await fetchJSON(`${API_BASE}/schedule/maintenance`, {
        method: 'POST',
        body: JSON.stringify({
          scheduleId: sid,
          deviceId: Number(task.deviceId),
          employee_description: result.value.description,
          endTime: new Date().toISOString()
        })
      });

      await loadMyTasks();
      renderList(currentSchedule);
      refreshCalendarEvents();

      Swal.fire('已送出申請', '維修申請已提交給主管審查', 'success');
    } catch (error) {
      Swal.fire('申請失敗', error.message || '請稍後再試', 'error');
    }
  });

  // 列表操作：重新開始（本地示範；若有 API 請替換）
  $(document).on('click', '.btn-restart-task', async function () {
    const id = $(this).data('id');
    const ok = await Swal.fire({
      title: '重新開始？',
      text: '是否要針對此任務重新開始處理？',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '重新開始'
    }).then(r => r.isConfirmed);
    if (!ok) return;

    updateLocalStatus(id, '未完成');
    Swal.fire('已重新開始', '', 'info');
  });
});
