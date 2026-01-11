import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET!;
const PROJECT_URL = SUPABASE_URL;
const ISSUER = `${PROJECT_URL}/auth/v1`;
const AUDIENCE = 'authenticated';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      reason: 'Missing bearer token'
    });
    return;
  }

  try {
    // Verify token using HS256 with Supabase JWT secret
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE
    }) as any;

    const selectUser = async () => {
      return await supabase
        .from('users')
        .select(
          'id, email, first_name, last_name, profile_picture_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at, role, membership_status, birthday_date, birthday_visibility'
        )
        .eq('id', decoded.sub)
        .single();
    };

    // Get user from database using Supabase user ID
    let { data: user, error: userError } = await selectUser();

    // Self-heal: if public.users row is missing (common when old signup trigger failed),
    // fetch user info from Supabase Auth and upsert a minimal profile.
    if ((userError || !user) && decoded?.sub) {
      try {
        const { data: authData, error: authErr } = await supabase.auth.getUser(token);
        const au: any = authData?.user;
        if (!authErr && au?.id && String(au.id) === String(decoded.sub)) {
          const meta = (au.user_metadata || {}) as any;
          const avatarUrlRaw = typeof meta?.avatar_url === 'string' ? String(meta.avatar_url) : null;
          const firstName = typeof meta?.first_name === 'string' ? String(meta.first_name) : '';
          const lastName = typeof meta?.last_name === 'string' ? String(meta.last_name) : '';
          const email = typeof au?.email === 'string' ? String(au.email) : '';

          // Best-effort upsert; defaults are handled in DB where possible.
          await supabase
            .from('users')
            .upsert(
              {
                id: au.id,
                email,
                first_name: firstName,
                last_name: lastName,
                profile_picture_url: avatarUrlRaw,
              },
              { onConflict: 'id' }
            );

          // Retry select after healing
          ({ data: user, error: userError } = await selectUser());
        }
      } catch (e) {
        // ignore and fall through to unauthorized
      }
    }

    if (userError || !user) {
      console.error('Auth error - user not found:', userError?.message);
      res.status(401).json({
        error: 'Unauthorized',
        reason: 'User not found'
      });
      return;
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      password: '', // Not included for security
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      avatar: user.profile_picture_url,
      bio: user.bio,
      linkedinUrl: user.linkedin_url,
      twitterUrl: user.twitter_url,
      isVerified: user.is_verified,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(user.updated_at || user.created_at),
      // Partner concept removed: force all users to be ZAURQ_USER.
      role: 'ZAURQ_USER',
      birthdayDate: (user as any).birthday_date || null,
      birthdayVisibility: (user as any).birthday_visibility || null,
      // Legacy fallback for older code paths; do not use for new features.
      membershipStatus: (user as any).membership_status || 'waitlist'
    };
    next();
  } catch (err: any) {
    console.error('Auth error - JWT verification failed:', err.message);
    res.status(401).json({
      error: 'Unauthorized',
      reason: 'Invalid token',
      details: err.message
    });
    return;
  }
};

// Export authenticate as auth for convenience
export const auth = authenticate;

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  if (!token) {
    // No token provided, continue without authentication
    return next();
  }

  try {
    // Verify token using HS256 with Supabase JWT secret
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE
    }) as any;

    // Get user from database using Supabase user ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, profile_picture_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at, role, membership_status')
      .eq('id', decoded.sub)
      .single();

    if (!userError && user) {
      req.user = {
        id: user.id,
        email: user.email,
        password: '', // Not included for security
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: `${user.first_name} ${user.last_name}`,
        avatar: user.profile_picture_url,
        bio: user.bio,
        linkedinUrl: user.linkedin_url,
        twitterUrl: user.twitter_url,
        isVerified: user.is_verified,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at || user.created_at),
          // Partner concept removed: force all users to be ZAURQ_USER.
          role: 'ZAURQ_USER',
        membershipStatus: (user as any).membership_status || 'waitlist'
      };
    }
  } catch (err) {
    // Invalid token, continue without auth (don't fail)
    console.warn('Invalid token in optional auth:', err);
  }

  next();
};

/**
 * Middleware that requires user to be an approved member.
 * Use after `authenticate` middleware.
 */
export const requireMember = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  // Legacy behavior: previously enforced membership_status === 'member'.
  // Current behavior: partner/membership gating has been removed; keep this middleware permissive
  // for backward-compat with older route wiring.

  next();
};
