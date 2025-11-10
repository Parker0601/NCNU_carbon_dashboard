$(document).ready(function () {
  let calendar = null;
  let currentSchedule = [];

  // ====== 全域設定 & API Routes ======
  const API_ROOT = document.getElementById('app-config')?.dataset?.apiRoot || 'http://localhost:3000/api';
  const ROUTES = {
    // 取得審核頁資料（建議回傳當週 schedules，已 join user/device/issue）
    list: (from, to) => `${API_ROOT}/schedule/manager-view?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    // 主管審核：approve / return
    review: (scheduleId) => `${API_ROOT}/schedule/review/${scheduleId}`,
    deviceSetStatus: (deviceId) => `${API_ROOT}/devices/${deviceId}/status`
  };

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
      credentials: 'omit'
    });

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

  // ====== 工具 ======
  function escapeHtml(str) {
    return String(str ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }
  const HIDE_STATUSES = new Set(['approved']);
  // ====== 狀態 → 中文 & 顏色統一表 ======
const STATUS_LABEL = {
  assigned:  '已指派',     // assigned
  accepted:  '員工已接受',     // accepted
  submitted: '待審核',     // submitted
  approved:  '審核完成',   // approved
  rejected:  '已退回'      // rejected
};

// FullCalendar / 列表共用的顏色（你也可自由換色碼）
function statusStyle(s) {
  switch (String(s)) {
    case 'assigned':  return { badge: 'badge-secondary', bg: '#6c757d', border: '#6c757d', text: '#ffffff' }; // 灰
    case 'accepted':  return { badge: 'badge-info',      bg: '#17a2b8', border: '#17a2b8', text: '#ffffff' }; // 藍
    case 'submitted': return { badge: 'badge-warning',   bg: '#ffc107', border: '#ffc107', text: '#212529' }; // 黃
    case 'approved':  return { badge: 'badge-success',   bg: '#28a745', border: '#28a745', text: '#ffffff' }; // 綠
    case 'rejected':  return { badge: 'badge-danger',    bg: '#dc3545', border: '#dc3545', text: '#ffffff' }; // 紅
    default:          return { badge: 'badge-light',     bg: '#e9ecef', border: '#e9ecef', text: '#212529' };
  }
}
function statusLabel(s) {
  return STATUS_LABEL[String(s)] || String(s);
}

  // 週區間（本週一 00:00 ~ 下週一 00:00）
  function getThisWeekRange() {
    const now = new Date();
    const day = now.getDay() || 7; // 1~7（把周日當 7）
    const monday = new Date(now);
    monday.setDate(now.getDate() - (day - 1));
    monday.setHours(0, 0, 0, 0);

    const nextMonday = new Date(monday);
    nextMonday.setDate(monday.getDate() + 7);

    return {
      from: monday.toISOString(),
      to: nextMonday.toISOString()
    };
  }

  // ====== 載入資料 ======
  async function fetchSchedule() {
    const ALL_FROM = '1970-01-01T00:00:00.000Z';
    const ALL_TO   = '2100-01-01T00:00:00.000Z';
    const { data } = await apiFetch(ROUTES.list(ALL_FROM, ALL_TO));
    const mapped = (data || []).map(e => ({
      id: e.id,
      title: e.title || (e.deviceName ? `維修：${e.deviceName}` : `任務#${e.id}`),
      start: e.startTime || e.start,  // 後端欄位名兼容
      end:   e.endTime   || e.end,
      owner: e.ownerName || e.userName || e.owner || '-',
      status: e.status,               // 原始狀態（submitted/approved/returned）
      desc: e.description || e.desc || '',
      rejectReason: e.rejectReason || e.managerNote || '',
      deviceId: e.deviceId || e.device?.id || e.issue?.deviceId || null
    }));
    currentSchedule = applyVisibilityFilter(mapped);
    return currentSchedule;
  }

  // ====== FullCalendar ======
  function mapToCalendarEvents(list) {
    return list.map(e => {
      const st = statusStyle(e.status);
      return {
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end,
        backgroundColor: st.bg,   // ⬅︎ 日曆背景色
        borderColor: st.border,   // ⬅︎ 日曆框線色
        textColor: st.text,       // ⬅︎ 文字色
        extendedProps: { raw: e }
      };
    });
  }
  
  function initCalendar() {
    if (calendar) return;
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
      initialView: 'dayGridMonth',
      timeZone: 'local',
      locale: 'zh-tw',
      buttonText: { today: '今天', month: '月', week: '週', day: '日', list: '列表' },
      headerToolbar: { left: 'title', center: '', right: 'today prev,next' },
      footerToolbar: { left: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek', center: '', right: '' },
      editable: false,
      events: (fetchInfo, success) => success(mapToCalendarEvents(currentSchedule)),
      eventClick: (info) => {
        const raw = info.event.extendedProps.raw;
        if (raw) showTaskDetail(raw);
      }
    });
    calendar.render();
  }
  function refreshCalendarEvents() {
    if (!calendar) return;
    calendar.removeAllEvents();
    calendar.addEventSource(mapToCalendarEvents(currentSchedule));
  }

  // ====== 審核動作 API ======
  async function approveTask(id) {
    await apiFetch(ROUTES.review(id), { method: 'PATCH', body: { action: 'approve' } });
    const approved = currentSchedule.find(x => String(x.id) === String(id));
    if (approved?.deviceId) {
      try {
        await apiFetch(ROUTES.deviceSetStatus(approved.deviceId), {
          method: 'PUT',
          body: { status: '1' }   // 1 = 正常運行
        });
      } catch (e) {
        console.warn('設備狀態更新失敗（不阻擋前端流程）:', e);
      }
    }
    // 本地移除
    currentSchedule = currentSchedule.filter(x => String(x.id) !== String(id));
    currentSchedule = applyVisibilityFilter(currentSchedule);
    renderList(currentSchedule);
    refreshCalendarEvents();
  }

  async function returnTask(id, reason, newEndIso) {
    await apiFetch(ROUTES.review(id), { method: 'PATCH', body: { action: 'reject', reason, newEndTime: newEndIso } });
    // 本地同步：把舊的標記為 returned，並新增下一輪 assigned→顯示成「待審核（下一段）」的殼
    const old = currentSchedule.find(x => String(x.id) === String(id));
    if (old) {
      old.status = 'rejected';
      old.rejectReason = reason;
    }
    await fetchSchedule(); // 重新撈資料
    renderList(currentSchedule);
    refreshCalendarEvents();

    // // 新一輪（由後端真實產生；前端先暫時補一筆讓畫面即時感）
    // currentSchedule.push({
    //   id: `tmp-${Date.now()}`,         // 臨時 id（等下次拉資料會被真實資料取代）
    //   title: old ? old.title : '重新處理',
    //   start: new Date().toISOString(),
    //   end: newEndIso,
    //   owner: old ? old.owner : '-',
    //   status: 'submitted',             // 在審核頁先呈現「待審核」以利管理（也可顯示「已指派」）
    //   desc: `（退回重辦）${old?.desc || ''}`,
    //   rejectReason: ''
    // });

    currentSchedule = applyVisibilityFilter(currentSchedule);currentSchedule = applyVisibilityFilter(currentSchedule);
    renderList(currentSchedule);
    refreshCalendarEvents();
  }

  // ====== 詳情彈窗 ======
  function showTaskDetail(e) {
    const stZh = statusLabel(e.status);
    const note = stZh === '已退回'
      ? '<p style="color:#d9534f;"><strong>備註：</strong>此任務已退回給員工，等待重新提交。</p>'
      : '';
    const rejectReasonHtml = e.rejectReason
      ? `
        <p><strong>退回原因：</strong></p>
        <div style="background:#f8d7da; padding:8px; border-radius:4px; color:#842029; margin-bottom:8px;">
          ${escapeHtml(e.rejectReason)}
        </div>
      `
      : '';
    Swal.fire({
      title: e.title,
      html: `
        ${note}
        ${rejectReasonHtml}
        <p><strong>描述：</strong>${escapeHtml(e.desc)}</p>
        <p><strong>負責人：</strong>${escapeHtml(e.owner)}</p>
        <p><strong>時間：</strong>${(e.start||'').replace('T',' ').slice(0,16)} ~ ${(e.end||'').replace('T',' ').slice(0,16)}</p>
        <p><strong>狀態：</strong>${stZh}</p>
      `,
      showCloseButton: true,
      showConfirmButton: false
    });
  }
  function applyVisibilityFilter(list) {
    return (list || []).filter(e => !HIDE_STATUSES.has(String(e.status)));
  }

  // ====== 列表 ======
  function renderList(events) {
    const $tb = $('#schedule-table tbody').empty();
    events.forEach(e => {
      const stZh = statusLabel(e.status);
      const stStyle = statusStyle(e.status);
      let rowClass = '';
      if (stZh === '已退回') rowClass = 'table-danger';
      else if (stZh === '審核完成') rowClass = 'table-success';

      let actionButtons = '';
      if (stZh === '待審核') {
        actionButtons = `
          <button class="btn btn-success btn-sm btn-approve-task" data-id="${e.id}">核准</button>
          <button class="btn btn-danger btn-sm btn-reject-task" data-id="${e.id}">退回</button>
        `;
      }

      $tb.append(`
        <tr class="${rowClass}">
          <td>${escapeHtml(e.title)}</td>
          <td>${(e.start||'').replace('T',' ').slice(0,16)} ~ ${(e.end||'').replace('T',' ').slice(0,16)}</td>
          <td>${escapeHtml(e.owner)}</td>
          <td><span class="badge ${stStyle.badge}">${stZh}</span></td>
          <td>
            <button class="btn btn-info btn-sm btn-task-detail" data-id="${e.id}">詳情</button>
            ${actionButtons}
          </td>
        </tr>
      `);
    });
  }

  // ====== 視圖切換 ======
  $('#btn-calendar-view').on('click', function() {
    $(this).addClass('active');
    $('#btn-list-view').removeClass('active');
    $('#calendar-view').show();
    $('#list-view').hide();
    if (!calendar) initCalendar();
    refreshCalendarEvents();
  });
  $('#btn-list-view').on('click', function() {
    $(this).addClass('active');
    $('#btn-calendar-view').removeClass('active');
    $('#calendar-view').hide();
    $('#list-view').show();
    renderList(currentSchedule);
  });

  // ====== 事件代理：核准 / 退回 / 詳情 ======
  $(document).on('click', '.btn-approve-task', async function() {
    const id = $(this).data('id');
    const r = await Swal.fire({
      title: '核准？',
      text: '將此任務標記為「審核完成」。',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: '核准'
    });
    if (!r.isConfirmed) return;
    try {
      await approveTask(id);
      Swal.fire('已核准並完成', '', 'success');
    } catch (e) {
      Swal.fire('核准失敗', e.message || '請稍後再試', 'error');
    }
  });

  $(document).on('click', '.btn-reject-task', async function() {
    const id = $(this).data('id');
    const r = await Swal.fire({
      title: '退回此任務',
      html: `
        <div class="text-left">
          <label class="d-block mb-2">退回原因：</label>
          <textarea id="reject-reason" class="form-control mb-3" placeholder="需要修改的地方是..." rows="3"></textarea>
          <label class="d-block mb-2">新的截止日期 (ETA)：</label>
          <input id="reject-eta" type="datetime-local" class="form-control" />
          <small class="form-text text-muted">退回會開「新一輪」排程，請指定新的截止時間</small>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: '退回',
      preConfirm: () => {
        const reason = (document.getElementById('reject-reason')?.value || '').trim();
        const eta    = (document.getElementById('reject-eta')?.value || '').trim();
        if (!reason)  return Swal.showValidationMessage('退回原因不可為空');
        if (!eta)     return Swal.showValidationMessage('請指定新的截止日期');
        const newEnd = new Date(eta.replace(' ', 'T'));
        if (isNaN(+newEnd)) return Swal.showValidationMessage('截止日期格式不正確');
        return { reason, newEndIso: newEnd.toISOString() };
      }
    });
    if (!r.isConfirmed) return;

    try {
      await returnTask(id, r.value.reason, r.value.newEndIso);
      Swal.fire('已退回給員工', '已建立新一輪任務與維修記錄', 'info');
    } catch (e) {
      Swal.fire('退回失敗', e.message || '請稍後再試', 'error');
    }
  });

  $(document).on('click', '.btn-task-detail', function() {
    const id = $(this).data('id');
    const e = currentSchedule.find(x => String(x.id) === String(id));
    if (e) showTaskDetail(e);
  });

  // ====== 初始載入 ======
  (async () => {
    try {
      await fetchSchedule();
      renderList(currentSchedule);
      initCalendar();
    } catch (e) {
      console.error(e);
      Swal.fire('載入失敗', e.message || '請稍後再試', 'error');
    }
  })();
});
