// Global Data Storage
let appData = {
    restaurants: [],
    volunteers: [],
    ngos: [],
    foodDonations: [],
    pickups: [],
    distributions: [],
    leaderboard: []
};

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    loadData();
    initializeApp();
    setupEventListeners();
    updateStats();
    loadLeaderboard();
});

// Load data from localStorage
function loadData() {
    const savedData = localStorage.getItem('foodWasteAppData');
    if (savedData) {
        appData = { ...appData, ...JSON.parse(savedData) };
    } else {
        // Initialize with sample data
        initializeSampleData();
    }
}

// Save data to localStorage
function saveData() {
    localStorage.setItem('foodWasteAppData', JSON.stringify(appData));
}

// Initialize sample data
function initializeSampleData() {
    appData.restaurants = [
        { id: 1, name: "Green Garden Restaurant", points: 1250, mealsDonated: 45, rating: 4.8, location: "Downtown" },
        { id: 2, name: "Eco Eats Cafe", points: 980, mealsDonated: 32, rating: 4.6, location: "Midtown" },
        { id: 3, name: "Sustainable Bites", points: 2100, mealsDonated: 78, rating: 4.9, location: "Uptown" },
        { id: 4, name: "Fresh Food Hub", points: 750, mealsDonated: 28, rating: 4.4, location: "Eastside" },
        { id: 5, name: "Nature's Kitchen", points: 1650, mealsDonated: 56, rating: 4.7, location: "Westside" }
    ];

    appData.volunteers = [
        { id: 1, name: "Sarah Johnson", completedPickups: 23, rating: 4.9, location: "Downtown" },
        { id: 2, name: "Mike Chen", completedPickups: 18, rating: 4.8, location: "Midtown" },
        { id: 3, name: "Emily Davis", completedPickups: 31, rating: 4.9, location: "Uptown" }
    ];

    appData.ngos = [
        { id: 1, name: "Community Food Bank", mealsDistributed: 450, rating: 4.9, location: "Downtown" },
        { id: 2, name: "Hope Kitchen", mealsDistributed: 320, rating: 4.7, location: "Midtown" },
        { id: 3, name: "Feed the Future", mealsDistributed: 280, rating: 4.8, location: "Uptown" }
    ];

    appData.foodDonations = [
        { id: 1, restaurantId: 1, restaurantName: "Green Garden Restaurant", foodType: "Vegetarian Curry", quantity: "15 servings", pickupTime: "2024-01-15T18:00", status: "available", description: "Fresh vegetable curry, prepared today" },
        { id: 2, restaurantId: 2, restaurantName: "Eco Eats Cafe", foodType: "Sandwiches", quantity: "25 pieces", pickupTime: "2024-01-15T19:30", status: "pending", description: "Assorted sandwiches, still warm" },
        { id: 3, restaurantId: 3, restaurantName: "Sustainable Bites", foodType: "Pasta", quantity: "20 portions", pickupTime: "2024-01-15T20:00", status: "picked_up", description: "Creamy pasta with vegetables" }
    ];

    appData.pickups = [
        { id: 1, volunteerId: 1, volunteerName: "Sarah Johnson", donationId: 1, status: "completed", pickupTime: "2024-01-15T18:30", deliveryTime: "2024-01-15T19:00" },
        { id: 2, volunteerId: 2, volunteerName: "Mike Chen", donationId: 2, status: "in_progress", pickupTime: "2024-01-15T19:45", deliveryTime: null }
    ];

    appData.distributions = [
        { id: 1, ngoId: 1, ngoName: "Community Food Bank", pickupId: 1, mealsDistributed: 15, distributionTime: "2024-01-15T19:30", location: "Downtown Shelter" }
    ];

    saveData();
}

// Initialize app
function initializeApp() {
    // Mobile menu toggle
    const hamburger = document.querySelector('.hamburger');
    const navMenu = document.querySelector('.nav-menu');

    if (hamburger && navMenu) {
        hamburger.addEventListener('click', () => {
            hamburger.classList.toggle('active');
            navMenu.classList.toggle('active');
        });
    }

    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Close mobile menu when clicking on a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });
}

