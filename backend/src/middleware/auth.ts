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
  console.log('🔐 Auth: Starting authentication');
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';

  console.log('🔑 Auth: Token present:', !!token);
  console.log('🔧 Auth: JWT Secret present:', !!SUPABASE_JWT_SECRET);
  console.log('🌐 Auth: Issuer:', ISSUER);

  if (!token) {
    console.log('❌ Auth: No token provided');
    res.status(401).json({
      error: 'Unauthorized',
      reason: 'Missing bearer token'
    });
    return;
  }

  try {
    console.log('🔍 Auth: Verifying JWT token...');
    // Verify token using HS256 with Supabase JWT secret
    const decoded = jwt.verify(token, SUPABASE_JWT_SECRET, {
      issuer: ISSUER,
      audience: AUDIENCE
    }) as any;
    console.log('✅ Auth: JWT verified successfully, user ID:', decoded.sub);

    // Get user from database using Supabase user ID
    console.log('👤 Auth: Fetching user from database...');
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
      .eq('id', decoded.sub)
      .single();

    if (userError || !user) {
      console.log('❌ Auth: User not found:', userError?.message);
      res.status(401).json({
        error: 'Unauthorized',
        reason: 'User not found'
      });
      return;
    }

    console.log('✅ Auth: User found:', user.email);

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
    console.log('✅ Auth: Authentication successful, proceeding...');
    next();
  } catch (err: any) {
    console.log('❌ Auth: JWT verification failed:', err.message);
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
  } catch (err) {
    // Invalid token, continue without auth (don't fail)
    console.warn('Invalid token in optional auth:', err);
  }

  next();
};


