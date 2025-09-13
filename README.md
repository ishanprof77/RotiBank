# RotiBank - Food Waste Management Platform

A comprehensive platform connecting restaurants, volunteers, and NGOs to reduce food waste and help those in need.

## Features

### For Restaurants
- Register and create food donation listings
- Track donations and earn points
- View analytics and impact metrics
- Manage pickup requests

### For Volunteers
- Browse available food donations
- Request pickups from restaurants
- Track delivery progress
- Earn points and ratings

### For NGOs
- Request food donations for distribution
- Manage volunteer coordination
- Track distribution impact
- Generate impact reports

### Admin Dashboard
- View all registered users
- Manage user accounts and permissions
- Monitor platform activity
- Generate analytics and reports

## Tech Stack

### Backend
- **Node.js** with Express.js
- **SQLite** database
- **JWT** authentication
- **bcryptjs** for password hashing
- **express-validator** for input validation

### Frontend
- **Vanilla JavaScript** with modern ES6+
- **Bootstrap 5** for responsive design
- **Font Awesome** for icons
- **CSS3** with custom styling

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:
```env
PORT=3000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
DB_PATH=./database/rotibank.db
ADMIN_EMAIL=admin@rotibank.com
ADMIN_PASSWORD=admin123
```

### 3. Initialize Database
```bash
npm run init-db
```

### 4. Start the Server
```bash
# Development mode with auto-restart
npm run dev

# Production mode
npm start
```

### 5. Access the Application
- **Main Website**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3000/admin
- **API Health Check**: http://localhost:3000/api/health

## Default Admin Credentials
- **Email**: admin@rotibank.com
- **Password**: admin123

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Users
- `GET /api/users/profile` - Get current user profile
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/stats` - Get user statistics
- `GET /api/users/available-donations` - Get available donations
- `POST /api/users/request-pickup` - Request pickup

### Food Management
- `POST /api/food/donations` - Create food donation
- `GET /api/food/donations` - Get user's donations
- `PUT /api/food/donations/:id/status` - Update donation status
- `GET /api/food/pickup-requests` - Get pickup requests
- `PUT /api/food/pickup-requests/:id/status` - Update request status

### Admin
- `GET /api/admin/users` - Get all users (with pagination)
- `GET /api/admin/users/:id` - Get user details
- `PUT /api/admin/users/:id/status` - Update user status
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/dashboard` - Get dashboard statistics
- `GET /api/admin/logs` - Get admin activity logs

## Database Schema

### Users Table
- Basic user information (name, email, password, type)
- Contact details (phone, address, city, state, zip)
- Account status (active, verified)

### User-Specific Tables
- **restaurants**: Restaurant details, ratings, points
- **volunteers**: Availability, vehicle type, skills
- **ngos**: Organization details, cause, capacity

### Core Tables
- **food_donations**: Food listings with details
- **pickup_requests**: Pickup coordination
- **admin_logs**: Admin activity tracking

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS protection
- Helmet.js security headers

## Development

### Project Structure
```
RotiBank/
├── admin/                 # Admin dashboard frontend
│   ├── index.html
│   └── admin.js
├── database/              # Database files
│   └── init.js
├── middleware/            # Express middleware
│   └── auth.js
├── routes/               # API routes
│   ├── auth.js
│   ├── users.js
│   ├── admin.js
│   └── food.js
├── index.html            # Main website
├── styles.css           # Main website styles
├── script.js            # Main website JavaScript
├── server.js            # Express server
├── package.json         # Dependencies
└── README.md           # This file
```

### Adding New Features
1. Create new route files in `/routes`
2. Add corresponding frontend components
3. Update database schema if needed
4. Add proper validation and error handling

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For support and questions, please contact:
- Email: support@rotibank.com
- Phone: +1 (555) 123-4567

## Roadmap

- [ ] Mobile app development
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] Integration with food delivery apps
- [ ] Multi-language support
- [ ] API documentation with Swagger
- [ ] Automated testing suite
- [ ] Docker containerization
