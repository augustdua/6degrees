import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { exchangeCodeForToken, getUserProfile } from '../services/workosService';
import { createPersonaInquiry } from '../services/personaService';

export const workosCallback = async (req: Request, res: Response) => {
  try {
    const { code, state } = req.query as { code?: string; state?: string };
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }

    // Lookup pending verification by state
    const { data: verification, error: fetchError } = await supabase
      .from('broker_verifications')
      .select('*')
      .eq('workos_state', state)
      .eq('status', 'pending')
      .single();

    if (fetchError || !verification) {
      return res.status(404).json({ error: 'Verification not found or already processed' });
    }

    // Exchange code
    const token = await exchangeCodeForToken(code);
    const profile = await getUserProfile(token.access_token);

    const emailDomain = (profile.email || '').split('@')[1] || null;

    // Basic checks against expectations
    let match = true;
    let failure_reason: string | null = null;
    if (verification.expected_company_domain && emailDomain && emailDomain.toLowerCase() !== verification.expected_company_domain.toLowerCase()) {
      match = false;
      failure_reason = 'Company domain mismatch';
    }
    if (verification.expected_title && profile.title && !profile.title.toLowerCase().includes(String(verification.expected_title).toLowerCase())) {
      match = false;
      failure_reason = failure_reason ? failure_reason + '; Title mismatch' : 'Title mismatch';
    }

    // Update verification record
    const { data: updated } = await supabase
      .from('broker_verifications')
      .update({
        verified_email: profile.email,
        verified_email_domain: emailDomain,
        verified_first_name: profile.first_name,
        verified_last_name: profile.last_name,
        verified_full_name: profile.name,
        verified_title: profile.title,
        verified_company_name: profile.organization_name,
        workos_connection_id: profile.organization_id,
        workos_organization_id: profile.organization_id,
        status: match ? 'verified' : 'failed',
        failure_reason: match ? null : failure_reason,
        verified_at: new Date().toISOString()
      })
      .eq('id', verification.id)
      .select()
      .single();

    if (!match) {
      return res.status(200).json({ success: false, reason: failure_reason, verification: updated });
    }

    // Auto-create listing if requested
    if (verification.listing_title && verification.listing_price_inr) {
      const { data: listing } = await supabase
        .from('network_listings')
        .insert({
          seller_id: verification.broker_user_id,
          title: verification.listing_title,
          description: verification.listing_description || `${profile.name || profile.email} at ${profile.organization_name || emailDomain}`,
          asking_price_inr: verification.listing_price_inr,
          deposit_amount_inr: Math.round(Number(verification.listing_price_inr) * 0.1),
          status: 'active',
          verification_status: 'verified',
          verified_at: new Date().toISOString()
        })
        .select()
        .single();

      // Also create a contact derived from the SSO profile for the listing
      if (listing) {
        const { data: contact } = await supabase
          .from('listing_contacts')
          .insert({
            listing_id: listing.id,
            full_name: profile.name || `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || profile.email,
            role_title: profile.title || verification.expected_title || 'Executive',
            company: profile.organization_name || verification.expected_company_name || (emailDomain ? emailDomain.split('.')[0] : 'Company'),
            photo_url: 'https://placehold.co/256x256',
            public_role: 'Senior-level',
            public_company: profile.organization_name || verification.expected_company_name || 'Company'
          })
          .select()
          .single();

        // Create Persona inquiry for identity verification
        try {
          const { data: personaRecord } = await supabase
            .from('persona_verifications')
            .insert({
              broker_user_id: verification.broker_user_id,
              broker_verification_id: verification.id,
              listing_contact_id: contact?.id || null,
              target_email: profile.email,
              target_full_name: profile.name
            })
            .select()
            .single();

          if (personaRecord) {
            const inquiry = await createPersonaInquiry({
              referenceId: personaRecord.id,
              name: profile.name,
              email: profile.email
            });
            await supabase
              .from('persona_verifications')
              .update({
                persona_inquiry_id: inquiry.inquiryId,
                persona_session_link: inquiry.sessionLink
              })
              .eq('id', personaRecord.id);
          }
        } catch (e) {
          console.error('Failed to create Persona inquiry:', (e as any).message);
        }
      }
    }

    return res.status(200).json({ success: true, verification: updated });
  } catch (err: any) {
    console.error('WorkOS callback error:', err.message);
    return res.status(500).json({ error: 'Failed to process WorkOS callback' });
  }
};

import bcrypt from 'bcryptjs';
import { generateTokenPair } from '../utils/jwt';
import { AuthenticatedRequest, RegisterData, LoginData, ApiResponse } from '../types';
import { createError, asyncHandler } from '../middleware/errorHandler';

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password, firstName, lastName }: RegisterData = req.body;

  // Check if user already exists
  const { data: existingUser, error: checkError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    throw createError('User already exists with this email', 400);
  }

  // Hash password
  const saltRounds = 12;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  // Create user
  const { data: user, error: createUserError } = await supabase
    .from('users')
    .insert({
      email,
      password: hashedPassword,
      first_name: firstName,
      last_name: lastName,
      full_name: `${firstName} ${lastName}`,
      is_verified: false
    })
    .select('id, email, first_name, last_name, full_name, avatar_url, bio, linkedin_url, twitter_url, is_verified, created_at')
    .single();

  if (createUserError || !user) {
    throw createError('Failed to create user', 500);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    avatar: user.avatar_url,
    bio: user.bio,
    linkedinUrl: user.linkedin_url,
    twitterUrl: user.twitter_url,
    isVerified: user.is_verified,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.created_at),
    password: '' // Not included in response
  });

  const response: ApiResponse = {
    success: true,
    message: 'User registered successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: user.full_name,
        avatar: user.avatar_url,
        bio: user.bio,
        linkedinUrl: user.linkedin_url,
        twitterUrl: user.twitter_url,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  };

  res.status(201).json(response);
});

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { email, password }: LoginData = req.body;

  // Check if user exists
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, password, first_name, last_name, full_name, avatar_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
    .eq('email', email)
    .single();

  if (userError || !user) {
    throw createError('Invalid email or password', 401);
  }

  // Check password
  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw createError('Invalid email or password', 401);
  }

  // Generate tokens
  const { accessToken, refreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    avatar: user.avatar_url,
    bio: user.bio,
    linkedinUrl: user.linkedin_url,
    twitterUrl: user.twitter_url,
    isVerified: user.is_verified,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at || user.created_at),
    password: '' // Not included in response
  });

  const response: ApiResponse = {
    success: true,
    message: 'Login successful',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        fullName: user.full_name,
        avatar: user.avatar_url,
        bio: user.bio,
        linkedinUrl: user.linkedin_url,
        twitterUrl: user.twitter_url,
        isVerified: user.is_verified,
        createdAt: user.created_at
      },
      tokens: {
        accessToken,
        refreshToken
      }
    }
  };

  res.status(200).json(response);
});

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
export const getMe = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;

  const response: ApiResponse = {
    success: true,
    message: 'User profile retrieved successfully',
    data: {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        avatar: user.avatar,
        bio: user.bio,
        linkedinUrl: user.linkedinUrl,
        twitterUrl: user.twitterUrl,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    }
  };

  res.status(200).json(response);
});

// @desc    Refresh token
// @route   POST /api/auth/refresh
// @access  Public
export const refreshToken = asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw createError('Refresh token is required', 400);
  }

  // Verify refresh token
  const { verifyToken } = await import('../utils/jwt');
  const decoded = verifyToken(refreshToken);

  // Get user
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, email, first_name, last_name, full_name, avatar_url, bio, linkedin_url, twitter_url, is_verified, created_at, updated_at')
    .eq('id', decoded.userId)
    .single();

  if (userError || !user) {
    throw createError('User not found', 404);
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair({
    id: user.id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    fullName: user.full_name,
    avatar: user.avatar_url,
    bio: user.bio,
    linkedinUrl: user.linkedin_url,
    twitterUrl: user.twitter_url,
    isVerified: user.is_verified,
    createdAt: new Date(user.created_at),
    updatedAt: new Date(user.updated_at || user.created_at),
    password: '' // Not included in response
  });

  const response: ApiResponse = {
    success: true,
    message: 'Token refreshed successfully',
    data: {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken
      }
    }
  };

  res.status(200).json(response);
});