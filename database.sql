-- Crearea bazei de date
CREATE DATABASE IF NOT EXISTS s186897_db1779805112871;
USE s186897_db1779805112871;

-- Tabela users
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabela projects
CREATE TABLE IF NOT EXISTS projects (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    client VARCHAR(100) NOT NULL,
    status ENUM('active', 'completed', 'on_hold') DEFAULT 'active',
    estimated_value DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabela orders (comenzi)
CREATE TABLE IF NOT EXISTS orders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    order_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

-- Tabela offers
CREATE TABLE IF NOT EXISTS offers (
    id INT PRIMARY KEY AUTO_INCREMENT,
    project_id INT NOT NULL,
    offer_number VARCHAR(50) UNIQUE NOT NULL,
    status ENUM('in_progress', 'transmitted', 'approved', 'rejected') DEFAULT 'in_progress',
    total_value DECIMAL(15,2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by INT,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Tabela offer_items
CREATE TABLE IF NOT EXISTS offer_items (
    id INT PRIMARY KEY AUTO_INCREMENT,
    offer_id INT NOT NULL,
    material_name VARCHAR(200) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_value DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    FOREIGN KEY (offer_id) REFERENCES offers(id) ON DELETE CASCADE
);

-- Tabela activity_log
CREATE TABLE IF NOT EXISTS activity_log (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    project_id INT,
    action_type VARCHAR(50) NOT NULL,
    action_details TEXT,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (project_id) REFERENCES projects(id),
    INDEX idx_created_at (created_at)
);

-- Inserare utilizatori demo
INSERT INTO users (username, email, password_hash, role) VALUES 
('admin', 'admin@grecostil.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrYqYqYqYqYqYqYqYqYqYqYqYqYq', 'admin'),
('user1', 'user1@grecostil.com', '$2a$10$N9qo8uLOickgx2ZMRZoMy.MrYqYqYqYqYqYqYqYqYqYqYqYqY', 'user');

-- Inserare proiecte demo
INSERT INTO projects (name, client, status, estimated_value) VALUES
('MallDova', 'MallDova SRL', 'active', 250000.00),
('Radisson Blu', 'Radisson Hotel Group', 'active', 450000.00),
('MedPark', 'MedPark Medical Center', 'active', 180000.00),
('Kaufland', 'Kaufland Moldova', 'active', 320000.00),
('Linella Logistic Center', 'Linella Distribution', 'on_hold', 150000.00);

-- Inserare comenzi demo
INSERT INTO orders (project_id, material_name, quantity, unit, unit_price, order_date) VALUES
(1, 'Ciment', 1000, 'kg', 2.50, '2024-01-15'),
(1, 'Nisip', 5000, 'kg', 0.80, '2024-01-15'),
(2, 'Cărămidă', 10000, 'buc', 1.20, '2024-01-20'),
(2, 'Beton', 200, 'mc', 85.00, '2024-01-20'),
(3, 'Gresie', 500, 'mp', 45.00, '2024-01-25');

-- Inserare oferte demo
INSERT INTO offers (project_id, offer_number, status, total_value) VALUES
(1, 'OFF-2024-001', 'approved', 125000.00),
(1, 'OFF-2024-002', 'transmitted', 89000.00),
(2, 'OFF-2024-003', 'in_progress', 275000.00),
(3, 'OFF-2024-004', 'rejected', 95000.00);