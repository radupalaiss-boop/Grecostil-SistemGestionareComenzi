let currentProjectId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('id');
    
    if (currentProjectId) {
        // Modul DETALII PROIECT
        showProjectDetailsView();
        loadProjectDetails();
        setupEventListeners();
    } else {
        // Modul LISTĂ PROIECTE
        showProjectsListView();
        loadAllProjects();
        setupProjectsListEvents();
    }
});

function showProjectsListView() {
    document.getElementById('projectsView').style.display = 'block';
    document.getElementById('projectDetailsView').style.display = 'none';
}

function showProjectDetailsView() {
    document.getElementById('projectsView').style.display = 'none';
    document.getElementById('projectDetailsView').style.display = 'block';
}

function setupProjectsListEvents() {
    document.getElementById('projectForm')?.addEventListener('submit', createProject);
    document.getElementById('searchProjects')?.addEventListener('input', filterProjects);
    document.getElementById('statusFilter')?.addEventListener('change', filterProjects);
}

function setupEventListeners() {
    document.getElementById('addOrderBtn')?.addEventListener('click', () => openModal('orderModal'));
    document.getElementById('addOfferBtn')?.addEventListener('click', () => openModal('offerModal'));
    document.getElementById('saveOrderBtn')?.addEventListener('click', saveOrder);
    document.getElementById('saveOfferBtn')?.addEventListener('click', saveOffer);
    document.getElementById('addMaterialBtn')?.addEventListener('click', addMaterialRow);
    document.getElementById('backToProjectsBtn')?.addEventListener('click', () => {
        window.location.href = 'project.html';
    });
}

// ==================== LISTA PROIECTE ====================

async function loadAllProjects() {
    try {
        const response = await fetch('/api/projects');
        const projects = await response.json();
        window.allProjects = projects;
        displayProjects(projects);
    } catch (error) {
        console.error('Error loading projects:', error);
        showNotification('Error loading projects', 'error');
    }
}

function displayProjects(projects) {
    const container = document.getElementById('projectsList');
    
    if (projects.length === 0) {
        container.innerHTML = '<p style="color: var(--text-dim); text-align: center; padding: 60px;">No projects found</p>';
        return;
    }
    
    container.innerHTML = '';
    
    projects.forEach(project => {
        const card = document.createElement('div');
        card.className = 'project-card';
        card.style.cursor = 'pointer';
        card.onclick = function(e) {
            if (e.target.tagName === 'BUTTON' || e.target.tagName === 'SELECT') {
                return;
            }
            window.location.href = `project.html?id=${project.id}`;
        };
        
        card.innerHTML = `
            <h3>${escapeHtml(project.name)}</h3>
            <p><strong>Client:</strong> ${escapeHtml(project.client)}</p>
            <p><strong>Status:</strong> 
                <select class="status-select" onclick="event.stopPropagation()" onchange="updateProjectStatus(${project.id}, this.value)">
                    <option value="active" ${project.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="on_hold" ${project.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
                </select>
            </p>
            <p><strong>Orders:</strong> ${project.order_count || 0}</p>
            <p><strong>Offers:</strong> ${project.offer_count || 0}</p>
            <p><strong>Total Value:</strong> ${(project.estimated_value || 0).toLocaleString()} MDL</p>
            <div class="project-actions" onclick="event.stopPropagation()">
                <button onclick="editProject(${project.id})" class="btn-icon btn-edit">✏️ Edit</button>
                <button onclick="deleteProject(${project.id})" class="btn-icon btn-delete">🗑️ Delete</button>
            </div>
        `;
        
        container.appendChild(card);
    });
}

async function updateProjectStatus(projectId, newStatus) {
    try {
        const project = window.allProjects.find(p => p.id === projectId);
        if (!project) return;
        
        const updatedProject = {
            name: project.name,
            client: project.client,
            status: newStatus,
            estimated_value: project.estimated_value
        };
        
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProject)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(`Status changed to ${newStatus}`, 'success');
            await loadAllProjects();
        } else {
            showNotification(data.error || 'Error updating status', 'error');
            await loadAllProjects();
        }
    } catch (error) {
        console.error('Error updating project status:', error);
        showNotification('Error updating status', 'error');
        await loadAllProjects();
    }
}

function filterProjects() {
    const searchTerm = document.getElementById('searchProjects').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    
    let filtered = window.allProjects || [];
    
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) || 
            p.client.toLowerCase().includes(searchTerm)
        );
    }
    
    if (statusFilter) {
        filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    displayProjects(filtered);
}

