import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { initializeDatabase } from './config/database';
import { generalLimiter } from './middleware/rateLimiter';
import { errorHandler, notFound } from './middleware/errorHandler';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import requestRoutes from './routes/requests';
import chainRoutes from './routes/chains';
import analyticsRoutes from './routes/analytics';
import clickRoutes from './routes/clicks';
import linkedInRoutes from './routes/linkedin';
import errorRoutes from './routes/errors';
import creditsRoutes from './routes/credits';
import feedRoutes from './routes/feed';
import debugRoutes from './routes/debug';
import bidRoutes from './routes/bids';
import pathRoutes from './routes/paths';
import organizationRoutes from './routes/organizations';
import connectorRoutes from './routes/connector';


const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.PRODUCTION_FRONTEND_URL || 'https://6degree.app'
  ],
  credentials: true
}));

// Rate limiting - apply to all routes except organizations (which has its own caching)
app.use((req, res, next) => {
  // Skip rate limiting for organization user lookups (high volume, read-only, cacheable)
  if (req.path.startsWith('/api/organizations/user/')) {
    return next();
  }
  return generalLimiter(req, res, next);
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '6Degrees API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/chains', chainRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/clicks', clickRoutes);
app.use('/api/linkedin', linkedInRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/credits', creditsRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/bids', bidRoutes);
app.use('/api/paths', pathRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/connector', connectorRoutes);

// 404 handler
app.use(notFound);

// Error handling middleware
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 6Degrees API server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 Health check: http://localhost:${PORT}/health`);
});

export default app;


