(() => {
  // ========= 基本設定 =========
  const API_BASE = 'http://localhost:3000/api/devices';
  const SCHEDULE_API_BASE = 'http://localhost:3000/api/schedule';

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
  const toastError   = (msg) => Swal.fire({ icon: 'error',   title: '錯誤', text: msg });

  const fmtDateTime = (iso) => {
    if (!iso) return '-';
    const d = new Date(iso);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const hoursBetween = (a, b) => Math.max(0, (new Date(b) - new Date(a)) / 36e5);

  const statusMap = {
    '1': { 
      text: '正常運行', 
      badge: 'badge-success',
      headerBg: 'bg-success-700',
      headerIcon: 'fa-check-circle',
      borderColor: 'border-success',
      ratioColor: 'text-success',
      ratioIcon: 'fa-arrow-up'
    },
    '2': { 
      text: '維護中', 
      badge: 'badge-warning',
      headerBg: 'bg-warning-400',
      headerIcon: 'fa-wrench',
      borderColor: 'border-warning',
      ratioColor: 'text-warning',
      ratioIcon: 'fa-minus'
    },
    '3': { 
      text: '故障', 
      badge: 'badge-danger',
      headerBg: 'bg-danger-500',
      headerIcon: 'fa-exclamation-triangle',
      borderColor: 'border-danger',
      ratioColor: 'text-danger',
      ratioIcon: 'fa-arrow-down'
    },
    '4': { 
      text: '維護中', 
      badge: 'badge-warning',
      headerBg: 'bg-warning-400',
      headerIcon: 'fa-wrench',
      borderColor: 'border-warning',
      ratioColor: 'text-warning',
      ratioIcon: 'fa-minus'
    },
  };

  // ========= DOM 參考 =========
  const $deviceView   = document.getElementById('device-view');
  const $reportView   = document.getElementById('report-view');
  const $maintenanceHistoryView = document.getElementById('maintenance-history-view');
  const $deviceList   = document.getElementById('device-list');
  const $btnDevice    = document.getElementById('btn-device-view');
  const $btnReport    = document.getElementById('btn-report-view');
  const $btnMaintenanceHistory = document.getElementById('btn-maintenance-history');
  const $btnRefresh   = document.getElementById('btn-refresh');
  const $reportSel    = document.getElementById('report-selector');
  const $reportBox    = document.getElementById('report-container');

  // 維護紀錄相關 DOM
  const $maintenanceDeviceSelector = document.getElementById('maintenance-device-selector');
  const $maintenanceHistoryTable   = document.getElementById('maintenance-history-table');

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
      const s = statusMap[status] || { 
        text: `未知(${status})`, 
        badge: 'badge-secondary',
        headerBg: 'bg-fusion-100',
        headerIcon: 'fa-question-circle',
        borderColor: 'border-secondary',
        ratioColor: 'text-muted',
        ratioIcon: 'fa-minus'
      };
      
      // 根據 ratio 判斷效率狀態
      const ratioValue = ratio != null ? Number(ratio) : null;
      const ratioStatus = ratioValue !== null 
        ? (ratioValue >= 70 ? '良好' : ratioValue >= 40 ? '待觀察' : '需改善')  
        : null;
      
      const card = document.createElement('div');
      card.className = 'col-12 col-md-6 col-lg-4 mb-3';
      card.innerHTML = `
        <div class="card h-100 shadow-sm ${s.borderColor}" style="border-top-width: 4px !important;">
          <!-- 彩色標題區 -->
          <div class="card-header ${s.headerBg} text-white d-flex justify-content-between align-items-center py-2 px-3">
            <div class="d-flex align-items-center">
              <i class="fal ${s.headerIcon} mr-2 fs-lg"></i>
              <h5 class="card-title mb-0 text-white font-weight-bold">${name || '未命名設備'}</h5>
            </div>
            <span class="badge badge-light text-dark">${s.text}</span>
          </div>
          
          <!-- 卡片內容 -->
          <div class="card-body d-flex flex-column bg-white">
            <!-- 設備ID -->
            <div class="mb-3">
              <div class="text-muted mb-1">
                <i class="fal fa-tag mr-1"></i> 設備編號
              </div>
              <span class="font-weight-bold text-dark fs-lg">#${id}</span>
            </div>
            
            <!-- 最近啟動時間 -->
            <div class="mb-3">
              <div class="text-muted mb-1">
                <i class="fal fa-clock mr-1"></i> 最近啟動時間
              </div>
              <span class="font-weight-normal text-dark fs-md">${fmtDateTime(bootTime)}</span>
            </div>
            
            <!-- 使用效率 -->
            <div class="mb-3">
              <div class="text-muted mb-1">
                <i class="fal fa-chart-line mr-1"></i> 設備使用效率
              </div>
              <div class="d-flex align-items-baseline">
                <span class="display-4 font-weight-bold ${s.ratioColor} mr-2">
                  ${ratioValue !== null ? ratioValue.toFixed(1) : '-'}
                </span>
                <span class="text-muted">%</span>
                ${ratioStatus ? `<span class="ml-auto badge ${ratioValue >= 70 ? 'badge-success' : ratioValue >= 40 ? 'badge-warning' : 'badge-danger'}">
                  <i class="fal ${s.ratioIcon} mr-1"></i> ${ratioStatus}
                </span>` : ''}
              </div>
            </div>
            
            <!-- 操作按鈕 -->
            <div class="mt-auto pt-2 border-top">
              <button class="btn btn-sm btn-outline-primary w-100" data-action="history" data-id="${id}" data-name="${name}">
                <i class="fal fa-history mr-1"></i> 查看維護歷史
              </button>
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
      const resp = await apiFetch(`${API_BASE}/status`, { method: 'GET' });
      renderDeviceCards(resp.data || []);
    } catch (err) {
      toastError(`載入設備狀態失敗：${err.message}`);
    }
  };

  // ========= 維護紀錄功能（保留） =========
  const loadMaintenanceHistory = async (deviceId = null) => {
    try {
      const url = deviceId ?
        `${SCHEDULE_API_BASE}/maintenance-history?deviceId=${deviceId}` :
        `${SCHEDULE_API_BASE}/maintenance-history`;
      const resp = await apiFetch(url, { method: 'GET' });
      renderMaintenanceHistoryTable(resp.data || []);
    } catch (err) {
      toastError(`載入維護紀錄失敗：${err.message}`);
    }
  };

  const renderMaintenanceHistoryTable = (records) => {
    const tbody = $maintenanceHistoryTable.querySelector('tbody');
    if (!records || records.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">目前沒有維護紀錄</td></tr>';
      return;
    }

    const rows = records.map(record => {
      const startTime = fmtDateTime(record.createTime);
      const endTime = record.endTime ? fmtDateTime(record.endTime) : '—';
      const bossDescription = record.bossDescription || '—';

      return `
        <tr>
          <td>${record.deviceName || '—'}</td>
          <td>${record.userName || '—'}</td>
          <td>${record.employeeDescription || '—'}</td>
          <td>${startTime}</td>
          <td>${endTime}</td>
          <td>${bossDescription}</td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;
  };

  const loadDeviceSelector = async () => {
    try {
      const resp = await apiFetch(`${API_BASE}/status`, { method: 'GET' });
      const devices = resp.data || [];
      const options = devices.map(device =>
        `<option value="${device.id}">${device.name || `設備#${device.id}`}</option>`
      ).join('');
      $maintenanceDeviceSelector.innerHTML =
        '<option value="">所有機台</option>' + options;
    } catch (err) {
      toastError(`載入設備清單失敗：${err.message}`);
    }
  };

  const renderHistoryModal = (deviceId, deviceName, list) => {
    const completed = (list || []).filter(r => !!r.recordEndTime);
    const rows = completed.map(r => `
      <tr>
        <td>${fmtDateTime(r.recordCreateTime)}</td>
        <td>${fmtDateTime(r.recordEndTime)}</td>
        <td>${r.userName || '-'}</td>
        <td>${r.recordDescription || '-'}</td>
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
              </tr>
            </thead>
            <tbody>${rows || `<tr><td colspan="4" class="text-center text-muted">目前沒有已完成的維護紀錄</td></tr>`}</tbody>
          </table>
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: '關閉',
    });
  };

  const showDeviceMaintenanceHistory = async (deviceId, deviceName) => {
    try {
      const resp = await apiFetch(`${API_BASE}/${deviceId}/maintenance`, { method: 'GET' });
      renderHistoryModal(deviceId, deviceName, resp.data || []);
    } catch (err) {
      const msg = (err && err.message) ? String(err.message) : '';
      if (/404/.test(msg) || /No maintenance history/i.test(msg)) {
        renderHistoryModal(deviceId, deviceName, []);
        return;
      }
      toastError(`取得維護歷史失敗：${msg}`);
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
    $reportBox.innerHTML = '<canvas id="report-canvas" style="width:100%; height:420px;"></canvas>';
    const canvas = document.getElementById('report-canvas');
    const ctx = canvas.getContext('2d');
    return ctx;
  };
  const basePlugins = { legend: { position: 'bottom' }, title: { display: false } };
  const baseLayout  = { padding: { top: 8, right: 12, bottom: 8, left: 12 } };
  const COLORS = { ok:'#2ecc71', warn:'#f1c40f', err:'#e74c3c', blue:'#3498db', gray:'#95a5a6' };

  const renderRuntimeChart = async () => {
    const ctx = ensureReportCanvas();
    const { data: devices } = await apiFetch(`${API_BASE}`, { method: 'GET' }).catch(async () => {
      const fb = await apiFetch(`${API_BASE}/status`, { method: 'GET' });
      return { data: (fb.data || []).map(d => ({ ...d, bootTime: null, ratio: null })) };
    });

    const now = new Date();
    const day30Ago = new Date(now.getTime() - 30 * 24 * 3600 * 1000);

    const labels = [];
    const values = [];

    (devices || []).forEach(d => {
      labels.push(d.name || `設備${d.id}`);
      if (d.bootTime) {
        let r = Number(d.ratio ?? 1);
        if (r > 1) r = r / 100;
        const start = new Date(d.bootTime) > day30Ago ? new Date(d.bootTime) : day30Ago;
        const hrs = hoursBetween(start, now) * (isNaN(r) ? 1 : r);
        values.push(Math.max(0, Number(hrs.toFixed(1))));
      } else {
        values.push(0);
      }
    });

    destroyChartIfAny();
    currentChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: '近30天估算運行時數（小時）', data: values, backgroundColor: COLORS.blue }] },
      options: {
        responsive: true, maintainAspectRatio: false, layout: baseLayout,
        plugins: { ...basePlugins, tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${c.formattedValue} 小時` } } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: '小時' } },
                  x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } } }
      }
    });
  };

  const renderStatusPie = async () => {
    const ctx = ensureReportCanvas();
    const { data: statuses } = await apiFetch(`${API_BASE}/status`, { method: 'GET' });
    const counts = { '1': 0, '2': 0, '3': 0, '4': 0 };
    (statuses || []).forEach(s => counts[s.status] = (counts[s.status] || 0) + 1);
    const total = (counts['1'] || 0) + (counts['2'] || 0) + (counts['3'] || 0) + (counts['4'] || 0) || 1;

    destroyChartIfAny();
    currentChart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['正常運行', '維護中', '故障', '已指派未處理'],
        datasets: [{
          data: [counts['1'] || 0, counts['2'] || 0, counts['3'] || 0, counts['4'] || 0],
          backgroundColor: [COLORS.ok, COLORS.warn, COLORS.err, COLORS.blue],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, layout: baseLayout,
        plugins: { ...basePlugins, tooltip: { callbacks: { label: (c) => {
          const val = c.raw || 0; const pct = ((val / total) * 100).toFixed(1); return `${c.label}: ${val}（${pct}%）`;
        } } } }
      }
    });
  };

  const renderMaintenanceCount = async () => {
    const ctx = ensureReportCanvas();
    const { data: history } = await apiFetch(`${API_BASE}/maintenance-history`, { method: 'GET' });
    const countByDevice = {};
    (history || []).forEach(r => {
      const key = `${r.deviceId}::${r.deviceName || `設備${r.deviceId}`}`;
      countByDevice[key] = (countByDevice[key] || 0) + 1;
    });

    const entries = Object.entries(countByDevice).sort((a, b) => b[1] - a[1]);
    const labels = entries.map(e => e[0].split('::')[1]);
    const values = entries.map(e => e[1]);

    destroyChartIfAny();
    currentChart = new Chart(ctx, {
      type: 'bar',
      data: { labels, datasets: [{ label: '維護次數', data: values, backgroundColor: COLORS.gray }] },
      options: {
        responsive: true, maintainAspectRatio: false, layout: baseLayout, plugins: { ...basePlugins },
        scales: {
          y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: '次' } },
          x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } }
        }
      }
    });
  };

  const renderPrediction = async () => {
    const ctx = ensureReportCanvas();
    const { data: history } = await apiFetch(`${API_BASE}/maintenance-history`, { method: 'GET' });

    const byDevice = {};
    (history || []).forEach(r => {
      const key = `${r.deviceId}::${r.deviceName || `設備${r.deviceId}`}`;
      (byDevice[key] ||= []).push(r);
    });
    Object.values(byDevice).forEach(list =>
      list.sort((a, b) => new Date(a.recordEndTime || a.recordCreateTime) - new Date(b.recordEndTime || b.recordCreateTime))
    );

    const labels = [];
    const avgDays = [];
    const nextDays = [];

    for (const key of Object.keys(byDevice)) {
      const [, name] = key.split('::');
      const list = byDevice[key];
      const gaps = [];
      for (let i = 1; i < list.length; i++) {
        const prev = list[i - 1];
        const curr = list[i];
        const gapHrs = hoursBetween(prev.recordEndTime || prev.recordCreateTime, curr.recordEndTime || curr.recordCreateTime);
        gaps.push(gapHrs / 24);
      }
      const avg = gaps.length ? (gaps.reduce((a, b) => a + b, 0) / gaps.length) : 0;
      labels.push(name);
      avgDays.push(Number(avg.toFixed(1)));
      nextDays.push(Number((avg || 0).toFixed(1)));
    }

    destroyChartIfAny();
    currentChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: '平均維護間隔（天）', data: avgDays, backgroundColor: COLORS.blue },
          { label: '預測下次間隔（天）', data: nextDays, backgroundColor: COLORS.warn }
        ]
      },
      options: {
        responsive: true, maintainAspectRatio: false, layout: baseLayout, plugins: { ...basePlugins },
        scales: { y: { beginAtZero: true, title: { display: true, text: '天' } },
                  x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } } }
      }
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
  $btnDevice?.addEventListener('click', () => {
    $btnDevice.classList.add('active');
    $btnReport.classList.remove('active');
    $btnMaintenanceHistory.classList.remove('active');
    $deviceView.style.display = '';
    $reportView.style.display = 'none';
    $maintenanceHistoryView.style.display = 'none';
  });

  $btnReport?.addEventListener('click', async () => {
    $btnReport.classList.add('active');
    $btnDevice.classList.remove('active');
    $btnMaintenanceHistory.classList.remove('active');
    $deviceView.style.display = 'none';
    $reportView.style.display = '';
    $maintenanceHistoryView.style.display = 'none';
    await renderReport();
  });

  $btnMaintenanceHistory?.addEventListener('click', async () => {
    $btnMaintenanceHistory.classList.add('active');
    $btnDevice.classList.remove('active');
    $btnReport.classList.remove('active');
    $deviceView.style.display = 'none';
    $reportView.style.display = 'none';
    $maintenanceHistoryView.style.display = '';
    await loadDeviceSelector();
    await loadMaintenanceHistory();
  });

  $maintenanceDeviceSelector?.addEventListener('change', async (e) => {
    const deviceId = e.target.value;
    await loadMaintenanceHistory(deviceId || null);
  });

  $btnRefresh?.addEventListener('click', async () => {
    if ($deviceView.style.display !== 'none') {
      await loadDeviceStatus();
    } else if ($reportView.style.display !== 'none') {
      await renderReport();
    } else if ($maintenanceHistoryView.style.display !== 'none') {
      await loadMaintenanceHistory();
    }
    toastSuccess('已刷新');
  });

  $reportSel?.addEventListener('change', renderReport);

  // 卡片按鈕（事件委派，只保留歷史）
  $deviceList?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');
    const id = btn.getAttribute('data-id');
    const name = btn.getAttribute('data-name');
    if (action === 'history') {
      showDeviceMaintenanceHistory(id, name);
    }
  });

  // ========= 初始化 =========
  const init = async () => {
    await loadDeviceStatus();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
