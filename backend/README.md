# 6Degrees Backend API

A comprehensive backend API for the 6Degrees networking platform, built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **User Authentication**: JWT-based authentication with refresh tokens
- **Connection Requests**: Create and manage connection requests
- **Chain Management**: Build and track connection chains
- **Reward System**: Distribute rewards to chain participants
- **Rate Limiting**: Protect against abuse with configurable rate limits
- **Input Validation**: Comprehensive validation using Joi
- **Error Handling**: Centralized error handling with proper HTTP status codes
- **Security**: Helmet for security headers, CORS configuration

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting
- **Environment**: dotenv

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user profile
- `POST /api/auth/refresh` - Refresh access token

### Users
- `PUT /api/users/profile` - Update user profile
- `GET /api/users/:id` - Get user by ID
- `GET /api/users/search` - Search users

### Connection Requests
- `POST /api/requests` - Create a new connection request
- `GET /api/requests/my-requests` - Get user's requests
- `GET /api/requests/share/:linkId` - Get request by shareable link
- `POST /api/requests/:requestId/join` - Join a connection chain
- `POST /api/requests/:requestId/complete` - Complete a chain

### Chains
- `GET /api/chains/my-chains` - Get user's chains
- `GET /api/chains/:id` - Get chain by ID
- `GET /api/chains/rewards` - Get user's rewards
- `GET /api/chains/stats` - Get user's statistics

## Database Schema

### User
- Personal information (name, email, bio)
- Social links (LinkedIn, Twitter)
- Authentication data
- Verification status

### ConnectionRequest
- Target description
- Optional message
- Reward amount
- Status and expiration
- Shareable link

### Chain
- Request reference
- Participants array
- Status tracking
- Reward distribution

### Reward
- Chain reference
- User reference
- Amount and status
- Payment tracking

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (local or cloud)
- npm or yarn

### Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```bash
   npm install
   ```

4. Set up environment variables:
   ```bash
   cp env.example .env
   ```
   Edit `.env` with your configuration

5. Start the development server:
   ```bash
   npm run dev
   ```

### Environment Variables

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/6degrees

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_IN=30d

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

## Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint errors
- `npm test` - Run tests

## API Response Format

All API responses follow a consistent format:

```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

Error responses:

```json
{
  "success": false,
  "message": "Error description",
  "error": "Detailed error information (development only)"
}
```

## Authentication

The API uses JWT tokens for authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your-access-token>
```

## Rate Limiting

- General endpoints: 100 requests per 15 minutes
- Authentication endpoints: 5 requests per 15 minutes
- Request creation: 10 requests per hour

## Error Handling

The API includes comprehensive error handling:
- Validation errors (400)
- Authentication errors (401)
- Authorization errors (403)
- Not found errors (404)
- Server errors (500)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details


