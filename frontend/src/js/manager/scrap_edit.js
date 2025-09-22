const API_BASE = 'http://localhost:3000/api';
const API_SCRAP_BY_ID = (id) => `${API_BASE}/scrap/${id}`;

async function fetchJSON(url, options = {}) {
  const token = localStorage.getItem('authToken') || localStorage.getItem('access_token') || localStorage.getItem('token');
  const headers = Object.assign(
    { 'Content-Type': 'application/json' },
    options.headers || {},
    token ? { 'Authorization': `Bearer ${token}` } : {}
  );
  const resp = await fetch(url, { ...options, headers });
  let data = null;
  try { data = await resp.json(); } catch {}
  if (!resp.ok) {
    const msg = (data && (data.message || data.error)) || `HTTP ${resp.status}`;
    throw new Error(msg);
  }
  return data ?? {};
}

const $ = (id) => document.getElementById(id);

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) {
    Swal.fire({ icon:'error', title:'缺少參數', text:'URL 未提供 id' });
    return;
  }

  // 讀取原資料
  try {
    const resp = await fetchJSON(API_SCRAP_BY_ID(id));
    const d = Array.isArray(resp) ? resp[0] : (resp.data || resp);
    if (!d) throw new Error('找不到該筆資料');

    // 填表
    $('f-id').value       = d.id;
    $('f-deviceId').value = d.deviceId ?? '';
    $('f-status').value   = String(d.status ?? '1');
    $('f-type').value     = d.type ?? '';
    $('f-weight').value   = d.weight ?? 0;
    $('f-volume').value   = d.volume ?? 0;
    $('f-humidity').value = d.humidity ?? 0;

  } catch (err) {
    Swal.fire({ icon:'error', title:'讀取失敗', text: err.message });
  }

  // 儲存
  $('btn-save')?.addEventListener('click', async () => {
    const id = $('f-id').value;
    const partial = {
      deviceId: toInt($('f-deviceId').value),
      status: String($('f-status').value || '1'),
      type:   $('f-type').value.trim(),
      weight: toInt($('f-weight').value),
      volume: toInt($('f-volume').value),
      humidity: toInt($('f-humidity').value),
    };
    // 只送有值的欄位（避免把空字串覆蓋掉）
    Object.keys(partial).forEach(k => {
      if (partial[k] === '' || partial[k] === null || Number.isNaN(partial[k])) delete partial[k];
    });

    try {
      await fetchJSON(API_SCRAP_BY_ID(id), {
        method: 'PUT',
        body: JSON.stringify(partial),
      });
      Swal.fire({ icon:'success', title:'已更新', timer: 1000, showConfirmButton:false })
        .then(() => window.location.href = '/manager/scrap_overview');
    } catch (err) {
      Swal.fire({ icon:'error', title:'更新失敗', text: err.message });
    }
  });
});

function toInt(v, def = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : def;
}
