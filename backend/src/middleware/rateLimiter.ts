import rateLimit from 'express-rate-limit';
import crypto from 'crypto';

function rateLimitKey(req: any): string {
  // Prefer per-user/per-session keying when possible (reduces false positives on shared IPs,
  // which is common in Telegram webviews / mobile networks).
  const auth = req?.get?.('authorization') || req?.headers?.authorization;
  // #region agent log
  // NOTE: do not log IP or token. Only log which keying path is taken.
  try { console.log(JSON.stringify({sessionId:'debug-session',runId:'run1',hypothesisId:'H1',location:'backend/src/middleware/rateLimiter.ts:rateLimitKey',message:'rateLimitKey called',data:{hasAuthHeader:typeof auth==='string'&&auth.startsWith('Bearer '),usedKeyType:(typeof auth==='string'&&auth.startsWith('Bearer '))?'bearer':'ip'},timestamp:Date.now()})); } catch {}
  // #endregion agent log
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) {
    const token = auth.slice('Bearer '.length).trim();
    if (token) {
      const digest = crypto.createHash('sha256').update(token).digest('hex');
      return `bearer:${digest}`;
    }
  }

  // Fall back to IP-based limiting for unauthenticated/anonymous traffic.
  return req.ip;
}

// General rate limiter
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  keyGenerator: rateLimitKey,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Moderate rate limiter for request creation
export const requestLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 requests per hour
  message: {
    success: false,
    message: 'Too many requests created, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});


