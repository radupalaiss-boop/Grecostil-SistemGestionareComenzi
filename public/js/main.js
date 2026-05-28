// Check authentication on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

async function checkAuth() {
    try {
        const response = await fetch('/api/check-session');
        const data = await response.json();
        
        if (!data.authenticated && window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
            window.location.href = '/index.html';
        } else if (data.authenticated && window.location.pathname === '/') {
            window.location.href = '/dashboard.html';
        }
        
        if (data.authenticated) {
            const usernameSpan = document.getElementById('username');
            if (usernameSpan) {
                usernameSpan.textContent = data.user.username;
            }
        }
    } catch (error) {
        console.error('Auth check error:', error);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showNotification(t('success'), 'success');
            window.location.href = '/dashboard.html';
        } else {
            showNotification(data.error || t('error'), 'error');
        }
    } catch (error) {
        showNotification(t('error'), 'error');
    }
}

async function logout() {
    try {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/index.html';
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('active');
    }
};