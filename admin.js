/* ============================================
   ADMIN DASHBOARD LOGIC
   Manage reports, staff, categories, statistics
   ============================================ */

// Current report being managed
let currentReportId = null;

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('adminNameDisplay') !== null) {
        initAdminDashboard();
    }
});

function initAdminDashboard() {
    // Check authentication - must be admin
    if (!checkAuth()) return;

    const currentUser = Auth.getCurrentUser();
    if (!Auth.isAdmin()) {
        showNotification('Access denied. Admin only.', 'error');
        setTimeout(() => redirectToLogin(), 1000);
        return;
    }

    // Show logged-in admin name
    document.getElementById('adminNameDisplay').textContent = `Admin: ${currentUser.name}`;

    // Initialize storage
    AppStorage.init();

    // Setup event listeners
    setupAdminEventListeners();

    // Load initial data
    updateDashboard();
    loadAllReports();
    loadStaffList();
    loadCategoriesList();
    loadFilters();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupAdminEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        Auth.logout();
        showNotification('Logged out successfully', 'success');
        setTimeout(() => redirectToLogin(), 500);
    });

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchAdminTab(this.dataset.tab);
        });
    });

    // Filters
    document.getElementById('adminStatusFilter').addEventListener('change', loadAllReports);
    document.getElementById('categoryFilter').addEventListener('change', loadAllReports);

    // Forms
    document.getElementById('addStaffForm').addEventListener('submit', handleAddStaff);
    document.getElementById('addCategoryForm').addEventListener('submit', handleAddCategory);

    // Backup and export buttons
    const exportJSONBtn = document.getElementById('exportJSON');
    const exportCSVBtn = document.getElementById('exportCSV');
    const exportHTMLBtn = document.getElementById('exportHTML');

    if (exportJSONBtn) exportJSONBtn.addEventListener('click', () => BackupExport.downloadJSON());
    if (exportCSVBtn) exportCSVBtn.addEventListener('click', () => BackupExport.downloadReportsAsCSV());
    if (exportHTMLBtn) exportHTMLBtn.addEventListener('click', () => BackupExport.downloadHTMLReport());

    // Import button
    const importDataBtn = document.getElementById('importDataBtn');
    const importFile = document.getElementById('importFile');
    if (importDataBtn && importFile) {
        importDataBtn.addEventListener('click', () => handleImportData(importFile));
    }

    // Report action modal
    setupReportActionModal();
}

// Setup report action modal
function setupReportActionModal() {
    const modal = document.getElementById('reportActionModal');
    const closeBtn = modal.querySelector('.close');
    const closeActionModalBtn = document.getElementById('closeActionModal');
    const saveActionBtn = document.getElementById('saveActionBtn');

    closeBtn.addEventListener('click', function() {
        modal.classList.remove('active');
    });

    if (closeActionModalBtn) {
        closeActionModalBtn.addEventListener('click', function() {
            modal.classList.remove('active');
        });
    }

    if (saveActionBtn) {
        saveActionBtn.addEventListener('click', saveReportAction);
    }

    // Close when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

// ============================================
// TAB SWITCHING
// ============================================

function switchAdminTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Deactivate all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        event.target.classList.add('active');
    }

    // Refresh data
    if (tabName === 'dashboard') {
        updateDashboard();
    } else if (tabName === 'all-reports') {
        loadAllReports();
    } else if (tabName === 'staff') {
        loadStaffList();
    } else if (tabName === 'categories') {
        loadCategoriesList();
    }
}

// ============================================
// DASHBOARD STATISTICS
// ============================================

function updateDashboard() {
    const reports = AppStorage.get('reports') || [];

    // Calculate statistics
    const total = reports.length;
    const pending = reports.filter(r => r.status === 'Reported').length;
    const inProgress = reports.filter(r => r.status === 'In Progress').length;
    const resolved = reports.filter(r => r.status === 'Resolved').length;

    // Update cards
    document.getElementById('totalReports').textContent = total;
    document.getElementById('pendingReports').textContent = pending;
    document.getElementById('inProgressReports').textContent = inProgress;
    document.getElementById('resolvedReports').textContent = resolved;

    // Display recent reports
    const recentReports = reports
        .sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate))
        .slice(0, 5);

    const recentContainer = document.getElementById('recentReports');
    if (recentReports.length === 0) {
        recentContainer.innerHTML = '<p class="empty-state">No reports yet</p>';
        return;
    }

    recentContainer.innerHTML = recentReports.map(report => createReportCard(report)).join('');

    recentReports.forEach(report => {
        document.getElementById(`manage-${report.id}`)?.addEventListener('click', () => openReportAction(report));
    });
}

