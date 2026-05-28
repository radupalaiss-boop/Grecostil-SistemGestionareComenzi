document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
    loadProjects();
});

async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard-stats');
        const stats = await response.json();
        
        document.getElementById('totalProjects').textContent = stats.totalProjects;
        document.getElementById('activeOrders').textContent = stats.activeOrders;
        document.getElementById('offersInProgress').textContent = stats.offersInProgress;
        document.getElementById('totalValue').textContent = `${stats.totalEstimatedValue.toLocaleString()} MDL`;
    } catch (error) {
        console.error('Error loading stats:', error);
        showNotification(t('error'), 'error');
    }
}

async function loadProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        
        const container = document.getElementById('projectsList');
        container.innerHTML = '';
        
        projects.slice(0, 6).forEach(project => {
            const projectCard = document.createElement('div');
            projectCard.className = 'project-card';
            projectCard.onclick = () => window.location.href = `/project.html?id=${project.id}`;
            projectCard.innerHTML = `
                <h3>${project.name}</h3>
                <p><strong>${t('client')}:</strong> ${project.client}</p>
                <p><strong>${t('status')}:</strong> ${project.status}</p>
                <p><strong>${t('orders')}:</strong> ${project.order_count || 0}</p>
                <p><strong>${t('offers')}:</strong> ${project.offer_count || 0}</p>
                <p><strong>${t('total_value')}:</strong> ${(project.estimated_value || 0).toLocaleString()} MDL</p>
            `;
            container.appendChild(projectCard);
        });
    } catch (error) {
        console.error('Error loading projects:', error);
    }
}