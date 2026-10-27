-- ============================================
-- QUICKFIX DATABASE SCHEMA
-- MySQL Database for Campus Problem Reporting System
-- ============================================

-- Create Database
CREATE DATABASE IF NOT EXISTS quickfix;
USE quickfix;

-- ============================================
-- USERS TABLE
-- ============================================

CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('User', 'Admin') DEFAULT 'User',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- ============================================
-- CATEGORIES TABLE
-- ============================================

CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
);

-- ============================================
-- STAFF TABLE
-- ============================================

CREATE TABLE staff (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  specialty VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  status ENUM('Active', 'Inactive') DEFAULT 'Active',
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_specialty (specialty),
  INDEX idx_status (status)
);

-- ============================================
-- REPORTS TABLE
-- ============================================

CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  categoryId INT NOT NULL,
  location VARCHAR(255) NOT NULL,
  image LONGBLOB,
  status ENUM('Reported', 'Approved', 'In Progress', 'Resolved', 'Rejected') DEFAULT 'Reported',
  assignedStaff INT,
  adminNotes TEXT,
  createdDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (assignedStaff) REFERENCES staff(id) ON DELETE SET NULL,
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_categoryId (categoryId),
  INDEX idx_createdDate (createdDate),
  INDEX idx_assignedStaff (assignedStaff)
);

-- ============================================
-- INSERT DEFAULT ADMIN USER
-- ============================================

-- Password: admin123 (bcrypt hashed)
INSERT INTO users (name, email, password, role) VALUES 
('Admin', 'admin@campus.edu', '$2a$10$wBM7YxxIpTMqTf1PpMfqaubjW0/9YANnqVLXYNQGQAKwg0G8hhOha', 'Admin');

-- ============================================
-- INSERT DEFAULT CATEGORIES
-- ============================================

INSERT INTO categories (name, description) VALUES
('Broken Door', 'Doors that are damaged or not functioning properly'),
('Leak', 'Water leaks or plumbing issues'),
('Electrical Issue', 'Electrical problems, power outages, or faulty wiring'),
('Furniture Damage', 'Broken desks, chairs, or other furniture'),
('Pest Problem', 'Insects, rodents, or other pest issues'),
('Cleaning', 'Areas that need cleaning or maintenance'),
('Safety Concern', 'Security or safety-related issues'),
('Other', 'Any other maintenance or repair issues');

-- ============================================
-- INSERT DEFAULT STAFF
-- ============================================

INSERT INTO staff (name, email, specialty, phone, status) VALUES
('John Smith', 'john.smith@campus.edu', 'General Maintenance', '+1-555-0101', 'Active'),
('Sarah Johnson', 'sarah.johnson@campus.edu', 'Electrical', '+1-555-0102', 'Active'),
('Mike Davis', 'mike.davis@campus.edu', 'Plumbing', '+1-555-0103', 'Active'),
('Lisa Wilson', 'lisa.wilson@campus.edu', 'Cleaning', '+1-555-0104', 'Active');

-- ============================================
-- VIEWS (Optional - for reporting)
-- ============================================

-- View: Reports with full details
CREATE OR REPLACE VIEW vw_reports_detailed AS
SELECT 
  r.id,
  r.userId,
  u.name as userName,
  u.email as userEmail,
  r.title,
  r.description,
  r.categoryId,
  c.name as categoryName,
  r.location,
  r.status,
  r.assignedStaff,
  s.name as staffName,
  r.adminNotes,
  r.createdDate,
  r.updatedDate
FROM reports r
LEFT JOIN users u ON r.userId = u.id
LEFT JOIN categories c ON r.categoryId = c.id
LEFT JOIN staff s ON r.assignedStaff = s.id;

-- View: Statistics
CREATE OR REPLACE VIEW vw_statistics AS
SELECT 
  (SELECT COUNT(*) FROM reports) as totalReports,
  (SELECT COUNT(*) FROM reports WHERE status = 'Reported') as reportedCount,
  (SELECT COUNT(*) FROM reports WHERE status = 'Approved') as approvedCount,
  (SELECT COUNT(*) FROM reports WHERE status = 'In Progress') as inProgressCount,
  (SELECT COUNT(*) FROM reports WHERE status = 'Resolved') as resolvedCount,
  (SELECT COUNT(*) FROM reports WHERE status = 'Rejected') as rejectedCount,
  (SELECT COUNT(*) FROM users) as totalUsers,
  (SELECT COUNT(*) FROM staff) as totalStaff;

-- ============================================
-- USEFUL QUERIES
-- ============================================

-- Get all reports with user and category details
SELECT * FROM vw_reports_detailed;

-- Get reports by status
SELECT * FROM vw_reports_detailed WHERE status = 'In Progress';

-- Get reports assigned to a staff member
SELECT * FROM vw_reports_detailed WHERE staffName = 'John Smith';

-- Get reports in a specific category
SELECT * FROM vw_reports_detailed WHERE categoryName = 'Broken Door';

-- Get statistics
SELECT * FROM vw_statistics;

-- Count reports by status
SELECT status, COUNT(*) as count FROM reports GROUP BY status;

-- Count reports by category
SELECT c.name as category, COUNT(r.id) as count 
FROM reports r 
LEFT JOIN categories c ON r.categoryId = c.id 
GROUP BY c.name;

-- Get reports in last 7 days
SELECT * FROM vw_reports_detailed 
WHERE createdDate >= DATE_SUB(NOW(), INTERVAL 7 DAY);

-- ============================================
-- BACKUP & RESTORE
-- ============================================

-- BACKUP:
-- mysqldump -u root -p quickfix > quickfix_backup.sql

-- RESTORE:
-- mysql -u root -p quickfix < quickfix_backup.sql

-- ============================================
-- INDEX INFORMATION
-- ============================================

-- Indexes improve query performance:
-- - idx_email: Fast user login lookups
-- - idx_role: Fast role-based queries
-- - idx_name: Fast category lookups
-- - idx_specialty: Fast staff specialty searches
-- - idx_status: Fast status-based report filtering
-- - idx_userId: Fast user report queries
-- - idx_categoryId: Fast category report queries
-- - idx_createdDate: Fast date range queries
-- - idx_assignedStaff: Fast assigned staff queries

-- ============================================
-- TABLE SIZES & CAPACITY
-- ============================================

-- Maximum records per table (with indexes):
-- Users: 1,000,000+
-- Categories: 1,000+
-- Staff: 10,000+
-- Reports: 10,000,000+ (with images may be limited by disk space)
-- 
-- Typical usage:
-- Small campus: 1,000-10,000 reports
-- Medium campus: 10,000-100,000 reports
-- Large campus: 100,000-1,000,000 reports

-- ============================================
-- MIGRATION SCRIPT (LocalStorage to SQL)
-- ============================================

-- If migrating from LocalStorage (JSON), import the JSON data using:
-- LOAD DATA LOCAL INFILE 'users.json' INTO TABLE users;
-- Or use a Node.js script to parse JSON and insert into database.

-- Example migration script in Node.js:
/*
const localStorageData = JSON.parse(localStorage.getItem('reports'));
for (const report of localStorageData) {
  await db.execute(
    'INSERT INTO reports (userId, title, description, categoryId, location, image, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [report.userId, report.title, report.description, report.categoryId, report.location, report.image, report.status]
  );
}
*/

-- ============================================
-- END OF SCHEMA
-- ============================================
