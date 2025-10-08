(() => {
  // ====== 設定：API/登入頁（先保留，未串）======
  const cfg       = document.getElementById('app-config')?.dataset || {};
  const API_ROOT  = cfg.apiRoot || 'http://localhost:3000/api';
  const LOGIN_URL = cfg.login   || '/index.html';
  const DEVICES   = `${API_ROOT}/devices`;

  // ====== Token 讀取（保留）======
  const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
  function getToken() {
    for (const k of TOKEN_KEYS) {
      const t = localStorage.getItem(k);
      if (t) return t;
    }
    return '';
  }

  // ====== 通用 fetch（保留；目前未使用）======
  async function apiFetch(url, options = {}) {
    const headers = options.headers || {};
    const token = getToken();

    if (!token || token === 'DEMO_ONLY__NO_SERVER_TOKEN') {
      // 先不強制登入，避免 demo 被中斷
      // await Swal.fire({ icon:'warning', title:'需要登入', text:'請先登入再操作' });
      // window.location.href = LOGIN_URL;
      // throw new Error('No token');
    }

    const res = await fetch(url, {
      ...options,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.body && !headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    });

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

  // ====== 左側：異常清單（先用後端 /devices/status；若沒有也顯示 demo）======
  const $alertList = document.getElementById('alert-list');

  function renderAlerts(devices) {
    if (!$alertList) return;

    const abnormal = (devices || []).filter(d => d.status !== '1');
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
                        data-device-name="${(d.name || '').replace(/"/g, '&quot;')}"
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
      // 嘗試向後端取資料
      const { data } = await apiFetch(`${DEVICES}/status`, { method:'GET' }).catch(() => ({ data: null }));
      if (data && Array.isArray(data)) {
        renderAlerts(data);
        return;
      }
      // 後端未就緒：示範資料
      renderAlerts([
        { id: 1, name: '切割機 A', status: '3' },
        { id: 2, name: '封裝機 B', status: '2' },
      ]);
    } catch (err) {
      toastErr(`載入異常清單失敗：${err.message}`);
    }
  }

  // ====== 右側：人員任務表（簡化版；寫死資料）======
  const $tblBody = document.querySelector('#tbl-staff tbody');
  const $sortSel = document.getElementById('staff-sort-order');

  // 先寫死：id / name / status(idle|busy) / task
  const staffModel = [
    { id: 1, name: 'Jerry Wang', status: 'idle', task: '無' },
    { id: 2, name: 'Mary Chen', status: 'busy', task: '機台 #2 維護' },
    { id: 3, name: 'Allen Wu',  status: 'idle', task: '無' },
    { id: 4, name: 'Cindy Lin', status: 'busy', task: '客訴單據整理' },
  ];
  let sortMode = 'idleFirst'; // 'idleFirst' | 'busyFirst'

  function sortStaff(arr) {
    const w = (s) => (s.status === 'idle' ? (sortMode === 'idleFirst' ? 0 : 1)
                                           : (sortMode === 'idleFirst' ? 1 : 0));
    return [...arr].sort((a, b) => {
      const wa = w(a), wb = w(b);
      if (wa !== wb) return wa - wb;
      return a.name.localeCompare(b.name, 'zh-Hant');
    });
  }

  function renderStaffTable() {
    if (!$tblBody) return;
    const rows = sortStaff(staffModel).map(s => {
      const badge = s.status === 'idle'
        ? `<span class="status-badge-idle">空閒</span>`
        : `<span class="status-badge-busy">執行中</span>`;
      return `
        <tr data-id="${s.id}">
          <td>${s.name}</td>
          <td>
            <select class="form-control form-control-sm js-status">
              <option value="idle" ${s.status==='idle'?'selected':''}>空閒</option>
              <option value="busy" ${s.status==='busy'?'selected':''}>執行中</option>
            </select>
          </td>
          <td class="js-task">${s.task || '無'}</td>
        </tr>`;
    }).join('');
    $tblBody.innerHTML = rows;
  }

  // 狀態改變（事件委派）：更新 model 並重渲染（以維持排序）
  function bindStaffEvents() {
    document.getElementById('tbl-staff')?.addEventListener('change', (e) => {
      const sel = e.target.closest('.js-status');
      if (!sel) return;
      const tr = e.target.closest('tr'); if (!tr) return;
      const id = Number(tr.dataset.id);
      const row = staffModel.find(x => x.id === id);
      if (!row) return;
      row.status = sel.value; // 'idle' | 'busy'
      if (row.status === 'idle' && (!row.task || row.task === '執行中')) {
        row.task = '無';
      }
      renderStaffTable(); // 重新排序 + 畫面
    });

    $sortSel?.addEventListener('change', () => {
      sortMode = $sortSel.value;
      renderStaffTable();
    });
  }

  // ====== 指派流程（移到左側「立即指派」；先不打 API）======
  function getSortedCandidates() {
    // 依右上角排序輸出（空閒在上 / 執行中在上）
    return sortStaff(staffModel);
  }
  async function openAssignDialog(deviceId, deviceName, severity) {
    // 直接在這裡分組，不再呼叫 getCandidateGroups
    const idle = staffModel
      .filter(s => s.status === 'idle')
      .sort((a,b)=> a.name.localeCompare(b.name, 'zh-Hant'));
    const busy = staffModel
      .filter(s => s.status === 'busy')
      .sort((a,b)=> a.name.localeCompare(b.name, 'zh-Hant'));
  
    const firstLabel  = (sortMode === 'idleFirst') ? '空閒' : '執行中';
    const firstGroup  = (sortMode === 'idleFirst') ? idle   : busy;
    const secondLabel = (sortMode === 'idleFirst') ? '執行中' : '空閒';
    const secondGroup = (sortMode === 'idleFirst') ? busy   : idle;
  
    const groupHtml = (label, arr, disableAll=false) => `
      <optgroup label="${label}">
        ${arr.map(s => `<option value="${s.id}" ${disableAll ? 'disabled' : ''}>
          ${s.name}（${label}）
        </option>`).join('')}
      </optgroup>`;
  
    const opts = [
      groupHtml(firstLabel,  firstGroup,  firstLabel  === '執行中'),
      groupHtml(secondLabel, secondGroup, secondLabel === '執行中'),
    ].join('');
  
    const { value: form } = await Swal.fire({
      title: `指派：${deviceName || '設備'} (#${deviceId})`,
      html: `
        <div class="text-left">
          <div class="form-group">
            <label>指派人員</label>
            <select id="swal-staff" class="form-control">${opts}</select>
            <small class="text-muted">清單依右上「排序」設定；「執行中」會被停用</small>
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
      didOpen: () => {
        const sel = document.getElementById('swal-staff');
        if (!sel) return;
        const firstEnabled = Array.from(sel.options).find(o => !o.disabled);
        if (firstEnabled) sel.value = firstEnabled.value;
      },
      preConfirm: () => {
        const staffId = Number(document.getElementById('swal-staff').value);
        const desc    = document.getElementById('swal-desc').value.trim();
        const eta     = document.getElementById('swal-eta').value;
        if (!staffId) return Swal.showValidationMessage('請選擇人員');
        return { staffId, desc, eta };
      }
    });
  
    if (!form) return;
  
    // 目前僅前端更新
    const staff = staffModel.find(x => x.id === Number(form.staffId));
    if (!staff) return toastErr('找不到人員');
  
    staff.status = 'busy';
    const sevText = severity === 'emergency' ? '緊急' : (severity === 'warning' ? '警告' : '提示');
    staff.task = `${deviceName || `設備 ${deviceId}`}（${sevText}）`;
    renderStaffTable();
    toastOk('已指派（僅前端示範）');
  }
  

  // ====== 左側按鈕事件 ======
  function bindLeftPanelEvents() {
    document.getElementById('panel-1')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-assign');
      if (!btn) return;
      const deviceId   = btn.dataset.deviceId;
      const deviceName = btn.dataset.deviceName;
      const severity   = btn.dataset.severity || 'warning';
      if (!deviceId) {
        Swal.fire({ icon:'info', title:'無法指派', text:'缺少 deviceId。' });
        return;
      }
      openAssignDialog(deviceId, deviceName, severity);
    });
  }

  // ====== 自動刷新（暫保留；等接後端再啟用）======
  let timer = null;
  function startAutoRefresh() {
    stopAutoRefresh();
    // timer = setInterval(loadAlerts, 30_000);
  }
  function stopAutoRefresh() {
    if (timer) clearInterval(timer), timer = null;
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopAutoRefresh(); else startAutoRefresh();
  });

  // ====== 初始化 ======
  async function init() {
    bindLeftPanelEvents();
    bindStaffEvents();
    await loadAlerts();
    renderStaffTable();
    startAutoRefresh();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
