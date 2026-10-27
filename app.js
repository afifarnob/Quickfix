/* ============================================
   QUICKFIX - MAIN APPLICATION LOGIC
   Handles authentication, LocalStorage, sessions
   ============================================ */

// ============================================
// LOCALSTORAGE MANAGEMENT
// ============================================

const AppStorage = {
    // Initialize the application with default data
    init() {
        // Create default data if it doesn't exist
        if (!this.get('users')) {
            this.set('users', []);
        }
        if (!this.get('reports')) {
            this.set('reports', []);
        }
        if (!this.get('categories')) {
            this.initDefaultCategories();
        }
        if (!this.get('staff')) {
            this.set('staff', []);
        }
        
        // Create default admin user
        if (!this.hasDefaultAdmin()) {
            this.createDefaultAdmin();
        }
    },

    // Generic get method
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    },

    // Generic set method
    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    },

    // Remove data from storage
    remove(key) {
        localStorage.removeItem(key);
    },

    // Initialize default categories
    initDefaultCategories() {
        const defaultCategories = [
            { id: 1, name: 'Electrical', description: 'Electrical issues and problems' },
            { id: 2, name: 'Plumbing', description: 'Water and plumbing issues' },
            { id: 3, name: 'Structural', description: 'Building structure problems' },
            { id: 4, name: 'Cleaning', description: 'Cleaning and maintenance' },
            { id: 5, name: 'Other', description: 'Other issues' }
        ];
        this.set('categories', defaultCategories);
    },

    // Check if default admin exists
    hasDefaultAdmin() {
        const users = this.get('users') || [];
        return users.some(u => u.email === 'admin@campus.edu');
    },

    // Create default admin user
    createDefaultAdmin() {
        const users = this.get('users') || [];
        users.push({
            id: generateId(),
            name: 'Campus Admin',
            email: 'admin@campus.edu',
            password: hashPassword('admin123'),
            role: 'Admin'
        });
        this.set('users', users);
    }
};

// ============================================
// AUTHENTICATION
// ============================================

const Auth = {
    // Current logged-in user
    currentUser: null,

    // Initialize authentication state
    init() {
        const sessionUser = sessionStorage.getItem('currentUser');
        if (sessionUser) {
            this.currentUser = JSON.parse(sessionUser);
        }
    },

    // Register new user
    register(name, email, password, confirmPassword) {
        // Validation
        if (!name || !email || !password) {
            return { success: false, message: 'All fields are required' };
        }
        if (password !== confirmPassword) {
            return { success: false, message: 'Passwords do not match' };
        }
        if (password.length < 6) {
            return { success: false, message: 'Password must be at least 6 characters' };
        }

        // Check if user already exists
        const users = AppStorage.get('users') || [];
        if (users.some(u => u.email === email)) {
            return { success: false, message: 'Email already registered' };
        }

        // Create new user
        const newUser = {
            id: generateId(),
            name,
            email,
            password: hashPassword(password),
            role: 'User'
        };

        users.push(newUser);
        AppStorage.set('users', users);

        return { success: true, message: 'Registration successful! Please log in.' };
    },

    // Login user
    login(email, password) {
        // Validation
        if (!email || !password) {
            return { success: false, message: 'Email and password are required' };
        }

        // Find user
        const users = AppStorage.get('users') || [];
        const user = users.find(u => u.email === email);

        if (!user || user.password !== hashPassword(password)) {
            return { success: false, message: 'Invalid email or password' };
        }

        // Set current user in session
        this.currentUser = { ...user };
        // Remove password from session storage for security
        const userSession = { ...user };
        delete userSession.password;
        sessionStorage.setItem('currentUser', JSON.stringify(userSession));

        return { success: true, message: 'Login successful' };
    },

    // Logout user
    logout() {
        this.currentUser = null;
        sessionStorage.removeItem('currentUser');
    },

    // Check if user is logged in
    isLoggedIn() {
        return this.currentUser !== null;
    },

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    },

    // Check if user is admin
    isAdmin() {
        return this.currentUser && this.currentUser.role === 'Admin';
    }
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Generate unique ID
function generateId() {
    return '_' + Math.random().toString(36).substr(2, 9);
}

// Simple hash function (for demo purposes, not cryptographically secure)
function hashPassword(password) {
    let hash = 0;
    for (let i = 0; i < password.length; i++) {
        const char = password.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
}

// Format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    if (!notification) return;

    notification.textContent = message;
    notification.className = `notification show ${type}`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Convert file to base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// Validate image file
function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!validTypes.includes(file.type)) {
        return { valid: false, message: 'Only JPG, PNG, and GIF files are supported' };
    }
    if (file.size > maxSize) {
        return { valid: false, message: 'Image size must be less than 5MB' };
    }
    return { valid: true };
}

// ============================================
// PAGE NAVIGATION
// ============================================

function redirectToLogin() {
    window.location.href = 'index.html';
}

function redirectToUserDashboard() {
    window.location.href = 'user-dashboard.html';
}

function redirectToAdminDashboard() {
    window.location.href = 'admin-dashboard.html';
}

// Check if user should be on current page
function checkAuth() {
    Auth.init();

    if (!Auth.isLoggedIn()) {
        redirectToLogin();
        return false;
    }

    return true;
}

// ============================================
// INITIALIZATION ON LOGIN PAGE
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Only run on login/register page
    if (document.getElementById('loginSection') !== null) {
        initLoginPage();
    }
});

function initLoginPage() {
    // Initialize storage
    AppStorage.init();

    // Initialize auth
    Auth.init();

    // If already logged in, redirect based on role
    if (Auth.isLoggedIn()) {
        if (Auth.isAdmin()) {
            redirectToAdminDashboard();
        } else {
            redirectToUserDashboard();
        }
        return;
    }

    // Setup event listeners
    const switchToRegisterBtn = document.getElementById('switchToRegister');
    const switchToLoginBtn = document.getElementById('switchToLogin');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // Switch to register form
    if (switchToRegisterBtn) {
        switchToRegisterBtn.addEventListener('click', function() {
            document.getElementById('loginSection').classList.remove('active');
            document.getElementById('registerSection').classList.add('active');
        });
    }

    // Switch to login form
    if (switchToLoginBtn) {
        switchToLoginBtn.addEventListener('click', function() {
            document.getElementById('registerSection').classList.remove('active');
            document.getElementById('loginSection').classList.add('active');
        });
    }

    // Handle login
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            const result = Auth.login(email, password);

            if (result.success) {
                showNotification(result.message, 'success');
                setTimeout(() => {
                    if (Auth.isAdmin()) {
                        redirectToAdminDashboard();
                    } else {
                        redirectToUserDashboard();
                    }
                }, 500);
            } else {
                showNotification(result.message, 'error');
            }

            // Clear password field
            document.getElementById('loginPassword').value = '';
        });
    }

    // Handle registration
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const name = document.getElementById('registerName').value;
            const email = document.getElementById('registerEmail').value;
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;

            const result = Auth.register(name, email, password, confirmPassword);

            if (result.success) {
                showNotification(result.message, 'success');
                // Clear form
                registerForm.reset();
                // Switch to login
                setTimeout(() => {
                    document.getElementById('registerSection').classList.remove('active');
                    document.getElementById('loginSection').classList.add('active');
                }, 500);
            } else {
                showNotification(result.message, 'error');
            }
        });
    }
}
