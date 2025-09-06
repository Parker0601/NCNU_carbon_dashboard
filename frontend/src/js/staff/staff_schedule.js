$(document).ready(function () {
    let calendar = null;
    let currentSchedule = [];

    // ---- 假資料；實際用後端 API 換掉這個 ----
    function fetchSchedule() {
      // TODO: 用 fetch/$.ajax 從後端撈該員工的任務清單
      return Promise.resolve([
        { id:1, title:'廢料處理', start:'2024-06-10T09:00:00', end:'2024-06-10T10:00:00', owner:'EMP001', status:'未完成', desc:'處理廢料', returned: false },
        { id:2, title:'設備操作', start:'2024-06-10T13:00:00', end:'2024-06-10T14:00:00', owner:'EMP001', status:'完成', desc:'操作機台A', returned: false },
        { id:3, title:'安全檢查', start:'2024-06-11T10:00:00', end:'2024-06-11T11:00:00', owner:'EMP001', status:'申請中', desc:'檢查安全設施', returned: false },
        { id:4, title:'文件整理', start:'2024-06-12T09:00:00', end:'2024-06-12T11:00:00', owner:'EMP001', status:'未完成', desc:'整理報表', returned: true, rejectReason: '缺少上次審核要求的附檔內容' }
      ]).then(data => {
        currentSchedule = data;
        return data;
      });
    }

    // ---- 工具函式 ----
    function escapeHtml(str) {
      return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function statusToCalendarClass(status, returned) {
      if (status === '未完成') {
        if (returned) return 'bg-warning border-danger text-dark';
        return 'bg-warning border-warning text-dark';
      }
      if (status === '申請中') return 'bg-info border-info';
      if (status === '完成') return 'bg-success border-success text-white';
      return '';
    }

    function badgeClass(status, returned) {
      if (status === '未完成') {
        return 'badge-danger';
      }
      if (status === '申請中') return 'badge-info';
      if (status === '完成') return 'badge-success';
      return 'badge-secondary';
    }

    function mapToCalendarEvents(schedule) {
      return schedule.map(e => ({
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end,
        className: statusToCalendarClass(e.status, e.returned),
        extendedProps: { raw: e }
      }));
    }

    // ---- Calendar 初始化與同步（FullCalendar v5 語法）----
    function initCalendar() {
      if (calendar) return;
      const calendarEl = document.getElementById('calendar');
      calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',   // 你也可改成 'dayGridMonth'
        timeZone: 'local',
        locale: 'zh-tw',
        buttonText: { today: '今天', month: '月', week: '週', day: '日', list: '列表' },

        // v5 使用 headerToolbar / footerToolbar
        headerToolbar: {
          left: 'title',
          center: '',
          right: 'today prev,next'
        },
        footerToolbar: {
          left: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          center: '',
          right: ''
        },

        // v5 不需要 plugins 陣列；main.min.js 已含常用視圖
        editable: false,
        // eventLimit 在 v5 移除（自動處理），可忽略

        events: (fetchInfo, successCallback) => {
          successCallback(mapToCalendarEvents(currentSchedule));
        },
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

    // ---- 狀態更新（員工端申請 / 重新開始） ----
    function updateTaskStatus(id, newStatus) {
      const task = currentSchedule.find(t => String(t.id) === String(id));
      if (!task) return;
      task.status = newStatus;
      if (newStatus === '申請中' || newStatus === '完成') {
        task.returned = false;
        delete task.rejectReason;
      }
      renderList(currentSchedule);
      refreshCalendarEvents();
    }

    function clearReturned(id) {
      const task = currentSchedule.find(t => String(t.id) === String(id));
      if (!task) return;
      task.returned = false; // 保持 status 未完成
      renderList(currentSchedule);
      refreshCalendarEvents();
    }

    // ---- 詳情視窗 ----
    function showTaskDetail(e) {
      let extraNote = '';
      if (e.status === '未完成' && e.returned) {
        extraNote = '<p style="color:#d9534f;"><strong>備註：</strong>此任務已被退回，請重新處理後再申請。</p>';
      }
      let rejectReasonHtml = '';
      if (e.returned && e.rejectReason) {
        rejectReasonHtml = `
          <p><strong>退回原因：</strong></p>
          <div style="background:#f8d7da; padding:8px; border-radius:4px; color:#842029; margin-bottom:8px;">
            ${escapeHtml(e.rejectReason)}
          </div>
        `;
      }
      Swal.fire({
        title: e.title,
        html: `
          ${extraNote}
          ${rejectReasonHtml}
          <p><strong>描述：</strong>${e.desc}</p>
          <p><strong>負責人：</strong>${e.owner}</p>
          <p><strong>時間：</strong>${e.start.replace('T',' ')} ~ ${e.end.replace('T',' ')}</p>
          <p><strong>狀態：</strong>${e.status}${e.status==='未完成' && e.returned ? '（已退回）' : ''}</p>
        `,
        showCloseButton: true,
        showConfirmButton: false
      });
    }

    // ---- 列表渲染 ----
    function renderList(events) {
      const $tb = $('#schedule-table tbody').empty();
      events.forEach(e => {
        let rowClass = '';
        if (e.status === '未完成' && e.returned) rowClass = 'table-danger';
        else if (e.status === '未完成') rowClass = 'table-warning';
        else if (e.status === '申請中') rowClass = 'table-info';

        let actionButtons = '';
        if (e.status === '未完成' && !e.returned) {
          actionButtons = `<button class="btn btn-warning btn-sm btn-apply-task" data-id="${e.id}">申請</button>`;
        } else if (e.status === '未完成' && e.returned) {
          actionButtons = `<button class="btn btn-secondary btn-sm btn-restart-task" data-id="${e.id}">重新開始</button>`;
        }

        $tb.append(`
          <tr class="${rowClass}">
            <td>${e.title}</td>
            <td>${e.start.replace('T',' ').slice(0,16)} ~ ${e.end.replace('T',' ').slice(0,16)}</td>
            <td>${e.owner}</td>
            <td><span class="badge ${badgeClass(e.status, e.returned)}">${e.status}${e.status==='未完成' && e.returned ? '（已退回）' : ''}</span></td>
            <td>
              <button class="btn btn-info btn-sm btn-task-detail" data-id="${e.id}">詳情</button>
              ${actionButtons}
            </td>
          </tr>
        `);
      });
    }

    // ---- 視圖切換 ----
    $('#btn-calendar-view').on('click', function() {
      $(this).addClass('active');
      $('#btn-list-view').removeClass('active');
      $('#calendar-view').show();
      $('#list-view').hide();
      if (!calendar) initCalendar();
    });
    $('#btn-list-view').on('click', function() {
      $(this).addClass('active');
      $('#btn-calendar-view').removeClass('active');
      $('#calendar-view').hide();
      $('#list-view').show();
      fetchSchedule().then(events => {
        renderList(events);
      });
    });

    // ---- 事件代理：申請 / 重新開始 / 詳情 ----
    $(document).on('click', '.btn-apply-task', function() {
      const id = $(this).data('id');
      Swal.fire({
        title: '送出申請？',
        text: '是否要將此任務送出給主管審查？',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '送出'
      }).then(r => {
        if (r.isConfirmed) {
          // TODO: 呼叫後端 API 送出申請（status -> 申請中）
          updateTaskStatus(id, '申請中');
          Swal.fire('已送出申請','','success');
        }
      });
    });

    $(document).on('click', '.btn-restart-task', function() {
      const id = $(this).data('id');
      Swal.fire({
        title: '重新開始？',
        text: '是否要針對此任務重新開始處理？',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '重新開始'
      }).then(r => {
        if (r.isConfirmed) {
          // TODO: 可呼叫後端 API 清除退回標記
          clearReturned(id);
          Swal.fire('已重新開始','','info');
        }
      });
    });

    $(document).on('click', '.btn-task-detail', function() {
      const id = $(this).data('id');
      const e = currentSchedule.find(x => String(x.id) === String(id));
      if (e) showTaskDetail(e);
    });

    // ---- 初始載入 ----
    fetchSchedule().then(() => {
      renderList(currentSchedule);
      initCalendar(); // 先初始化日曆；切到列表時再渲染表格
    });
  });