class AdminDashboard {
    constructor() {
        this.apiBase = '/api';
        this.token = localStorage.getItem('adminToken');
        this.currentUser = null;
        this.currentPage = 1;
        this.currentSection = 'dashboard';
        
        this.init();
    }

    async init() {
        // Check authentication
        if (!this.token) {
            this.showLogin();
            return;
        }

        try {
            // Verify token and get user info
            const response = await this.apiCall('/auth/profile');
            this.currentUser = response.user;
            this.updateUI();
            this.loadDashboard();
        } catch (error) {
            console.error('Authentication failed:', error);
            this.showLogin();
        }

        this.setupEventListeners();
    }

    showLogin() {
        const email = prompt('Admin Email:');
        const password = prompt('Admin Password:');
        
        if (email && password) {
            this.login(email, password);
        } else {
            alert('Login required to access admin panel');
            window.location.href = '/';
        }
    }

    async login(email, password) {
        try {
            const response = await fetch(`${this.apiBase}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                this.currentUser = data.user;
                localStorage.setItem('adminToken', this.token);
                this.updateUI();
                this.loadDashboard();
            } else {
                alert('Login failed: ' + data.error);
                this.showLogin();
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Login failed. Please try again.');
            this.showLogin();
        }
    }

    async apiCall(endpoint, options = {}) {
        const response = await fetch(`${this.apiBase}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`,
                ...options.headers
            }
        });

        if (response.status === 401) {
            localStorage.removeItem('adminToken');
            this.showLogin();
            throw new Error('Unauthorized');
        }

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'API call failed');
        }

        return data;
    }

    setupEventListeners() {
        // Sidebar navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', () => {
            localStorage.removeItem('adminToken');
            window.location.href = '/';
        });

        // User search
        document.getElementById('searchUsers').addEventListener('click', () => {
            this.loadUsers();
        });

        // User actions
        document.getElementById('toggleUserStatus').addEventListener('click', () => {
            this.toggleUserStatus();
        });

        document.getElementById('deleteUser').addEventListener('click', () => {
            this.deleteUser();
        });

        // Refresh data
        document.getElementById('refreshData').addEventListener('click', () => {
            this.loadCurrentSection();
        });
    }

    updateUI() {
        if (this.currentUser) {
            document.getElementById('adminName').textContent = 
                `${this.currentUser.first_name} ${this.currentUser.last_name}`;
        }
    }

    showSection(section) {
        // Hide all sections
        document.querySelectorAll('[id$="-section"]').forEach(el => {
            el.style.display = 'none';
        });

        // Remove active class from nav links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });

        // Show selected section
        document.getElementById(`${section}-section`).style.display = 'block';
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Update page title
        const titles = {
            dashboard: 'Dashboard',
            users: 'User Management',
            donations: 'Food Donations',
            logs: 'Activity Logs'
        };
        document.getElementById('pageTitle').textContent = titles[section];

        this.currentSection = section;
        this.loadCurrentSection();
    }

    async loadCurrentSection() {
        switch (this.currentSection) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'donations':
                await this.loadDonations();
                break;
            case 'logs':
                await this.loadLogs();
                break;
        }
    }

    async loadDashboard() {
        try {
            const data = await this.apiCall('/admin/dashboard');
            this.updateDashboardStats(data);
            this.updateUserDistribution(data.userStats);
            this.updateRecentActivity(data.recentActivity);
        } catch (error) {
            console.error('Dashboard load error:', error);
            this.showError('Failed to load dashboard data');
        }
    }

    updateDashboardStats(data) {
        document.getElementById('totalUsers').textContent = data.totalStats.total_users || 0;
        document.getElementById('totalDonations').textContent = data.donationStats.total_donations || 0;
        document.getElementById('totalMeals').textContent = data.donationStats.total_meals || 0;
        document.getElementById('newUsers30d').textContent = data.totalStats.new_users_30d || 0;
    }

    updateUserDistribution(userStats) {
        const container = document.getElementById('userDistribution');
        container.innerHTML = '';

        userStats.forEach(stat => {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center mb-2';
            div.innerHTML = `
                <span class="text-capitalize">${stat.user_type}s</span>
                <div>
                    <span class="badge bg-primary me-2">${stat.count}</span>
                    <span class="text-muted">(${stat.active_count} active)</span>
                </div>
            `;
            container.appendChild(div);
        });
    }

    updateRecentActivity(activities) {
        const container = document.getElementById('recentActivity');
        container.innerHTML = '';

        activities.slice(0, 10).forEach(activity => {
            const div = document.createElement('div');
            div.className = 'd-flex justify-content-between align-items-center mb-2 p-2 bg-light rounded';
            div.innerHTML = `
                <div>
                    <strong>${activity.email}</strong>
                    <small class="text-muted d-block">${activity.user_type} - ${activity.type}</small>
                </div>
                <small class="text-muted">${new Date(activity.created_at).toLocaleDateString()}</small>
            `;
            container.appendChild(div);
        });
    }

    async loadUsers() {
        try {
            const search = document.getElementById('userSearch').value;
            const userType = document.getElementById('userTypeFilter').value;
            
            const params = new URLSearchParams({
                page: this.currentPage,
                limit: 10
            });
            
            if (search) params.append('search', search);
            if (userType) params.append('user_type', userType);

            const data = await this.apiCall(`/admin/users?${params}`);
            this.renderUsersTable(data.users);
            this.renderPagination(data.pagination, 'users');
        } catch (error) {
            console.error('Users load error:', error);
            this.showError('Failed to load users');
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = '';

        if (users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center">No users found</td></tr>';
            return;
        }

        users.forEach(user => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td><span class="user-type-badge user-type-${user.user_type}">${user.user_type}</span></td>
                <td><span class="status-badge ${user.is_active ? 'status-active' : 'status-inactive'}">${user.is_active ? 'Active' : 'Inactive'}</span></td>
                <td><span class="status-badge ${user.is_verified ? 'status-verified' : 'status-unverified'}">${user.is_verified ? 'Verified' : 'Unverified'}</span></td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-action" onclick="adminDashboard.viewUser(${user.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-warning btn-action" onclick="adminDashboard.toggleUserStatus(${user.id}, ${user.is_active})">
                        <i class="fas fa-${user.is_active ? 'ban' : 'check'}"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger btn-action" onclick="adminDashboard.confirmDeleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async viewUser(userId) {
        try {
            const data = await this.apiCall(`/admin/users/${userId}`);
            this.showUserDetails(data);
        } catch (error) {
            console.error('User details error:', error);
            this.showError('Failed to load user details');
        }
    }

    showUserDetails(data) {
        const modal = new bootstrap.Modal(document.getElementById('userDetailsModal'));
        const content = document.getElementById('userDetailsContent');
        
        content.innerHTML = `
            <div class="row">
                <div class="col-md-6">
                    <h6>Basic Information</h6>
                    <table class="table table-sm">
                        <tr><td><strong>Name:</strong></td><td>${data.user.first_name} ${data.user.last_name}</td></tr>
                        <tr><td><strong>Email:</strong></td><td>${data.user.email}</td></tr>
                        <tr><td><strong>Type:</strong></td><td><span class="user-type-badge user-type-${data.user.user_type}">${data.user.user_type}</span></td></tr>
                        <tr><td><strong>Phone:</strong></td><td>${data.user.phone || 'N/A'}</td></tr>
                        <tr><td><strong>Address:</strong></td><td>${data.user.address || 'N/A'}</td></tr>
                        <tr><td><strong>City:</strong></td><td>${data.user.city || 'N/A'}</td></tr>
                        <tr><td><strong>Status:</strong></td><td><span class="status-badge ${data.user.is_active ? 'status-active' : 'status-inactive'}">${data.user.is_active ? 'Active' : 'Inactive'}</span></td></tr>
                        <tr><td><strong>Verified:</strong></td><td><span class="status-badge ${data.user.is_verified ? 'status-verified' : 'status-unverified'}">${data.user.is_verified ? 'Verified' : 'Unverified'}</span></td></tr>
                        <tr><td><strong>Joined:</strong></td><td>${new Date(data.user.created_at).toLocaleDateString()}</td></tr>
                    </table>
                </div>
                <div class="col-md-6">
                    <h6>Profile Details</h6>
                    ${data.profile ? this.renderProfileDetails(data.profile, data.user.user_type) : '<p>No profile details available</p>'}
                </div>
            </div>
            ${data.recentActivity.length > 0 ? `
                <div class="mt-3">
                    <h6>Recent Activity</h6>
                    <div class="table-responsive">
                        <table class="table table-sm">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Status</th>
                                    <th>Description</th>
                                    <th>Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${data.recentActivity.map(activity => `
                                    <tr>
                                        <td>${activity.type}</td>
                                        <td><span class="status-badge status-${activity.status}">${activity.status}</span></td>
                                        <td>${activity.description || 'N/A'}</td>
                                        <td>${new Date(activity.created_at).toLocaleDateString()}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            ` : ''}
        `;
        
        modal.show();
    }

    renderProfileDetails(profile, userType) {
        switch (userType) {
            case 'restaurant':
                return `
                    <table class="table table-sm">
                        <tr><td><strong>Restaurant Name:</strong></td><td>${profile.restaurant_name}</td></tr>
                        <tr><td><strong>Cuisine Type:</strong></td><td>${profile.cuisine_type || 'N/A'}</td></tr>
                        <tr><td><strong>License Number:</strong></td><td>${profile.license_number || 'N/A'}</td></tr>
                        <tr><td><strong>Capacity:</strong></td><td>${profile.capacity || 'N/A'}</td></tr>
                        <tr><td><strong>Operating Hours:</strong></td><td>${profile.operating_hours || 'N/A'}</td></tr>
                        <tr><td><strong>Total Donations:</strong></td><td>${profile.total_donations}</td></tr>
                        <tr><td><strong>Points:</strong></td><td>${profile.points}</td></tr>
                        <tr><td><strong>Rating:</strong></td><td>${profile.rating || 'N/A'}</td></tr>
                    </table>
                `;
            case 'volunteer':
                return `
                    <table class="table table-sm">
                        <tr><td><strong>Availability:</strong></td><td>${profile.availability || 'N/A'}</td></tr>
                        <tr><td><strong>Vehicle Type:</strong></td><td>${profile.vehicle_type || 'N/A'}</td></tr>
                        <tr><td><strong>Max Distance:</strong></td><td>${profile.max_distance || 'N/A'} km</td></tr>
                        <tr><td><strong>Skills:</strong></td><td>${profile.skills || 'N/A'}</td></tr>
                        <tr><td><strong>Total Pickups:</strong></td><td>${profile.total_pickups}</td></tr>
                        <tr><td><strong>Points:</strong></td><td>${profile.points}</td></tr>
                        <tr><td><strong>Rating:</strong></td><td>${profile.rating || 'N/A'}</td></tr>
                    </table>
                `;
            case 'ngo':
                return `
                    <table class="table table-sm">
                        <tr><td><strong>Organization Name:</strong></td><td>${profile.organization_name}</td></tr>
                        <tr><td><strong>Registration Number:</strong></td><td>${profile.registration_number || 'N/A'}</td></tr>
                        <tr><td><strong>Cause:</strong></td><td>${profile.cause || 'N/A'}</td></tr>
                        <tr><td><strong>Target Audience:</strong></td><td>${profile.target_audience || 'N/A'}</td></tr>
                        <tr><td><strong>Capacity:</strong></td><td>${profile.capacity || 'N/A'}</td></tr>
                        <tr><td><strong>Total Distributions:</strong></td><td>${profile.total_distributions}</td></tr>
                        <tr><td><strong>Points:</strong></td><td>${profile.points}</td></tr>
                    </table>
                `;
            default:
                return '<p>No profile details available</p>';
        }
    }

    async toggleUserStatus(userId, currentStatus) {
        try {
            await this.apiCall(`/admin/users/${userId}/status`, {
                method: 'PUT',
                body: JSON.stringify({
                    is_active: !currentStatus
                })
            });
            
            this.showSuccess(`User ${!currentStatus ? 'activated' : 'deactivated'} successfully`);
            this.loadUsers();
        } catch (error) {
            console.error('Toggle user status error:', error);
            this.showError('Failed to update user status');
        }
    }

    confirmDeleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            this.deleteUser(userId);
        }
    }

    async deleteUser(userId) {
        try {
            await this.apiCall(`/admin/users/${userId}`, {
                method: 'DELETE'
            });
            
            this.showSuccess('User deleted successfully');
            this.loadUsers();
        } catch (error) {
            console.error('Delete user error:', error);
            this.showError('Failed to delete user');
        }
    }

    async loadDonations() {
        try {
            // This would need to be implemented in the backend
            const data = await this.apiCall('/admin/donations');
            this.renderDonationsTable(data.donations || []);
        } catch (error) {
            console.error('Donations load error:', error);
            this.showError('Failed to load donations');
        }
    }

    renderDonationsTable(donations) {
        const tbody = document.getElementById('donationsTableBody');
        tbody.innerHTML = '';

        if (donations.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center">No donations found</td></tr>';
            return;
        }

        donations.forEach(donation => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${donation.id}</td>
                <td>${donation.restaurant_name || 'N/A'}</td>
                <td>${donation.food_type}</td>
                <td>${donation.quantity}</td>
                <td><span class="status-badge status-${donation.status}">${donation.status}</span></td>
                <td>${new Date(donation.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary btn-action">
                        <i class="fas fa-eye"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadLogs() {
        try {
            const data = await this.apiCall('/admin/logs');
            this.renderLogsTable(data.logs);
        } catch (error) {
            console.error('Logs load error:', error);
            this.showError('Failed to load activity logs');
        }
    }

    renderLogsTable(logs) {
        const tbody = document.getElementById('logsTableBody');
        tbody.innerHTML = '';

        if (logs.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center">No logs found</td></tr>';
            return;
        }

        logs.forEach(log => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${log.id}</td>
                <td>${log.admin_first_name} ${log.admin_last_name}</td>
                <td>${log.action}</td>
                <td>${log.target_type || 'N/A'}</td>
                <td>${log.details || 'N/A'}</td>
                <td>${new Date(log.created_at).toLocaleString()}</td>
            `;
            tbody.appendChild(row);
        });
    }

    renderPagination(pagination, type) {
        const container = document.getElementById(`${type}Pagination`);
        container.innerHTML = '';

        if (pagination.pages <= 1) return;

        const currentPage = pagination.page;
        const totalPages = pagination.pages;

        // Previous button
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" onclick="adminDashboard.goToPage(${currentPage - 1}, '${type}')">Previous</a>`;
        container.appendChild(prevLi);

        // Page numbers
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
                const li = document.createElement('li');
                li.className = `page-item ${i === currentPage ? 'active' : ''}`;
                li.innerHTML = `<a class="page-link" href="#" onclick="adminDashboard.goToPage(${i}, '${type}')">${i}</a>`;
                container.appendChild(li);
            } else if (i === currentPage - 3 || i === currentPage + 3) {
                const li = document.createElement('li');
                li.className = 'page-item disabled';
                li.innerHTML = '<span class="page-link">...</span>';
                container.appendChild(li);
            }
        }

        // Next button
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" onclick="adminDashboard.goToPage(${currentPage + 1}, '${type}')">Next</a>`;
        container.appendChild(nextLi);
    }

    goToPage(page, type) {
        this.currentPage = page;
        this.loadCurrentSection();
    }

    showSuccess(message) {
        // Simple success notification
        const alert = document.createElement('div');
        alert.className = 'alert alert-success alert-dismissible fade show position-fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 3000);
    }

    showError(message) {
        // Simple error notification
        const alert = document.createElement('div');
        alert.className = 'alert alert-danger alert-dismissible fade show position-fixed';
        alert.style.top = '20px';
        alert.style.right = '20px';
        alert.style.zIndex = '9999';
        alert.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Initialize dashboard when page loads
let adminDashboard;
document.addEventListener('DOMContentLoaded', () => {
    adminDashboard = new AdminDashboard();
});