// ============================================
// LOAD ALL REPORTS
// ============================================

function loadFilters() {
    const categories = AppStorage.get('categories') || [];
    const categoryFilter = document.getElementById('categoryFilter');

    categoryFilter.innerHTML = '<option value="">All Categories</option>';
    categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat.id;
        option.textContent = cat.name;
        categoryFilter.appendChild(option);
    });
}

function loadAllReports() {
    const statusFilter = document.getElementById('adminStatusFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const tbody = document.querySelector('.reports-table tbody');

    // Get all reports
    let reports = AppStorage.get('reports') || [];

    // Apply filters
    if (statusFilter) {
        reports = reports.filter(r => r.status === statusFilter);
    }
    if (categoryFilter) {
        reports = reports.filter(r => r.categoryId == categoryFilter);
    }

    // Sort by date (newest first)
    reports.sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));

    // Display reports
    if (reports.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No reports found</td></tr>';
        return;
    }

    tbody.innerHTML = reports.map(report => {
        const users = AppStorage.get('users') || [];
        const user = users.find(u => u.id === report.userId);
        const userName = user?.name || 'Unknown';
        const statusClass = `status-${report.status.toLowerCase().replace(' ', '-')}`;

        return `
            <tr>
                <td>${escapeHtml(report.title)}</td>
                <td>${escapeHtml(report.categoryName)}</td>
                <td>${escapeHtml(report.location)}</td>
                <td>${escapeHtml(userName)}</td>
                <td><span class="report-status ${statusClass}">${report.status}</span></td>
                <td>${report.assignedStaff ? escapeHtml(report.assignedStaff) : '-'}</td>
                <td>
                    <button class="btn btn-primary btn-small" id="manage-${report.id}">Manage</button>
                </td>
            </tr>
        `;
    }).join('');

    // Add event listeners
    reports.forEach(report => {
        document.getElementById(`manage-${report.id}`)?.addEventListener('click', () => openReportAction(report));
    });
}

// ============================================
// REPORT MANAGEMENT
// ============================================

function openReportAction(report) {
    currentReportId = report.id;
    const modal = document.getElementById('reportActionModal');
    const detail = document.getElementById('reportActionDetail');
    const staff = AppStorage.get('staff') || [];
    const users = AppStorage.get('users') || [];
    const user = users.find(u => u.id === report.userId);
    const statusClass = `status-${report.status.toLowerCase().replace(' ', '-')}`;

    // Display report details
    let detailHtml = `
        <div class="report-detail">
            <div class="detail-row">
                <span class="detail-label">Title:</span>
                <span class="detail-value">${escapeHtml(report.title)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Category:</span>
                <span class="detail-value">${escapeHtml(report.categoryName)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${escapeHtml(report.location)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Submitted By:</span>
                <span class="detail-value">${escapeHtml(user?.name || 'Unknown')}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Submitted Date:</span>
                <span class="detail-value">${formatDate(report.submittedDate)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Current Status:</span>
                <span class="report-status ${statusClass}">${report.status}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${escapeHtml(report.description)}</span>
            </div>
    `;

    if (report.image) {
        detailHtml += `
            <div class="detail-image">
                <p class="detail-label">Attached Image:</p>
                <img src="${report.image}" alt="Report Image" style="max-height: 300px;">
            </div>
        `;
    }

    detailHtml += '</div>';
    detail.innerHTML = detailHtml;

    // Populate status select
    const statusSelect = document.getElementById('actionStatus');
    statusSelect.value = '';

    // Populate staff select
    const staffSelect = document.getElementById('assignStaff');
    staffSelect.innerHTML = '<option value="">Select staff member...</option>';
    staff.forEach(s => {
        const option = document.createElement('option');
        option.value = s.name;
        option.textContent = `${s.name} (${s.specialty})`;
        staffSelect.appendChild(option);
    });
    if (report.assignedStaff) {
        staffSelect.value = report.assignedStaff;
    }

    // Set admin notes
    document.getElementById('adminNotes').value = report.adminNotes || '';

    modal.classList.add('active');
}

