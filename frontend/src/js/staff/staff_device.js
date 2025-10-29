(() => {
  // ========= 基本設定 =========
  const API_BASE = 'http://localhost:3000/api/devices';
  const SCHEDULE_API_BASE = 'http://localhost:3000/api/schedule';
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
  const $maintenanceHistoryTable = document.getElementById('maintenance-history-table');

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

  // ========= 維護紀錄功能 =========
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
        '<option value="">選擇設備查看維護紀錄</option>' + options;
    } catch (err) {
      toastError(`載入設備清單失敗：${err.message}`);
    }
  };

  // ========= 維護歷史 =========
  const renderHistoryModal = (deviceId, deviceName, list) => {
    // 僅顯示已完成（有 end_time）的紀錄
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
      // 若後端回 404（此設備尚無維護紀錄），仍顯示空表格 modal
      if (/404/.test(msg) || /No maintenance history/i.test(msg)) {
        renderHistoryModal(deviceId, deviceName, []);
        return;
      }
      toastError(`取得維護歷史失敗：${msg}`);
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

  /**
   * 提交維護記錄到後端 API
   * 這個函數處理維護表單的提交，包括資料驗證、API 呼叫和 UI 更新
   */
  const submitMaintenance = async () => {
    try {
      // ========= 1. 檢查是否有選定的設備 =========
      // 確保在開啟維護 Modal 時有設定 currentDeviceForMaintenance
      if (!currentDeviceForMaintenance) {
        toastError('沒有選定設備。');
        return;
      }

      // ========= 2. 取得表單資料 =========
      const deviceId = currentDeviceForMaintenance.id;           // 設備 ID
      const name = currentDeviceForMaintenance.name || `設備 ${deviceId}`; // 設備名稱，若無則使用預設格式
      const type = $maintenanceType.value;                      // 維護類型（下拉選單）
      const desc = $maintenanceDesc.value.trim();               // 維護描述（文字區域）
      const endTimeLocal = $maintenanceTime.value;              // 維護結束時間（日期時間選擇器）

      // ========= 3. 表單驗證 =========
      // 檢查必填欄位是否都有填寫
      if (!type) return toastError('請選擇維護類型');
      if (!desc) return toastError('請填寫維護描述');
      if (!endTimeLocal) return toastError('請選擇維護時間');

      // ========= 4. 資料處理 =========
      // 將維護類型和描述合併成一個字串，因為後端 API 只有 description 欄位
      // 格式：[維護類型] 維護描述
      const finalDesc = `[${type}] ${desc}`;

      // ========= 5. 組裝 API 請求的 payload =========
      const payload = {
        deviceId: Number(deviceId),                    // 轉換為數字類型
        name,                                          // 設備名稱
        description: finalDesc,                        // 合併後的維護描述
        endTime: new Date(endTimeLocal).toISOString(), // 將本地時間轉換為 ISO 格式
      };

      // ========= 6. 呼叫後端 API =========
      // POST 請求到 /api/devices/maintenance 端點
      const resp = await apiFetch(`${API_BASE}/maintenance`, {
        method: 'POST',
        body: JSON.stringify(payload),  // 將 payload 轉換為 JSON 字串
      });

      // ========= 7. 關閉維護 Modal =========
      // 支援兩種方式關閉 Modal：
      // 1. 如果有 jQuery，使用 Bootstrap Modal 的 hide 方法
      // 2. 如果沒有 jQuery，直接操作 DOM 元素
      if (window.$) {
        $('#maintenanceModal').modal('hide');
      } else {
        $maintenanceModal.classList.remove('show');
        $maintenanceModal.style.display = 'none';
      }

      // ========= 8. 顯示成功訊息 =========
      // 使用後端回傳的訊息，若無則使用預設訊息
      toastSuccess(resp.message || '維護紀錄已建立');

      // ========= 9. 重新載入設備狀態 =========
      // 因為維護可能會影響設備狀態，所以需要重新載入設備列表
      loadDeviceStatus();

    } catch (err) {
      // ========= 錯誤處理 =========
      // 如果 API 呼叫失敗或其他錯誤，顯示錯誤訊息
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

// 取代：ensureReportCanvas
const ensureReportCanvas = () => {
  // 讓容器高度確實生效，避免比例擠壓
  $reportBox.innerHTML = '<canvas id="report-canvas" style="width:100%; height:420px;"></canvas>';
  const canvas = document.getElementById('report-canvas');
  const ctx = canvas.getContext('2d');
  return ctx;
};

// 共用：乾淨的 Bar/Pie options
const basePlugins = {
  legend: { position: 'bottom' },
  title: { display: false }
};
const baseLayout = { padding: { top: 8, right: 12, bottom: 8, left: 12 } };

// 統一顏色
const COLORS = {
  ok:   '#2ecc71', // 綠
  warn: '#f1c40f', // 黃
  err:  '#e74c3c', // 紅
  blue: '#3498db',
  gray: '#95a5a6'
};

// 取代：renderRuntimeChart（近 30 天估算運行時數）
const renderRuntimeChart = async () => {
  const ctx = ensureReportCanvas();
  // 先嘗試 /devices，失敗再用 /devices/status（沒有 bootTime 的會顯示 0）
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
      // ratio 可能是 0~1 或 0~100，統一成 0~1
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
    data: {
      labels,
      datasets: [{
        label: '近30天估算運行時數（小時）',
        data: values,
        backgroundColor: COLORS.blue
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: baseLayout,
      plugins: {
        ...basePlugins,
        tooltip: {
          callbacks: { label: (c) => `${c.dataset.label}: ${c.formattedValue} 小時` }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { precision: 0 },   // 讓刻度是整數
          title: { display: true, text: '小時' }
        },
        x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } }
      }
    }
  });
};

// 取代：renderStatusPie（固定綠/黃/紅、顯示百分比）
const renderStatusPie = async () => {
  const ctx = ensureReportCanvas();
  const { data: statuses } = await apiFetch(`${API_BASE}/status`, { method: 'GET' });
  const counts = { '1': 0, '2': 0, '3': 0 };
  (statuses || []).forEach(s => counts[s.status] = (counts[s.status] || 0) + 1);
  const total = (counts['1'] || 0) + (counts['2'] || 0) + (counts['3'] || 0) || 1;

  destroyChartIfAny();
  currentChart = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: ['正常運行', '維護中', '故障'],
      datasets: [{
        data: [counts['1'] || 0, counts['2'] || 0, counts['3'] || 0],
        backgroundColor: [COLORS.ok, COLORS.warn, COLORS.err],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: baseLayout,
      plugins: {
        ...basePlugins,
        tooltip: {
          callbacks: {
            label: (c) => {
              const val = c.raw || 0;
              const pct = ((val / total) * 100).toFixed(1);
              return `${c.label}: ${val}（${pct}%）`;
            }
          }
        }
      }
    }
  });
};

