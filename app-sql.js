// ============================================
// QUICKFIX APP.JS - MODIFIED FOR BACKEND API
// Connect to Express.js + MySQL Backend
// ============================================

// API Base URL (change this to your backend server)
const API_BASE_URL = 'http://localhost:5000/api';

// ============================================
// AUTHENTICATION CLASS
// ============================================

class Auth {
  // Register a new user
  static async register(name, email, password, confirmPassword) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name,
          email,
          password,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Login user
  static async login(email, password) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      // Store token
      if (data.token) {
        sessionStorage.setItem('authToken', data.token);
        sessionStorage.setItem('currentUser', JSON.stringify(data.user));
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  static logout() {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
  }

  // Get current user
  static getCurrentUser() {
    const user = sessionStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  // Check if user is authenticated
  static isAuthenticated() {
    return !!sessionStorage.getItem('authToken');
  }

  // Check if user is admin
  static isAdmin() {
    const user = Auth.getCurrentUser();
    return user && user.role === 'Admin';
  }

  // Get auth token
  static getToken() {
    return sessionStorage.getItem('authToken');
  }
}

// ============================================
// API CLASS - REPORTS
// ============================================

class ReportAPI {
  // Get authorization header
  static getAuthHeader() {
    const token = Auth.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Create report
  static async create(reportData) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(reportData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create report');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get user's reports
  static async getUserReports() {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/user`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reports');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get all reports (admin)
  static async getAllReports(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.categoryId) params.append('categoryId', filters.categoryId);

      const response = await fetch(
        `${API_BASE_URL}/reports?${params.toString()}`,
        {
          method: 'GET',
          headers: this.getAuthHeader()
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch reports');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Get single report
  static async getById(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch report');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Update report (user - only own reports)
  static async update(id, reportData) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(reportData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update report');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Update report status (admin)
  static async updateStatus(id, statusData) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}/status`, {
        method: 'PUT',
        headers: this.getAuthHeader(),
        body: JSON.stringify(statusData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update report status');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Delete report (user - only own reports)
  static async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/reports/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete report');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

// ============================================
// API CLASS - CATEGORIES
// ============================================

class CategoryAPI {
  static getAuthHeader() {
    const token = Auth.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all categories
  static async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch categories');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Create category (admin)
  static async create(categoryData) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(categoryData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create category');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Delete category (admin)
  static async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete category');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

// ============================================
// API CLASS - STAFF
// ============================================

class StaffAPI {
  static getAuthHeader() {
    const token = Auth.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get all staff (admin)
  static async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/staff`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch staff');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Create staff (admin)
  static async create(staffData) {
    try {
      const response = await fetch(`${API_BASE_URL}/staff`, {
        method: 'POST',
        headers: this.getAuthHeader(),
        body: JSON.stringify(staffData)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create staff');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }

  // Delete staff (admin)
  static async delete(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/staff/${id}`, {
        method: 'DELETE',
        headers: this.getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete staff');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

// ============================================
// API CLASS - STATISTICS (Admin)
// ============================================

class StatsAPI {
  static getAuthHeader() {
    const token = Auth.getToken();
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }

  // Get statistics (admin)
  static async getStats() {
    try {
      const response = await fetch(`${API_BASE_URL}/stats`, {
        method: 'GET',
        headers: this.getAuthHeader()
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch stats');
      }

      return data;
    } catch (error) {
      throw error;
    }
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Show toast notification
function showToast(message, type = 'info') {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: ${type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db'};
    color: white;
    padding: 15px 20px;
    border-radius: 5px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;

  document.body.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.remove();
  }, 3000);
}

// Convert file to Base64
async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Check authentication
function checkAuth() {
  if (!Auth.isAuthenticated()) {
    window.location.href = 'index.html';
  }
}

// ============================================
// INITIALIZE APP
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // Check if user is logged in on protected pages
  const page = window.location.pathname.split('/').pop();
  
  if (page === 'user-dashboard.html' || page === 'admin-dashboard.html') {
    checkAuth();
  }

  // Display current user (if logged in)
  const user = Auth.getCurrentUser();
  if (user) {
    const userDisplay = document.getElementById('currentUser');
    if (userDisplay) {
      userDisplay.textContent = `${user.name} (${user.role})`;
    }
  }
});

// ============================================
// EXPORT FOR USE IN OTHER FILES
// ============================================

// Make classes available globally
window.Auth = Auth;
window.ReportAPI = ReportAPI;
window.CategoryAPI = CategoryAPI;
window.StaffAPI = StaffAPI;
window.StatsAPI = StatsAPI;
window.showToast = showToast;
window.fileToBase64 = fileToBase64;
window.escapeHtml = escapeHtml;
window.checkAuth = checkAuth;