function saveReportAction() {
    if (!currentReportId) return;

    const status = document.getElementById('actionStatus').value;
    const assignedStaff = document.getElementById('assignStaff').value;
    const adminNotes = document.getElementById('adminNotes').value;

    const reports = AppStorage.get('reports') || [];
    const reportIndex = reports.findIndex(r => r.id === currentReportId);

    if (reportIndex === -1) {
        showNotification('Report not found', 'error');
        return;
    }

    // Update report
    if (status) {
        reports[reportIndex].status = status;
        if (status === 'Approved') {
            reports[reportIndex].approvedDate = new Date().toISOString();
        }
    }

    if (assignedStaff) {
        reports[reportIndex].assignedStaff = assignedStaff;
    }

    if (adminNotes) {
        reports[reportIndex].adminNotes = adminNotes;
    }

    reports[reportIndex].updatedDate = new Date().toISOString();

    AppStorage.set('reports', reports);

    // Close modal and reload
    document.getElementById('reportActionModal').classList.remove('active');
    loadAllReports();
    updateDashboard();

    showNotification('Report updated successfully!', 'success');
}

// ============================================
// STAFF MANAGEMENT
// ============================================

function handleAddStaff(e) {
    e.preventDefault();

    const name = document.getElementById('staffName').value;
    const email = document.getElementById('staffEmail').value;
    const specialty = document.getElementById('staffSpecialty').value;
    const phone = document.getElementById('staffPhone').value;

    // Validation
    if (!name || !email || !specialty) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Get staff list
    const staff = AppStorage.get('staff') || [];

    // Check if staff already exists
    if (staff.some(s => s.email === email)) {
        showNotification('This email is already registered', 'error');
        return;
    }

    // Add new staff
    staff.push({
        id: generateId(),
        name,
        email,
        specialty,
        phone
    });

    AppStorage.set('staff', staff);

    // Clear form
    document.getElementById('addStaffForm').reset();
    loadStaffList();

    showNotification('Staff member added successfully!', 'success');
}

function loadStaffList() {
    const staff = AppStorage.get('staff') || [];
    const container = document.getElementById('staffListContainer');

    if (staff.length === 0) {
        container.innerHTML = '<p class="empty-state">No staff members added yet</p>';
        return;
    }

    container.innerHTML = staff.map(s => `
        <div class="staff-card">
            <div class="staff-info">
                <h4>${escapeHtml(s.name)}</h4>
                <p>📧 ${escapeHtml(s.email)}</p>
                <p>🔧 ${escapeHtml(s.specialty)}</p>
                ${s.phone ? `<p>📱 ${escapeHtml(s.phone)}</p>` : ''}
            </div>
            <div class="card-actions">
                <button class="btn btn-danger btn-small" id="delete-staff-${s.id}">Remove</button>
            </div>
        </div>
    `).join('');

    // Add delete listeners
    staff.forEach(s => {
        document.getElementById(`delete-staff-${s.id}`)?.addEventListener('click', () => deleteStaff(s.id));
    });
}

function deleteStaff(staffId) {
    if (!confirm('Are you sure you want to remove this staff member?')) {
        return;
    }

    const staff = AppStorage.get('staff') || [];
    const filteredStaff = staff.filter(s => s.id !== staffId);

    AppStorage.set('staff', filteredStaff);
    loadStaffList();

    showNotification('Staff member removed', 'success');
}

// ============================================
// CATEGORIES MANAGEMENT
// ============================================

function handleAddCategory(e) {
    e.preventDefault();

    const name = document.getElementById('categoryName').value;
    const description = document.getElementById('categoryDescription').value;

    // Validation
    if (!name || !description) {
        showNotification('Please fill in all fields', 'error');
        return;
    }

    // Get categories
    const categories = AppStorage.get('categories') || [];

    // Check if category already exists
    if (categories.some(c => c.name.toLowerCase() === name.toLowerCase())) {
        showNotification('This category already exists', 'error');
        return;
    }

    // Add new category
    const maxId = Math.max(0, ...categories.map(c => c.id));
    categories.push({
        id: maxId + 1,
        name,
        description
    });

    AppStorage.set('categories', categories);

    // Clear form
    document.getElementById('addCategoryForm').reset();
    loadCategoriesList();
    loadFilters();

    showNotification('Category added successfully!', 'success');
}

