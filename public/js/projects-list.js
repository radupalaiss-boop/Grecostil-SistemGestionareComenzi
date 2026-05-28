document.addEventListener('DOMContentLoaded', () => {
    loadAllProjects();
    
    document.getElementById('projectForm')?.addEventListener('submit', createProject);
    document.getElementById('searchProjects')?.addEventListener('input', filterProjects);
    document.getElementById('statusFilter')?.addEventListener('change', filterProjects);
});

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
    
    container.innerHTML = projects.map(project => `
        <div class="project-card" data-project-id="${project.id}">
            <h3>${escapeHtml(project.name)}</h3>
            <p><strong>Client:</strong> ${escapeHtml(project.client)}</p>
            <p><strong>Status:</strong> 
                <select class="status-select" data-project-id="${project.id}" onchange="updateProjectStatus(${project.id}, this.value)">
                    <option value="active" ${project.status === 'active' ? 'selected' : ''}>Active</option>
                    <option value="completed" ${project.status === 'completed' ? 'selected' : ''}>Completed</option>
                    <option value="on_hold" ${project.status === 'on_hold' ? 'selected' : ''}>On Hold</option>
                </select>
            </p>
            <p><strong>Orders:</strong> ${project.order_count || 0}</p>
            <p><strong>Offers:</strong> ${project.offer_count || 0}</p>
            <p><strong>Total Value:</strong> ${(project.estimated_value || 0).toLocaleString()} MDL</p>
            <div class="project-actions">
                <button onclick="event.stopPropagation(); editProject(${project.id})" class="btn-icon btn-edit">✏️ Edit</button>
                <button onclick="event.stopPropagation(); deleteProject(${project.id})" class="btn-icon btn-delete">🗑️ Delete</button>
            </div>
        </div>
    `).join('');
}

// Funcția principală pentru actualizarea statusului proiectului
async function updateProjectStatus(projectId, newStatus) {
    try {
        // Găsim proiectul în datele existente
        const project = window.allProjects.find(p => p.id === projectId);
        if (!project) return;
        
        // Pregătim datele actualizate
        const updatedProject = {
            name: project.name,
            client: project.client,
            status: newStatus,
            estimated_value: project.estimated_value
        };
        
        // Trimitem cererea la server
        const response = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedProject)
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Actualizăm statusul în datele locale
            project.status = newStatus;
            
            // Arătăm notificare de succes
            showNotification(`Status changed to ${getStatusText(newStatus)}`, 'success');
            
            // Reîncărcăm proiectele pentru a fi siguri
            await loadAllProjects();
        } else {
            showNotification(data.error || 'Error updating status', 'error');
            // Reîncărcăm pentru a reveni la statusul corect
            await loadAllProjects();
        }
    } catch (error) {
        console.error('Error updating project status:', error);
        showNotification('Error updating status', 'error');
        await loadAllProjects();
    }
}

// Helper pentru a afișa textul statusului în română
function getStatusText(status) {
    const statusMap = {
        'active': 'Active',
        'completed': 'Completed',
        'on_hold': 'On Hold'
    };
    return statusMap[status] || status;
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
    if (!confirm('Are you sure you want to delete this project? All associated orders and offers will also be deleted.')) return;
    
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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}