// Setup event listeners
function setupEventListeners() {
    // Modal close functionality
    const modal = document.getElementById('portalModal');
    const closeBtn = document.querySelector('.close');

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    if (modal) {
        window.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    }

    // Filter buttons for leaderboard
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            loadLeaderboard(e.target.dataset.filter);
        });
    });

    // Contact form submission
    const contactForm = document.querySelector('.contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            alert('Thank you for your message! We will get back to you soon.');
            contactForm.reset();
        });
    }
}

// Update statistics
function updateStats() {
    const totalDonations = appData.foodDonations.length;
    const totalVolunteers = appData.volunteers.length;
    const totalRestaurants = appData.restaurants.length;

    document.getElementById('totalDonations').textContent = totalDonations;
    document.getElementById('totalVolunteers').textContent = totalVolunteers;
    document.getElementById('totalRestaurants').textContent = totalRestaurants;
}

// Open portal modal
function openPortal(portalType) {
    const modal = document.getElementById('portalModal');
    const portalContent = document.getElementById('portalContent');
    
    let content = '';
    
    switch(portalType) {
        case 'restaurant':
            content = generateRestaurantPortal();
            break;
        case 'volunteer':
            content = generateVolunteerPortal();
            break;
        case 'ngo':
            content = generateNGOPortal();
            break;
    }
    
    portalContent.innerHTML = content;
    modal.style.display = 'block';
    
    // Setup portal-specific event listeners
    setupPortalEventListeners(portalType);
}

// Generate Restaurant Portal
function generateRestaurantPortal() {
    return `
        <div class="portal-header">
            <h2><i class="fas fa-utensils"></i> Restaurant Portal</h2>
            <p>Manage your food donations and track your impact</p>
        </div>
        <div class="portal-body">
            <div class="portal-tabs">
                <button class="tab-button active" data-tab="dashboard">Dashboard</button>
                <button class="tab-button" data-tab="donate">Donate Food</button>
                <button class="tab-button" data-tab="history">Donation History</button>
                <button class="tab-button" data-tab="analytics">Analytics</button>
            </div>

            <div id="dashboard" class="tab-content active">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>${getRestaurantStats().totalDonations}</h3>
                        <p>Total Donations</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getRestaurantStats().totalPoints}</h3>
                        <p>Points Earned</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getRestaurantStats().mealsDonated}</h3>
                        <p>Meals Donated</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getRestaurantStats().rank}</h3>
                        <p>Leaderboard Rank</p>
                    </div>
                </div>
                
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Recent Donations</h3>
                    </div>
                    <div id="recentDonations">
                        ${generateRecentDonations()}
                    </div>
                </div>
            </div>

            <div id="donate" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Donate Surplus Food</h3>
                    </div>
                    <form id="donationForm">
                        <div class="form-group">
                            <label for="foodType">Food Type</label>
                            <input type="text" id="foodType" name="foodType" placeholder="e.g., Vegetarian Curry, Sandwiches" required>
                        </div>
                        <div class="form-group">
                            <label for="quantity">Quantity</label>
                            <input type="text" id="quantity" name="quantity" placeholder="e.g., 15 servings, 25 pieces" required>
                        </div>
                        <div class="form-group">
                            <label for="pickupTime">Preferred Pickup Time</label>
                            <input type="datetime-local" id="pickupTime" name="pickupTime" required>
                        </div>
                        <div class="form-group">
                            <label for="description">Description</label>
                            <textarea id="description" name="description" placeholder="Describe the food item, ingredients, and any special notes" rows="3"></textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">List for Donation</button>
                    </form>
                </div>
            </div>

            <div id="history" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Donation History</h3>
                    </div>
                    <div id="donationHistory">
                        ${generateDonationHistory()}
                    </div>
                </div>
            </div>

            <div id="analytics" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Impact Analytics</h3>
                    </div>
                    <div class="analytics-content">
                        <p>Your restaurant has contributed significantly to reducing food waste:</p>
                        <ul>
                            <li>Total meals donated: ${getRestaurantStats().mealsDonated}</li>
                            <li>Estimated waste prevented: ${Math.round(getRestaurantStats().mealsDonated * 0.5)} kg</li>
                            <li>CO2 emissions saved: ${Math.round(getRestaurantStats().mealsDonated * 2.5)} kg</li>
                            <li>People helped: ${getRestaurantStats().mealsDonated}</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate Volunteer Portal
function generateVolunteerPortal() {
    return `
        <div class="portal-header">
            <h2><i class="fas fa-hands-helping"></i> Volunteer Portal</h2>
            <p>Help pick up and deliver food to those in need</p>
        </div>
        <div class="portal-body">
            <div class="portal-tabs">
                <button class="tab-button active" data-tab="available">Available Pickups</button>
                <button class="tab-button" data-tab="my-pickups">My Pickups</button>
                <button class="tab-button" data-tab="profile">Profile</button>
            </div>

            <div id="available" class="tab-content active">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Available Food Pickups</h3>
                    </div>
                    <div id="availablePickups">
                        ${generateAvailablePickups()}
                    </div>
                </div>
            </div>

            <div id="my-pickups" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">My Pickup Assignments</h3>
                    </div>
                    <div id="myPickups">
                        ${generateMyPickups()}
                    </div>
                </div>
            </div>

            <div id="profile" class="tab-content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>${getVolunteerStats().completedPickups}</h3>
                        <p>Completed Pickups</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getVolunteerStats().rating}</h3>
                        <p>Average Rating</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getVolunteerStats().mealsDelivered}</h3>
                        <p>Meals Delivered</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getVolunteerStats().hoursVolunteered}</h3>
                        <p>Hours Volunteered</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Generate NGO Portal
