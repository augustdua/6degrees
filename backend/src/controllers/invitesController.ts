import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

export const createInviteNotification = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { invite_uuid } = req.body;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    if (!invite_uuid) {
      res.status(400).json({ error: 'Missing invite_uuid' });
      return;
    }

    const { data, error } = await supabase.rpc('create_invite_notification', {
      invite_uuid: invite_uuid
    });

    if (error) {
      console.error('Error creating invite notification:', error);
      res.status(500).json({ error: 'Failed to create invite notification' });
      return;
    }

    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error in createInviteNotification:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

