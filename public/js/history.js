let currentFilter = {};

document.addEventListener('DOMContentLoaded', () => {
    loadHistory();
    setupFilters();
});

async function loadHistory() {
    try {
        let url = '/api/activity-logs?limit=200';
        
        if (currentFilter.project_id) {
            url += `&project_id=${currentFilter.project_id}`;
        }
        
        const response = await fetch(url);
        const logs = await response.json();
        
        displayLogs(logs);
    } catch (error) {
        console.error('Error loading history:', error);
        showNotification(t('error'), 'error');
    }
}

function displayLogs(logs) {
    const container = document.getElementById('historyList');
    
    if (logs.length === 0) {
        container.innerHTML = '<p>No activity logs found</p>';
        return;
    }
    
    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>${t('date')}</th>
                    <th>${t('projects')}</th>
                    <th>${t('action')}</th>
                    <th>${t('details')}</th>
                    <th>User</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(log => `
                    <tr>
                        <td>${new Date(log.created_at).toLocaleString()}</td>
                        <td>${escapeHtml(log.project_name || '-')}</td>
                        <td><span class="action-badge">${escapeHtml(log.action_type)}</span></td>
                        <td>${escapeHtml(log.action_details || '-')}</td>
                        <td>${escapeHtml(log.username || 'System')}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = table;
}

function setupFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#historyList tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        });
    }
}

function filterByProject(projectId) {
    currentFilter.project_id = projectId;
    loadHistory();
}

function resetFilters() {
    currentFilter = {};
    loadHistory();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}