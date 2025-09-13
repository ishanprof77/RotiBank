const jwt = require('jsonwebtoken');
const { getDatabase } = require('../database/init');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.user_type !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

const requireUserType = (userTypes) => {
  return (req, res, next) => {
    if (!userTypes.includes(req.user.user_type)) {
      return res.status(403).json({ 
        error: `Access denied. Required user types: ${userTypes.join(', ')}` 
      });
    }
    next();
  };
};

const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      user_type: user.user_type,
      first_name: user.first_name,
      last_name: user.last_name
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
};

const getUserById = async (userId) => {
  const db = getDatabase();
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

module.exports = {
  authenticateToken,
  requireAdmin,
  requireUserType,
  generateToken,
  getUserById
};
