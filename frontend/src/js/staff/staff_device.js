(() => {
  // ========= 基本設定 =========
  const API_BASE = 'http://localhost:3000/api/devices';
  const TOKEN_KEY = ['authToken', 'access_token', 'token']; // 你系統存 token 的 key，若不同請改這裡

  // ========= 小工具 =========
  const TOKEN_KEYS = ['authToken', 'access_token', 'token'];
  const getToken = () => {
    for (const k of TOKEN_KEYS) {
      const t = localStorage.getItem(k);
      if (t) return t;
    }
    return '';
  };
  const apiFetch = async (path, options = {}) => {
    const headers = options.headers || {};
    const token = getToken();
    const res = await fetch(path, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        ...(options.body && !headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
    });
    let data = null;
    try { data = await res.json(); } catch (_) {}
    if (!res.ok || (data && data.success === false)) {
      const msg = (data && (data.error || data.message)) || `${res.status} ${res.statusText}`;
      throw new Error(msg);
    }
    return data;
  };

  const toastSuccess = (msg) => Swal.fire({ icon: 'success', title: '成功', text: msg, timer: 1600, showConfirmButton: false });
  const toastError = (msg)   => Swal.fire({ icon: 'error',   title: '錯誤', text: msg });

  const fmtDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const hoursBetween = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 36e5);

  const statusMap = {
    '1': { text: '正常運行', badge: 'badge-success' },
    '2': { text: '維護中',   badge: 'badge-warning' },
    '3': { text: '故障',     badge: 'badge-danger'  },
  };

  // ========= DOM 參考 =========
  const $deviceView   = document.getElementById('device-view');
  const $reportView   = document.getElementById('report-view');
  const $deviceList   = document.getElementById('device-list');
  const $btnDevice    = document.getElementById('btn-device-view');
  const $btnReport    = document.getElementById('btn-report-view');
  const $btnRefresh   = document.getElementById('btn-refresh');
  const $reportSel    = document.getElementById('report-selector');
  const $reportBox    = document.getElementById('report-container');

  // Modal 元件
  const $maintenanceModal = document.getElementById('maintenanceModal');
  const $deviceNameInput  = document.getElementById('deviceName');
  const $maintenanceType  = document.getElementById('maintenanceType');
  const $maintenanceDesc  = document.getElementById('maintenanceDescription');
  const $maintenanceTime  = document.getElementById('maintenanceTime');
  const $submitMaintenance= document.getElementById('submitMaintenance');

  // 當前選中的設備（用於提交維護）
  let currentDeviceForMaintenance = null;

  // ========= 設備卡片渲染 =========
  const renderDeviceCards = (devices) => {
    $deviceList.innerHTML = '';
    if (!devices || devices.length === 0) {
      $deviceList.innerHTML = `<div class="col-12"><div class="alert alert-info mb-0">目前沒有設備。</div></div>`;
      return;
    }

    const frag = document.createDocumentFragment();

    devices.forEach((d) => {
      const { id, name, status, bootTime, ratio } = d;
      const s = statusMap[status] || { text: `未知(${status})`, badge: 'badge-secondary' };
      const card = document.createElement('div');
      card.className = 'col-12 col-md-6 col-lg-4 mb-3';
      card.innerHTML = `
        <div class="card h-100 shadow-sm">
          <div class="card-body d-flex flex-column">
            <div class="d-flex justify-content-between align-items-start mb-2">
              <h5 class="card-title mb-0">${name || '未命名設備'}</h5>
              <span class="badge ${s.badge}">${s.text}</span>
            </div>
            <div class="small text-muted mb-2">ID：${id}</div>
            <ul class="list-unstyled mb-3">
              <li>啟動時間：${fmtDateTime(bootTime)}</li>
              <li>設備使用效率 (ratio)：${(ratio != null ? (ratio).toFixed(1) : '-') }%</li>
            </ul>
            <div class="mt-auto d-flex gap-2">
              <button class="btn btn-sm btn-outline-primary mr-2" data-action="history" data-id="${id}" data-name="${name}"><i class="fal fa-history"></i> 維護歷史</button>
              <button class="btn btn-sm btn-outline-success" data-action="maint" data-id="${id}" data-name="${name}"><i class="fal fa-tools"></i> 新增維護</button>
            </div>
          </div>
        </div>
      `;
      frag.appendChild(card);
    });

    $deviceList.appendChild(frag);
  };

  // ========= 載入資料 =========
  const loadDeviceStatus = async () => {
    try {
      // 以「狀態列表」為主（所有角色可用）
      const resp = await apiFetch(`${API_BASE}/status`, { method: 'GET' });
      renderDeviceCards(resp.data || []);
    } catch (err) {
      toastError(`載入設備狀態失敗：${err.message}`);
    }
  };

  // ========= 維護歷史 =========
  const showDeviceMaintenanceHistory = async (deviceId, deviceName) => {
    try {
      const resp = await apiFetch(`${API_BASE}/${deviceId}/maintenance`, { method: 'GET' });
      const rows = (resp.data || []).map(r => `
        <tr>
          <td>${fmtDateTime(r.recordCreateTime)}</td>
          <td>${fmtDateTime(r.recordEndTime)}</td>
          <td>${r.userName || '-'}</td>
          <td>${r.recordDescription || '-'}</td>
          <td><span class="badge ${ (statusMap[r.deviceStatus]?.badge || 'badge-secondary') }">${ statusMap[r.deviceStatus]?.text || r.deviceStatus }</span></td>
        </tr>
      `).join('');

      Swal.fire({
        width: 900,
        title: `維護歷史 - ${deviceName} (ID: ${deviceId})`,
        html: `
          <div class="table-responsive text-left">
            <table class="table table-sm table-striped">
              <thead>
                <tr>
                  <th>建立時間</th>
                  <th>結束時間</th>
                  <th>維修人員</th>
                  <th>描述</th>
                  <th>當時設備狀態</th>
                </tr>
              </thead>
              <tbody>${rows || `<tr><td colspan="5" class="text-center text-muted">尚無紀錄</td></tr>`}</tbody>
            </table>
          </div>
        `,
        showConfirmButton: true,
        confirmButtonText: '關閉',
      });
    } catch (err) {
      toastError(`取得維護歷史失敗：${err.message}`);
    }
  };

  // ========= 提交維護 =========
  const openMaintenanceModal = (deviceId, deviceName) => {
    currentDeviceForMaintenance = { id: deviceId, name: deviceName };
    $deviceNameInput.value = deviceName || `設備 ${deviceId}`;
    $maintenanceType.value = '';
    $maintenanceDesc.value = '';
    $maintenanceTime.value = new Date().toISOString().slice(0,16); // yyyy-MM-ddTHH:mm
    // 顯示 Bootstrap modal
    if (window.$) {
      $('#maintenanceModal').modal('show');
    } else {
      // 後備方案
      $maintenanceModal.style.display = 'block';
      $maintenanceModal.classList.add('show');
    }
  };

  const submitMaintenance = async () => {
    try {
      if (!currentDeviceForMaintenance) {
        toastError('沒有選定設備。');
        return;
      }
      const deviceId = currentDeviceForMaintenance.id;
      const name = currentDeviceForMaintenance.name || `設備 ${deviceId}`;
      const type = $maintenanceType.value;
      const desc = $maintenanceDesc.value.trim();
      const endTimeLocal = $maintenanceTime.value;

      if (!type) return toastError('請選擇維護類型');
      if (!desc) return toastError('請填寫維護描述');
      if (!endTimeLocal) return toastError('請選擇維護時間');

      // 把「維護類型」合併到描述（API 只有 description 欄位）
      const finalDesc = `[${type}] ${desc}`;

      const payload = {
        deviceId: Number(deviceId),
        name,
        description: finalDesc,
        endTime: new Date(endTimeLocal).toISOString(),
      };

      const resp = await apiFetch(`${API_BASE}/maintenance`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      // 關閉 modal
      if (window.$) {
        $('#maintenanceModal').modal('hide');
      } else {
        $maintenanceModal.classList.remove('show');
        $maintenanceModal.style.display = 'none';
      }

      toastSuccess(resp.message || '維護紀錄已建立');
      // 重新載入設備狀態（維護可能會影響狀態）
      loadDeviceStatus();
    } catch (err) {
      toastError(`提交維護失敗：${err.message}`);
    }
  };

  // ========= 報表（Chart.js） =========
  let currentChart = null;

  const destroyChartIfAny = () => {
    if (currentChart) {
      currentChart.destroy();
      currentChart = null;
    }
  };

  const ensureReportCanvas = () => {
    $reportBox.innerHTML = '<canvas id="report-canvas" height="400"></canvas>';
    return document.getElementById('report-canvas').getContext('2d');
  };

  // 1) 運行時數統計（以 bootTime ~ 現在 的小時數 * ratio 作為近似）
  const renderRuntimeChart = async () => {
    const ctx = ensureReportCanvas();
    const { data: devices } = await apiFetch(`${API_BASE}`, { method: 'GET' }).catch(async (e) => {
      // 若非 admin 取不到 /api/devices，就退而求其次用 /status（無 bootTime/ratio 就顯示不了）
      const fallback = await apiFetch(`${API_BASE}/status`, { method: 'GET' });
      return { data: (fallback.data || []).map(d => ({ ...d, bootTime: null, ratio: null })) };
    });

    const now = new Date();
    const labels = [];
    const values = [];

    (devices || []).forEach(d => {
      labels.push(d.name || `設備${d.id}`);
      if (d.bootTime && (d.ratio != null)) {
        const hrs = hoursBetween(d.bootTime, now) * Number(d.ratio || 1);
        values.push(Math.max(0, Math.round(hrs)));
      } else {
        values.push(0);
      }
    });

    destroyChartIfAny();
    currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ label: '估算運行時數(小時)', data: values }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: true }, title: { display: false } },
        scales: { y: { beginAtZero: true } },
      },
    });
  };

  // 2) 設備狀態分布
  const renderStatusPie = async () => {
    const ctx = ensureReportCanvas();
    const { data: statuses } = await apiFetch(`${API_BASE}/status`, { method: 'GET' });
    const counts = { '1': 0, '2': 0, '3': 0 };
    (statuses || []).forEach(s => counts[s.status] = (counts[s.status] || 0) + 1);

    destroyChartIfAny();
    currentChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['正常運行', '維護中', '故障'],
        datasets: [{ data: [counts['1'] || 0, counts['2'] || 0, counts['3'] || 0] }],
      },
      options: { responsive: true }
    });
  };

  // 3) 維護紀錄次數統計（依設備彙總）
  const renderMaintenanceCount = async () => {
    const ctx = ensureReportCanvas();
    const { data: history } = await apiFetch(`${API_BASE}/maintenance-history`, { method: 'GET' });
    const countByDevice = {};
    (history || []).forEach(r => {
      const key = `${r.deviceId}::${r.deviceName}`;
      countByDevice[key] = (countByDevice[key] || 0) + 1;
    });
    const labels = Object.keys(countByDevice).map(k => k.split('::')[1] || k);
    const values = Object.values(countByDevice);

    destroyChartIfAny();
    currentChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: '維護次數', data: values }] },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  };

  // 4) 平均運行時間與預測維護（簡易近似：相鄰維護記錄的平均間隔）
  const renderPrediction = async () => {
    const ctx = ensureReportCanvas();
    const { data: history } = await apiFetch(`${API_BASE}/maintenance-history`, { method: 'GET' });

    // 依設備分組並按時間排序
    const byDevice = {};
    (history || []).forEach(r => {
      const key = `${r.deviceId}::${r.deviceName}`;
      byDevice[key] = byDevice[key] || [];
      byDevice[key].push(r);
    });
    Object.values(byDevice).forEach(list => list.sort((a,b) => new Date(a.recordEndTime) - new Date(b.recordEndTime)));

    const labels = [];
    const avgDays = [];
    const nextDays = [];

    for (const key of Object.keys(byDevice)) {
      const [id, name] = key.split('::');
      const list = byDevice[key];
      const gaps = [];
      for (let i = 1; i < list.length; i++) {
        const gapHrs = hoursBetween(list[i-1].recordEndTime || list[i-1].recordCreateTime, list[i].recordEndTime || list[i].recordCreateTime);
        gaps.push(gapHrs / 24);
      }
      const avg = gaps.length ? (gaps.reduce((a,b)=>a+b,0) / gaps.length) : 0;
      labels.push(name || `設備${id}`);
      avgDays.push(Number(avg.toFixed(1)));

      // 預測下一次 = 最後一次結束時間 + 平均間隔
      let nextGap = avg || 0;
      nextDays.push(Number(nextGap.toFixed(1)));
    }

    destroyChartIfAny();
    currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '平均維護間隔(天)', data: avgDays },
          { label: '預測下次維護間隔(天)', data: nextDays },
        ]
      },
      options: { responsive: true, scales: { y: { beginAtZero: true } } }
    });
  };

  const renderReport = async () => {
    try {
      const sel = $reportSel.value;
      if (sel === 'runtime')      return renderRuntimeChart();
      if (sel === 'status')       return renderStatusPie();
      if (sel === 'maintenance')  return renderMaintenanceCount();
      if (sel === 'prediction')   return renderPrediction();
    } catch (err) {
      toastError(`載入報表失敗：${err.message}`);
    }
  };

  // ========= 事件掛載 =========
  // 切換視圖
  $btnDevice?.addEventListener('click', () => {
    $btnDevice.classList.add('active');
    $btnReport.classList.remove('active');
    $deviceView.style.display = '';
    $reportView.style.display = 'none';
  });

  $btnReport?.addEventListener('click', async () => {
    $btnReport.classList.add('active');
    $btnDevice.classList.remove('active');
    $deviceView.style.display = 'none';
    $reportView.style.display = '';
    await renderReport();
  });

  // 刷新
  $btnRefresh?.addEventListener('click', async () => {
    if ($deviceView.style.display !== 'none') {
      await loadDeviceStatus();
    } else {
      await renderReport();
    }
    toastSuccess('已刷新');
  });

  // 報表選擇
  $reportSel?.addEventListener('change', renderReport);

  // 卡片按鈕（事件委派）
  $deviceList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');

    if (action === 'history') {
      showDeviceMaintenanceHistory(id, name);
    } else if (action === 'maint') {
      openMaintenanceModal(id, name);
    }
  });

  // 提交維護
  $submitMaintenance?.addEventListener('click', submitMaintenance);

  // ========= 初始化 =========
  const init = async () => {
    // 初始化先顯示設備卡片
    await loadDeviceStatus();
  };

  // DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
