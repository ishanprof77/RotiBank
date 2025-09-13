const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, 'rotibank.db');

let db;

const initDatabase = async () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Error opening database:', err);
        reject(err);
        return;
      }
      console.log('📁 Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = async () => {
  const tables = [
    // Users table
    `CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      user_type TEXT NOT NULL CHECK (user_type IN ('restaurant', 'volunteer', 'ngo', 'admin')),
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      phone TEXT,
      address TEXT,
      city TEXT,
      state TEXT,
      zip_code TEXT,
      is_verified BOOLEAN DEFAULT 0,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`,

    // Restaurant specific data
    `CREATE TABLE IF NOT EXISTS restaurants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      restaurant_name TEXT NOT NULL,
      cuisine_type TEXT,
      license_number TEXT,
      capacity INTEGER,
      operating_hours TEXT,
      description TEXT,
      rating DECIMAL(2,1) DEFAULT 0.0,
      total_donations INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // Volunteer specific data
    `CREATE TABLE IF NOT EXISTS volunteers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      availability TEXT,
      vehicle_type TEXT,
      max_distance INTEGER DEFAULT 10,
      skills TEXT,
      total_pickups INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      rating DECIMAL(2,1) DEFAULT 0.0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // NGO specific data
    `CREATE TABLE IF NOT EXISTS ngos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      organization_name TEXT NOT NULL,
      registration_number TEXT,
      cause TEXT,
      target_audience TEXT,
      capacity INTEGER,
      description TEXT,
      total_distributions INTEGER DEFAULT 0,
      points INTEGER DEFAULT 0,
      FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
    )`,

    // Food donations
    `CREATE TABLE IF NOT EXISTS food_donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      restaurant_id INTEGER NOT NULL,
      food_type TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      description TEXT,
      pickup_time DATETIME,
      expiry_date DATE,
      status TEXT DEFAULT 'available' CHECK (status IN ('available', 'claimed', 'picked_up', 'distributed', 'expired')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (restaurant_id) REFERENCES restaurants (id) ON DELETE CASCADE
    )`,

    // Pickup requests
    `CREATE TABLE IF NOT EXISTS pickup_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      donation_id INTEGER NOT NULL,
      volunteer_id INTEGER,
      ngo_id INTEGER,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'picked_up', 'delivered', 'cancelled')),
      pickup_time DATETIME,
      delivery_time DATETIME,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (donation_id) REFERENCES food_donations (id) ON DELETE CASCADE,
      FOREIGN KEY (volunteer_id) REFERENCES volunteers (id) ON DELETE SET NULL,
      FOREIGN KEY (ngo_id) REFERENCES ngos (id) ON DELETE SET NULL
    )`,

    // Admin logs
    `CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target_type TEXT,
      target_id INTEGER,
      details TEXT,
      ip_address TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (admin_id) REFERENCES users (id) ON DELETE CASCADE
    )`
  ];

  for (const table of tables) {
    await new Promise((resolve, reject) => {
      db.run(table, (err) => {
        if (err) {
          console.error('Error creating table:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  // Create default admin user
  await createDefaultAdmin();
  console.log('✅ Database tables created successfully');
};

const createDefaultAdmin = async () => {
  const adminEmail = 'admin@rotibank.com';
  const adminPassword = 'admin123'; // In production, use a secure password
  
  // Check if admin already exists
  const existingAdmin = await new Promise((resolve, reject) => {
    db.get('SELECT id FROM users WHERE email = ? AND user_type = ?', [adminEmail, 'admin'], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO users (email, password, user_type, first_name, last_name, is_verified, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [adminEmail, hashedPassword, 'admin', 'System', 'Administrator', 1, 1],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    console.log('👤 Default admin user created: admin@rotibank.com / admin123');
  }
};

const getDatabase = () => db;

module.exports = {
  initDatabase,
  getDatabase
};
