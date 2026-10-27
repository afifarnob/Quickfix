// ============================================
// QUICKFIX BACKEND SERVER
// Node.js + Express + MySQL
// ============================================

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// JWT Secret Key (change in production!)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// ============================================
// DATABASE CONNECTION POOL
// ============================================

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'password',
  database: process.env.DB_NAME || 'quickfix',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// ============================================
// MIDDLEWARE: VERIFY JWT TOKEN
// ============================================

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============================================
// MIDDLEWARE: VERIFY ADMIN
// ============================================

const verifyAdmin = (req, res, next) => {
  if (req.user.role !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================
// AUTHENTICATION ROUTES
// ============================================

// Register User
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be 6+ characters' });
    }

    const connection = await pool.getConnection();

    // Check if user exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    await connection.execute(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, 'User']
    );

    connection.release();
    res.json({ success: true, message: 'Registration successful' });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login User
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const connection = await pool.getConnection();

    const [users] = await connection.execute(
      'SELECT id, name, email, password, role FROM users WHERE email = ?',
      [email]
    );

    connection.release();

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// REPORT ROUTES
// ============================================

// Create Report
app.post('/api/reports', verifyToken, async (req, res) => {
  try {
    const { title, description, categoryId, location, image } = req.body;

    if (!title || !description || !categoryId || !location) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const connection = await pool.getConnection();

    const [result] = await connection.execute(
      'INSERT INTO reports (userId, title, description, categoryId, location, image, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.user.id, title, description, categoryId, location, image || null, 'Reported']
    );

    connection.release();

    res.json({ 
      success: true, 
      message: 'Report submitted',
      reportId: result.insertId 
    });
  } catch (error) {
    console.error('Create report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get User's Reports
app.get('/api/reports/user', verifyToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [reports] = await connection.execute(
      'SELECT * FROM reports WHERE userId = ? ORDER BY createdDate DESC',
      [req.user.id]
    );

    connection.release();

    res.json(reports);
  } catch (error) {
    console.error('Get user reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get All Reports (Admin)
app.get('/api/reports', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status, categoryId } = req.query;
    const connection = await pool.getConnection();

    let query = 'SELECT r.*, u.name as userName FROM reports r JOIN users u ON r.userId = u.id WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    if (categoryId) {
      query += ' AND r.categoryId = ?';
      params.push(categoryId);
    }

    query += ' ORDER BY r.createdDate DESC';

    const [reports] = await connection.execute(query, params);
    connection.release();

    res.json(reports);
  } catch (error) {
    console.error('Get all reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get Single Report
app.get('/api/reports/:id', verifyToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [reports] = await connection.execute(
      'SELECT r.*, u.name as userName FROM reports r JOIN users u ON r.userId = u.id WHERE r.id = ?',
      [req.params.id]
    );

    connection.release();

    if (reports.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(reports[0]);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Report (User - only own reports)
app.put('/api/reports/:id', verifyToken, async (req, res) => {
  try {
    const { title, description, categoryId, location, image } = req.body;
    const connection = await pool.getConnection();

    // Verify ownership
    const [reports] = await connection.execute(
      'SELECT userId, status FROM reports WHERE id = ?',
      [req.params.id]
    );

    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Report not found' });
    }

    if (reports[0].userId !== req.user.id) {
      connection.release();
      return res.status(403).json({ error: 'Cannot edit other users reports' });
    }

    // Can only edit if status is "Reported"
    if (reports[0].status !== 'Reported') {
      connection.release();
      return res.status(400).json({ error: 'Can only edit pending reports' });
    }

    await connection.execute(
      'UPDATE reports SET title = ?, description = ?, categoryId = ?, location = ?, image = ? WHERE id = ?',
      [title, description, categoryId, location, image || null, req.params.id]
    );

    connection.release();
    res.json({ success: true, message: 'Report updated' });
  } catch (error) {
    console.error('Update report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update Report Status (Admin)
app.put('/api/reports/:id/status', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { status, assignedStaff, adminNotes } = req.body;
    const connection = await pool.getConnection();

    await connection.execute(
      'UPDATE reports SET status = ?, assignedStaff = ?, adminNotes = ? WHERE id = ?',
      [status, assignedStaff || null, adminNotes || null, req.params.id]
    );

    connection.release();
    res.json({ success: true, message: 'Report updated' });
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Report (User - only own reports)
app.delete('/api/reports/:id', verifyToken, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [reports] = await connection.execute(
      'SELECT userId, status FROM reports WHERE id = ?',
      [req.params.id]
    );

    if (reports.length === 0) {
      connection.release();
      return res.status(404).json({ error: 'Report not found' });
    }

    if (reports[0].userId !== req.user.id) {
      connection.release();
      return res.status(403).json({ error: 'Cannot delete other users reports' });
    }

    if (reports[0].status !== 'Reported') {
      connection.release();
      return res.status(400).json({ error: 'Can only delete pending reports' });
    }

    await connection.execute('DELETE FROM reports WHERE id = ?', [req.params.id]);

    connection.release();
    res.json({ success: true, message: 'Report deleted' });
  } catch (error) {
    console.error('Delete report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// CATEGORIES ROUTES
// ============================================

// Get All Categories
app.get('/api/categories', async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [categories] = await connection.execute('SELECT * FROM categories');
    connection.release();
    res.json(categories);
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Category (Admin)
app.post('/api/categories', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description required' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description]
    );
    connection.release();

    res.json({ success: true, message: 'Category created' });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Category (Admin)
app.delete('/api/categories/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    connection.release();
    res.json({ success: true, message: 'Category deleted' });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// STAFF ROUTES
// ============================================

// Get All Staff
app.get('/api/staff', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [staff] = await connection.execute('SELECT * FROM staff');
    connection.release();
    res.json(staff);
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create Staff (Admin)
app.post('/api/staff', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { name, email, specialty, phone } = req.body;

    if (!name || !email || !specialty) {
      return res.status(400).json({ error: 'Name, email, and specialty required' });
    }

    const connection = await pool.getConnection();
    await connection.execute(
      'INSERT INTO staff (name, email, specialty, phone) VALUES (?, ?, ?, ?)',
      [name, email, specialty, phone || null]
    );
    connection.release();

    res.json({ success: true, message: 'Staff member added' });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete Staff (Admin)
app.delete('/api/staff/:id', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.execute('DELETE FROM staff WHERE id = ?', [req.params.id]);
    connection.release();
    res.json({ success: true, message: 'Staff member deleted' });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// DASHBOARD STATS (Admin)
// ============================================

app.get('/api/stats', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [[{ total }]] = await connection.execute(
      'SELECT COUNT(*) as total FROM reports'
    );

    const [[{ pending }]] = await connection.execute(
      'SELECT COUNT(*) as pending FROM reports WHERE status = "Reported"'
    );

    const [[{ inProgress }]] = await connection.execute(
      'SELECT COUNT(*) as inProgress FROM reports WHERE status = "In Progress"'
    );

    const [[{ resolved }]] = await connection.execute(
      'SELECT COUNT(*) as resolved FROM reports WHERE status = "Resolved"'
    );

    connection.release();

    res.json({
      total,
      pending,
      inProgress,
      resolved
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Server error' });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`QuickFix Backend Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;
