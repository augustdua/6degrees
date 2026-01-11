import { Response, Request } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { loadTemplate, sendEmail } from '../services/emailService';

const APP_URL = process.env.FRONTEND_URL || 'https://6degree.app';

interface SendInviteRequest {
  email: string;
}

interface ValidateCodeRequest {
  code: string;
}

interface CompleteSignupRequest {
  code: string;
  password: string;
  firstName: string;
  lastName: string;
  bio?: string;
  profilePictureUrl?: string;
}

interface RedeemReferralRequest {
  inviterId: string;
}

/**
 * Resolve inviter details for referral links.
 * GET /api/user-invites/referrer/:id
 * Public (no auth)
 */
export const getReferrerInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const inviterId = String((req.params as any)?.id || '');
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(inviterId)) {
      res.status(400).json({ ok: false, error: 'Invalid id' });
      return;
    }

    const { data, error } = await supabase
      .from('users')
      .select('id, first_name, last_name, profile_picture_url')
      .eq('id', inviterId)
      .single();

    if (error || !data) {
      res.status(404).json({ ok: false, error: 'Not found' });
      return;
    }

    res.json({
      ok: true,
      inviter: {
        id: data.id,
        firstName: data.first_name || '',
        lastName: data.last_name || '',
        profilePictureUrl: data.profile_picture_url || null,
      },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};

/**
 * Send a 4-digit invite code to an email address
 * POST /api/user-invites/send
 */
export const sendInvite = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { email } = req.body as SendInviteRequest;

    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'Valid email is required' });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user has invites remaining
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('invites_remaining, first_name, last_name, profile_picture_url')
      .eq('id', userId)
      .single();

    if (userError || !userData) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    if ((userData.invites_remaining ?? 6) <= 0) {
      res.status(400).json({ error: 'No invites remaining. You have used all 6 of your invites.' });
      return;
    }

    // Check if email is already registered
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      res.status(400).json({ error: 'This email is already registered on 6Degree' });
      return;
    }

    // Check if there's already a pending invite for this email
    const { data: existingInvite } = await supabase
      .from('user_invites')
      .select('id, code, expires_at')
      .eq('invitee_email', normalizedEmail)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .single();

    let inviteCode: string;
    
    if (existingInvite) {
      // Resend existing invite
      inviteCode = existingInvite.code;
    } else {
      // Generate new invite code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError || !codeData) {
        console.error('Error generating invite code:', codeError);
        res.status(500).json({ error: 'Failed to generate invite code' });
        return;
      }

      inviteCode = codeData;

      // Create new invite
      const { error: insertError } = await supabase
        .from('user_invites')
        .insert({
          inviter_id: userId,
          invitee_email: normalizedEmail,
          code: inviteCode,
          status: 'pending',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
        });

      if (insertError) {
        console.error('Error creating invite:', insertError);
        res.status(500).json({ error: 'Failed to create invite' });
        return;
      }

      // Decrement invites remaining
      await supabase
        .from('users')
        .update({ invites_remaining: (userData.invites_remaining ?? 6) - 1 })
        .eq('id', userId);
    }

    // Send email with invite code
    const inviterName = `${userData.first_name} ${userData.last_name}`.trim();
    const inviterPhoto = userData.profile_picture_url || `${APP_URL}/default-avatar.png`;
    
    try {
      console.log(`📧 Loading invite-code template...`);
      const html = loadTemplate('invite-code', {
        INVITER_NAME: inviterName,
        INVITER_PHOTO: inviterPhoto,
        CODE_1: inviteCode[0],
        CODE_2: inviteCode[1],
        CODE_3: inviteCode[2],
        CODE_4: inviteCode[3],
        JOIN_URL: `${APP_URL}/invite`
      });
      console.log(`📧 Template loaded, sending email to ${normalizedEmail}...`);

      const emailSent = await sendEmail({
        to: normalizedEmail,
        subject: `${inviterName} invited you to join 6Degree`,
        html
      });

      if (emailSent) {
        console.log(`✅ Invite email sent to ${normalizedEmail} with code ${inviteCode}`);
      } else {
        console.error(`❌ Failed to send invite email to ${normalizedEmail} - sendEmail returned false`);
      }
    } catch (emailError) {
      console.error('❌ Error sending invite email:', emailError);
      // Don't fail the request, invite is still created
    }

    res.json({ 
      success: true, 
      message: `Invite sent to ${normalizedEmail}`,
      invitesRemaining: (userData.invites_remaining ?? 6) - 1
    });
  } catch (error: any) {
    console.error('Error in sendInvite:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Get user's sent invites and remaining count
 * GET /api/user-invites/my-invites
 */
export const getMyInvites = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Get user's invites remaining
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('invites_remaining')
      .eq('id', userId)
      .single();

    if (userError) {
      res.status(500).json({ error: 'Failed to fetch user data' });
      return;
    }

    // Get sent invites
    const { data: invites, error: invitesError } = await supabase
      .from('user_invites')
      .select(`
        id,
        invitee_email,
        status,
        created_at,
        accepted_at,
        expires_at
      `)
      .eq('inviter_id', userId)
      .order('created_at', { ascending: false });

    if (invitesError) {
      res.status(500).json({ error: 'Failed to fetch invites' });
      return;
    }

    res.json({
      invitesRemaining: userData?.invites_remaining ?? 6,
      totalInvites: 6,
      sentInvites: invites || []
    });
  } catch (error: any) {
    console.error('Error in getMyInvites:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Validate an invite code (public endpoint for onboarding)
 * POST /api/user-invites/validate
 */
export const validateInviteCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.body as ValidateCodeRequest;

    if (!code || code.length !== 4) {
      res.status(400).json({ error: 'Valid 4-digit code is required' });
      return;
    }

    // Use service role to bypass RLS
    const { data, error } = await supabase
      .rpc('validate_invite_code', { p_code: code });

    if (error) {
      console.error('Error validating code:', error);
      res.status(500).json({ error: 'Failed to validate code' });
      return;
    }

    if (!data || data.length === 0) {
      res.status(404).json({ error: 'Invalid or expired invite code' });
      return;
    }

    const invite = data[0];

    res.json({
      valid: true,
      inviteId: invite.invite_id,
      email: invite.invitee_email,
      inviter: {
        id: invite.inviter_id,
        firstName: invite.inviter_first_name,
        lastName: invite.inviter_last_name,
        profilePictureUrl: invite.inviter_profile_picture_url
      }
    });
  } catch (error: any) {
    console.error('Error in validateInviteCode:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Complete signup with invite code
 * POST /api/user-invites/complete-signup
 */
export const completeSignup = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, password, firstName, lastName, bio, profilePictureUrl } = req.body as CompleteSignupRequest;
    const birthdayDateRaw = typeof (req.body as any)?.birthdayDate === 'string' ? String((req.body as any).birthdayDate).trim() : '';
    const birthdayVisibilityRaw = typeof (req.body as any)?.birthdayVisibility === 'string' ? String((req.body as any).birthdayVisibility).trim() : '';
    const birthdayDate = birthdayDateRaw && /^\d{4}-\d{2}-\d{2}$/.test(birthdayDateRaw) ? birthdayDateRaw : null;
    const birthdayVisibility =
      birthdayVisibilityRaw === 'private' || birthdayVisibilityRaw === 'connections' || birthdayVisibilityRaw === 'public'
        ? birthdayVisibilityRaw
        : 'connections';

    if (!code || code.length !== 4) {
      res.status(400).json({ error: 'Valid 4-digit code is required' });
      return;
    }

    if (!password || password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    if (!firstName || !lastName) {
      res.status(400).json({ error: 'First name and last name are required' });
      return;
    }

    // Validate the invite code first
    const { data: inviteData, error: inviteError } = await supabase
      .rpc('validate_invite_code', { p_code: code });

    if (inviteError || !inviteData || inviteData.length === 0) {
      res.status(404).json({ error: 'Invalid or expired invite code' });
      return;
    }

    const invite = inviteData[0];
    const email = invite.invitee_email;

    // Create auth user with Supabase Admin
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm since they have a valid invite
      user_metadata: {
        first_name: firstName,
        last_name: lastName,
        ...(birthdayDate ? { birthday_date: birthdayDate } : {}),
        birthday_visibility: birthdayVisibility
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      res.status(500).json({ error: authError.message || 'Failed to create account' });
      return;
    }

    const newUserId = authData.user.id;

    // Create user profile
    const { error: profileError } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        email,
        first_name: firstName,
        last_name: lastName,
        bio: bio || null,
        profile_picture_url: profilePictureUrl || null,
        ...(birthdayDate ? { birthday_date: birthdayDate } : {}),
        birthday_visibility: birthdayVisibility,
        is_verified: true, // They're verified via invite
        invites_remaining: 6, // Give them 6 invites
        invited_by_user_id: invite.inviter_id
      });

    if (profileError) {
      console.error('Error creating user profile:', profileError);
      // Try to clean up auth user
      await supabase.auth.admin.deleteUser(newUserId);
      res.status(500).json({ error: 'Failed to create profile' });
      return;
    }

    // Complete the invite (marks as accepted and creates connection)
    const { error: completeError } = await supabase
      .rpc('complete_user_invite', {
        p_invite_id: invite.invite_id,
        p_new_user_id: newUserId
      });

    if (completeError) {
      console.error('Error completing invite:', completeError);
      // Non-fatal, continue
    }

    // Sign in the user to get a session
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (signInError) {
      console.error('Error signing in new user:', signInError);
      // User is created, but they'll need to sign in manually
      res.json({
        success: true,
        message: 'Account created successfully. Please sign in.',
        userId: newUserId,
        session: null
      });
      return;
    }

    res.json({
      success: true,
      message: 'Welcome to 6Degree!',
      userId: newUserId,
      session: signInData.session,
      user: {
        id: newUserId,
        email,
        firstName,
        lastName,
        bio,
        profilePictureUrl
      },
      inviter: {
        id: invite.inviter_id,
        firstName: invite.inviter_first_name,
        lastName: invite.inviter_last_name,
        profilePictureUrl: invite.inviter_profile_picture_url
      }
    });
  } catch (error: any) {
    console.error('Error in completeSignup:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * Redeem a referral link (?ref=<inviterId>) after a user signs in.
 * POST /api/user-invites/redeem-referral
 * Body: { inviterId }
 */
export const redeemReferral = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }

    const { inviterId } = (req.body || {}) as RedeemReferralRequest;
    if (!inviterId || typeof inviterId !== 'string') {
      res.status(400).json({ ok: false, error: 'inviterId is required' });
      return;
    }

    // basic UUID sanity check
    const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRe.test(inviterId)) {
      res.status(400).json({ ok: false, error: 'Invalid inviterId' });
      return;
    }
    if (inviterId === userId) {
      res.status(400).json({ ok: false, error: 'Cannot invite yourself' });
      return;
    }

    // Ensure inviter exists in public.users
    const { data: inviter, error: inviterErr } = await supabase.from('users').select('id').eq('id', inviterId).single();
    if (inviterErr || !inviter) {
      res.status(404).json({ ok: false, error: 'Inviter not found' });
      return;
    }

    // Create mutual connection (existing table is bidirectional via unique constraint)
    const { error: connErr } = await supabase.rpc('create_user_connection', {
      p_user1_id: inviterId,
      p_user2_id: userId,
      p_connection_request_id: null,
    });
    if (connErr) {
      // Still allow invited_by update attempt; but return error for visibility
      res.status(500).json({ ok: false, error: connErr.message || 'Failed to create connection' });
      return;
    }

    // Store attribution (best-effort; do not overwrite if already set)
    await supabase
      .from('users')
      .update({ invited_by_user_id: inviterId })
      .eq('id', userId)
      .is('invited_by_user_id', null);

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
};

