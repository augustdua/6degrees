import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

// Create request with credit deduction
export const createRequest = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { target, message, credit_cost, target_cash_reward } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Validate inputs
    if (!target || target.length < 10 || target.length > 200) {
      return res.status(400).json({ error: 'Target must be between 10 and 200 characters' });
    }

    if (message && message.length > 1000) {
      return res.status(400).json({ error: 'Message must be less than 1000 characters' });
    }

    if (!credit_cost || credit_cost < 10 || credit_cost > 1000) {
      return res.status(400).json({ error: 'Credit cost must be between 10 and 1000' });
    }

    if (target_cash_reward && (target_cash_reward < 10 || target_cash_reward > 10000)) {
      return res.status(400).json({ error: 'Target cash reward must be between 10 and 10000' });
    }

    // Generate shareable link
    const shareableLink = uuidv4();

    // Use database function to create request and deduct credits
    const { data, error } = await supabase.rpc('create_request_with_credits', {
      p_creator_id: userId,
      p_target: target,
      p_message: message || null,
      p_credit_cost: credit_cost,
      p_target_cash_reward: target_cash_reward || null,
      p_shareable_link: shareableLink
    });

    if (error) {
      console.error('Error creating request:', error);
      if (error.message?.includes('Insufficient credits')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(500).json({ error: 'Failed to create request' });
    }

    // Get the created request
    const { data: request, error: fetchError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', data)
      .single();

    if (fetchError) {
      console.error('Error fetching created request:', fetchError);
      return res.status(500).json({ error: 'Request created but failed to fetch details' });
    }

    return res.status(201).json({ success: true, request });
  } catch (error) {
    console.error('Error in createRequest:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyRequests = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Request retrieval functionality not yet implemented'
  });
};

export const getRequestByLink = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Request link functionality not yet implemented'
  });
};

export const joinChain = async (req: AuthenticatedRequest, res: Response) => {
  return res.status(501).json({
    success: false,
    message: 'Chain joining functionality not yet implemented'
  });
};

export const completeChain = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { requestId } = req.params;
    const { chain_id } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!chain_id) {
      return res.status(400).json({ error: 'Chain ID is required' });
    }

    // Use the new credit distribution function
    const { data, error } = await supabase.rpc('complete_chain_and_distribute_credits', {
      chain_uuid: chain_id
    });

    if (error) {
      console.error('Error completing chain:', error);
      return res.status(500).json({ error: 'Failed to complete chain' });
    }

    return res.status(200).json({ success: true, message: 'Chain completed and credits distributed' });
  } catch (error) {
    console.error('Error in completeChain:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};