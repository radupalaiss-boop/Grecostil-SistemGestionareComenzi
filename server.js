const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const PDFDocument = require('pdfkit');
const multer = require('multer');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Session configuration
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Database connection
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

const promiseDb = db.promise();

// Authentication middleware
const requireAuth = (req, res, next) => {
    if (!req.session.userId) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
};

const requireAdmin = (req, res, next) => {
    if (!req.session.userId || req.session.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }
    next();
};

// Log activity function (corectată)
async function logActivity(userId, projectId, actionType, actionDetails) {
    try {
        await promiseDb.execute(
            'INSERT INTO activity_log (user_id, project_id, action_type, action_details) VALUES (?, ?, ?, ?)',
            [userId, projectId, actionType, actionDetails]
        );
    } catch (error) {
        console.error('Error logging activity:', error);
    }
}

// ============= AUTHENTICATION ROUTES =============

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const [users] = await promiseDb.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
        );
        
        if (users.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        const user = users[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.role = user.role;
        
        await logActivity(user.id, null, 'LOGIN', `User ${user.username} logged in`);
        
        res.json({ 
            success: true, 
            user: { id: user.id, username: user.username, role: user.role } 
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Logout
app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Check session
app.get('/api/check-session', (req, res) => {
    if (req.session.userId) {
        res.json({ 
            authenticated: true, 
            user: { id: req.session.userId, username: req.session.username, role: req.session.role }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Register (admin only)
app.post('/api/register', requireAdmin, async (req, res) => {
    const { username, email, password, role } = req.body;
    
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await promiseDb.execute(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            [username, email, hashedPassword, role || 'user']
        );
        
        await logActivity(req.session.userId, null, 'CREATE_USER', `Created user: ${username}`);
        
        res.json({ success: true, message: 'User created successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Username or email already exists' });
    }
});

// ============= PROJECT ROUTES =============

// Get all projects
app.get('/api/projects', requireAuth, async (req, res) => {
    try {
        const [projects] = await promiseDb.execute(`
            SELECT p.*, 
                   COUNT(DISTINCT o.id) as order_count,
                   COUNT(DISTINCT off.id) as offer_count,
                   COALESCE(SUM(o.total_value), 0) as total_orders_value
            FROM projects p
            LEFT JOIN orders o ON p.id = o.project_id
            LEFT JOIN offers off ON p.id = off.project_id
            GROUP BY p.id
            ORDER BY p.created_at DESC
        `);
        
        res.json(projects);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get single project with details
app.get('/api/projects/:id', requireAuth, async (req, res) => {
    const projectId = req.params.id;
    
    try {
        const [projects] = await promiseDb.execute(
            'SELECT * FROM projects WHERE id = ?',
            [projectId]
        );
        
        if (projects.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        const [orders] = await promiseDb.execute(
            'SELECT * FROM orders WHERE project_id = ? ORDER BY order_date DESC',
            [projectId]
        );
        
        const [offers] = await promiseDb.execute(`
            SELECT o.*, u.username as created_by_name
            FROM offers o
            LEFT JOIN users u ON o.created_by = u.id
            WHERE o.project_id = ?
            ORDER BY o.created_at DESC
        `, [projectId]);
        
        const orderTotal = orders.reduce((sum, order) => sum + parseFloat(order.total_value), 0);
        
        res.json({
            project: projects[0],
            orders,
            offers,
            orderTotal
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Create project
app.post('/api/projects', requireAuth, async (req, res) => {
    const { name, client, status, estimated_value } = req.body;
    
    if (!name || !client) {
        return res.status(400).json({ error: 'Project name and client are required' });
    }
    
    try {
        const [result] = await promiseDb.execute(
            'INSERT INTO projects (name, client, status, estimated_value, created_by) VALUES (?, ?, ?, ?, ?)',
            [name, client, status || 'active', estimated_value || 0, req.session.userId]
        );
        
        await logActivity(req.session.userId, result.insertId, 'CREATE_PROJECT', `Created project: ${name}`);
        
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update project
app.put('/api/projects/:id', requireAuth, async (req, res) => {
    const projectId = req.params.id;
    const { name, client, status, estimated_value } = req.body;
    
    try {
        await promiseDb.execute(
            'UPDATE projects SET name = ?, client = ?, status = ?, estimated_value = ? WHERE id = ?',
            [name, client, status, estimated_value, projectId]
        );
        
        await logActivity(req.session.userId, projectId, 'UPDATE_PROJECT', `Updated project: ${name}`);
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete project (admin only) - VERSIUNE COMPLETĂ
app.delete('/api/projects/:id', requireAdmin, async (req, res) => {
    const projectId = req.params.id;
    
    try {
        // Verificăm dacă proiectul există
        const [project] = await promiseDb.execute('SELECT name FROM projects WHERE id = ?', [projectId]);
        
        if (project.length === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        // Ștergem în ordine pentru a evita erorile de foreign key
        // 1. Ștergem activity_log entries
        await promiseDb.execute('DELETE FROM activity_log WHERE project_id = ?', [projectId]);
        
        // 2. Ștergem orders
        await promiseDb.execute('DELETE FROM orders WHERE project_id = ?', [projectId]);
        
        // 3. Ștergem offers (offer_items se vor șterge automat cu CASCADE)
        await promiseDb.execute('DELETE FROM offers WHERE project_id = ?', [projectId]);
        
        // 4. Acum putem șterge proiectul
        const [result] = await promiseDb.execute('DELETE FROM projects WHERE id = ?', [projectId]);
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Project not found' });
        }
        
        await logActivity(req.session.userId, projectId, 'DELETE_PROJECT', `Deleted project: ${project[0].name}`);
        
        res.json({ success: true, message: 'Project deleted successfully' });
    } catch (error) {
        console.error('Error deleting project:', error);
        res.status(500).json({ error: 'Failed to delete project: ' + error.message });
    }
});
// ============= ORDER ROUTES =============

// Create order
app.post('/api/orders', requireAuth, async (req, res) => {
    const { project_id, material_name, quantity, unit, unit_price, order_date } = req.body;
    
    // Validation
    if (!material_name || material_name.trim() === '') {
        return res.status(400).json({ error: 'Material name is required' });
    }
    if (!quantity || isNaN(quantity) || quantity <= 0) {
        return res.status(400).json({ error: 'Quantity must be a positive number' });
    }
    if (!unit_price || isNaN(unit_price) || unit_price <= 0) {
        return res.status(400).json({ error: 'Unit price must be a positive number' });
    }
    
    try {
        const [result] = await promiseDb.execute(
            'INSERT INTO orders (project_id, material_name, quantity, unit, unit_price, order_date) VALUES (?, ?, ?, ?, ?, ?)',
            [project_id, material_name, quantity, unit, unit_price, order_date]
        );
        
        await logActivity(req.session.userId, project_id, 'CREATE_ORDER', `Created order for material: ${material_name}, quantity: ${quantity}`);
        
        res.json({ success: true, id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Update order
app.put('/api/orders/:id', requireAuth, async (req, res) => {
    const orderId = req.params.id;
    const { material_name, quantity, unit, unit_price, order_date } = req.body;
    
    try {
        await promiseDb.execute(
            'UPDATE orders SET material_name = ?, quantity = ?, unit = ?, unit_price = ?, order_date = ? WHERE id = ?',
            [material_name, quantity, unit, unit_price, order_date, orderId]
        );
        
        await logActivity(req.session.userId, null, 'UPDATE_ORDER', `Updated order ID: ${orderId}`);
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Delete order
app.delete('/api/orders/:id', requireAuth, async (req, res) => {
    const orderId = req.params.id;
    
    try {
        await promiseDb.execute('DELETE FROM orders WHERE id = ?', [orderId]);
        
        await logActivity(req.session.userId, null, 'DELETE_ORDER', `Deleted order ID: ${orderId}`);
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============= OFFER ROUTES =============

// Create offer
app.post('/api/offers', requireAuth, async (req, res) => {
    const { project_id, offer_number, status, items } = req.body;
    
    if (!offer_number) {
        return res.status(400).json({ error: 'Offer number is required' });
    }
    
    const connection = await promiseDb.getConnection();
    
    try {
        await connection.beginTransaction();
        
        const total_value = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
        
        const [result] = await connection.execute(
            'INSERT INTO offers (project_id, offer_number, status, total_value, created_by) VALUES (?, ?, ?, ?, ?)',
            [project_id, offer_number, status || 'in_progress', total_value, req.session.userId]
        );
        
        const offerId = result.insertId;
        
        for (const item of items) {
            await connection.execute(
                'INSERT INTO offer_items (offer_id, material_name, quantity, unit, unit_price) VALUES (?, ?, ?, ?, ?)',
                [offerId, item.material_name, item.quantity, item.unit, item.unit_price]
            );
        }
        
        await connection.commit();
        
        await logActivity(req.session.userId, project_id, 'CREATE_OFFER', `Created offer: ${offer_number}`);
        
        res.json({ success: true, id: offerId });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    } finally {
        connection.release();
    }
});

// Update offer status
app.put('/api/offers/:id/status', requireAuth, async (req, res) => {
    const offerId = req.params.id;
    const { status } = req.body;
    
    try {
        await promiseDb.execute(
            'UPDATE offers SET status = ? WHERE id = ?',
            [status, offerId]
        );
        
        await logActivity(req.session.userId, null, 'UPDATE_OFFER_STATUS', `Updated offer ${offerId} status to ${status}`);
        
        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get offer details
app.get('/api/offers/:id', requireAuth, async (req, res) => {
    const offerId = req.params.id;
    
    try {
        const [offers] = await promiseDb.execute(`
            SELECT o.*, p.name as project_name, u.username as created_by_name
            FROM offers o
            JOIN projects p ON o.project_id = p.id
            LEFT JOIN users u ON o.created_by = u.id
            WHERE o.id = ?
        `, [offerId]);
        
        if (offers.length === 0) {
            return res.status(404).json({ error: 'Offer not found' });
        }
        
        const [items] = await promiseDb.execute(
            'SELECT * FROM offer_items WHERE offer_id = ?',
            [offerId]
        );
        
        res.json({
            offer: offers[0],
            items
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Export offer to PDF
app.get('/api/offers/:id/pdf', requireAuth, async (req, res) => {
    const offerId = req.params.id;
    
    try {
        const [offers] = await promiseDb.execute(`
            SELECT o.*, p.name as project_name, p.client
            FROM offers o
            JOIN projects p ON o.project_id = p.id
            WHERE o.id = ?
        `, [offerId]);
        
        if (offers.length === 0) {
            return res.status(404).json({ error: 'Offer not found' });
        }
        
        const [items] = await promiseDb.execute(
            'SELECT * FROM offer_items WHERE offer_id = ?',
            [offerId]
        );
        
        const offer = offers[0];
        
        // Create PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=offer_${offer.offer_number}.pdf`);
        
        doc.pipe(res);
        
        // Header
        doc.fontSize(20).text('Grecostil - Commercial Offer', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text(`Offer Number: ${offer.offer_number}`);
        doc.text(`Project: ${offer.project_name}`);
        doc.text(`Client: ${offer.client}`);
        doc.text(`Status: ${offer.status}`);
        doc.text(`Date: ${new Date(offer.created_at).toLocaleDateString()}`);
        doc.moveDown();
        
        // Table header
        doc.fontSize(12);
        doc.text('Materials List:', { underline: true });
        doc.moveDown();
        
        let y = doc.y;
        doc.text('Material', 50, y);
        doc.text('Quantity', 200, y);
        doc.text('Unit', 280, y);
        doc.text('Unit Price', 350, y);
        doc.text('Total', 450, y);
        
        y += 20;
        
        // Table rows
        items.forEach(item => {
            doc.text(item.material_name, 50, y);
            doc.text(item.quantity.toString(), 200, y);
            doc.text(item.unit, 280, y);
            doc.text(`${item.unit_price} MDL`, 350, y);
            doc.text(`${item.total_value} MDL`, 450, y);
            y += 20;
            
            if (y > 700) {
                doc.addPage();
                y = 50;
            }
        });
        
        doc.moveDown();
        doc.fontSize(14).text(`Total Value: ${offer.total_value} MDL`, { align: 'right' });
        
        doc.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// ============= ACTIVITY LOG ROUTES (corectată) =============

app.get('/api/activity-logs', requireAuth, async (req, res) => {
    const limit = parseInt(req.query.limit) || 100;
    const project_id = req.query.project_id;
    
    try {
        let query = `
            SELECT l.*, u.username, p.name as project_name
            FROM activity_log l
            LEFT JOIN users u ON l.user_id = u.id
            LEFT JOIN projects p ON l.project_id = p.id
            WHERE 1=1
        `;
        const params = [];
        
        if (project_id) {
            query += ' AND l.project_id = ?';
            params.push(parseInt(project_id));
        }
        
        query += ' ORDER BY l.created_at DESC LIMIT ?';
        params.push(limit);
        
        const [logs] = await promiseDb.query(query, params);
        
        res.json(logs);
    } catch (error) {
        console.error('Error fetching activity logs:', error);
        res.status(500).json({ error: 'Server error: ' + error.message });
    }
});

// ============= DASHBOARD STATISTICS =============

app.get('/api/dashboard-stats', requireAuth, async (req, res) => {
    try {
        const [totalProjects] = await promiseDb.execute('SELECT COUNT(*) as count FROM projects');
        const [activeOrders] = await promiseDb.execute('SELECT COUNT(*) as count FROM orders');
        const [offersInProgress] = await promiseDb.execute('SELECT COUNT(*) as count FROM offers WHERE status = "in_progress"');
        const [totalValue] = await promiseDb.execute('SELECT COALESCE(SUM(estimated_value), 0) as total FROM projects');
        
        res.json({
            totalProjects: totalProjects[0].count,
            activeOrders: activeOrders[0].count,
            offersInProgress: offersInProgress[0].count,
            totalEstimatedValue: totalValue[0].total
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});