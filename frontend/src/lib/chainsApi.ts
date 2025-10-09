import { supabase } from './supabase';
import { generateShareableLink } from './shareUtils';

export interface ChainParticipant {
  userid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'creator' | 'forwarder' | 'target' | 'connector';
  joinedAt: string;
  rewardAmount: number;
  shareableLink?: string;
  parentUserId?: string; // The user whose link was clicked to join
}

export interface ChainData {
  id: string;
  request_id: string;
  participants: ChainParticipant[];
  status: 'active' | 'completed' | 'failed';
  total_reward: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateOrJoinOptions {
  totalReward: number;
  role: 'creator' | 'forwarder';
  parentUserId?: string; // The user whose link was clicked to join
}

/**
 * Creates a new chain or joins an existing one
 * Now supports connecting to specific parent nodes
 */
export async function createOrJoinChain(requestId: string, options: CreateOrJoinOptions): Promise<ChainData> {
  // Get current user first
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in to create or join a chain');
  }

  // Get the single chain for this request (there should only be one chain per request)
  const { data: existingChains, error: fetchError } = await supabase
    .from('chains')
    .select('*')
    .eq('request_id', requestId)
    .limit(1);

  if (fetchError) {
    console.error('Error fetching existing chains:', fetchError);
    throw new Error(`Failed to fetch chains: ${fetchError.message}`);
  }

  // If a chain exists, join it
  if (existingChains && existingChains.length > 0) {
    const existingChain = existingChains[0];
    console.log(`Joining existing chain ${existingChain.id}`);
    return await joinExistingChain(existingChain, options);
  }

  // If no chain exists, create a new one
  return await createNewChain(requestId, options);
}

/**
 * Creates a new chain
 */
async function createNewChain(requestId: string, options: CreateOrJoinOptions): Promise<ChainData> {
  // Get request details to create chain with creator info
  const { data: requestData, error: requestError } = await supabase
    .from('connection_requests')
    .select(`
      *,
      creator:users!creator_id (
        id,
        first_name,
        last_name,
        email
      )
    `)
    .eq('id', requestId)
    .maybeSingle();

  if (requestError) {
    throw new Error(`Failed to fetch request details: ${requestError.message}`);
  }

  if (!requestData) {
    throw new Error('Request not found');
  }

  // Generate unique shareable link for creator
  const creatorLinkId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const creatorShareableLink = generateShareableLink(creatorLinkId);

  // Create the chain with creator as first participant
  const { data: chainData, error: chainError } = await supabase
    .from('chains')
    .insert({
      request_id: requestId,
      participants: [{
        userid: requestData.creator_id,
        email: requestData.creator?.email || '',
        firstName: requestData.creator?.first_name || 'Creator',
        lastName: requestData.creator?.last_name || '',
        role: 'creator',
        joinedAt: new Date().toISOString(),
        rewardAmount: 0,
        shareableLink: creatorShareableLink,
        parentUserId: null // Creator has no parent
      }],
      total_reward: options.totalReward,
      status: 'active'
    })
    .select()
    .single();

  if (chainError) {
    throw new Error(`Failed to create chain: ${chainError.message}`);
  }

  return chainData;
}

/**
 * Joins an existing chain
 */
async function joinExistingChain(chain: ChainData, options: CreateOrJoinOptions): Promise<ChainData> {
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    throw new Error('You must be logged in to join a chain');
  }

  // Check if user is already in the chain
  const existingParticipant = chain.participants.find((p: any) => p.userid === user.id);

  if (existingParticipant) {
    throw new Error('You are already part of this chain');
  }

  // Verify the parent user exists in the chain if parentUserId is provided
  if (options.parentUserId) {
    const parentExists = chain.participants.find((p: any) => p.userid === options.parentUserId);
    if (!parentExists) {
      throw new Error('Invalid referrer - the person who shared this link is not in the chain');
    }
  }

  // Check if chain is still active
  if (chain.status !== 'active') {
    throw new Error('This chain is no longer active');
  }

  // Get user details from users table
  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('first_name, last_name')
    .eq('id', user.id)
    .single();

  if (userDataError) {
    console.warn('Could not fetch user details:', userDataError);
  }

  // Generate unique shareable link for the new participant
  const linkId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  const shareableLink = generateShareableLink(linkId);

  // Add user to chain
  const now = new Date().toISOString();

  const updatedParticipants = [...chain.participants];

  // Add new participant
  updatedParticipants.push({
    userid: user.id,
    email: user.email || '',
    firstName: userData?.first_name || 'User',
    lastName: userData?.last_name || '',
    role: options.role,
    joinedAt: now,
    rewardAmount: 0,
    shareableLink: shareableLink,
    parentUserId: options.parentUserId || null // Track who referred this user
  });

  const { data: updatedChain, error: updateError } = await supabase
    .from('chains')
    .update({
      participants: updatedParticipants,
      updated_at: new Date().toISOString(),
    })
    .eq('id', chain.id)
    .select()
    .single();

  if (updateError) {
    throw new Error(`Failed to join chain: ${updateError.message}`);
  }

  // Award referral credits to parent user if they exist
  if (options.parentUserId) {
    try {
      const { error: creditError } = await supabase
        .rpc('award_join_credits', {
          p_chain_id: chain.id,
          p_new_user_id: user.id,
          p_parent_user_id: options.parentUserId
        });

      if (creditError) {
        console.error('Error awarding join credits:', creditError);
        // Don't throw - join was successful, credit award is secondary
      }
    } catch (creditError) {
      console.error('Error calling award_join_credits:', creditError);
      // Don't throw - join was successful, credit award is secondary
    }
  }

  return updatedChain;
}

/**
 * Get user's shareable link from a chain
 */
export function getUserShareableLink(chain: ChainData, userId: string): string | null {
  const participant = chain.participants.find(p => p.userid === userId);
  return participant?.shareableLink || null;
}

/**
 * Extract parent user ID from URL or shareable link
 */
export function extractParentUserIdFromLink(shareableLink: string, chain: ChainData): string | null {
  // Find the participant whose shareable link matches
  const participant = chain.participants.find(p => p.shareableLink === shareableLink);
  return participant?.userid || null;
}

/**
 * Explains Supabase errors in user-friendly terms
 */
export function explainSupabaseError(error: any): string {
  if (!error) return 'An unknown error occurred';

  // Handle specific Supabase error codes
  if (error.code === 'PGRST116') {
    return 'The requested resource was not found';
  }
  
  if (error.code === '42501') {
    return 'You do not have permission to perform this action. Please make sure you are logged in.';
  }
  
  if (error.code === '23505') {
    return 'This item already exists';
  }
  
  if (error.code === '23503') {
    return 'Cannot perform this action due to related data constraints';
  }

  // Handle network errors
  if (error.message?.includes('fetch')) {
    return 'Network error. Please check your internet connection and try again.';
  }

  // Handle authentication errors
  if (error.message?.includes('auth') || error.message?.includes('session')) {
    return 'Authentication error. Please log in again.';
  }

  // Return the original error message if it's user-friendly
  if (error.message && typeof error.message === 'string') {
    return error.message;
  }

  // Fallback
  return 'An unexpected error occurred. Please try again.';
}