import { Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';

export const authenticate = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
      return;
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
      .eq('id', decoded.userId)
      .single();
    
    if (userError || !user) {
      res.status(401).json({
        success: false,
        message: 'Token is not valid. User not found.'
      });
      return;
    }
    
    // Add user to request object - map database fields to IUser interface
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
    res.status(401).json({
      success: false,
      message: error instanceof Error ? error.message : 'Token is not valid.'
    });
  }
};

export const optionalAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // No token provided, continue without authentication
      next();
      return;
    }
    
    const token = authHeader.substring(7);
    
    if (!token) {
      next();
      return;
    }
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Get user from database
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, avatar_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
      .eq('id', decoded.userId)
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
    
    next();
    
  } catch (error) {
    // Token is invalid, but we continue without authentication
    next();
  }
};


