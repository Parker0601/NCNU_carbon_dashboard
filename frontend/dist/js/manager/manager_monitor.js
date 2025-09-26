// public/js/manager/manager_monitor.js
(() => {
    // ====== 設定：API/登入頁 ======
    const cfg       = document.getElementById('app-config')?.dataset || {};
    const API_ROOT  = cfg.apiRoot || 'http://localhost:3000/api';
    const LOGIN_URL = cfg.login   || '/index.html';
    const DEVICES   = `${API_ROOT}/devices`;
  
    // ====== 讀 Token（相容多種 key）======
    const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
    function getToken() {
      for (const k of TOKEN_KEYS) {
        const t = localStorage.getItem(k);
        if (t) return t;
      }
      return '';
    }
  
    // ====== 通用 fetch（自動帶 JWT；401 直接導回登入）======
    async function apiFetch(url, options = {}) {
      const headers = options.headers || {};
      const token = getToken();
  
      if (!token || token === 'DEMO_ONLY__NO_SERVER_TOKEN') {
        await Swal.fire({ icon:'warning', title:'需要登入', text:'請先登入再操作' });
        window.location.href = LOGIN_URL;
        throw new Error('No token');
      }
  
      const res = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(options.body && !headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
          ...headers,
        },
      });
  
      if (res.status === 401) {
        let msg = '未授權或登入已過期';
        try { const j = await res.json(); msg = j.message || msg; } catch {}
        TOKEN_KEYS.forEach(k => localStorage.removeItem(k));
        await Swal.fire({ icon:'warning', title:'請重新登入', text: msg });
        window.location.href = LOGIN_URL;
        throw new Error('Unauthorized');
      }
  
      let data = null; try { data = await res.json(); } catch {}
      if (!res.ok || (data && data.success === false)) {
        const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
        throw new Error(msg);
      }
      return data;
    }
  
    // ====== UI 小工具 ======
    const toastOk  = (m) => Swal.fire({ icon:'success', title:'成功', text:m, timer:1400, showConfirmButton:false });
    const toastErr = (m) => Swal.fire({ icon:'error',   title:'錯誤', text:m });
  
    const statusLabel = {
      '1': { text:'正常運行', badge:'badge-success' },
      '2': { text:'維護中',   badge:'badge-warning' },
      '3': { text:'故障',     badge:'badge-danger'  },
    };
    function mapSeverityByStatus(status) {
      if (status === '3') return 'emergency';
      if (status === '2') return 'warning';
      return 'info';
    }
    function sevClasses(sev) {
      if (sev === 'emergency') return { alert:'alert-danger',  btn:'btn-danger',  title:'緊急異常' };
      if (sev === 'warning')   return { alert:'alert-warning', btn:'btn-warning', title:'警告' };
      return { alert:'alert-info', btn:'btn-info', title:'提示' };
    }
  
    // ====== 左側：異常清單渲染 ======
    const $alertList = document.getElementById('alert-list');
  
    function renderAlerts(devices) {
      if (!$alertList) return; // 沒容器就跳過（不覆蓋你原本的寫死 alert）
  
      const abnormal = (devices || []).filter(d => d.status !== '1'); // 只顯示 2,3
      if (!abnormal.length) {
        $alertList.innerHTML = `<div class="alert alert-success mb-0">目前無異常。</div>`;
        return;
      }
  
      $alertList.innerHTML = abnormal.map(d => {
        const sev  = mapSeverityByStatus(d.status);
        const cls  = sevClasses(sev);
        const st   = statusLabel[d.status] || { text:`未知(${d.status})`, badge:'badge-secondary' };
        const desc = (d.status === '3') ? '設備故障，請立即處理' : '設備維護中，請追蹤進度';
        return `
          <div class="alert ${cls.alert} mb-3">
            <div class="d-flex align-items-center">
              <div class="alert-icon mr-2">
                <span class="icon-stack icon-stack-md">
                  <i class="base-7 icon-stack-3x"></i>
                  <i class="fal fa-exclamation-triangle icon-stack-1x text-white"></i>
                </span>
              </div>
              <div class="flex-1 ml-2">
                <div class="d-flex align-items-center">
                  <span class="h5 mb-0 mr-2">${cls.title}</span>
                  <span class="badge ${st.badge}">${st.text}</span>
                </div>
                <div class="mt-1">
                  <strong>${d.name || '未命名設備'}</strong>（ID: ${d.id}） — ${desc}
                </div>
                <div class="mt-2">
                  <button type="button"
                          class="btn ${cls.btn} btn-sm btn-assign"
                          data-device-id="${d.id}"
                          data-device-name="${d.name || ''}"
                          data-severity="${sev}">
                    ${sev === 'emergency' ? '立即指派' : '指派處理'}
                  </button>
                </div>
              </div>
            </div>
          </div>`;
      }).join('');
    }
  
    async function loadAlerts() {
      try {
        const { data } = await apiFetch(`${DEVICES}/status`, { method:'GET' });
        renderAlerts(data || []);
      } catch (err) {
        toastErr(`載入異常清單失敗：${err.message}`);
      }
    }
  
    // ====== 右側：人員任務表（DataTables）======
    let dt;
    function initDataTable() {
      if (!window.jQuery || !jQuery.fn.DataTable) return;
      dt = jQuery('#dt-staff-tasks').DataTable({
        responsive: true,
        paging: false, searching: false, info: false, ordering: false,
        dom:
          "<'row mb-3'<'col-sm-12 col-md-6 d-flex align-items-center justify-content-start'f>" +
          "<'col-sm-12 col-md-6 d-flex align-items-center justify-content-end'B>>" +
          "<'row'<'col-sm-12'tr>>" +
          "<'row'<'col-sm-12 col-md-5'i><'col-sm-12 col-md-7'p>>",
        buttons: [
          { extend:'colvis', text:'欄位顯示', titleAttr:'欄位顯示', className:'btn-outline-default' }
        ],
        language: { emptyTable: '尚無資料' }
      });
  
      // 狀態改變（事件委派：支援動態列）
      jQuery('#dt-staff-tasks tbody').on('change', '.status-select', function () {
        const $row = jQuery(this).closest('tr');
        const $btn = $row.find('.btn-assign-task');
        const v = jQuery(this).val();
        if (v === 'busy' || v === 'break') {
          $btn.prop('disabled', true);
          if ($row.children().eq(2).text().trim() === '無') $row.children().eq(2).text('執行中');
        } else {
          $btn.prop('disabled', false);
          $row.children().eq(2).text('無');
        }
        // TODO: 之後若有 /api/staff 狀態 API，可以在這裡呼叫更新
      });
    }
  
    function getIdleStaffList() {
      const rows = Array.from(document.querySelectorAll('#dt-staff-tasks tbody tr'));
      return rows
        .map(tr => {
          const name = tr.children[0]?.textContent?.trim();
          const statusSel = tr.querySelector('.status-select');
          const busy = statusSel?.value === 'busy' || statusSel?.value === 'break';
          const staffId = tr.querySelector('.btn-assign-task')?.dataset.staffId;
          return { tr, name, busy, staffId };
        })
        .filter(x => x.name && !x.busy);
    }
  
    function markStaffBusy(staffId, taskText) {
      const btn = document.querySelector(`.btn-assign-task[data-staff-id="${staffId}"]`);
      const tr  = btn?.closest('tr');
      if (!tr) return;
      const select = tr.querySelector('.status-select');
      if (select) select.value = 'busy';
      if (btn) btn.disabled = true;
      const taskCell = tr.children[2];
      if (taskCell) taskCell.textContent = taskText || '執行中';
    }
  
    // ====== 指派流程（打一進二 API）======
    async function openAssignDialog(deviceId, deviceName, severity) {
      const idle = getIdleStaffList();
      if (!idle.length) {
        await Swal.fire({ icon:'info', title:'目前無可派人力', text:'請稍後再試或調整人員狀態。' });
        return;
      }
  
      const staffOptions = idle.map(s => `<option value="${s.staffId}">${s.name}</option>`).join('');
      const { value: form } = await Swal.fire({
        title: `指派：${deviceName || '設備'} (#${deviceId})`,
        html: `
          <div class="text-left">
            <div class="form-group">
              <label>指派人員</label>
              <select id="swal-staff" class="form-control">${staffOptions}</select>
            </div>
            <div class="form-group">
              <label>說明</label>
              <textarea id="swal-desc" class="form-control" rows="3" placeholder="處置方式或備註"></textarea>
            </div>
            <div class="form-group">
              <label>預計完成時間</label>
              <input id="swal-eta" class="form-control" type="datetime-local"/>
            </div>
          </div>`,
        showCancelButton: true,
        confirmButtonText: '確認指派',
        cancelButtonText: '取消',
        focusConfirm: false,
        preConfirm: () => {
          const staffId = document.getElementById('swal-staff').value;
          const desc    = document.getElementById('swal-desc').value.trim();
          const eta     = document.getElementById('swal-eta').value;
          if (!staffId) return Swal.showValidationMessage('請選擇人員');
          return { staffId, desc, eta };
        }
      });
  
      if (!form) return;
  
      try {
        // 1) 改設備狀態為「2 維護中」
        await apiFetch(`${DEVICES}/${deviceId}/status`, {
          method: 'PUT',
          body: JSON.stringify({ status: '2' })
        });
  
        // 2) 寫入維護紀錄
        const endISO = form.eta ? new Date(form.eta).toISOString() : new Date().toISOString();
        const payload = {
          deviceId: Number(deviceId),
          name: deviceName || `設備 ${deviceId}`,
          description: `[${severity}] 指派給 #${form.staffId}，說明：${form.desc || '無'}`,
          endTime: endISO,
        };
        const resp = await apiFetch(`${DEVICES}/maintenance`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
  
        // 右側表格 UI 更新
        const taskText = `${deviceName || `設備 ${deviceId}`}（${severity === 'emergency' ? '緊急' : '警告'}）`;
        markStaffBusy(form.staffId, taskText);
  
        toastOk(resp.message || '已指派並建立維護紀錄');
        // 刷新左側
        loadAlerts();
      } catch (err) {
        toastErr(`指派失敗：${err.message}`);
      }
    }
  
    // ====== 事件綁定（委派）======
    function bindEvents() {
      // 左側指派按鈕：支援動態渲染
      document.getElementById('panel-1')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.btn-assign');
        if (!btn) return;
  
        // 動態渲染的按鈕會帶 deviceId；如果你還用原本寫死的 alert，只有 alertId 的話，就無法打 API
        const deviceId   = btn.dataset.deviceId;
        const deviceName = btn.dataset.deviceName;
        const severity   = btn.dataset.severity || 'warning';
  
        if (!deviceId) {
          Swal.fire({ icon:'info', title:'無法指派', text:'缺少 deviceId。請改用動態異常清單（#alert-list）或在按鈕上加 data-device-id。' });
          return;
        }
        openAssignDialog(deviceId, deviceName, severity);
      });
    }
  
    // ====== 自動刷新（每 30 秒；頁面不在前景則暫停）======
    let timer = null;
    function startAutoRefresh() {
      stopAutoRefresh();
      timer = setInterval(loadAlerts, 30_000);
    }
    function stopAutoRefresh() {
      if (timer) clearInterval(timer), timer = null;
    }
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoRefresh(); else startAutoRefresh();
    });
  
    // ====== 初始化 ======
    async function init() {
      initDataTable();
      bindEvents();
      await loadAlerts();
      startAutoRefresh();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  })();
  