async function createProject(e) {
    e.preventDefault();
    
    const projectData = {
        name: document.getElementById('projectName').value,
        client: document.getElementById('clientName').value,
        status: document.getElementById('projectStatus').value,
        estimated_value: parseFloat(document.getElementById('estimatedValue').value) || 0
    };
    
    if (!projectData.name || !projectData.client) {
        showNotification('Project name and client are required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(projectData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Project created successfully', 'success');
            closeModal('projectModal');
            document.getElementById('projectForm').reset();
            loadAllProjects();
        } else {
            showNotification(data.error || 'Error creating project', 'error');
        }
    } catch (error) {
        console.error('Error creating project:', error);
        showNotification('Error creating project', 'error');
    }
}

async function editProject(projectId) {
    const project = window.allProjects.find(p => p.id === projectId);
    if (!project) return;
    
    const newName = prompt('Enter new project name:', project.name);
    const newClient = prompt('Enter new client name:', project.client);
    
    if (newName && newClient) {
        try {
            const response = await fetch(`/api/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...project,
                    name: newName,
                    client: newClient
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Project updated successfully', 'success');
                loadAllProjects();
            } else {
                showNotification(data.error || 'Error updating project', 'error');
            }
        } catch (error) {
            console.error('Error updating project:', error);
            showNotification('Error updating project', 'error');
        }
    }
}

async function deleteProject(projectId) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    
    try {
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Project deleted successfully', 'success');
            loadAllProjects();
        } else {
            showNotification(data.error || 'Error deleting project', 'error');
        }
    } catch (error) {
        console.error('Error deleting project:', error);
        showNotification('Error deleting project', 'error');
    }
}

// ==================== DETALII PROIECT ====================

async function loadProjectDetails() {
    try {
        const response = await fetch(`/api/projects/${currentProjectId}`);
        const data = await response.json();
        
        document.getElementById('projectName').textContent = data.project.name;
        document.getElementById('projectClient').textContent = data.project.client;
        document.getElementById('projectStatus').textContent = data.project.status;
        document.getElementById('projectValue').textContent = `${(data.project.estimated_value || 0).toLocaleString()} MDL`;
        document.getElementById('orderTotal').innerHTML = `<span>${data.orderTotal.toLocaleString()} MDL</span>`;
        
        loadOrders(data.orders);
        loadOffers(data.offers);
    } catch (error) {
        console.error('Error loading project:', error);
        showNotification('Error loading project', 'error');
    }
}

function loadOrders(orders) {
    const container = document.getElementById('ordersList');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = '<p>No orders found</p>';
        return;
    }
    
    const table = `
        <table class="data-table">
            <thead>
                <tr><th>Material</th><th>Quantity</th><th>Unit</th><th>Unit Price</th><th>Total</th><th>Date</th><th>Action</th></tr>
            </thead>
            <tbody>
                ${orders.map(order => `
                    <tr>
                        <td>${escapeHtml(order.material_name)}</td>
                        <td>${order.quantity}</td>
                        <td>${order.unit}</td>
                        <td>${order.unit_price} MDL</td>
                        <td>${order.total_value} MDL</td>
                        <td>${new Date(order.order_date).toLocaleDateString()}</td>
                        <td>
                            <button onclick="deleteOrder(${order.id})" class="btn-icon btn-delete">🗑️</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = table;
}

function loadOffers(offers) {
    const container = document.getElementById('offersList');
    if (!container) return;
    
    if (offers.length === 0) {
        container.innerHTML = '<p style="color: var(--text-dim); padding: 40px; text-align: center;">No offers found</p>';
        return;
    }
    
    let html = `
        <table class="data-table">
            <thead><tr><th>Offer Number</th><th>Total Value</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead>
            <tbody>
    `;
    
    offers.forEach(offer => {
        html += `
            <tr>
                <td><strong>${escapeHtml(offer.offer_number)}</strong></td>
                <td>${Number(offer.total_value).toLocaleString()} MDL</td>
                <td>
                    <select onchange="updateOfferStatus(${offer.id}, this.value)" class="status-select">
                        <option value="in_progress" ${offer.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                        <option value="transmitted" ${offer.status === 'transmitted' ? 'selected' : ''}>Transmitted</option>
                        <option value="approved" ${offer.status === 'approved' ? 'selected' : ''}>Approved</option>
                        <option value="rejected" ${offer.status === 'rejected' ? 'selected' : ''}>Rejected</option>
                    </select>
                </td>
                <td>${new Date(offer.created_at).toLocaleDateString()}</td>
                <td>
                    <button onclick="viewOffer(${offer.id})" class="btn-icon" style="background: #2d6fa4; color: white;">View</button>
                    <button onclick="exportOfferPDF(${offer.id})" class="btn-icon" style="background: #c9a84c; color: #0c0d0f;">PDF</button>
                </td>
            </tr>
        `;
    });
    
    html += `</tbody></table>`;
    container.innerHTML = html;
}

async function exportOfferPDF(offerId) {
    window.open(`/api/offers/${offerId}/pdf`, '_blank');
    showNotification('Generating PDF...', 'success');
}

async function updateOfferStatus(offerId, status) {
    try {
        const response = await fetch(`/api/offers/${offerId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Status updated', 'success');
            loadProjectDetails();
        } else {
            showNotification(data.error || 'Error', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('Error updating status', 'error');
    }
}

async function viewOffer(offerId) {
    try {
        const response = await fetch(`/api/offers/${offerId}`);
        const data = await response.json();
        
        let details = `Offer: ${data.offer.offer_number}\nStatus: ${data.offer.status}\nTotal: ${data.offer.total_value} MDL\n\nMaterials:\n`;
        data.items.forEach(item => {
            details += `- ${item.material_name}: ${item.quantity} ${item.unit} x ${item.unit_price} MDL = ${item.total_value} MDL\n`;
        });
        alert(details);
    } catch (error) {
        showNotification('Error viewing offer', 'error');
    }
}

async function saveOrder() {
    const orderData = {
        project_id: currentProjectId,
        material_name: document.getElementById('materialName').value,
        quantity: parseFloat(document.getElementById('quantity').value),
        unit: document.getElementById('unit').value,
        unit_price: parseFloat(document.getElementById('unitPrice').value),
        order_date: document.getElementById('orderDate').value
    };
    
    if (!orderData.material_name || isNaN(orderData.quantity) || orderData.quantity <= 0 || isNaN(orderData.unit_price) || orderData.unit_price <= 0) {
        showNotification('Please fill all fields correctly', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(orderData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Order added', 'success');
            closeModal('orderModal');
            loadProjectDetails();
            document.getElementById('orderForm').reset();
        } else {
            showNotification(data.error || 'Error', 'error');
        }
    } catch (error) {
        showNotification('Error saving order', 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Delete this order?')) return;
    
    try {
        await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
        showNotification('Order deleted', 'success');
        loadProjectDetails();
    } catch (error) {
        showNotification('Error deleting order', 'error');
    }
}

let materialRows = [];

function addMaterialRow() {
    const container = document.getElementById('materialsContainer');
    const rowId = Date.now();
    materialRows.push(rowId);
    
    const row = document.createElement('div');
    row.className = 'material-row';
    row.id = `material-${rowId}`;
    row.innerHTML = `
        <input type="text" placeholder="Material name" class="material-name" required>
        <input type="number" placeholder="Quantity" class="material-quantity" step="0.01" required>
        <input type="text" placeholder="Unit" class="material-unit" required>
        <input type="number" placeholder="Unit price" class="material-price" step="0.01" required>
        <button onclick="removeMaterialRow(${rowId})" class="btn-delete">🗑️</button>
    `;
    container.appendChild(row);
}

function removeMaterialRow(rowId) {
    const row = document.getElementById(`material-${rowId}`);
    if (row) {
        row.remove();
        materialRows = materialRows.filter(id => id !== rowId);
    }
}

async function saveOffer() {
    const items = [];
    const rows = document.querySelectorAll('.material-row');
    
    for (let row of rows) {
        const item = {
            material_name: row.querySelector('.material-name').value,
            quantity: parseFloat(row.querySelector('.material-quantity').value),
            unit: row.querySelector('.material-unit').value,
            unit_price: parseFloat(row.querySelector('.material-price').value)
        };
        
        if (!item.material_name || isNaN(item.quantity) || !item.unit || isNaN(item.unit_price)) {
            showNotification('Please fill all material fields', 'error');
            return;
        }
        items.push(item);
    }
    
    if (items.length === 0) {
        showNotification('Add at least one material', 'error');
        return;
    }
    
    const offerData = {
        project_id: currentProjectId,
        offer_number: document.getElementById('offerNumber').value,
        status: document.getElementById('offerStatus').value,
        items: items
    };
    
    if (!offerData.offer_number) {
        showNotification('Offer number required', 'error');
        return;
    }
    
    try {
        const response = await fetch('/api/offers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(offerData)
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Offer created', 'success');
            closeModal('offerModal');
            loadProjectDetails();
            document.getElementById('materialsContainer').innerHTML = '';
            materialRows = [];
            document.getElementById('offerForm').reset();
        } else {
            showNotification(data.error || 'Error', 'error');
        }
    } catch (error) {
        showNotification('Error creating offer', 'error');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}