// 取代：renderMaintenanceCount（依維護次數排序、版面友善）
const renderMaintenanceCount = async () => {
  const ctx = ensureReportCanvas();
  const { data: history } = await apiFetch(`${API_BASE}/maintenance-history`, { method: 'GET' });
  const countByDevice = {};
  (history || []).forEach(r => {
    const key = `${r.deviceId}::${r.deviceName || `設備${r.deviceId}`}`;
    countByDevice[key] = (countByDevice[key] || 0) + 1;
  });

  // 依次數排序（多到少）
  const entries = Object.entries(countByDevice).sort((a, b) => b[1] - a[1]);
  const labels = entries.map(e => e[0].split('::')[1]);
  const values = entries.map(e => e[1]);

  destroyChartIfAny();
  currentChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '維護次數',
        data: values,
        backgroundColor: COLORS.gray
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: baseLayout,
      plugins: { ...basePlugins },
      scales: {
        y: { beginAtZero: true, ticks: { precision: 0 }, title: { display: true, text: '次' } },
        x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } }
      }
    }
  });
};

// 取代：renderPrediction（平均天數＋推估天數，刻度從 0 起）
const renderPrediction = async () => {
  const ctx = ensureReportCanvas();
  const { data: history } = await apiFetch(`${API_BASE}/maintenance-history`, { method: 'GET' });

  // 依設備分組並按時間排序
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
    // 簡易預測：用平均間隔
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
      responsive: true,
      maintainAspectRatio: false,
      layout: baseLayout,
      plugins: { ...basePlugins },
      scales: {
        y: { beginAtZero: true, title: { display: true, text: '天' } },
        x: { ticks: { autoSkip: true, maxRotation: 0, minRotation: 0 } }
      }
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
  // 切換視圖
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
    
    // 載入設備選擇器和維護紀錄
    await loadDeviceSelector();
    await loadMaintenanceHistory();
  });

  // 設備選擇器變更事件
  $maintenanceDeviceSelector?.addEventListener('change', async (e) => {
    const deviceId = e.target.value;
    await loadMaintenanceHistory(deviceId || null);
  });

  // 刷新
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
