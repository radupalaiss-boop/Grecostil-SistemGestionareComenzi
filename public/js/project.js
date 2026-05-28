let currentProjectId = null;

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    currentProjectId = urlParams.get('id');
    
    if (currentProjectId) {
        loadProjectDetails();
        setupEventListeners();
    } else {
        window.location.href = '/dashboard.html';
    }
});

function setupEventListeners() {
    document.getElementById('addOrderBtn')?.addEventListener('click', () => openModal('orderModal'));
    document.getElementById('addOfferBtn')?.addEventListener('click', () => openModal('offerModal'));
    document.getElementById('saveOrderBtn')?.addEventListener('click', saveOrder);
    document.getElementById('saveOfferBtn')?.addEventListener('click', saveOffer);
    document.getElementById('addMaterialBtn')?.addEventListener('click', addMaterialRow);
}

async function loadProjectDetails() {
    try {
        const response = await fetch(`/api/projects/${currentProjectId}`);
        const data = await response.json();
        
        document.getElementById('projectName').textContent = data.project.name;
        document.getElementById('projectClient').textContent = data.project.client;
        document.getElementById('projectStatus').textContent = data.project.status;
        document.getElementById('projectValue').textContent = `${(data.project.estimated_value || 0).toLocaleString()} MDL`;
        document.getElementById('orderTotal').textContent = `${data.orderTotal.toLocaleString()} MDL`;
        
        loadOrders(data.orders);
        loadOffers(data.offers);
    } catch (error) {
        console.error('Error loading project:', error);
        showNotification(t('error'), 'error');
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
                <tr>
                    <th>${t('material_name')}</th>
                    <th>${t('quantity')}</th>
                    <th>${t('unit')}</th>
                    <th>${t('unit_price')}</th>
                    <th>${t('total')}</th>
                    <th>${t('order_date')}</th>
                    <th>${t('action')}</th>
                </tr>
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
                            <button onclick="editOrder(${order.id})" class="btn-icon btn-edit">✏️</button>
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
        container.innerHTML = '<p>No offers found</p>';
        return;
    }
    
    const table = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>${t('offer_number')}</th>
                    <th>${t('total')}</th>
                    <th>${t('offer_status')}</th>
                    <th>${t('date')}</th>
                    <th>${t('action')}</th>
                </tr>
            </thead>
            <tbody>
                ${offers.map(offer => `
                    <tr>
                        <td>${escapeHtml(offer.offer_number)}</td>
                        <td>${offer.total_value} MDL</td>
                        <td>
                            <select onchange="updateOfferStatus(${offer.id}, this.value)" class="status-select">
                                <option value="in_progress" ${offer.status === 'in_progress' ? 'selected' : ''}>${t('in_progress')}</option>
                                <option value="transmitted" ${offer.status === 'transmitted' ? 'selected' : ''}>${t('transmitted')}</option>
                                <option value="approved" ${offer.status === 'approved' ? 'selected' : ''}>${t('approved')}</option>
                                <option value="rejected" ${offer.status === 'rejected' ? 'selected' : ''}>${t('rejected')}</option>
                            </select>
                        </td>
                        <td>${new Date(offer.created_at).toLocaleDateString()}</td>
                        <td>
                            <button onclick="viewOffer(${offer.id})" class="btn-icon btn-edit">👁️</button>
                            <button onclick="exportOfferPDF(${offer.id})" class="btn-icon">📄</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    container.innerHTML = table;
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
        <input type="text" placeholder="${t('material_name')}" class="material-name" required>
        <input type="number" placeholder="${t('quantity')}" class="material-quantity" step="0.01" required>
        <input type="text" placeholder="${t('unit')}" class="material-unit" required>
        <input type="number" placeholder="${t('unit_price')}" class="material-price" step="0.01" required>
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

async function saveOrder() {
    const orderData = {
        project_id: currentProjectId,
        material_name: document.getElementById('materialName').value,
        quantity: parseFloat(document.getElementById('quantity').value),
        unit: document.getElementById('unit').value,
        unit_price: parseFloat(document.getElementById('unitPrice').value),
        order_date: document.getElementById('orderDate').value
    };
    
    // Validation
    if (!orderData.material_name || orderData.material_name.trim() === '') {
        showNotification('Material name is required', 'error');
        return;
    }
    
    if (isNaN(orderData.quantity) || orderData.quantity <= 0) {
        showNotification('Quantity must be a positive number', 'error');
        return;
    }
    
    if (isNaN(orderData.unit_price) || orderData.unit_price <= 0) {
        showNotification('Unit price must be a positive number', 'error');
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
            showNotification(t('order_added'), 'success');
            closeModal('orderModal');
            loadProjectDetails();
            document.getElementById('orderForm').reset();
        } else {
            showNotification(data.error || t('error'), 'error');
        }
    } catch (error) {
        console.error('Error saving order:', error);
        showNotification(t('error'), 'error');
    }
}

async function saveOffer() {
    const items = [];
    const materialRows = document.querySelectorAll('.material-row');
    
    for (let row of materialRows) {
        const item = {
            material_name: row.querySelector('.material-name').value,
            quantity: parseFloat(row.querySelector('.material-quantity').value),
            unit: row.querySelector('.material-unit').value,
            unit_price: parseFloat(row.querySelector('.material-price').value)
        };
        
        if (!item.material_name || isNaN(item.quantity) || !item.unit || isNaN(item.unit_price)) {
            showNotification('Please fill all material fields correctly', 'error');
            return;
        }
        
        items.push(item);
    }
    
    if (items.length === 0) {
        showNotification('Please add at least one material', 'error');
        return;
    }
    
    const offerData = {
        project_id: currentProjectId,
        offer_number: document.getElementById('offerNumber').value,
        status: document.getElementById('offerStatus').value,
        items: items
    };
    
    if (!offerData.offer_number) {
        showNotification('Offer number is required', 'error');
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
            showNotification(t('offer_created'), 'success');
            closeModal('offerModal');
            loadProjectDetails();
        } else {
            showNotification(data.error || t('error'), 'error');
        }
    } catch (error) {
        console.error('Error saving offer:', error);
        showNotification(t('error'), 'error');
    }
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
            showNotification('Status updated successfully', 'success');
            loadProjectDetails();
        } else {
            showNotification(data.error || 'Error updating status', 'error');
        }
    } catch (error) {
        console.error('Error updating status:', error);
        showNotification(t('error'), 'error');
    }
}

async function deleteOrder(orderId) {
    if (!confirm('Are you sure you want to delete this order?')) return;
    
    try {
        const response = await fetch(`/api/orders/${orderId}`, {
            method: 'DELETE'
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification('Order deleted successfully', 'success');
            loadProjectDetails();
        } else {
            showNotification(data.error || 'Error deleting order', 'error');
        }
    } catch (error) {
        console.error('Error deleting order:', error);
        showNotification(t('error'), 'error');
    }
}

async function viewOffer(offerId) {
    try {
        const response = await fetch(`/api/offers/${offerId}`);
        const data = await response.json();
        
        let details = `Offer: ${data.offer.offer_number}\n`;
        details += `Status: ${data.offer.status}\n`;
        details += `Total: ${data.offer.total_value} MDL\n\n`;
        details += `Materials:\n`;
        
        data.items.forEach(item => {
            details += `- ${item.material_name}: ${item.quantity} ${item.unit} x ${item.unit_price} MDL = ${item.total_value} MDL\n`;
        });
        
        alert(details);
    } catch (error) {
        console.error('Error viewing offer:', error);
        showNotification(t('error'), 'error');
    }
}

async function exportOfferPDF(offerId) {
    window.open(`/api/offers/${offerId}/pdf`, '_blank');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add this function to project.js
function showEditProjectModal() {
    const project = window.currentProject;
    if (!project) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'editProjectModal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Project</h2>
                <span class="close-modal" onclick="closeModal('editProjectModal')">&times;</span>
            </div>
            <form id="editProjectForm">
                <div class="form-group">
                    <label>Project Name</label>
                    <input type="text" id="editProjectName" value="${escapeHtml(project.name)}" required>
                </div>
                <div class="form-group">
                    <label>Client</label>
                    <input type="text" id="editClientName" value="${escapeHtml(project.client)}" required>
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="editProjectStatus">
                        <option value="active" ${project.status === 'active' ? 'selected' : ''}>Active</option>
                        <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                        <option value="on_hold" ${project.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Estimated Value (MDL)</label>
                    <input type="number" id="editEstimatedValue" step="0.01" value="${project.estimated_value}" required>
                </div>
                <button type="submit" class="btn-primary">Save Changes</button>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    document.getElementById('editProjectForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const updatedProject = {
            name: document.getElementById('editProjectName').value,
            client: document.getElementById('editClientName').value,
            status: document.getElementById('editProjectStatus').value,
            estimated_value: parseFloat(document.getElementById('editEstimatedValue').value)
        };
        
        try {
            const response = await fetch(`/api/projects/${currentProjectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedProject)
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotification('Project updated successfully!', 'success');
                closeModal('editProjectModal');
                loadProjectDetails();
            } else {
                showNotification(data.error || 'Error updating project', 'error');
            }
        } catch (error) {
            console.error('Error updating project:', error);
            showNotification('Error updating project', 'error');
        }
    });
}

// Update loadProjectDetails function
async function loadProjectDetails() {
    try {
        const response = await fetch(`/api/projects/${currentProjectId}`);
        const data = await response.json();
        
        window.currentProject = data.project;
        
        document.getElementById('projectName').textContent = data.project.name;
        document.getElementById('projectClient').textContent = data.project.client;
        document.getElementById('projectStatus').textContent = data.project.status;
        document.getElementById('projectValue').textContent = `${(data.project.estimated_value || 0).toLocaleString()} MDL`;
        document.getElementById('orderTotal').innerHTML = `<span>${data.orderTotal.toLocaleString()} MDL</span>`;
        
        // Add edit button if not exists
        if (!document.getElementById('editProjectBtn')) {
            const header = document.querySelector('.project-header');
            const editBtn = document.createElement('button');
            editBtn.id = 'editProjectBtn';
            editBtn.className = 'edit-project-btn';
            editBtn.innerHTML = '✏️ Edit Project';
            editBtn.onclick = showEditProjectModal;
            header.appendChild(editBtn);
        }
        
        loadOrders(data.orders);
        loadOffers(data.offers);
    } catch (error) {
        console.error('Error loading project:', error);
        showNotification('Error loading project', 'error');
    }
}