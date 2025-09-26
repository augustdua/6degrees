import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { reportError, getErrorReports, getErrorStats } from '../controllers/errorController';

const router = Router();

// Apply rate limiting to error reporting
const errorReportLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // Allow 10 error reports per minute per IP
  message: {
    success: false,
    message: 'Too many error reports from this IP, please try again later.'
  },
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