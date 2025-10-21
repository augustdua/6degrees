import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { getWorkosAuthorizeUrl } from '../services/workosService';
import { randomUUID } from 'crypto';

export const registerBroker = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('users')
      .update({ is_broker: true })
      .eq('id', userId);

    if (error) {
      return res.status(500).json({ error: 'Failed to register as broker' });
    }

    return res.json({ message: 'Registered as broker' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};

export const createVerificationLink = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Ensure user is broker
    const { data: user } = await supabase
      .from('users')
      .select('is_broker')
      .eq('id', userId)
      .single();
    if (!user?.is_broker) {
      return res.status(403).json({ error: 'Only brokers can create verification links' });
    }

    const {
      expected_company_domain,
      expected_company_name,
      expected_title,
      target_email,
      listing_title,
      listing_description,
      listing_price_inr
    } = req.body;

    const state = randomUUID();
    const authorizeUrl = getWorkosAuthorizeUrl({ state, domainHint: expected_company_domain || undefined });

    const { data: record, error } = await supabase
      .from('broker_verifications')
      .insert({
        broker_user_id: userId,
        expected_company_domain,
        expected_company_name,
        expected_title,
        target_email,
        workos_state: state,
        verification_url: authorizeUrl,
        listing_title,
        listing_description,
        listing_price_inr
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to create verification link' });
    }

    return res.status(201).json({ verification: record, link: authorizeUrl });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
};












