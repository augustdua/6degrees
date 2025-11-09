import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import crypto from 'crypto';
import {
  processMemberSubscription,
  getMafiaRevenue,
  distributeRevenueToFoundingMembers,
} from '../services/mafiaPayments';

/**
 * Create a new mafia
 * POST /api/mafias
 */
export const createMafia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, description, cover_image_url, monthly_price_usd, monthly_price_inr, currency, founding_members_limit } =
      req.body;

    // Validation
    if (!name || !description || monthly_price_usd === undefined || monthly_price_inr === undefined) {
      res.status(400).json({ error: 'Name, description, monthly_price_usd, and monthly_price_inr are required' });
      return;
    }

    if (monthly_price_usd < 0 || monthly_price_inr < 0) {
      res.status(400).json({ error: 'Monthly prices must be non-negative' });
      return;
    }

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Create mafia
    const { data: mafia, error: mafiaError } = await supabase
      .from('mafias')
      .insert({
        name,
        slug,
        description,
        cover_image_url: cover_image_url || null,
        monthly_price_usd,
        monthly_price_inr,
        currency: currency || 'USD',
        creator_id: userId,
        founding_members_limit: founding_members_limit || 10,
        member_count: 0,
      })
      .select()
      .single();

    if (mafiaError) {
      console.error('Error creating mafia:', mafiaError);
      res.status(500).json({ error: mafiaError.message });
      return;
    }

    // Add creator as admin member
    const { error: memberError } = await supabase.from('mafia_members').insert({
      mafia_id: mafia.id,
      user_id: userId,
      role: 'admin',
      subscription_status: null,
      next_payment_date: null,
    });

    if (memberError) {
      console.error('Error adding creator as member:', memberError);
      // Rollback mafia creation
      await supabase.from('mafias').delete().eq('id', mafia.id);
      res.status(500).json({ error: 'Failed to initialize mafia membership' });
      return;
    }

    // Create group conversation for mafia
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        created_by: userId,
        is_group: true,
      })
      .select()
      .single();

    if (convError) {
      console.error('Error creating mafia conversation:', convError);
      // Non-critical, continue
    } else {
      // Link conversation to mafia
      await supabase
        .from('mafias')
        .update({ conversation_id: conversation.id })
        .eq('id', mafia.id);

      // Add creator as participant
      await supabase.from('conversation_participants').insert({
        conversation_id: conversation.id,
        user_id: userId,
      });
    }

    res.status(201).json({ mafia });
  } catch (error: any) {
    console.error('Error in createMafia:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get all active mafias (public explore)
 * GET /api/mafias
 */
export const getAllMafias = async (req: Request, res: Response): Promise<void> => {
  try {
    const { data: mafias, error } = await supabase
      .from('mafias')
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          first_name,
          last_name,
          profile_picture_url
        )
      `
      )
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching mafias:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    // Get member counts for each mafia
    const mafiasWithCounts = await Promise.all(
      (mafias || []).map(async (mafia: any) => {
        const { count: memberCount } = await supabase
          .from('mafia_members')
          .select('*', { count: 'exact', head: true })
          .eq('mafia_id', mafia.id);

        const { count: foundingCount } = await supabase
          .from('mafia_members')
          .select('*', { count: 'exact', head: true })
          .eq('mafia_id', mafia.id)
          .in('role', ['admin', 'founding']);

        return {
          ...mafia,
          member_count: memberCount || 0,
          founding_member_count: foundingCount || 0,
        };
      })
    );

    res.status(200).json({ mafias: mafiasWithCounts });
  } catch (error: any) {
    console.error('Error in getAllMafias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get user's mafias (created or joined)
 * GET /api/mafias/my?filter=created|joined
 */
export const getMyMafias = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const filter = req.query.filter as string; // 'created' or 'joined'

    let query = supabase
      .from('mafia_members')
      .select(
        `
        id,
        role,
        joined_at,
        subscription_status,
        next_payment_date,
        mafias!inner (
          id,
          name,
          slug,
          description,
          cover_image_url,
          monthly_price_usd,
          monthly_price_inr,
          currency,
          creator_id,
          founding_members_limit,
          conversation_id,
          member_count,
          created_at,
          updated_at
        )
      `
      )
      .eq('user_id', userId);

    if (filter === 'created') {
      // Only show mafias created by this user
      query = query.eq('role', 'admin');
    } else if (filter === 'joined') {
      // Only show mafias joined by this user (not created)
      query = query.neq('role', 'admin');
    }

    const { data: memberships, error } = await query.order('joined_at', {
      ascending: false,
    });

    if (error) {
      console.error('Error fetching my mafias:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    // Get member counts for each mafia
    const mafiasWithCounts = await Promise.all(
      (memberships || []).map(async (membership: any) => {
        const mafia = (membership as any).mafias;

        const { count: memberCount } = await supabase
          .from('mafia_members')
          .select('*', { count: 'exact', head: true })
          .eq('mafia_id', mafia.id);

        return {
          ...membership,
          mafias: {
            ...mafia,
            member_count: memberCount || 0,
          },
        };
      })
    );

    res.status(200).json({ memberships: mafiasWithCounts });
  } catch (error: any) {
    console.error('Error in getMyMafias:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get mafia details with members
 * GET /api/mafias/:id
 */
export const getMafiaDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get mafia details
    const { data: mafia, error: mafiaError } = await supabase
      .from('mafias')
      .select(
        `
        *,
        creator:users!creator_id (
          id,
          first_name,
          last_name,
          profile_picture_url
        )
      `
      )
      .eq('id', id)
      .single();

    if (mafiaError || !mafia) {
      res.status(404).json({ error: 'Mafia not found' });
      return;
    }

    // Get members with user details and their organizations
    const { data: members, error: membersError } = await supabase
      .from('mafia_members')
      .select(
        `
        id,
        role,
        joined_at,
        subscription_status,
        user:users!user_id (
          id,
          first_name,
          last_name,
          profile_picture_url,
          bio,
          user_organizations (
            organization:organizations (
              id,
              name,
              logo_url
            )
          )
        )
      `
      )
      .eq('mafia_id', id)
      .order('joined_at', { ascending: true });

    if (membersError) {
      console.error('Error fetching members:', membersError);
      res.status(500).json({ error: membersError.message });
      return;
    }

    // Get conversation ID for group chat
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('mafia_id', id)
      .single();

    res.status(200).json({
      mafia: {
        ...mafia,
        members: members || [],
        conversation_id: conversation?.id || null,
      },
    });
  } catch (error: any) {
    console.error('Error in getMafiaDetails:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update mafia info (admin only)
 * PATCH /api/mafias/:id
 */
export const updateMafia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { name, description, cover_image_url, monthly_price_usd, monthly_price_inr, currency } = req.body;

    // Check if user is admin
    const { data: member } = await supabase
      .from('mafia_members')
      .select('role')
      .eq('mafia_id', id)
      .eq('user_id', userId)
      .single();

    if (!member || member.role !== 'admin') {
      res.status(403).json({ error: 'Only admin can update mafia info' });
      return;
    }

    // Build update object
    const updates: any = {};
    if (name !== undefined) {
      updates.name = name;
      // Regenerate slug if name changes
      updates.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
    if (description !== undefined) updates.description = description;
    if (cover_image_url !== undefined) updates.cover_image_url = cover_image_url;
    if (monthly_price_usd !== undefined) updates.monthly_price_usd = monthly_price_usd;
    if (monthly_price_inr !== undefined) updates.monthly_price_inr = monthly_price_inr;
    if (currency !== undefined) updates.currency = currency;

    const { data: updatedMafia, error } = await supabase
      .from('mafias')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating mafia:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ mafia: updatedMafia });
  } catch (error: any) {
    console.error('Error in updateMafia:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Deactivate mafia (admin only)
 * DELETE /api/mafias/:id
 */
export const deactivateMafia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Check if user is admin
    const { data: member } = await supabase
      .from('mafia_members')
      .select('role')
      .eq('mafia_id', id)
      .eq('user_id', userId)
      .single();

    if (!member || member.role !== 'admin') {
      res.status(403).json({ error: 'Only admin can deactivate mafia' });
      return;
    }

    // Delete the mafia (since we removed the status column)
    const { error } = await supabase
      .from('mafias')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting mafia:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    res.status(200).json({ message: 'Mafia deleted successfully' });
  } catch (error: any) {
    console.error('Error in deactivateMafia:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Generate founding member invite link (admin only)
 * GET /api/mafias/:id/generate-founding-link
 */
export const generateFoundingLink = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Check if user is admin
    const { data: member } = await supabase
      .from('mafia_members')
      .select('role')
      .eq('mafia_id', id)
      .eq('user_id', userId)
      .single();

    if (!member || member.role !== 'admin') {
      res.status(403).json({ error: 'Only admin can generate invite links' });
      return;
    }

    // Check if mafia has any paid members (if so, no more founding members allowed)
    const { count: paidCount } = await supabase
      .from('mafia_members')
      .select('*', { count: 'exact', head: true })
      .eq('mafia_id', id)
      .eq('role', 'paid');

    if (paidCount && paidCount > 0) {
      res
        .status(400)
        .json({ error: 'Cannot invite founding members after paid members have joined' });
      return;
    }

    // Check founding member count
    const { count: foundingCount } = await supabase
      .from('mafia_members')
      .select('*', { count: 'exact', head: true })
      .eq('mafia_id', id)
      .in('role', ['admin', 'founding']);

    const { data: mafia } = await supabase
      .from('mafias')
      .select('founding_members_limit')
      .eq('id', id)
      .single();

    if (foundingCount && mafia && foundingCount >= mafia.founding_members_limit) {
      res.status(400).json({ error: 'Founding member limit reached' });
      return;
    }

    // Generate unique token
    const token = crypto.randomBytes(32).toString('hex');

    // Set expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Create invite token
    const { data: inviteToken, error } = await supabase
      .from('mafia_invite_tokens')
      .insert({
        mafia_id: id,
        token,
        expires_at: expiresAt.toISOString(),
        max_uses: null, // Unlimited uses until expiration
        current_uses: 0,
        created_by: userId,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating invite token:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    const inviteLink = `${process.env.FRONTEND_URL || 'https://6degree.app'}/mafias/join/${token}`;

    res.status(200).json({
      invite_link: inviteLink,
      token,
      expires_at: inviteToken.expires_at,
    });
  } catch (error: any) {
    console.error('Error in generateFoundingLink:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Join as founding member via invite token
 * POST /api/mafias/join-founding/:token
 */
export const joinAsFoundingMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { token } = req.params;

    // Validate token
    const { data: inviteToken, error: tokenError } = await supabase
      .from('mafia_invite_tokens')
      .select('*')
      .eq('token', token)
      .single();

    if (tokenError || !inviteToken) {
      res.status(404).json({ error: 'Invalid invite link' });
      return;
    }

    if (new Date(inviteToken.expires_at) < new Date()) {
      res.status(400).json({ error: 'Invite link has expired' });
      return;
    }

    if (
      inviteToken.max_uses &&
      inviteToken.current_uses >= inviteToken.max_uses
    ) {
      res.status(400).json({ error: 'Invite link has reached maximum uses' });
      return;
    }

    const mafiaId = inviteToken.mafia_id;

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('mafia_members')
      .select('id')
      .eq('mafia_id', mafiaId)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      res.status(400).json({ error: 'You are already a member of this mafia' });
      return;
    }

    // Check if mafia has paid members (if so, can't join as founding)
    const { count: paidCount } = await supabase
      .from('mafia_members')
      .select('*', { count: 'exact', head: true })
      .eq('mafia_id', mafiaId)
      .eq('role', 'paid');

    if (paidCount && paidCount > 0) {
      res
        .status(400)
        .json({ error: 'Cannot join as founding member after paid members have joined' });
      return;
    }

    // Check founding member limit
    const { count: foundingCount } = await supabase
      .from('mafia_members')
      .select('*', { count: 'exact', head: true })
      .eq('mafia_id', mafiaId)
      .in('role', ['admin', 'founding']);

    const { data: mafia } = await supabase
      .from('mafias')
      .select('founding_members_limit')
      .eq('id', mafiaId)
      .single();

    if (foundingCount && mafia && foundingCount >= mafia.founding_members_limit) {
      res.status(400).json({ error: 'Founding member limit reached' });
      return;
    }

    // Add user as founding member
    const { data: newMember, error: memberError } = await supabase
      .from('mafia_members')
      .insert({
        mafia_id: mafiaId,
        user_id: userId,
        role: 'founding',
        subscription_status: null,
        next_payment_date: null,
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error adding founding member:', memberError);
      res.status(500).json({ error: memberError.message });
      return;
    }

    // Increment token usage
    await supabase
      .from('mafia_invite_tokens')
      .update({ current_uses: inviteToken.current_uses + 1 })
      .eq('id', inviteToken.id);

    // Add to group conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('mafia_id', mafiaId)
      .single();

    if (conversation) {
      await supabase.from('conversation_participants').insert({
        conversation_id: conversation.id,
        user_id: userId,
      });
    }

    res.status(200).json({
      message: 'Successfully joined as founding member',
      member: newMember,
    });
  } catch (error: any) {
    console.error('Error in joinAsFoundingMember:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Join as paid member (deduct from wallet)
 * POST /api/mafias/:id/join-paid
 */
export const joinAsPaidMember = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Check if user is already a member
    const { data: existingMember } = await supabase
      .from('mafia_members')
      .select('id')
      .eq('mafia_id', id)
      .eq('user_id', userId)
      .single();

    if (existingMember) {
      res.status(400).json({ error: 'You are already a member of this mafia' });
      return;
    }

    // Get mafia details
    const { data: mafia, error: mafiaError } = await supabase
      .from('mafias')
      .select('monthly_price_usd, monthly_price_inr, currency, conversation_id')
      .eq('id', id)
      .single();

    if (mafiaError || !mafia) {
      res.status(404).json({ error: 'Mafia not found' });
      return;
    }

    // Check wallet balance
    const { data: wallet, error: walletError } = await supabase
      .from('wallets')
      .select('balance')
      .eq('user_id', userId)
      .single();

    if (walletError || !wallet) {
      res.status(400).json({ error: 'Wallet not found' });
      return;
    }

    if (wallet.balance < mafia.monthly_price) {
      res.status(400).json({ error: 'Insufficient wallet balance' });
      return;
    }

    // Calculate next payment date (1 month from now)
    const nextPaymentDate = new Date();
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    // Add user as paid member
    const { data: newMember, error: memberError } = await supabase
      .from('mafia_members')
      .insert({
        mafia_id: id,
        user_id: userId,
        role: 'paid',
        subscription_status: 'active',
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error adding paid member:', memberError);
      res.status(500).json({ error: memberError.message });
      return;
    }

    // Process initial payment
    const paymentResult = await processMemberSubscription(
      newMember.id,
      id,
      userId,
      mafia.monthly_price
    );

    if (!paymentResult.success) {
      // Rollback membership
      await supabase.from('mafia_members').delete().eq('id', newMember.id);
      res.status(400).json({ error: paymentResult.error || 'Payment failed' });
      return;
    }

    // Add to group conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('mafia_id', id)
      .single();

    if (conversation) {
      await supabase.from('conversation_participants').insert({
        conversation_id: conversation.id,
        user_id: userId,
      });
    }

    res.status(200).json({
      message: 'Successfully joined as paid member',
      member: newMember,
    });
  } catch (error: any) {
    console.error('Error in joinAsPaidMember:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Leave mafia
 * POST /api/mafias/:id/leave
 */
export const leaveMafia = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Check membership
    const { data: member } = await supabase
      .from('mafia_members')
      .select('id, role')
      .eq('mafia_id', id)
      .eq('user_id', userId)
      .single();

    if (!member) {
      res.status(404).json({ error: 'You are not a member of this mafia' });
      return;
    }

    if (member.role === 'admin') {
      res
        .status(400)
        .json({ error: 'Admin cannot leave. Please deactivate the mafia instead.' });
      return;
    }

    // Remove from mafia_members
    const { error } = await supabase
      .from('mafia_members')
      .delete()
      .eq('id', member.id);

    if (error) {
      console.error('Error leaving mafia:', error);
      res.status(500).json({ error: error.message });
      return;
    }

    // Remove from group conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('mafia_id', id)
      .single();

    if (conversation) {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversation.id)
        .eq('user_id', userId);
    }

    res.status(200).json({ message: 'Successfully left mafia' });
  } catch (error: any) {
    console.error('Error in leaveMafia:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Get revenue stats (admin and founding members only)
 * GET /api/mafias/:id/revenue
 */
export const getMafiaRevenueStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Check if user is admin or founding member
    const { data: member } = await supabase
      .from('mafia_members')
      .select('role')
      .eq('mafia_id', id)
      .eq('user_id', userId)
      .single();

    if (!member || !['admin', 'founding'].includes(member.role)) {
      res.status(403).json({ error: 'Only admin and founding members can view revenue' });
      return;
    }

    const revenue = await getMafiaRevenue(id);

    res.status(200).json({ revenue });
  } catch (error: any) {
    console.error('Error in getMafiaRevenueStats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

