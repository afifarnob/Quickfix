/* ============================================
   USER DASHBOARD LOGIC
   Submit, view, edit, delete personal reports
   ============================================ */

// Current report being edited
let currentEditingReport = null;

// Initialize user dashboard
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('reportForm') !== null) {
        initUserDashboard();
    }
});

function initUserDashboard() {
    // Check authentication
    if (!checkAuth()) return;

    // Show logged-in user name
    const currentUser = Auth.getCurrentUser();
    document.getElementById('userNameDisplay').textContent = `Welcome, ${currentUser.name}`;

    // Initialize storage
    AppStorage.init();

    // Setup event listeners
    setupUserEventListeners();

    // Load initial data
    loadCategories();
    loadUserReports();
}

// ============================================
// EVENT LISTENERS
// ============================================

function setupUserEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', function() {
        Auth.logout();
        showNotification('Logged out successfully', 'success');
        setTimeout(() => redirectToLogin(), 500);
    });

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });

    // Submit report form
    document.getElementById('reportForm').addEventListener('submit', handleReportSubmit);

    // Image preview
    document.getElementById('reportImage').addEventListener('change', handleImagePreview);

    // Status filter
    document.getElementById('statusFilter').addEventListener('change', loadUserReports);

    // Modal controls
    setupModalControls();
}

// Setup modal open/close
function setupModalControls() {
    const editModal = document.getElementById('editModal');
    const viewModal = document.getElementById('viewModal');
    const closeButtons = document.querySelectorAll('.close');
    const editCloseBtn = document.getElementById('closeEditModal');

    closeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });

    if (editCloseBtn) {
        editCloseBtn.addEventListener('click', function() {
            editModal.classList.remove('active');
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === editModal) {
            editModal.classList.remove('active');
        }
        if (e.target === viewModal) {
            viewModal.classList.remove('active');
        }
    });

    // Edit form submit
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
    }

    // Edit image preview
    const editImage = document.getElementById('editImage');
    if (editImage) {
        editImage.addEventListener('change', handleEditImagePreview);
    }
}

// ============================================
// TAB SWITCHING
// ============================================

function switchTab(tabName) {
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

    // Reload data if needed
    if (tabName === 'my-reports') {
        loadUserReports();
    }
}

// ============================================
// LOAD CATEGORIES
// ============================================

function loadCategories() {
    const categories = AppStorage.get('categories') || [];
    const reportCategory = document.getElementById('reportCategory');
    const editCategory = document.getElementById('editCategory');

    // Clear existing options except first one
    reportCategory.innerHTML = '<option value="">Select a category</option>';
    if (editCategory) {
        editCategory.innerHTML = '';
    }

    // Add categories
    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.name;
        reportCategory.appendChild(option);

        if (editCategory) {
            const editOption = document.createElement('option');
            editOption.value = category.id;
            editOption.textContent = category.name;
            editCategory.appendChild(editOption);
        }
    });
}

// ============================================
// REPORT SUBMISSION
// ============================================

async function handleReportSubmit(e) {
    e.preventDefault();

    const currentUser = Auth.getCurrentUser();
    const title = document.getElementById('reportTitle').value;
    const description = document.getElementById('reportDescription').value;
    const categoryId = document.getElementById('reportCategory').value;
    const location = document.getElementById('reportLocation').value;
    const imageFile = document.getElementById('reportImage').files[0];

    // Validation
    if (!title || !description || !categoryId || !location) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }

    // Validate image if provided
    if (imageFile) {
        const validation = validateImageFile(imageFile);
        if (!validation.valid) {
            showNotification(validation.message, 'error');
            return;
        }
    }

    // Get category name
    const categories = AppStorage.get('categories') || [];
    const categoryName = categories.find(c => c.id == categoryId)?.name || 'Other';

    // Convert image to base64
    let imageData = null;
    if (imageFile) {
        imageData = await fileToBase64(imageFile);
    }

    // Create report
    const reports = AppStorage.get('reports') || [];
    const newReport = {
        id: generateId(),
        userId: currentUser.id,
        title,
        description,
        categoryId,
        categoryName,
        location,
        image: imageData,
        status: 'Reported',
        submittedDate: new Date().toISOString(),
        approvedDate: null,
        assignedStaff: null,
        adminNotes: '',
        updatedDate: new Date().toISOString()
    };

    reports.push(newReport);
    AppStorage.set('reports', reports);

    // Clear form
    document.getElementById('reportForm').reset();
    document.getElementById('imagePreview').innerHTML = '';

    showNotification('Report submitted successfully!', 'success');
}

