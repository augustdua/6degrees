# 6Degrees - Networking Connection Platform

A modern networking platform that helps you connect with anyone through your network using connection chains and rewards.

## Features

- **Connection Requests**: Create requests to connect with specific people
- **Chain Building**: Build connection chains through your network
- **Reward System**: Incentivize connections with rewards
- **Analytics Dashboard**: Track your requests, chains, and link statistics
- **Real-time Updates**: Live updates on connection progress

## Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS for styling
- shadcn/ui component library
- React Router for navigation
- Supabase for backend services

### Backend
- Node.js with Express
- TypeScript
- Supabase for database and authentication
- JWT for session management
- Rate limiting and security middleware

## Project Structure

```
6Degrees/
├── frontend/          # React frontend application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── hooks/         # React hooks
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities and config
│   └── package.json
├── backend/           # Express backend API
│   ├── src/
│   │   ├── controllers/   # Request handlers
│   │   ├── middleware/    # Express middleware
│   │   ├── routes/        # API routes
│   │   └── config/        # Configuration
│   └── package.json
└── README.md
```

## Development Setup

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd 6Degrees
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd backend
npm install
```

4. Set up environment variables:
```bash
# Frontend (.env)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_APP_URL=http://localhost:5173

# Backend (.env)
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
FRONTEND_URL=http://localhost:5173
PORT=3001
```

5. Start development servers:
```bash
# Frontend
cd frontend && npm run dev

# Backend
cd backend && npm run dev
```

## Deployment

### Railway Deployment

1. Push to GitHub
2. Connect Railway to your GitHub repository
3. Set environment variables in Railway dashboard
4. Deploy frontend and backend as separate services

### Environment Variables for Production

**Frontend:**
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_APP_URL`

**Backend:**
- `NODE_ENV=production`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_KEY`
- `FRONTEND_URL`
- `PORT` (automatically set by Railway)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details