/**
 * /js/staff/staff_schedule.js  (FullCalendar v5 + 接 accept-task API)
 * 串接後端：
 *   - GET   /api/schedule/my-tasks
 *   - PATCH /api/schedule/accept-task/:scheduleId
 *
 * - Calendar 與列表共用同一份資料 currentSchedule
 * - 狀態映射：assigned/accepted/submitted/approved/rejected
 *            → 未完成/進行中/申請中/完成/退回
 * 需求：頁面已載入
 *   - /js/vendors.bundle.js（含 jQuery）
 *   - /js/notifications/sweetalert2/sweetalert2.bundle.js
 *   - /js/miscellaneous/fullcalendar/main.min.js（v5）
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

// e.id 可能長得像 "S-12" 或 "I-7"，只對 S-* 才需要打 accept API
function extractScheduleId(eventId) {
  if (!eventId || typeof eventId !== 'string') return null;
  const m = eventId.match(/^S-(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
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

function eventClassByStatus(stxt) {
  if (stxt === '退回') return 'bg-warning text-dark border-danger';
  if (stxt === '未完成') return 'bg-warning text-dark border-warning';
  if (stxt === '申請中') return 'bg-info';
  if (stxt === '完成') return 'bg-success text-white border-success';
  if (stxt === '進行中') return 'bg-primary text-white border-primary';
  return '';
}

// ==============================
// API → 統一資料模型
// ==============================
/**
 * 後端回傳：
 * {
 *   schedules: [{ scheduleId, title, description, date, startTime, endTime, status, deviceId, deviceName, ... }],
 *   issues:    [{ issueId, deviceId, description, status, createTime, deviceName, ... }]
 * }
 * 轉為：
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

  for (const s of schedules) {
    const start = s.date ? `${s.date}T${s.startTime || '00:00:00'}` : (s.startTime || null);
    const end   = s.date ? `${s.date}T${s.endTime   || '00:00:00'}` : (s.endTime   || null);
    const stxt  = statusText(s.status);

    out.push({
      type: 'schedule',
      id: `S-${s.scheduleId}`,
      title: s.title || (s.deviceName ? `設備：${s.deviceName}` : '工作任務'),
      desc: s.description || '',
      deviceName: s.deviceName || '',
      start, end,
      owner: '自己',
      statusText: stxt,
      rawStatus: s.status,
      returned: stxt === '退回',
      rejectReason: s.rejectReason || undefined
    });
  }

  for (const i of issues) {
    const stxt = statusText(i.status || 'assigned');
    out.push({
      type: 'issue',
      id: `I-${i.issueId}`,
      title: `[問題] ${i.deviceName || ('設備#' + (i.deviceId ?? ''))}`,
      desc: i.description || '',
      deviceName: i.deviceName || '',
      start: i.createTime || null,
      end: null,
      owner: '自己',
      statusText: stxt,
      rawStatus: i.status || 'assigned',
      returned: String(i.status).toLowerCase() === 'rejected',
      rejectReason: i.rejectReason || undefined
    });
  }

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
  return arr.map(e => ({
    id: e.id,
    title: e.title,
    start: e.start || null,
    end: e.end || null,
    classNames: [eventClassByStatus(e.statusText)],
    extendedProps: { raw: e }
  }));
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
      if (e.statusText === '未完成') {
        actionBtns += ` <button class="btn btn-primary btn-sm btn-accept-task" data-id="${e.id}">接受任務</button>`;
      } else if (e.statusText === '進行中') {
        actionBtns += ` <button class="btn btn-warning btn-sm btn-apply-task" data-id="${e.id}">申請</button>`;
      } else if (e.statusText === '退回') {
        actionBtns += ` <button class="btn btn-secondary btn-sm btn-restart-task" data-id="${e.id}">重新開始</button>`;
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
  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(toCalendarEvents(currentSchedule));
  }
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
  calendar = new FullCalendar.Calendar(el, {
    locale: 'zh-tw',
    initialView: 'timeGridWeek',
    headerToolbar: { left: 'title', center: '', right: 'today prev,next' },
    allDaySlot: false,
    events: toCalendarEvents(currentSchedule),
    eventClick: function(info) {
      const raw = info.event.extendedProps?.raw || {};
      showTaskDetail(raw);
    }
  });
  calendar.render();
}

// ==============================
/** 載入我的任務 */
// ==============================
async function loadMyTasks() {
  const resp = await fetchJSON(API_MY_TASKS);
  currentSchedule = normalizeTasks(resp);
}

// ==============================
/** 入口 */
// ==============================
$(document).ready(async function () {
  try {
    await loadMyTasks();
  } catch (e) {
    Swal.fire({ icon: 'error', title: '載入失敗', text: e.message || String(e) });
  }

  // 初始化日曆
  ensureCalendar();
  if (calendar) {
    calendar.removeAllEvents();
    calendar.addEventSource(toCalendarEvents(currentSchedule));
  }

  // 初始化列表
  renderList(currentSchedule);

  // 視圖切換
  $calendarViewBtn.on('click', function () {
    $(this).addClass('active');
    $listViewBtn.removeClass('active');
    $calendarWrap.show();
    $listWrap.hide();
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
    const eventId = $(this).data('id'); // e.g. "S-12"
    const sid = extractScheduleId(String(eventId));
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
      // 呼叫 accept API
      await fetchJSON(`${API_BASE}/schedule/accept-task/${sid}`, { method: 'PATCH' });

      // 成功後重載並刷新
      await loadMyTasks();
      if (calendar) {
        calendar.removeAllEvents();
        calendar.addEventSource(toCalendarEvents(currentSchedule));
      }
      renderList(currentSchedule);

      Swal.fire('已接受任務', '', 'success');
    } catch (err) {
      Swal.fire({
        icon: 'error',
        title: '接受失敗',
        text: (err && err.message) ? err.message : '請稍後再試'
      });
    }
  });

  // 列表操作：申請（TODO：接你的實際 API）
  $(document).on('click', '.btn-apply-task', async function () {
    const id = $(this).data('id');
    const ok = await Swal.fire({
      title: '送出申請？',
      text: '是否要將此任務送出給主管審查？',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '送出'
    }).then(r => r.isConfirmed);
    if (!ok) return;

    // TODO：改為呼叫後端 API（例：PATCH /api/schedule/submit/:scheduleId），成功後重新 loadMyTasks()
    updateLocalStatus(id, '申請中');
    Swal.fire('已送出申請', '', 'success');
  });

  // 列表操作：重新開始（TODO：接你的實際 API）
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

    // TODO：改為呼叫後端 API（例：PATCH /api/schedule/restart/:scheduleId）
    updateLocalStatus(id, '未完成');
    Swal.fire('已重新開始', '', 'info');
  });
});
