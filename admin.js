const express = require('express');
const { body, validationResult } = require('express-validator');
const { getDatabase } = require('../database/init');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Apply admin authentication to all routes
router.use(authenticateToken, requireAdmin);

// Get all users with pagination and filters
router.get('/users', async (req, res) => {
  try {
    const db = getDatabase();
    const { 
      page = 1, 
      limit = 10, 
      user_type, 
      search, 
      sort_by = 'created_at', 
      sort_order = 'DESC',
      is_active,
      is_verified
    } = req.query;

    const offset = (page - 1) * limit;
    let whereConditions = [];
    let params = [];

    // Build WHERE clause
    if (user_type) {
      whereConditions.push('u.user_type = ?');
      params.push(user_type);
    }

    if (search) {
      whereConditions.push('(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    if (is_active !== undefined) {
      whereConditions.push('u.is_active = ?');
      params.push(is_active === 'true' ? 1 : 0);
    }

    if (is_verified !== undefined) {
      whereConditions.push('u.is_verified = ?');
      params.push(is_verified === 'true' ? 1 : 0);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM users u 
      ${whereClause}
    `;
    
    const totalResult = await new Promise((resolve, reject) => {
      db.get(countQuery, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Get users with profile data
    const usersQuery = `
      SELECT 
        u.*,
        r.restaurant_name,
        r.cuisine_type,
        r.rating as restaurant_rating,
        r.total_donations,
        r.points as restaurant_points,
        v.availability,
        v.vehicle_type,
        v.total_pickups,
        v.points as volunteer_points,
        n.organization_name,
        n.cause,
        n.total_distributions,
        n.points as ngo_points
      FROM users u
      LEFT JOIN restaurants r ON u.id = r.user_id
      LEFT JOIN volunteers v ON u.id = v.user_id
      LEFT JOIN ngos n ON u.id = n.user_id
      ${whereClause}
      ORDER BY u.${sort_by} ${sort_order}
      LIMIT ? OFFSET ?
    `;

    const users = await new Promise((resolve, reject) => {
      db.all(usersQuery, [...params, limit, offset], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID with full details
router.get('/users/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.params.id;

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

    // Get user-specific profile
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

    // Get recent activity
    const recentActivity = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 'donation' as type, id, created_at, status, description
        FROM food_donations 
        WHERE restaurant_id = (SELECT id FROM restaurants WHERE user_id = ?)
        UNION ALL
        SELECT 'pickup' as type, id, created_at, status, notes as description
        FROM pickup_requests 
        WHERE volunteer_id = (SELECT id FROM volunteers WHERE user_id = ?)
        ORDER BY created_at DESC
        LIMIT 10
      `, [userId, userId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      user,
      profile,
      recentActivity
    });

  } catch (error) {
    console.error('Admin user details error:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Update user status
router.put('/users/:id/status', [
  body('is_active').isBoolean(),
  body('is_verified').optional().isBoolean()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const db = getDatabase();
    const userId = req.params.id;
    const { is_active, is_verified } = req.body;

    // Update user status
    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET is_active = ?, is_verified = COALESCE(?, is_verified), updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [is_active ? 1 : 0, is_verified ? 1 : 0, userId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    // Log admin action
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, 'update_user_status', 'user', userId, 
         `Updated status: active=${is_active}, verified=${is_verified}`, req.ip],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'User status updated successfully' });

  } catch (error) {
    console.error('Admin user status update error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Delete user
router.delete('/users/:id', async (req, res) => {
  try {
    const db = getDatabase();
    const userId = req.params.id;

    // Get user info before deletion
    const user = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Delete user (cascade will handle related records)
    await new Promise((resolve, reject) => {
      db.run('DELETE FROM users WHERE id = ?', [userId], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    // Log admin action
    await new Promise((resolve, reject) => {
      db.run(
        'INSERT INTO admin_logs (admin_id, action, target_type, target_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)',
        [req.user.id, 'delete_user', 'user', userId, 
         `Deleted user: ${user.email} (${user.user_type})`, req.ip],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    res.json({ message: 'User deleted successfully' });

  } catch (error) {
    console.error('Admin user deletion error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get dashboard statistics
router.get('/dashboard', async (req, res) => {
  try {
    const db = getDatabase();

    // Get user counts by type
    const userStats = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          user_type,
          COUNT(*) as count,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_count,
          SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_count
        FROM users 
        WHERE user_type != 'admin'
        GROUP BY user_type
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Get total counts
    const totalStats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_users,
          SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_users,
          SUM(CASE WHEN is_verified = 1 THEN 1 ELSE 0 END) as verified_users,
          SUM(CASE WHEN created_at >= date('now', '-30 days') THEN 1 ELSE 0 END) as new_users_30d
        FROM users 
        WHERE user_type != 'admin'
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Get food donation stats
    const donationStats = await new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          COUNT(*) as total_donations,
          SUM(quantity) as total_meals,
          SUM(CASE WHEN status = 'distributed' THEN quantity ELSE 0 END) as distributed_meals,
          SUM(CASE WHEN created_at >= date('now', '-30 days') THEN 1 ELSE 0 END) as donations_30d
        FROM food_donations
      `, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    // Get recent activity
    const recentActivity = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          'user_registration' as type,
          u.email,
          u.user_type,
          u.created_at,
          NULL as details
        FROM users u
        WHERE u.user_type != 'admin'
        UNION ALL
        SELECT 
          'food_donation' as type,
          u.email,
          u.user_type,
          fd.created_at,
          fd.description
        FROM food_donations fd
        JOIN restaurants r ON fd.restaurant_id = r.id
        JOIN users u ON r.user_id = u.id
        ORDER BY created_at DESC
        LIMIT 20
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    res.json({
      userStats,
      totalStats,
      donationStats,
      recentActivity
    });

  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// Get admin logs
router.get('/logs', async (req, res) => {
  try {
    const db = getDatabase();
    const { page = 1, limit = 50, action, admin_id } = req.query;
    const offset = (page - 1) * limit;

    let whereConditions = [];
    let params = [];

    if (action) {
      whereConditions.push('action = ?');
      params.push(action);
    }

    if (admin_id) {
      whereConditions.push('admin_id = ?');
      params.push(admin_id);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    // Get logs with admin info
    const logs = await new Promise((resolve, reject) => {
      db.all(`
        SELECT 
          al.*,
          u.email as admin_email,
          u.first_name as admin_first_name,
          u.last_name as admin_last_name
        FROM admin_logs al
        JOIN users u ON al.admin_id = u.id
        ${whereClause}
        ORDER BY al.created_at DESC
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
        FROM admin_logs al
        ${whereClause}
      `, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    res.json({
      logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalResult.total,
        pages: Math.ceil(totalResult.total / limit)
      }
    });

  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({ error: 'Failed to fetch admin logs' });
  }
});

module.exports = router;
