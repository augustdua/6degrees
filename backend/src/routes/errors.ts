import { Router } from 'express';
import { reportError, getErrorReports, getErrorStats } from '../controllers/errorController';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Apply rate limiting to error reporting
const errorReportLimiter = rateLimiter({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Allow 10 error reports per minute per IP
  message: 'Too many error reports from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/errors - Report a client-side error
router.post('/', errorReportLimiter, reportError);

// GET /api/errors - Get error reports (for debugging dashboard)
router.get('/', getErrorReports);

// GET /api/errors/stats - Get error statistics
router.get('/stats', getErrorStats);

export default router;