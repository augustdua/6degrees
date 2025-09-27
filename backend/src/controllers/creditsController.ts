import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

export interface CreditTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earned' | 'spent';
  source: 'join_chain' | 'others_joined' | 'unlock_chain' | 'bonus' | 'initial_bonus';
  description: string;
  chain_id?: string;
  request_id?: string;
  related_user_id?: string;
  created_at: string;
}

export interface UserCredits {
  id: string;
  user_id: string;
  total_credits: number;
  earned_credits: number;
  spent_credits: number;
  created_at: string;
  updated_at: string;
}

// Get user's current credit balance
export const getUserCredits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: credits, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching user credits:', error);
      res.status(500).json({ error: 'Failed to fetch credits' });
      return;
    }

    // If no credits record exists, create one with 0 credits
    if (!credits) {
      const { data: newCredits, error: createError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          total_credits: 0,
          earned_credits: 0,
          spent_credits: 0
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating user credits:', createError);
        res.status(500).json({ error: 'Failed to create credits record' });
        return;
      }

      res.json(newCredits);
      return;
    }

    res.json(credits);
  } catch (error) {
    console.error('Error in getUserCredits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Get user's credit transaction history
export const getCreditTransactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { limit = 50, offset = 0 } = req.query;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: transactions, error } = await supabase
      .from('credit_transactions')
      .select(`
        *,
        chains(
          id,
          participants
        ),
        connection_requests(
          id,
          target,
          reward
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error fetching credit transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
      return;
    }

    res.json(transactions);
  } catch (error) {
    console.error('Error in getCreditTransactions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Award credits to a user
export const awardCredits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const {
      amount,
      source,
      description,
      chain_id,
      request_id,
      related_user_id
    } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    if (!source || !description) {
      res.status(400).json({ error: 'Source and description are required' });
      return;
    }

    // Create credit transaction
    const { data: transaction, error } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount,
        transaction_type: 'earned',
        source,
        description,
        chain_id,
        request_id,
        related_user_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating credit transaction:', error);
      res.status(500).json({ error: 'Failed to award credits' });
      return;
    }

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Error in awardCredits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Spend credits
export const spendCredits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const {
      amount,
      source,
      description,
      chain_id,
      request_id
    } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!amount || amount <= 0) {
      res.status(400).json({ error: 'Invalid amount' });
      return;
    }

    if (!source || !description) {
      res.status(400).json({ error: 'Source and description are required' });
      return;
    }

    // Check if user has sufficient credits
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('total_credits')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error('Error fetching user credits:', creditsError);
      res.status(500).json({ error: 'Failed to check credits balance' });
      return;
    }

    if (!userCredits || userCredits.total_credits < amount) {
      res.status(400).json({ error: 'Insufficient credits' });
      return;
    }

    // Create credit transaction
    const { data: transaction, error } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount,
        transaction_type: 'spent',
        source,
        description,
        chain_id,
        request_id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating credit transaction:', error);
      res.status(500).json({ error: 'Failed to spend credits' });
      return;
    }

    res.json({ success: true, transaction });
  } catch (error) {
    console.error('Error in spendCredits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Handle join chain credits (award to joiner and chain creator)
export const handleJoinChainCredits = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { chain_id, request_id, creator_id } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!chain_id || !request_id || !creator_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Get user and creator info for descriptions
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, first_name, last_name')
      .in('id', [userId, creator_id]);

    if (usersError) {
      console.error('Error fetching user info:', usersError);
      res.status(500).json({ error: 'Failed to fetch user info' });
      return;
    }

    const joiner = users?.find(u => u.id === userId);
    const creator = users?.find(u => u.id === creator_id);

    const transactions = [];

    // Award credits to joiner (2 credits)
    const { data: joinerTransaction, error: joinerError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: 2,
        transaction_type: 'earned',
        source: 'join_chain',
        description: 'Earned for joining a connection chain',
        chain_id,
        request_id
      })
      .select()
      .single();

    if (joinerError) {
      console.error('Error awarding credits to joiner:', joinerError);
      res.status(500).json({ error: 'Failed to award joiner credits' });
      return;
    }

    transactions.push(joinerTransaction);

    // Award credits to chain creator (3 credits) - only if different from joiner
    if (creator_id !== userId) {
      const { data: creatorTransaction, error: creatorError } = await supabase
        .from('credit_transactions')
        .insert({
          user_id: creator_id,
          amount: 3,
          transaction_type: 'earned',
          source: 'others_joined',
          description: `Earned when ${joiner?.first_name} ${joiner?.last_name} joined your chain`,
          chain_id,
          request_id,
          related_user_id: userId
        })
        .select()
        .single();

      if (creatorError) {
        console.error('Error awarding credits to creator:', creatorError);
        // Continue anyway, don't fail the whole request
      } else {
        transactions.push(creatorTransaction);
      }
    }

    res.json({ success: true, transactions });
  } catch (error) {
    console.error('Error in handleJoinChainCredits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Unlock completed chain
export const unlockChain = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { chain_id, request_id, credits_cost } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!chain_id || !request_id || !credits_cost) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if already unlocked
    const { data: existing, error: existingError } = await supabase
      .from('unlocked_chains')
      .select('id')
      .eq('user_id', userId)
      .eq('chain_id', chain_id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing unlock:', existingError);
      res.status(500).json({ error: 'Failed to check unlock status' });
      return;
    }

    if (existing) {
      res.status(400).json({ error: 'Chain already unlocked' });
      return;
    }

    // Check credits balance
    const { data: userCredits, error: creditsError } = await supabase
      .from('user_credits')
      .select('total_credits')
      .eq('user_id', userId)
      .single();

    if (creditsError) {
      console.error('Error fetching user credits:', creditsError);
      res.status(500).json({ error: 'Failed to check credits balance' });
      return;
    }

    if (!userCredits || userCredits.total_credits < credits_cost) {
      res.status(400).json({ error: 'Insufficient credits' });
      return;
    }

    // Spend credits
    const { data: transaction, error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount: credits_cost,
        transaction_type: 'spent',
        source: 'unlock_chain',
        description: 'Spent to unlock completed chain details',
        chain_id,
        request_id
      })
      .select()
      .single();

    if (transactionError) {
      console.error('Error creating spend transaction:', transactionError);
      res.status(500).json({ error: 'Failed to spend credits' });
      return;
    }

    // Create unlock record
    const { data: unlock, error: unlockError } = await supabase
      .from('unlocked_chains')
      .insert({
        user_id: userId,
        chain_id,
        request_id,
        credits_spent: credits_cost
      })
      .select()
      .single();

    if (unlockError) {
      console.error('Error creating unlock record:', unlockError);
      res.status(500).json({ error: 'Failed to unlock chain' });
      return;
    }

    res.json({ success: true, transaction, unlock });
  } catch (error) {
    console.error('Error in unlockChain:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Toggle chain like
export const toggleChainLike = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { chain_id, request_id } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!chain_id || !request_id) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    // Check if already liked
    const { data: existing, error: existingError } = await supabase
      .from('chain_likes')
      .select('id')
      .eq('user_id', userId)
      .eq('chain_id', chain_id)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Error checking existing like:', existingError);
      res.status(500).json({ error: 'Failed to check like status' });
      return;
    }

    if (existing) {
      // Unlike
      const { error: deleteError } = await supabase
        .from('chain_likes')
        .delete()
        .eq('id', existing.id);

      if (deleteError) {
        console.error('Error removing like:', deleteError);
        res.status(500).json({ error: 'Failed to remove like' });
        return;
      }

      res.json({ success: true, liked: false });
    } else {
      // Like
      const { data: like, error: createError } = await supabase
        .from('chain_likes')
        .insert({
          user_id: userId,
          chain_id,
          request_id
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating like:', createError);
        res.status(500).json({ error: 'Failed to create like' });
        return;
      }

      res.json({ success: true, liked: true, like });
    }
  } catch (error) {
    console.error('Error in toggleChainLike:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};