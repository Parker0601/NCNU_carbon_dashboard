const API_BASE = 'http://localhost:3000/api';
const API_SCRAP_BY_ID = (id) => `${API_BASE}/scrap/${id}`;

async function fetchJSON(url) {
  const token = localStorage.getItem('authToken');
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
  const resp = await fetch(url, { headers });
  return resp.json();
}

document.addEventListener('DOMContentLoaded', async () => {
  const params = new URLSearchParams(location.search);
  const id = params.get('id');
  if (!id) return;
  const data = await fetchJSON(API_SCRAP_BY_ID(id));
  document.getElementById('scrap-detail').innerText = JSON.stringify(data, null, 2);
});
