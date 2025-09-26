$(document).ready(function () {
    let calendar = null;
    let currentSchedule = [];

    // ---- 資料取得（之後改成實際 API）----
    function fetchSchedule() {
      // TODO: 改成 fetch('/api/manager/schedule') ...
      return Promise.resolve([
        { id: 1, title: '廢料處理', start: '2024-06-10T09:00:00', end: '2024-06-10T10:00:00', owner: 'EMP001', status: '待審核', desc: '處理廢料' },
        { id: 2, title: '設備操作', start: '2024-06-10T13:00:00', end: '2024-06-10T14:00:00', owner: 'EMP001', status: '審核完成', desc: '操作機台A' },
        { id: 3, title: '安全檢查', start: '2024-06-11T10:00:00', end: '2024-06-11T11:00:00', owner: 'EMP001', status: '已退回', desc: '檢查安全設施 - 需修改', rejectReason: '資料缺失，請補上安全報告內容' }
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

    function statusToCalendarClass(status) {
      if (status === '待審核') return 'bg-warning border-warning text-dark';
      if (status === '審核完成') return 'bg-success border-success text-white';
      if (status === '已退回') return 'bg-danger border-danger text-white';
      return '';
    }

    function badgeClass(status) {
      switch (status) {
        case '待審核': return 'badge-warning';
        case '審核完成': return 'badge-success';
        case '已退回': return 'badge-danger';
        default: return 'badge-secondary';
      }
    }

    function mapToCalendarEvents(schedule) {
      return schedule.map(e => ({
        id: String(e.id),
        title: e.title,
        start: e.start,
        end: e.end,
        className: statusToCalendarClass(e.status),
        extendedProps: { raw: e }
      }));
    }

    // ---- Calendar 初始化（v5）----
    function initCalendar() {
      if (calendar) return;
      const calendarEl = document.getElementById('calendar');
      calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek', // 或 'dayGridMonth'
        timeZone: 'local',
        locale: 'zh-tw',
        buttonText: { today: '今天', month: '月', week: '週', day: '日', list: '列表' },

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

        editable: false,

        events: (fetchInfo, success) => {
          success(mapToCalendarEvents(currentSchedule));
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

    // ---- 狀態更新（同步 list + calendar）----
    function updateTaskStatus(id, newStatus, extra = {}) {
      const task = currentSchedule.find(t => String(t.id) === String(id));
      if (!task) return;
      task.status = newStatus;
      if (newStatus === '已退回' && extra.rejectReason) {
        task.rejectReason = extra.rejectReason;
      } else if (newStatus !== '已退回') {
        delete task.rejectReason;
      }
      renderList(currentSchedule);
      refreshCalendarEvents();
    }

    // ---- 詳情視窗 ----
    function showTaskDetail(e) {
      let note = '';
      if (e.status === '已退回') {
        note = '<p style="color:#d9534f;"><strong>備註：</strong>此任務已退回給員工，等待重新提交。</p>';
      }
      let rejectReasonHtml = '';
      if (e.rejectReason) {
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
          ${note}
          ${rejectReasonHtml}
          <p><strong>描述：</strong>${e.desc}</p>
          <p><strong>負責人：</strong>${e.owner}</p>
          <p><strong>時間：</strong>${e.start.replace('T',' ')} ~ ${e.end.replace('T',' ')}</p>
          <p><strong>狀態：</strong>${e.status}</p>
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
        if (e.status === '已退回') rowClass = 'table-danger';
        else if (e.status === '審核完成') rowClass = 'table-success';

        let actionButtons = '';
        if (e.status === '待審核') {
          actionButtons = `
            <button class="btn btn-success btn-sm btn-approve-task" data-id="${e.id}">核准</button>
            <button class="btn btn-danger btn-sm btn-reject-task" data-id="${e.id}">退回</button>
          `;
        }

        $tb.append(`
          <tr class="${rowClass}">
            <td>${e.title}</td>
            <td>${e.start.replace('T',' ').slice(0,16)} ~ ${e.end.replace('T',' ').slice(0,16)}</td>
            <td>${e.owner}</td>
            <td><span class="badge ${badgeClass(e.status)}">${e.status}</span></td>
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

    // ---- 事件代理：核准 / 退回 / 詳情 ----
    $(document).on('click', '.btn-approve-task', function() {
      const id = $(this).data('id');
      Swal.fire({
        title: '核准？',
        text: '是否要將此任務標記為「審核完成」？',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: '核准'
      }).then(r => {
        if (r.isConfirmed) {
          // TODO: 呼叫後端 API persist 審核完成
          updateTaskStatus(id, '審核完成');
          Swal.fire('已核准並完成','','success');
        }
      });
    });

    $(document).on('click', '.btn-reject-task', function() {
      const id = $(this).data('id');
      Swal.fire({
        title: '退回此任務',
        html: '<label for="reject-reason" class="d-block mb-2">請填寫退回原因：</label>',
        input: 'textarea',
        inputAttributes: {
          id: 'reject-reason',
          'aria-label': '退回原因',
          placeholder: '需要修改的地方是...'
        },
        inputPlaceholder: '請詳述退回原因，讓員工知道要怎麼修改',
        showCancelButton: true,
        confirmButtonText: '退回',
        preConfirm: (reason) => {
          if (!reason || !reason.trim()) {
            Swal.showValidationMessage('退回原因不可為空');
          }
          return reason;
        }
      }).then(r => {
        if (r.isConfirmed) {
          const reason = r.value.trim();
          // TODO: 呼叫後端 API 退回並附上 reason
          updateTaskStatus(id, '已退回', { rejectReason: reason });
          Swal.fire({
            title: '已退回給員工',
            html: '<p>原因：</p><div style="text-align:left; background:#f8d7da; padding:8px; border-radius:4px; color:#842029;">' + escapeHtml(reason) + '</div>',
            icon: 'info'
          });
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
      initCalendar();
    });
  });