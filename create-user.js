const bcrypt = require('bcryptjs');
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

async function createUsers() {
    // Generați hash pentru admin123
    const adminPassword = 'admin123';
    const adminHash = await bcrypt.hash(adminPassword, 10);
    
    // Generați hash pentru user123
    const userPassword = 'user123';
    const userHash = await bcrypt.hash(userPassword, 10);
    
    console.log('Admin hash:', adminHash);
    console.log('User hash:', userHash);
    
    // Ștergeți utilizatorii existenți
    db.query('DELETE FROM users', (err) => {
        if (err) console.error('Error deleting users:', err);
        
        // Inserați admin
        db.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ['admin', 'admin@grecostil.com', adminHash, 'admin'],
            (err) => {
                if (err) console.error('Error creating admin:', err);
                else console.log('Admin created successfully');
            }
        );
        
        // Inserați user
        db.query(
            'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
            ['user1', 'user1@grecostil.com', userHash, 'user'],
            (err) => {
                if (err) console.error('Error creating user:', err);
                else console.log('User created successfully');
            }
        );
    });
}

createUsers();