const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireUserType } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get user's own profile
router.get('/profile', async (req, res) => {
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
router.put('/profile', [
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

// Get user's activity/stats
router.get('/stats', async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    const userType = req.user.user_type;

    let stats = {};

    switch (userType) {
      case 'restaurant':
        const restaurantStats = await new Promise((resolve, reject) => {
          db.get(`
            SELECT 
              r.total_donations,
              r.points,
              r.rating,
              COUNT(fd.id) as total_listings,
              SUM(CASE WHEN fd.status = 'distributed' THEN fd.quantity ELSE 0 END) as meals_donated,
              SUM(CASE WHEN fd.created_at >= date('now', '-30 days') THEN 1 ELSE 0 END) as donations_30d
            FROM restaurants r
            LEFT JOIN food_donations fd ON r.id = fd.restaurant_id
            WHERE r.user_id = ?
            GROUP BY r.id
          `, [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        stats = restaurantStats;
        break;

      case 'volunteer':
        const volunteerStats = await new Promise((resolve, reject) => {
          db.get(`
            SELECT 
              v.total_pickups,
              v.points,
              v.rating,
              COUNT(pr.id) as total_requests,
              SUM(CASE WHEN pr.status = 'delivered' THEN 1 ELSE 0 END) as completed_pickups,
              SUM(CASE WHEN pr.created_at >= date('now', '-30 days') THEN 1 ELSE 0 END) as pickups_30d
            FROM volunteers v
            LEFT JOIN pickup_requests pr ON v.id = pr.volunteer_id
            WHERE v.user_id = ?
            GROUP BY v.id
          `, [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        stats = volunteerStats;
        break;

      case 'ngo':
        const ngoStats = await new Promise((resolve, reject) => {
          db.get(`
            SELECT 
              n.total_distributions,
              n.points,
              COUNT(pr.id) as total_received,
              SUM(CASE WHEN pr.status = 'delivered' THEN 1 ELSE 0 END) as completed_distributions,
              SUM(CASE WHEN pr.created_at >= date('now', '-30 days') THEN 1 ELSE 0 END) as distributions_30d
            FROM ngos n
            LEFT JOIN pickup_requests pr ON n.id = pr.ngo_id
            WHERE n.user_id = ?
            GROUP BY n.id
          `, [userId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
          });
        });
        stats = ngoStats;
        break;
    }

    res.json({ stats });

  } catch (error) {
    console.error('Stats fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Get available food donations (for volunteers and NGOs)
router.get('/available-donations', requireUserType(['volunteer', 'ngo']), async (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, limit = 10, food_type, city } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = ['fd.status = ?'];
    let params = ['available'];

    if (food_type) {
      whereConditions.push('fd.food_type LIKE ?');
      params.push(`%${food_type}%`);
    }

    if (city) {
      whereConditions.push('u.city LIKE ?');
      params.push(`%${city}%`);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get donations
    const donations = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          fd.*,
          u.first_name,
          u.last_name,
          u.phone,
          u.address,
          u.city,
          r.restaurant_name,
          r.cuisine_type
        FROM food_donations fd
        JOIN restaurants r ON fd.restaurant_id = r.id
        JOIN users u ON r.user_id = u.id
        ${whereClause}
        ORDER BY fd.created_at DESC
        LIMIT ? OFFSET ?
      `, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total count
    const totalResult = await new Promise((resolve, reject) => {
      db.get(`
        SELECT COUNT(*) as total 
        FROM food_donations fd
        JOIN restaurants r ON fd.restaurant_id = r.id
        JOIN users u ON r.user_id = u.id
        ${whereClause}
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Available donations error:', error);
    res.status(500).json({ error: 'Failed to fetch available donations' });
  }
});

// Request pickup for a donation
router.post('/request-pickup', requireUserType(['volunteer', 'ngo']), [
  body('donation_id').isInt(),
  body('notes').optional().trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = getDatabase();
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { donation_id, notes } = req.body;

    // Check if donation exists and is available
    const donation = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM food_donations WHERE id = ? AND status = ?', [donation_id, 'available'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found or not available' });
    }

    // Get user's profile ID
    let profileId;
    if (userType === 'volunteer') {
      const volunteer = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM volunteers WHERE user_id = ?', [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      profileId = volunteer.id;
    } else if (userType === 'ngo') {
      const ngo = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM ngos WHERE user_id = ?', [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      profileId = ngo.id;
    }

    // Create pickup request
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO pickup_requests (donation_id, ${userType}_id, notes) VALUES (?, ?, ?)`,
        [donation_id, profileId, notes],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    // Update donation status
    await new Promise((resolve, reject) => {
      db.run('UPDATE food_donations SET status = ? WHERE id = ?', ['claimed', donation_id], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    res.status(201).json({
      message: 'Pickup request created successfully',
      request_id: result.id
    });

  } catch (error) {
    console.error('Pickup request error:', error);
    res.status(500).json({ error: 'Failed to create pickup request' });
  }
});

module.exports = router;
