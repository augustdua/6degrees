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
import newsRoutes from './routes/news';
import debugRoutes from './routes/debug';
import pathRoutes from './routes/paths';
import organizationRoutes from './routes/organizations';
import connectorRoutes from './routes/connector';
import ogImageRoutes from './routes/ogImage';
import shareLinkRoutes from './routes/shareLink';
import paynetRoutes from './routes/paynet';
import webhookRoutes from './routes/webhooks';
import consultationRoutes from './routes/consultation';
import offerRoutes from './routes/offers';
import introRoutes from './routes/intros';
import notificationRoutes from './routes/notifications';
import aiAssistantRoutes from './routes/aiAssistant';
import messagesRoutes from './routes/messages';
import connectionsRoutes from './routes/connections';
import invitesRoutes from './routes/invites';
import userInvitesRoutes from './routes/userInvites';
import profileRoutes from './routes/profile';
import tagsRoutes from './routes/tags';
import socialCapitalRoutes from './routes/socialCapital';
import aiOffersRoutes from './routes/aiOffers';
import introRequestsRoutes from './routes/introRequests';
import connectionStoriesRoutes from './routes/connectionStories';
import peopleMatchingRoutes from './routes/peopleMatching';
import forumRoutes from './routes/forum';
import interactionsRoutes from './routes/interactions';
import jobsRoutes from './routes/jobs';
import dailyStandupRoutes from './routes/dailyStandup';
import personalityRoutes from './routes/personality';
import zaurqRoutes from './routes/zaurq';
import coworkingRoutes from './routes/coworking';
import deckRoutes from './routes/deck';


const app = express();
const PORT = process.env.PORT || 3001;

// Initialize database
initializeDatabase();

// Trust proxy for Railway deployment
app.set('trust proxy', 1);

// Security middleware with relaxed CSP for OG images
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "https:", "http:"], // Allow external images for OG previews
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin access for OG images
}));
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    process.env.PRODUCTION_FRONTEND_URL || 'https://6degree.app',
    process.env.ZAURQ_FRONTEND_URL || 'https://zaurq.com',
    'https://zaurq.com',
    'https://www.zaurq.com',
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

// Share link routes (must be before API routes to handle /r/:linkId)
app.use('/', shareLinkRoutes);

// Webhook routes (before authentication middleware)
app.use('/webhooks', webhookRoutes);

// Notification webhook routes (for database triggers)
app.use('/api/notifications', notificationRoutes);

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
app.use('/api/news', newsRoutes);
app.use('/api/tags', tagsRoutes);
app.use('/api/debug', debugRoutes);
app.use('/api/paths', pathRoutes);
app.use('/api/organizations', organizationRoutes);
app.use('/api/connector', connectorRoutes);
app.use('/api/og-image', ogImageRoutes);
app.use('/api/paynet', paynetRoutes);
app.use('/api/consultation', consultationRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/intros', introRoutes);
// Feature flag: disable AI Assistant API when needed (e.g., cost control / maintenance)
if (!(process.env.DISABLE_AI_ASSISTANT === '1' || process.env.DISABLE_AI_ASSISTANT === 'true')) {
app.use('/api/ai-assistant', aiAssistantRoutes);
}
app.use('/api/messages', messagesRoutes);
app.use('/api/connections', connectionsRoutes);
app.use('/api/invites', invitesRoutes);
app.use('/api/user-invites', userInvitesRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/social-capital', socialCapitalRoutes);
app.use('/api/ai-offers', aiOffersRoutes);
app.use('/api/intro-requests', introRequestsRoutes);
app.use('/api/connection-stories', connectionStoriesRoutes);
app.use('/api/people-matching', peopleMatchingRoutes);
app.use('/api/forum', forumRoutes);
app.use('/api/interactions', interactionsRoutes);
app.use('/api/jobs', jobsRoutes);
app.use('/api/daily-standup', dailyStandupRoutes);
app.use('/api/personality', personalityRoutes);
app.use('/api/zaurq', zaurqRoutes);
app.use('/api/coworking', coworkingRoutes);
app.use('/api/deck', deckRoutes);

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


