import { supabase } from './supabase';

export interface ChainParticipant {
  userid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'creator' | 'forwarder' | 'target' | 'connector';
  joinedAt: string;
  rewardAmount: number;
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
}

/**
 * Creates a new chain or joins an existing one
 */
export async function createOrJoinChain(requestId: string, options: CreateOrJoinOptions): Promise<ChainData> {
  // First, try to get the existing chain
  const { data: existingChain, error: fetchError } = await supabase
    .from('chains')
    .select('*')
    .eq('request_id', requestId)
    .maybeSingle();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Failed to fetch chain: ${fetchError.message}`);
  }

  // If chain exists, join it
  if (existingChain) {
    return await joinExistingChain(existingChain, options);
  }

  // If chain doesn't exist, create it
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
    .single();

  if (requestError) {
    throw new Error(`Failed to fetch request details: ${requestError.message}`);
  }

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
        rewardAmount: 0
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
  const existingParticipant = chain.participants.find(p => p.userid === user.id);
  
  if (existingParticipant) {
    throw new Error('You are already part of this chain');
  }

  // Check if chain is still active
  if (chain.status !== 'active') {
    throw new Error('This chain is no longer active');
  }

  // Add user to chain
  const updatedParticipants = [
    ...chain.participants,
    {
      userid: user.id,
      email: user.email || '',
      firstName: user.user_metadata?.first_name || 'User',
      lastName: user.user_metadata?.last_name || '',
      role: options.role,
      joinedAt: new Date().toISOString(),
      rewardAmount: 0
    }
  ];

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

  return updatedChain;
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