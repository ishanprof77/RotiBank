const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireUserType } = require('../middleware/auth');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Create food donation (restaurants only)
router.post('/donations', requireUserType(['restaurant']), [
  body('food_type').notEmpty().trim(),
  body('quantity').isInt({ min: 1 }),
  body('description').optional().trim(),
  body('pickup_time').optional().isISO8601(),
  body('expiry_date').optional().isISO8601()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = getDatabase();
    const userId = req.user.id;
    const { food_type, quantity, description, pickup_time, expiry_date } = req.body;

    // Get restaurant ID
    const restaurant = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM restaurants WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    // Create donation
    const result = await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO food_donations (restaurant_id, food_type, quantity, description, pickup_time, expiry_date) 
         VALUES (?, ?, ?, ?, ?, ?)`,
        [restaurant.id, food_type, quantity, description, pickup_time, expiry_date],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    // Update restaurant stats
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE restaurants SET total_donations = total_donations + ?, points = points + ? WHERE id = ?',
        [quantity, quantity * 10, restaurant.id], // 10 points per meal
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.status(201).json({
      message: 'Food donation created successfully',
      donation_id: result.id
    });

  } catch (error) {
    console.error('Food donation creation error:', error);
    res.status(500).json({ error: 'Failed to create food donation' });
  }
});

// Get restaurant's donations
router.get('/donations', requireUserType(['restaurant']), async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    // Get restaurant ID
    const restaurant = await new Promise((resolve, reject) => {
      db.get('SELECT id FROM restaurants WHERE user_id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!restaurant) {
      return res.status(404).json({ error: 'Restaurant profile not found' });
    }

    let whereConditions = ['fd.restaurant_id = ?'];
    let params = [restaurant.id];

    if (status) {
      whereConditions.push('fd.status = ?');
      params.push(status);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get donations
    const donations = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          fd.*,
          pr.id as request_id,
          pr.status as request_status,
          pr.pickup_time as scheduled_pickup,
          pr.notes,
          u.first_name,
          u.last_name,
          u.phone
        FROM food_donations fd
        LEFT JOIN pickup_requests pr ON fd.id = pr.donation_id
        LEFT JOIN users u ON (
          CASE 
            WHEN pr.volunteer_id IS NOT NULL THEN pr.volunteer_id = (SELECT user_id FROM volunteers WHERE id = pr.volunteer_id)
            WHEN pr.ngo_id IS NOT NULL THEN pr.ngo_id = (SELECT user_id FROM ngos WHERE id = pr.ngo_id)
            ELSE 0
          END
        )
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
    console.error('Restaurant donations error:', error);
    res.status(500).json({ error: 'Failed to fetch donations' });
  }
});

// Update donation status
router.put('/donations/:id/status', requireUserType(['restaurant']), [
  body('status').isIn(['available', 'claimed', 'picked_up', 'distributed', 'expired'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = getDatabase();
    const userId = req.user.id;
    const donationId = req.params.id;
    const { status } = req.body;

    // Verify ownership
    const donation = await new Promise((resolve, reject) => {
      db.get(`
        SELECT fd.* FROM food_donations fd
        JOIN restaurants r ON fd.restaurant_id = r.id
        WHERE fd.id = ? AND r.user_id = ?
      `, [donationId, userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!donation) {
      return res.status(404).json({ error: 'Donation not found or access denied' });
    }

    // Update status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE food_donations SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, donationId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Update related pickup request if exists
    if (status === 'picked_up' || status === 'distributed') {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE pickup_requests SET status = ? WHERE donation_id = ?',
          [status === 'picked_up' ? 'picked_up' : 'delivered', donationId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({ message: 'Donation status updated successfully' });

  } catch (error) {
    console.error('Donation status update error:', error);
    res.status(500).json({ error: 'Failed to update donation status' });
  }
});

// Get pickup requests for volunteers/NGOs
router.get('/pickup-requests', requireUserType(['volunteer', 'ngo']), async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.user.id;
    const userType = req.user.user_type;
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;

    // Get profile ID
    let profileId;
    if (userType === 'volunteer') {
      const volunteer = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM volunteers WHERE user_id = ?', [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      profileId = volunteer.id;
    } else {
      const ngo = await new Promise((resolve, reject) => {
        db.get('SELECT id FROM ngos WHERE user_id = ?', [userId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
      profileId = ngo.id;
    }

    let whereConditions = [`pr.${userType}_id = ?`];
    let params = [profileId];

    if (status) {
      whereConditions.push('pr.status = ?');
      params.push(status);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    // Get pickup requests
    const requests = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          pr.*,
          fd.food_type,
          fd.quantity,
          fd.description,
          fd.pickup_time as donation_pickup_time,
          fd.expiry_date,
          u.first_name,
          u.last_name,
          u.phone,
          u.address,
          u.city,
          r.restaurant_name,
          r.cuisine_type
        FROM pickup_requests pr
        JOIN food_donations fd ON pr.donation_id = fd.id
        JOIN restaurants r ON fd.restaurant_id = r.id
        JOIN users u ON r.user_id = u.id
        ${whereClause}
        ORDER BY pr.created_at DESC
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
        FROM pickup_requests pr
        ${whereClause}
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      requests,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Pickup requests error:', error);
    res.status(500).json({ error: 'Failed to fetch pickup requests' });
  }
});

// Update pickup request status
router.put('/pickup-requests/:id/status', requireUserType(['volunteer', 'ngo']), [
  body('status').isIn(['accepted', 'picked_up', 'delivered', 'cancelled'])
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = getDatabase();
    const userId = req.user.id;
    const userType = req.user.user_type;
    const requestId = req.params.id;
    const { status } = req.body;

    // Verify ownership
    const request = await new Promise((resolve, reject) => {
      db.get(`
        SELECT pr.* FROM pickup_requests pr
        JOIN ${userType}s p ON pr.${userType}_id = p.id
        WHERE pr.id = ? AND p.user_id = ?
      `, [requestId, userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!request) {
      return res.status(404).json({ error: 'Request not found or access denied' });
    }

    // Update status
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE pickup_requests SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, requestId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Update donation status if needed
    if (status === 'picked_up' || status === 'delivered') {
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE food_donations SET status = ? WHERE id = ?',
          [status === 'picked_up' ? 'picked_up' : 'distributed', request.donation_id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    // Update user stats
    if (status === 'delivered') {
      const points = 5; // Points for completing delivery
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE ${userType}s SET points = points + ?, total_${userType === 'volunteer' ? 'pickups' : 'distributions'} = total_${userType === 'volunteer' ? 'pickups' : 'distributions'} + 1 WHERE id = ?`,
          [points, request[`${userType}_id`]],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    }

    res.json({ message: 'Request status updated successfully' });

  } catch (error) {
    console.error('Request status update error:', error);
    res.status(500).json({ error: 'Failed to update request status' });
  }
});

module.exports = router;
