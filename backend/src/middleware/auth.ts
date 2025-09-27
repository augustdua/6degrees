import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import jwksClient from 'jwks-rsa';
import jwt from 'jsonwebtoken';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const PROJECT_URL = SUPABASE_URL;
const ISSUER = `${PROJECT_URL}/auth/v1`;
const AUDIENCE = 'authenticated';

const client = jwksClient({
  jwksUri: `${PROJECT_URL}/auth/v1/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 10,
  cacheMaxAge: 10 * 60 * 1000, // 10 minutes
});

function getKey(header: jwt.JwtHeader, cb: (err: Error | null, key?: string) => void) {
  if (!header.kid) {
    return cb(new Error('JWT missing kid'));
  }

  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      return cb(err);
    }
    cb(null, key?.getPublicKey());
  });
}

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

  jwt.verify(token, getKey, {
    issuer: ISSUER,
    audience: AUDIENCE
  }, async (err, decoded: any) => {
    if (err) {
      res.status(401).json({
        error: 'Unauthorized',
        reason: 'Invalid token',
        details: err.message
      });
      return;
    }

    try {
      // Get user from database using Supabase user ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, avatar_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
        .eq('id', decoded.sub)
        .single();

      if (userError || !user) {
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
        avatar: user.avatar_url,
        bio: user.bio,
        linkedinUrl: user.linkedin_url,
        twitterUrl: user.twitter_url,
        isVerified: user.is_verified,
        createdAt: new Date(user.created_at),
        updatedAt: new Date(user.updated_at || user.created_at)
      };
      next();
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        details: 'Failed to fetch user data'
      });
    }
  });
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

  jwt.verify(token, getKey, {
    issuer: ISSUER,
    audience: AUDIENCE
  }, async (err, decoded: any) => {
    if (err) {
      // Invalid token, continue without auth (don't fail)
      console.warn('Invalid token in optional auth:', err.message);
      return next();
    }

    try {
      // Get user from database using Supabase user ID
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, avatar_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
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
          avatar: user.avatar_url,
          bio: user.bio,
          linkedinUrl: user.linkedin_url,
          twitterUrl: user.twitter_url,
          isVerified: user.is_verified,
          createdAt: new Date(user.created_at),
          updatedAt: new Date(user.updated_at || user.created_at)
        };
      }
    } catch (error) {
      // Error getting user data, continue without auth
      console.warn('Error getting user data in optional auth:', error);
    }

    next();
  });
};


