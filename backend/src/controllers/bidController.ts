import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
  };
}

export const createBid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { title, description, connectionType, price } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
      return;
    }

    if (!title || !description || !connectionType || !price) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    if (price <= 0) {
      res.status(400).json({ error: 'Price must be greater than 0' });
      return;
    }

    const { data, error } = await supabase
      .from('bids')
      .insert({
        creator_id: userId,
        title,
        description,
        connection_type: connectionType,
        price,
        status: 'active'
      })
      .select(`
        *,
        creator:users!creator_id(
          id,
          first_name,
          last_name,
          avatar_url,
          bio
        )
      `)
      .single();

    if (error) {
      console.error('Error creating bid:', error);
      res.status(500).json({ error: 'Failed to create bid' });
      return;
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in createBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBids = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit = 20, offset = 0, status = 'active' } = req.query;

    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        creator:users!creator_id(
          id,
          first_name,
          last_name,
          avatar_url,
          bio
        )
      `)
      .eq('status', status)
      .order('created_at', { ascending: false })
      .range(Number(offset), Number(offset) + Number(limit) - 1);

    if (error) {
      console.error('Error fetching bids:', error);
      res.status(500).json({ error: 'Failed to fetch bids' });
      return;
    }

    // Get likes and responses count for each bid
    const bidsWithCounts = await Promise.all(
      data.map(async (bid) => {
        const [likesResult, responsesResult] = await Promise.all([
          supabase
            .from('bid_likes')
            .select('id', { count: 'exact' })
            .eq('bid_id', bid.id),
          supabase
            .from('bid_responses')
            .select('id', { count: 'exact' })
            .eq('bid_id', bid.id)
        ]);

        return {
          ...bid,
          likes_count: likesResult.count || 0,
          responses_count: responsesResult.count || 0
        };
      })
    );

    res.json(bidsWithCounts);
  } catch (error) {
    console.error('Error in getBids:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getBidById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('bids')
      .select(`
        *,
        creator:users!creator_id(
          id,
          first_name,
          last_name,
          avatar_url,
          bio
        ),
        likes_count:bid_likes(count),
        responses_count:bid_responses(count)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching bid:', error);
      res.status(404).json({ error: 'Bid not found' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in getBidById:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateBid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, connectionType, price } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user owns the bid
    const { data: bid, error: fetchError } = await supabase
      .from('bids')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !bid) {
      res.status(404).json({ error: 'Bid not found' });
      return;
    }

    if (bid.creator_id !== userId) {
      res.status(403).json({ error: 'Not authorized to update this bid' });
      return;
    }

    const updateData: any = {};
    if (title) updateData.title = title;
    if (description) updateData.description = description;
    if (connectionType) updateData.connection_type = connectionType;
    if (price) updateData.price = price;

    const { data, error } = await supabase
      .from('bids')
      .update(updateData)
      .eq('id', id)
      .select(`
        *,
        creator:users!creator_id(
          id,
          first_name,
          last_name,
          avatar_url,
          bio
        )
      `)
      .single();

    if (error) {
      console.error('Error updating bid:', error);
      res.status(500).json({ error: 'Failed to update bid' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in updateBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteBid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user owns the bid
    const { data: bid, error: fetchError } = await supabase
      .from('bids')
      .select('creator_id')
      .eq('id', id)
      .single();

    if (fetchError || !bid) {
      res.status(404).json({ error: 'Bid not found' });
      return;
    }

    if (bid.creator_id !== userId) {
      res.status(403).json({ error: 'Not authorized to delete this bid' });
      return;
    }

    const { error } = await supabase
      .from('bids')
      .update({ status: 'deleted' })
      .eq('id', id);

    if (error) {
      console.error('Error deleting bid:', error);
      res.status(500).json({ error: 'Failed to delete bid' });
    }

    res.json({ message: 'Bid deleted successfully' });
  } catch (error) {
    console.error('Error in deleteBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const likeBid = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
    }

    // Check if user already liked this bid
    const { data: existingLike } = await supabase
      .from('bid_likes')
      .select('id')
      .eq('bid_id', id)
      .eq('user_id', userId)
      .single();

    if (existingLike) {
      // Unlike
      const { error } = await supabase
        .from('bid_likes')
        .delete()
        .eq('bid_id', id)
        .eq('user_id', userId);

      if (error) {
        console.error('Error removing like:', error);
        res.status(500).json({ error: 'Failed to remove like' });
      }

      res.json({ liked: false, message: 'Like removed' });
    } else {
      // Like
      const { error } = await supabase
        .from('bid_likes')
        .insert({
          bid_id: id,
          user_id: userId
        });

      if (error) {
        console.error('Error adding like:', error);
        res.status(500).json({ error: 'Failed to add like' });
      }

      res.json({ liked: true, message: 'Bid liked' });
    }
  } catch (error) {
    console.error('Error in likeBid:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const contactBidCreator = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      res.status(401).json({ error: 'User not authenticated' });
    }

    if (!message) {
      res.status(400).json({ error: 'Message is required' });
    }

    // Get bid details
    const { data: bid, error: bidError } = await supabase
      .from('bids')
      .select('creator_id, title')
      .eq('id', id)
      .single();

    if (bidError || !bid) {
      res.status(404).json({ error: 'Bid not found' });
    }

    // Create bid response
    const { data, error } = await supabase
      .from('bid_responses')
      .insert({
        bid_id: id,
        responder_id: userId,
        message,
        status: 'pending'
      })
      .select(`
        *,
        responder:users!responder_id(
          id,
          first_name,
          last_name,
          avatar_url,
          bio
        )
      `)
      .single();

    if (error) {
      console.error('Error creating bid response:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }

    res.status(201).json(data);
  } catch (error) {
    console.error('Error in contactBidCreator:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