function loadCategoriesList() {
    const categories = AppStorage.get('categories') || [];
    const container = document.getElementById('categoriesContainer');

    if (categories.length === 0) {
        container.innerHTML = '<p class="empty-state">No categories added yet</p>';
        return;
    }

    container.innerHTML = categories.map(c => `
        <div class="category-card">
            <div class="category-info">
                <h4>${escapeHtml(c.name)}</h4>
                <p>${escapeHtml(c.description)}</p>
            </div>
            <div class="card-actions">
                <button class="btn btn-danger btn-small" id="delete-category-${c.id}">Delete</button>
            </div>
        </div>
    `).join('');

    // Add delete listeners
    categories.forEach(c => {
        document.getElementById(`delete-category-${c.id}`)?.addEventListener('click', () => deleteCategory(c.id));
    });
}

function deleteCategory(categoryId) {
    if (!confirm('Are you sure you want to delete this category?')) {
        return;
    }

    const categories = AppStorage.get('categories') || [];
    const filteredCategories = categories.filter(c => c.id !== categoryId);

    AppStorage.set('categories', filteredCategories);
    loadCategoriesList();
    loadFilters();

    showNotification('Category deleted', 'success');
}

// ============================================
// HELPER FUNCTION
// ============================================

// Create report card for dashboard
function createReportCard(report) {
    const users = AppStorage.get('users') || [];
    const user = users.find(u => u.id === report.userId);
    const userName = user?.name || 'Unknown';
    const statusClass = `status-${report.status.toLowerCase().replace(' ', '-')}`;

    return `
        <div class="report-card">
            <div class="report-header">
                <h3 class="report-title">${escapeHtml(report.title)}</h3>
                <span class="report-status ${statusClass}">${report.status}</span>
            </div>
            <div class="report-meta">
                <span>👤 ${escapeHtml(userName)}</span>
                <span>📂 ${escapeHtml(report.categoryName)}</span>
                <span>📍 ${escapeHtml(report.location)}</span>
                <span>📅 ${formatDate(report.submittedDate)}</span>
            </div>
            <p class="report-description">${escapeHtml(report.description.substring(0, 150))}</p>
            <div class="report-actions">
                <button class="btn btn-primary btn-small" id="manage-${report.id}">Manage</button>
            </div>
        </div>
    `;
}

// Handle importing data from JSON file
function handleImportData(fileInput) {
    const file = fileInput.files[0];

    if (!file) {
        showNotification('Please select a file to import', 'error');
        return;
    }

    if (file.type !== 'application/json') {
        showNotification('Only JSON files are supported', 'error');
        return;
    }

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);

            // Validate structure
            if (!importedData.data) {
                throw new Error('Invalid backup file format');
            }

            // Confirm import
            if (!confirm('Import data from backup?\n\nThis will add/update reports, users, staff, and categories.\n\nMake sure you have exported a backup first!')) {
                return;
            }

            // Get existing data
            const existingReports = AppStorage.get('reports') || [];
            const existingUsers = AppStorage.get('users') || [];
            const existingCategories = AppStorage.get('categories') || [];
            const existingStaff = AppStorage.get('staff') || [];

            // Merge data (imported data overwrites existing)
            const mergedReports = importedData.data.reports || existingReports;
            const mergedUsers = importedData.data.users || existingUsers;
            const mergedCategories = importedData.data.categories || existingCategories;
            const mergedStaff = importedData.data.staff || existingStaff;

            // Save merged data
            AppStorage.set('reports', mergedReports);
            AppStorage.set('users', mergedUsers);
            AppStorage.set('categories', mergedCategories);
            AppStorage.set('staff', mergedStaff);

            // Show success message
            showNotification(`Data imported successfully!\n\nReports: ${mergedReports.length} | Users: ${mergedUsers.length} | Staff: ${mergedStaff.length}`, 'success');

            // Clear file input
            fileInput.value = '';

            // Reload data
            setTimeout(() => {
                updateDashboard();
                loadAllReports();
                loadStaffList();
                loadCategoriesList();
                loadFilters();
            }, 500);

        } catch (error) {
            showNotification(`Import failed: ${error.message}`, 'error');
            console.error('Import error:', error);
            fileInput.value = '';
        }
    };

    reader.onerror = function() {
        showNotification('Failed to read file', 'error');
        fileInput.value = '';
    };

    reader.readAsText(file);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}