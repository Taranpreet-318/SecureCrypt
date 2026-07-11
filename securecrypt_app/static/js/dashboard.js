async function loadStats(){
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();
    document.getElementById('statEncrypted').textContent = data.encrypted;
    document.getElementById('statDecrypted').textContent = data.decrypted;
    document.getElementById('statTotal').textContent = data.total;
  } catch (err){
    console.error('Failed to load stats', err);
  }
}

function formatTimestamp(iso){
  // Postgres returns ISO timestamps that already include a timezone offset
  // (e.g. 2026-07-10T13:21:53.101579+00:00), so parse as-is.
  const d = new Date(iso);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

async function loadLogs(){
  const tbody = document.getElementById('logTableBody');
  const emptyState = document.getElementById('emptyState');
  try {
    const res = await fetch('/api/logs');
    if (!res.ok) return;
    const data = await res.json();

    if (!data.logs.length){
      emptyState.style.display = 'block';
      tbody.innerHTML = '';
      return;
    }
    emptyState.style.display = 'none';
    tbody.innerHTML = data.logs.map(log => `
      <tr>
        <td>${escapeHtml(log.filename)}</td>
        <td><span class="action-tag ${log.action}">${log.action}</span></td>
        <td>${formatTimestamp(log.created_at)}</td>
      </tr>
    `).join('');
  } catch (err){
    console.error('Failed to load activity log', err);
  }
}

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById('logoutBtn').addEventListener('click', async () => {
  try {
    const res = await fetch('/api/logout', { method: 'POST' });
    const data = await res.json();
    window.location.href = data.redirect || '/login';
  } catch (err){
    console.error(err);
    window.location.href = '/login';
  }
});

const eventLabels = {
  signup: 'Signed up',
  login_success: 'Logged in',
  login_failed: 'Failed login',
  logout: 'Logged out'
};
const eventClasses = {
  signup: 'encrypt',
  login_success: 'decrypt',
  login_failed: 'err',
  logout: 'encrypt'
};

async function loadAuthLogs(){
  const tbody = document.getElementById('authLogTableBody');
  const emptyState = document.getElementById('authEmptyState');
  try {
    const res = await fetch('/api/auth-logs');
    if (!res.ok) return;
    const data = await res.json();

    if (!data.logs.length){
      emptyState.style.display = 'block';
      tbody.innerHTML = '';
      return;
    }
    emptyState.style.display = 'none';
    tbody.innerHTML = data.logs.map(log => `
      <tr>
        <td><span class="action-tag ${eventClasses[log.event] || ''}">${eventLabels[log.event] || log.event}</span></td>
        <td>${escapeHtml(log.ip_address || '—')}</td>
        <td>${formatTimestamp(log.created_at)}</td>
      </tr>
    `).join('');
  } catch (err){
    console.error('Failed to load auth log', err);
  }
}

loadStats();
loadLogs();
loadAuthLogs();
