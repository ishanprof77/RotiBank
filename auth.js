const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { generateToken, authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('user_type').isIn(['restaurant', 'volunteer', 'ngo']),
  body('first_name').notEmpty().trim(),
  body('last_name').notEmpty().trim(),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, user_type, first_name, last_name, phone, address, city, state, zip_code } = req.body;
    const db = getDatabase();

    // Check if user already exists
    const existingUser = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create user
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (email, password, user_type, first_name, last_name, phone, address, city, state, zip_code) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [email, hashedPassword, user_type, first_name, last_name, phone, address, city, state, zip_code],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    // Create user-specific profile
    const userId = result.id;
    let profileResult;

    switch (user_type) {
      case 'restaurant':
        const { restaurant_name, cuisine_type, license_number, capacity, operating_hours, description } = req.body;
        profileResult = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO restaurants (user_id, restaurant_name, cuisine_type, license_number, capacity, operating_hours, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, restaurant_name, cuisine_type, license_number, capacity, operating_hours, description],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID });
            }
          );
        });
        break;

      case 'volunteer':
        const { availability, vehicle_type, max_distance, skills } = req.body;
        profileResult = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO volunteers (user_id, availability, vehicle_type, max_distance, skills) 
             VALUES (?, ?, ?, ?, ?)`,
            [userId, availability, vehicle_type, max_distance, skills],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID });
            }
          );
        });
        break;

      case 'ngo':
        const { organization_name, registration_number, cause, target_audience, ngo_capacity, ngo_description } = req.body;
        profileResult = await new Promise((resolve, reject) => {
          db.run(
            `INSERT INTO ngos (user_id, organization_name, registration_number, cause, target_audience, capacity, description) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, organization_name, registration_number, cause, target_audience, ngo_capacity, ngo_description],
            function(err) {
              if (err) reject(err);
              else resolve({ id: this.lastID });
            }
          );
        });
        break;
    }

    // Generate token
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name,
        is_verified: user.is_verified
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;
    const db = getDatabase();

    // Find user
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Check password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name,
        is_verified: user.is_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.user.id;

    // Get user data
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user-specific profile data
    let profile = null;
    switch (user.user_type) {
      case 'restaurant':
        profile = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM restaurants WHERE user_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        break;
      case 'volunteer':
        profile = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM volunteers WHERE user_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        break;
      case 'ngo':
        profile = await new Promise((resolve, reject) => {
          db.get('SELECT * FROM ngos WHERE user_id = ?', [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        break;
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        user_type: user.user_type,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        address: user.address,
        city: user.city,
        state: user.state,
        zip_code: user.zip_code,
        is_verified: user.is_verified,
        is_active: user.is_active,
        created_at: user.created_at
      },
      profile
    });

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', authenticateToken, [
  body('first_name').optional().notEmpty().trim(),
  body('last_name').optional().notEmpty().trim(),
  body('phone').optional().isMobilePhone()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user.id;
    const { first_name, last_name, phone, address, city, state, zip_code } = req.body;
    const db = getDatabase();

    // Update user data
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET first_name = COALESCE(?, first_name), last_name = COALESCE(?, last_name), 
         phone = COALESCE(?, phone), address = COALESCE(?, address), city = COALESCE(?, city), 
         state = COALESCE(?, state), zip_code = COALESCE(?, zip_code), updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [first_name, last_name, phone, address, city, state, zip_code, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'Profile updated successfully' });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
