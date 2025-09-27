// =========== 路由設定：依你目前的 device.routes.ts ===========
function getConfig() {
    const el = document.getElementById('app-config');
    const apiRoot = (el?.dataset?.apiRoot || 'http://localhost:3000/api').replace(/\/+$/, '');
    const login = el?.dataset?.login || '/index.html';
    const BASE = `${apiRoot}/devices`;
    return {
      apiRoot, login,
      routes: {
        deviceStatus: `${BASE}/status`,          // 供回報表單載設備清單
        reportIssue:  `${BASE}/report-issue`,    // 回報
        listIssues:   `${BASE}/issues`,          // ★ 新增：清單
        // 之後若要接手/完成，可以再加：
        // takeIssue: (id) => `${BASE}/issues/${id}/take`,
        // completeIssue: (id) => `${BASE}/issues/${id}`,
      }
    };
  }  
  
  // =========== 共用 fetch（帶 token） ===========
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
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'omit'
    });
  
    if (res.status === 401) {
      const { login } = getConfig();
      await Swal.fire('請重新登入', '登入逾時或權限不足', 'warning');
      location.href = login;
      throw new Error('Unauthorized');
    }
  
    let data = null;
    try { data = await res.json(); } catch {}
    if (!res.ok) {
      const msg = data?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }
  
  // =========== 1) 取得設備狀態，供下拉選單使用 ===========
  async function fetchDeviceStatus() {
    const { routes } = getConfig();
    const json = await apiFetch(routes.deviceStatus);
    // 期待後端回：{ success, data:[{id,name,status,bootTime,ratio}, ...] }
    return json.data || [];
  }
  
  // =========== 2) 回報問題（打 POST /report-issue） ===========
  async function reportIssue({ deviceId, name, desc }) {
    const { routes } = getConfig();
    const payload = {
      deviceId: Number(deviceId),
      name,                   // 顯示用名稱（若你後端改為用 req.user 可忽略）
      description: desc
    };
    const json = await apiFetch(routes.reportIssue, { method: 'POST', body: payload });
    return json;
  }
  
  // =========== UI：回報表單（含設備下拉） ===========
  function showReportForm() {
    Swal.fire({
      title: '回報設備問題',
      html: `
        <div class="form-group text-left">
          <label>設備</label>
          <select id="issue-device" class="form-control"></select>
          <small class="form-text text-muted">從設備清單選擇要回報的機台</small>
        </div>
        <div class="form-group text-left">
          <label>回報者名稱</label>
          <input id="issue-reporter" class="form-control" placeholder="例如：Jerry Wang">
        </div>
        <div class="form-group text-left">
          <label>問題描述</label>
          <textarea id="issue-desc" class="form-control" rows="3" placeholder="請輸入問題描述"></textarea>
        </div>
      `,
      didOpen: async () => {
        const sel = document.getElementById('issue-device');
        sel.innerHTML = `<option disabled selected>載入設備中...</option>`;
        try {
          const list = await fetchDeviceStatus();
          if (!list.length) {
            sel.innerHTML = `<option disabled selected>目前沒有設備資料</option>`;
            return;
          }
          sel.innerHTML = list.map(d => {
            const label = `${d.name || ('設備#' + d.id)}（${d.status}）`;
            return `<option value="${d.id}">${label}</option>`;
          }).join('');
        } catch (e) {
          sel.innerHTML = `<option disabled selected>載入失敗：${e.message}</option>`;
        }
      },
      showCancelButton: true,
      confirmButtonText: '送出',
      cancelButtonText: '取消',
      preConfirm: () => {
        const deviceId = document.getElementById('issue-device')?.value;
        const name = document.getElementById('issue-reporter')?.value?.trim();
        const desc = document.getElementById('issue-desc')?.value?.trim();
        if (!deviceId) return Swal.showValidationMessage('請選擇設備');
        if (!name)     return Swal.showValidationMessage('請填寫回報者名稱');
        if (!desc)     return Swal.showValidationMessage('請填寫問題描述');
        return { deviceId, name, desc };
      }
    }).then(async (r) => {
      if (!r.isConfirmed) return;
      try {
        await reportIssue(r.value);
        Swal.fire('已送出', '問題已回報，主管會收到通知', 'success');
        // 若日後你補了 GET /devices/issues，可在這裡 refreshIssues()
      } catch (e) {
        Swal.fire('送出失敗', e.message || '請稍後再試', 'error');
      }
    });
  }
  
  // =========== 綁定事件 ===========
  $('#btn-report-issue').on('click', showReportForm);
  
  // （目前沒有 issues 清單 API，就不自動刷新表格了）
  const STATUS_LABEL = { '1': '待處理', '2': '處理中', '3': '已解決' };

async function fetchIssues() {
  const { routes } = getConfig();
  const json = await apiFetch(routes.listIssues);
  // 後端回來已帶 deviceName / assigneeName，可直接用
  return (json.data || []).map(r => ({
    id: r.id,
    desc: r.description || '',
    assigned: r.assigneeName || '-',                 // 未分配顯示 -
    status: r.status,                                // '1' | '2' | '3'
    level: '-',                                      // 目前不用「緊急程度」
    deviceName: r.deviceName || `設備#${r.deviceId}` // 若要顯示設備可加到描述前
  }));
}

function renderIssues(issues) {
  const $tbody = $('#issue-table tbody');
  $tbody.empty();
  issues.forEach(issue => {
    const statusText = STATUS_LABEL[issue.status] || issue.status || '-';
    const statusColor = issue.status === '3' ? 'badge-success'
                      : issue.status === '2' ? 'badge-warning'
                      : 'badge-danger';
    $tbody.append(`
      <tr>
        <td>${issue.desc}</td>
        <td>${issue.assigned}</td>
        <td><span class="badge ${statusColor}">${statusText}</span></td>
        <td>-</td>                        <!-- 緊急程度暫不使用 -->
        <td class="text-center"></td>     <!-- 操作暫空，等你開「接手/完成」API 再放 -->
      </tr>
    `);
  });
}

async function refreshIssues() {
  try {
    const issues = await fetchIssues();
    renderIssues(issues);
  } catch (err) {
    Swal.fire('載入失敗', err.message || '請稍後再試', 'error');
  }
}

$(document).ready(function () {
  refreshIssues();                 // ★ 首次渲染問題清單
  // setInterval(refreshIssues, 30000); // 如需自動刷新再開
});