// ============================================
// IMAGE PREVIEW
// ============================================

async function handleImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('imagePreview');

    if (file) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            showNotification(validation.message, 'error');
            e.target.value = '';
            return;
        }

        const dataUrl = await fileToBase64(file);
        preview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
    } else {
        preview.innerHTML = '';
    }
}

async function handleEditImagePreview(e) {
    const file = e.target.files[0];
    const preview = document.getElementById('editImagePreview');

    if (file) {
        const validation = validateImageFile(file);
        if (!validation.valid) {
            showNotification(validation.message, 'error');
            e.target.value = '';
            return;
        }

        const dataUrl = await fileToBase64(file);
        preview.innerHTML = `<img src="${dataUrl}" alt="Preview">`;
    }
}

// ============================================
// LOAD USER REPORTS
// ============================================

function loadUserReports() {
    const currentUser = Auth.getCurrentUser();
    const statusFilter = document.getElementById('statusFilter').value;
    const reportsList = document.getElementById('reportsList');

    // Get all reports
    const allReports = AppStorage.get('reports') || [];

    // Filter for current user
    let userReports = allReports.filter(r => r.userId === currentUser.id);

    // Apply status filter
    if (statusFilter) {
        userReports = userReports.filter(r => r.status === statusFilter);
    }

    // Sort by date (newest first)
    userReports.sort((a, b) => new Date(b.submittedDate) - new Date(a.submittedDate));

    // Display reports
    if (userReports.length === 0) {
        reportsList.innerHTML = '<p class="empty-state">No reports found</p>';
        return;
    }

    reportsList.innerHTML = userReports.map(report => createReportCard(report)).join('');

    // Add event listeners
    userReports.forEach(report => {
        document.getElementById(`view-${report.id}`)?.addEventListener('click', () => viewReport(report));
        document.getElementById(`edit-${report.id}`)?.addEventListener('click', () => openEditModal(report));
        document.getElementById(`delete-${report.id}`)?.addEventListener('click', () => deleteReport(report.id));
    });
}

