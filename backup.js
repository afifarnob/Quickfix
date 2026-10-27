/* ============================================
   BACKUP & EXPORT UTILITY
   Export all application data
   ============================================ */

// Add this function to your app to enable data export

const BackupExport = {
    // Export all data as JSON
    exportAllDataAsJSON() {
        const data = {
            exportDate: new Date().toISOString(),
            version: '1.0',
            data: {
                users: AppStorage.get('users') || [],
                reports: AppStorage.get('reports') || [],
                categories: AppStorage.get('categories') || [],
                staff: AppStorage.get('staff') || []
            }
        };

        return JSON.stringify(data, null, 2);
    },

    // Export as downloadable JSON file
    downloadJSON() {
        const jsonData = this.exportAllDataAsJSON();
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quickfix-backup-${new Date().getTime()}.json`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Data exported as JSON file', 'success');
    },

    // Export as CSV (reports only)
    downloadReportsAsCSV() {
        const reports = AppStorage.get('reports') || [];
        const users = AppStorage.get('users') || [];

        // Create CSV header
        let csv = 'Report ID,Title,Description,Category,Location,Status,Submitted By,Submitted Date,Assigned Staff,Admin Notes\n';

        // Add report rows
        reports.forEach(report => {
            const user = users.find(u => u.id === report.userId);
            const userName = user ? user.name : 'Unknown';

            // Escape CSV fields
            const escapeCSV = (text) => `"${String(text).replace(/"/g, '""')}"`;

            csv += [
                escapeCSV(report.id),
                escapeCSV(report.title),
                escapeCSV(report.description),
                escapeCSV(report.categoryName),
                escapeCSV(report.location),
                escapeCSV(report.status),
                escapeCSV(userName),
                escapeCSV(report.submittedDate),
                escapeCSV(report.assignedStaff || '-'),
                escapeCSV(report.adminNotes || '-')
            ].join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quickfix-reports-${new Date().getTime()}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Reports exported as CSV file', 'success');
    },

    // Export as HTML report
    downloadHTMLReport() {
        const reports = AppStorage.get('reports') || [];
        const users = AppStorage.get('users') || [];
        const categories = AppStorage.get('categories') || [];
        const staff = AppStorage.get('staff') || [];

        let html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>QuickFix Backup Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        h1 { color: #2c3e50; border-bottom: 3px solid #3498db; padding-bottom: 10px; }
        h2 { color: #34495e; margin-top: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #3498db; color: white; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        .stats { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0; }
        .stat-box { background: #ecf0f1; padding: 15px; border-radius: 5px; }
        .stat-number { font-size: 24px; font-weight: bold; color: #3498db; }
        .export-info { background: #e8f8f5; padding: 15px; border-left: 4px solid #27ae60; margin: 20px 0; }
    </style>
</head>
<body>
    <h1>🔧 QuickFix - Data Backup Report</h1>
    
    <div class="export-info">
        <strong>Export Date:</strong> ${new Date().toLocaleString()}<br>
        <strong>Total Reports:</strong> ${reports.length}<br>
        <strong>Total Users:</strong> ${users.length}<br>
        <strong>Staff Members:</strong> ${staff.length}<br>
        <strong>Categories:</strong> ${categories.length}
    </div>

    <h2>📊 Summary Statistics</h2>
    <div class="stats">
        <div class="stat-box">
            <div class="stat-number">${reports.length}</div>
            <div>Total Reports</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${reports.filter(r => r.status === 'Reported').length}</div>
            <div>Pending</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${reports.filter(r => r.status === 'In Progress').length}</div>
            <div>In Progress</div>
        </div>
        <div class="stat-box">
            <div class="stat-number">${reports.filter(r => r.status === 'Resolved').length}</div>
            <div>Resolved</div>
        </div>
    </div>

    <h2>📋 All Reports</h2>
    <table>
        <thead>
            <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Location</th>
                <th>Status</th>
                <th>Submitted Date</th>
                <th>Assigned Staff</th>
            </tr>
        </thead>
        <tbody>
            ${reports.map(report => `
                <tr>
                    <td>${report.title}</td>
                    <td>${report.categoryName}</td>
                    <td>${report.location}</td>
                    <td><strong>${report.status}</strong></td>
                    <td>${new Date(report.submittedDate).toLocaleDateString()}</td>
                    <td>${report.assignedStaff || '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <h2>👥 Users</h2>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
            </tr>
        </thead>
        <tbody>
            ${users.map(user => `
                <tr>
                    <td>${user.name}</td>
                    <td>${user.email}</td>
                    <td><strong>${user.role}</strong></td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <h2>👷 Staff Members</h2>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Specialty</th>
                <th>Phone</th>
            </tr>
        </thead>
        <tbody>
            ${staff.map(s => `
                <tr>
                    <td>${s.name}</td>
                    <td>${s.email}</td>
                    <td>${s.specialty}</td>
                    <td>${s.phone || '-'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <h2>📂 Categories</h2>
    <table>
        <thead>
            <tr>
                <th>Name</th>
                <th>Description</th>
            </tr>
        </thead>
        <tbody>
            ${categories.map(c => `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.description}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <hr>
    <p style="color: #7f8c8d; font-size: 12px;">
        This is an automated backup of QuickFix system data.
        For security, keep this file in a safe location.
    </p>
</body>
</html>
        `;

        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `quickfix-report-${new Date().getTime()}.html`;
        link.click();
        URL.revokeObjectURL(url);
        showNotification('Report exported as HTML file', 'success');
    },

    // Import data from JSON backup
    importJSON(jsonString) {
        try {
            const data = JSON.parse(jsonString);
            
            if (data.data) {
                AppStorage.set('users', data.data.users || []);
                AppStorage.set('reports', data.data.reports || []);
                AppStorage.set('categories', data.data.categories || []);
                AppStorage.set('staff', data.data.staff || []);
                
                showNotification('Data imported successfully! Refresh the page.', 'success');
                return true;
            }
        } catch (error) {
            showNotification('Failed to import data. Invalid format.', 'error');
            console.error('Import error:', error);
            return false;
        }
    }
};