function generateNGOPortal() {
    return `
        <div class="portal-header">
            <h2><i class="fas fa-heart"></i> NGO Portal</h2>
            <p>Manage food distribution and coordinate with volunteers</p>
        </div>
        <div class="portal-body">
            <div class="portal-tabs">
                <button class="tab-button active" data-tab="incoming">Incoming Food</button>
                <button class="tab-button" data-tab="distribution">Distribution</button>
                <button class="tab-button" data-tab="volunteers">Volunteers</button>
                <button class="tab-button" data-tab="reports">Reports</button>
            </div>

            <div id="incoming" class="tab-content active">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Incoming Food Deliveries</h3>
                    </div>
                    <div id="incomingFood">
                        ${generateIncomingFood()}
                    </div>
                </div>
            </div>

            <div id="distribution" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Distribution Management</h3>
                    </div>
                    <div id="distributionList">
                        ${generateDistributionList()}
                    </div>
                </div>
            </div>

            <div id="volunteers" class="tab-content">
                <div class="card">
                    <div class="card-header">
                        <h3 class="card-title">Volunteer Management</h3>
                    </div>
                    <div id="volunteerList">
                        ${generateVolunteerList()}
                    </div>
                </div>
            </div>

            <div id="reports" class="tab-content">
                <div class="stats-grid">
                    <div class="stat-card">
                        <h3>${getNGOStats().totalMealsDistributed}</h3>
                        <p>Total Meals Distributed</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getNGOStats().activeVolunteers}</h3>
                        <p>Active Volunteers</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getNGOStats().familiesHelped}</h3>
                        <p>Families Helped</p>
                    </div>
                    <div class="stat-card">
                        <h3>${getNGOStats().distributionSites}</h3>
                        <p>Distribution Sites</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Setup portal event listeners
function setupPortalEventListeners(portalType) {
    // Tab switching
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabName = e.target.dataset.tab;
            
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            e.target.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });

    // Portal-specific event listeners
    if (portalType === 'restaurant') {
        setupRestaurantEventListeners();
    } else if (portalType === 'volunteer') {
        setupVolunteerEventListeners();
    } else if (portalType === 'ngo') {
        setupNGOEventListeners();
    }
}

// Restaurant event listeners
function setupRestaurantEventListeners() {
    const donationForm = document.getElementById('donationForm');
    if (donationForm) {
        donationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(donationForm);
            const donation = {
                id: Date.now(),
                restaurantId: 1, // In real app, this would be the logged-in restaurant's ID
                restaurantName: "Green Garden Restaurant",
                foodType: formData.get('foodType'),
                quantity: formData.get('quantity'),
                pickupTime: formData.get('pickupTime'),
                status: 'available',
                description: formData.get('description')
            };
            
            appData.foodDonations.push(donation);
            saveData();
            alert('Food donation listed successfully!');
            donationForm.reset();
        });
    }
}

// Volunteer event listeners
function setupVolunteerEventListeners() {
    // Accept pickup buttons
    document.querySelectorAll('.btn-accept').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const donationId = parseInt(e.target.dataset.donationId);
            const pickup = {
                id: Date.now(),
                volunteerId: 1, // In real app, this would be the logged-in volunteer's ID
                volunteerName: "Sarah Johnson",
                donationId: donationId,
                status: 'in_progress',
                pickupTime: new Date().toISOString(),
                deliveryTime: null
            };
            
            appData.pickups.push(pickup);
            
            // Update donation status
            const donation = appData.foodDonations.find(d => d.id === donationId);
            if (donation) {
                donation.status = 'picked_up';
            }
            
            saveData();
            alert('Pickup accepted! Please collect the food at the specified time.');
            openPortal('volunteer'); // Refresh the portal
        });
    });
}

// NGO event listeners
function setupNGOEventListeners() {
    // Complete distribution buttons
    document.querySelectorAll('.btn-complete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pickupId = parseInt(e.target.dataset.pickupId);
            const distribution = {
                id: Date.now(),
                ngoId: 1, // In real app, this would be the logged-in NGO's ID
                ngoName: "Community Food Bank",
                pickupId: pickupId,
                mealsDistributed: Math.floor(Math.random() * 20) + 10,
                distributionTime: new Date().toISOString(),
                location: "Downtown Shelter"
            };
            
            appData.distributions.push(distribution);
            saveData();
            alert('Distribution completed successfully!');
            openPortal('ngo'); // Refresh the portal
        });
    });
}

// Helper functions for generating content
function getRestaurantStats() {
    const restaurantId = 1; // In real app, this would be the logged-in restaurant's ID
    const donations = appData.foodDonations.filter(d => d.restaurantId === restaurantId);
    const totalDonations = donations.length;
    const totalPoints = totalDonations * 25; // 25 points per donation
    const mealsDonated = donations.reduce((sum, d) => {
        const quantity = parseInt(d.quantity.match(/\d+/)?.[0] || 0);
        return sum + quantity;
    }, 0);
    
    // Calculate rank
    const sortedRestaurants = appData.restaurants.sort((a, b) => b.points - a.points);
    const rank = sortedRestaurants.findIndex(r => r.id === restaurantId) + 1;
    
    return { totalDonations, totalPoints, mealsDonated, rank };
}

function getVolunteerStats() {
    const volunteerId = 1; // In real app, this would be the logged-in volunteer's ID
    const pickups = appData.pickups.filter(p => p.volunteerId === volunteerId);
    const completedPickups = pickups.filter(p => p.status === 'completed').length;
    const rating = 4.9; // In real app, this would be calculated from ratings
    const mealsDelivered = completedPickups * 15; // Average 15 meals per pickup
    const hoursVolunteered = completedPickups * 2; // Average 2 hours per pickup
    
    return { completedPickups, rating, mealsDelivered, hoursVolunteered };
}

function getNGOStats() {
    const ngoId = 1; // In real app, this would be the logged-in NGO's ID
    const distributions = appData.distributions.filter(d => d.ngoId === ngoId);
    const totalMealsDistributed = distributions.reduce((sum, d) => sum + d.mealsDistributed, 0);
    const activeVolunteers = appData.volunteers.length;
    const familiesHelped = Math.floor(totalMealsDistributed / 4); // Average 4 meals per family
    const distributionSites = 3; // In real app, this would be dynamic
    
    return { totalMealsDistributed, activeVolunteers, familiesHelped, distributionSites };
}

function generateRecentDonations() {
    const restaurantId = 1;
    const donations = appData.foodDonations
        .filter(d => d.restaurantId === restaurantId)
        .slice(-5)
        .reverse();
    
    if (donations.length === 0) {
        return '<p>No recent donations found.</p>';
    }
    
    return donations.map(donation => `
        <div class="card">
            <div class="card-header">
                <h4>${donation.foodType}</h4>
                <span class="status-badge status-${donation.status}">${donation.status.replace('_', ' ')}</span>
            </div>
            <p><strong>Quantity:</strong> ${donation.quantity}</p>
            <p><strong>Pickup Time:</strong> ${new Date(donation.pickupTime).toLocaleString()}</p>
            <p><strong>Description:</strong> ${donation.description}</p>
        </div>
    `).join('');
}

function generateDonationHistory() {
    const restaurantId = 1;
    const donations = appData.foodDonations.filter(d => d.restaurantId === restaurantId);
    
    if (donations.length === 0) {
        return '<p>No donation history found.</p>';
    }
    
    return donations.map(donation => `
        <div class="card">
            <div class="card-header">
                <h4>${donation.foodType}</h4>
                <span class="status-badge status-${donation.status}">${donation.status.replace('_', ' ')}</span>
            </div>
            <p><strong>Quantity:</strong> ${donation.quantity}</p>
            <p><strong>Date:</strong> ${new Date(donation.pickupTime).toLocaleDateString()}</p>
            <p><strong>Status:</strong> ${donation.status.replace('_', ' ')}</p>
        </div>
    `).join('');
}

function generateAvailablePickups() {
    const availableDonations = appData.foodDonations.filter(d => d.status === 'available');
    
    if (availableDonations.length === 0) {
        return '<p>No available pickups at the moment.</p>';
    }
    
    return availableDonations.map(donation => `
        <div class="card">
            <div class="card-header">
                <h4>${donation.foodType}</h4>
                <span class="status-badge status-${donation.status}">Available</span>
            </div>
            <p><strong>Restaurant:</strong> ${donation.restaurantName}</p>
            <p><strong>Quantity:</strong> ${donation.quantity}</p>
            <p><strong>Pickup Time:</strong> ${new Date(donation.pickupTime).toLocaleString()}</p>
            <p><strong>Description:</strong> ${donation.description}</p>
            <div class="action-buttons">
                <button class="btn-small btn-accept" data-donation-id="${donation.id}">Accept Pickup</button>
            </div>
        </div>
    `).join('');
}

function generateMyPickups() {
    const volunteerId = 1;
    const myPickups = appData.pickups.filter(p => p.volunteerId === volunteerId);
    
    if (myPickups.length === 0) {
        return '<p>No pickup assignments found.</p>';
    }
    
    return myPickups.map(pickup => {
        const donation = appData.foodDonations.find(d => d.id === pickup.donationId);
        return `
            <div class="card">
                <div class="card-header">
                    <h4>${donation ? donation.foodType : 'Unknown Food'}</h4>
                    <span class="status-badge status-${pickup.status}">${pickup.status.replace('_', ' ')}</span>
                </div>
                <p><strong>Restaurant:</strong> ${donation ? donation.restaurantName : 'Unknown'}</p>
                <p><strong>Quantity:</strong> ${donation ? donation.quantity : 'Unknown'}</p>
                <p><strong>Pickup Time:</strong> ${new Date(pickup.pickupTime).toLocaleString()}</p>
                ${pickup.deliveryTime ? `<p><strong>Delivery Time:</strong> ${new Date(pickup.deliveryTime).toLocaleString()}</p>` : ''}
            </div>
        `;
    }).join('');
}

function generateIncomingFood() {
    const incomingPickups = appData.pickups.filter(p => p.status === 'in_progress');
    
    if (incomingPickups.length === 0) {
        return '<p>No incoming food deliveries at the moment.</p>';
    }
    
    return incomingPickups.map(pickup => {
        const donation = appData.foodDonations.find(d => d.id === pickup.donationId);
        return `
            <div class="card">
                <div class="card-header">
                    <h4>${donation ? donation.foodType : 'Unknown Food'}</h4>
                    <span class="status-badge status-${pickup.status}">In Transit</span>
                </div>
                <p><strong>Volunteer:</strong> ${pickup.volunteerName}</p>
                <p><strong>Quantity:</strong> ${donation ? donation.quantity : 'Unknown'}</p>
                <p><strong>Expected Delivery:</strong> ${new Date(pickup.pickupTime).toLocaleString()}</p>
                <div class="action-buttons">
                    <button class="btn-small btn-complete" data-pickup-id="${pickup.id}">Mark as Received</button>
                </div>
            </div>
        `;
    }).join('');
}

function generateDistributionList() {
    const distributions = appData.distributions;
    
    if (distributions.length === 0) {
        return '<p>No distributions recorded yet.</p>';
    }
    
    return distributions.map(distribution => {
        const pickup = appData.pickups.find(p => p.id === distribution.pickupId);
        const donation = pickup ? appData.foodDonations.find(d => d.id === pickup.donationId) : null;
        return `
            <div class="card">
                <div class="card-header">
                    <h4>${donation ? donation.foodType : 'Unknown Food'}</h4>
                    <span class="status-badge status-completed">Completed</span>
                </div>
                <p><strong>Meals Distributed:</strong> ${distribution.mealsDistributed}</p>
                <p><strong>Location:</strong> ${distribution.location}</p>
                <p><strong>Distribution Time:</strong> ${new Date(distribution.distributionTime).toLocaleString()}</p>
            </div>
        `;
    }).join('');
}

function generateVolunteerList() {
    const volunteers = appData.volunteers;
    
    return volunteers.map(volunteer => `
        <div class="card">
            <div class="card-header">
                <h4>${volunteer.name}</h4>
                <span class="status-badge status-active">Active</span>
            </div>
            <p><strong>Completed Pickups:</strong> ${volunteer.completedPickups}</p>
            <p><strong>Rating:</strong> ${volunteer.rating}/5.0</p>
            <p><strong>Location:</strong> ${volunteer.location}</p>
        </div>
    `).join('');
}

// Load and display leaderboard
function loadLeaderboard(filter = 'all') {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    
    let restaurants = [...appData.restaurants];
    
    // Apply filter (in a real app, this would filter by time period)
    if (filter === 'monthly') {
        // Filter for this month (simplified)
        restaurants = restaurants.slice(0, 3);
    } else if (filter === 'weekly') {
        // Filter for this week (simplified)
        restaurants = restaurants.slice(0, 2);
    }
    
    // Sort by points
    restaurants.sort((a, b) => b.points - a.points);
    
    const leaderboardHTML = restaurants.map((restaurant, index) => {
        const rank = index + 1;
        const rankClass = rank <= 3 ? ['first', 'second', 'third'][rank - 1] : '';
        const rewardBadge = rank <= 3 ? '<span class="reward-badge">🏆</span>' : '';
        
        return `
            <div class="leaderboard-item">
                <div class="rank ${rankClass}">${rank}</div>
                <div class="restaurant-info">
                    <div class="restaurant-avatar">${restaurant.name.charAt(0)}</div>
                    <div class="restaurant-details">
                        <h4>${restaurant.name}</h4>
                        <p>${restaurant.location} • ${restaurant.mealsDonated} meals donated</p>
                    </div>
                </div>
                <div class="points">
                    <div class="points-value">${restaurant.points}</div>
                    <div class="points-label">points</div>
                </div>
                ${rewardBadge}
            </div>
        `;
    }).join('');
    
    leaderboardList.innerHTML = leaderboardHTML;
}

// Animate numbers
function animateNumber(element, target, duration = 2000) {
    const start = 0;
    const increment = target / (duration / 16);
    let current = start;
    
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = Math.floor(current);
    }, 16);
}

// Initialize number animations when page loads
window.addEventListener('load', () => {
    const totalDonations = document.getElementById('totalDonations');
    const totalVolunteers = document.getElementById('totalVolunteers');
    const totalRestaurants = document.getElementById('totalRestaurants');
    
    if (totalDonations) animateNumber(totalDonations, parseInt(totalDonations.textContent));
    if (totalVolunteers) animateNumber(totalVolunteers, parseInt(totalVolunteers.textContent));
    if (totalRestaurants) animateNumber(totalRestaurants, parseInt(totalRestaurants.textContent));
});
