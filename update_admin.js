const { getDatabase } = require('./database/init');
const bcrypt = require('bcryptjs');

async function updateAdminCredentials() {
  try {
    const db = getDatabase();
    
    // Check if admin exists
    const existingAdmin = await new Promise((resolve, reject) => {
      db.get('SELECT id, email FROM users WHERE user_type = ?', ['admin'], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (existingAdmin) {
      console.log('Found existing admin:', existingAdmin.email);
      
      // Update existing admin
      const hashedPassword = await bcrypt.hash('ishan123', 12);
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE users SET email = ?, password = ?, first_name = ?, last_name = ? WHERE user_type = ?',
          ['ishanprof77@rotibank.com', hashedPassword, 'Ishan', 'Prof', 'admin'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      console.log('✅ Admin credentials updated successfully!');
      console.log('New credentials: ishanprof77@rotibank.com / ishan123');
    } else {
      console.log('No existing admin found. Creating new admin...');
      
      // Create new admin
      const hashedPassword = await bcrypt.hash('ishan123', 12);
      await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO users (email, password, user_type, first_name, last_name, is_verified, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
          ['ishanprof77@rotibank.com', hashedPassword, 'admin', 'Ishan', 'Prof', 1, 1],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      console.log('✅ New admin created successfully!');
      console.log('Credentials: ishanprof77@rotibank.com / ishan123');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating admin:', error);
    process.exit(1);
  }
}

updateAdminCredentials();