// Create report card HTML
function createReportCard(report) {
    const statusClass = `status-${report.status.toLowerCase().replace(' ', '-')}`;
    
    return `
        <div class="report-card">
            <div class="report-header">
                <h3 class="report-title">${escapeHtml(report.title)}</h3>
                <span class="report-status ${statusClass}">${report.status}</span>
            </div>
            <div class="report-meta">
                <span>📂 ${escapeHtml(report.categoryName)}</span>
                <span>📍 ${escapeHtml(report.location)}</span>
                <span>📅 ${formatDate(report.submittedDate)}</span>
            </div>
            <p class="report-description">${escapeHtml(report.description.substring(0, 150))}</p>
            <div class="report-actions">
                <button class="btn btn-primary btn-small" id="view-${report.id}">View Details</button>
                ${report.status === 'Reported' ? `<button class="btn btn-secondary btn-small" id="edit-${report.id}">Edit</button>` : ''}
                ${report.status === 'Reported' ? `<button class="btn btn-danger btn-small" id="delete-${report.id}">Delete</button>` : ''}
            </div>
        </div>
    `;
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

// ============================================
// VIEW REPORT
// ============================================

function viewReport(report) {
    const modal = document.getElementById('viewModal');
    const detail = document.getElementById('reportDetail');
    const statusClass = `status-${report.status.toLowerCase().replace(' ', '-')}`;

    let html = `
        <h2>${escapeHtml(report.title)}</h2>
        <div class="report-detail">
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="report-status ${statusClass}">${report.status}</span>
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
                <span class="detail-label">Submitted:</span>
                <span class="detail-value">${formatDate(report.submittedDate)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Description:</span>
                <span class="detail-value">${escapeHtml(report.description)}</span>
            </div>
    `;

    if (report.assignedStaff) {
        html += `
            <div class="detail-row">
                <span class="detail-label">Assigned To:</span>
                <span class="detail-value">${escapeHtml(report.assignedStaff)}</span>
            </div>
        `;
    }

    if (report.adminNotes) {
        html += `
            <div class="detail-row">
                <span class="detail-label">Admin Notes:</span>
                <span class="detail-value">${escapeHtml(report.adminNotes)}</span>
            </div>
        `;
    }

    if (report.image) {
        html += `
            <div class="detail-image">
                <p class="detail-label">Attached Image:</p>
                <img src="${report.image}" alt="Report Image">
            </div>
        `;
    }

    html += '</div>';
    detail.innerHTML = html;
    modal.classList.add('active');
}

// ============================================
// EDIT REPORT
// ============================================

function openEditModal(report) {
    currentEditingReport = report;
    const modal = document.getElementById('editModal');

    // Populate form
    document.getElementById('editReportId').value = report.id;
    document.getElementById('editTitle').value = report.title;
    document.getElementById('editDescription').value = report.description;
    document.getElementById('editCategory').value = report.categoryId;
    document.getElementById('editLocation').value = report.location;

    // Show image preview if exists
    const editPreview = document.getElementById('editImagePreview');
    if (report.image) {
        editPreview.innerHTML = `<img src="${report.image}" alt="Current Image">`;
    } else {
        editPreview.innerHTML = '';
    }

    modal.classList.add('active');
}

async function handleEditSubmit(e) {
    e.preventDefault();

    const reportId = document.getElementById('editReportId').value;
    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const categoryId = document.getElementById('editCategory').value;
    const location = document.getElementById('editLocation').value;
    const imageFile = document.getElementById('editImage').files[0];

    // Get reports
    const reports = AppStorage.get('reports') || [];
    const reportIndex = reports.findIndex(r => r.id === reportId);

    if (reportIndex === -1) {
        showNotification('Report not found', 'error');
        return;
    }

    // Get category name
    const categories = AppStorage.get('categories') || [];
    const categoryName = categories.find(c => c.id == categoryId)?.name || 'Other';

    // Update report
    reports[reportIndex].title = title;
    reports[reportIndex].description = description;
    reports[reportIndex].categoryId = categoryId;
    reports[reportIndex].categoryName = categoryName;
    reports[reportIndex].location = location;
    reports[reportIndex].updatedDate = new Date().toISOString();

    // Update image if new one provided
    if (imageFile) {
        const validation = validateImageFile(imageFile);
        if (!validation.valid) {
            showNotification(validation.message, 'error');
            return;
        }
        reports[reportIndex].image = await fileToBase64(imageFile);
    }

    AppStorage.set('reports', reports);

    // Close modal and reload
    document.getElementById('editModal').classList.remove('active');
    document.getElementById('editForm').reset();
    loadUserReports();

    showNotification('Report updated successfully!', 'success');
}

// ============================================
// DELETE REPORT
// ============================================

function deleteReport(reportId) {
    if (!confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        return;
    }

    const reports = AppStorage.get('reports') || [];
    const filteredReports = reports.filter(r => r.id !== reportId);

    AppStorage.set('reports', filteredReports);
    loadUserReports();

    showNotification('Report deleted successfully', 'success');
}
