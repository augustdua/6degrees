import { Router } from 'express';
import { supabase } from '../lib/supabase';
import { authenticateUser } from '../middleware/auth';

const router = Router();

/**
 * GET /api/profile/:userId
 * Get public profile data for a user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Call the database function to get profile data
    const { data, error } = await supabase.rpc('get_public_profile', {
      p_user_id: userId
    });

    if (error) {
      console.error('Error fetching profile:', error);
      return res.status(500).json({ error: 'Failed to fetch profile' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    // Check if profile is private
    if (!data.user.is_profile_public) {
      // Only return data if requester is the profile owner
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user } } = await supabase.auth.getUser(token);
        
        if (user && user.id === userId) {
          return res.json(data);
        }
      }
      
      return res.status(403).json({ error: 'This profile is private' });
    }

    res.json(data);
  } catch (error) {
    console.error('Error in GET /api/profile/:userId:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId/offers
 * Get active offers for a user
 */
router.get('/:userId/offers', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const { data, error } = await supabase
      .from('offers')
      .select('id, title, description, reward, currency, created_at')
      .eq('creator_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching offers:', error);
      return res.status(500).json({ error: 'Failed to fetch offers' });
    }

    res.json({ offers: data || [] });
  } catch (error) {
    console.error('Error in GET /api/profile/:userId/offers:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/:userId/requests
 * Get active connection requests for a user
 */
router.get('/:userId/requests', async (req, res) => {
  try {
    const { userId } = req.params;
    const limit = parseInt(req.query.limit as string) || 10;

    const { data, error } = await supabase
      .from('connection_requests')
      .select('id, target, message, reward, currency, created_at')
      .eq('creator_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching requests:', error);
      return res.status(500).json({ error: 'Failed to fetch requests' });
    }

    res.json({ requests: data || [] });
  } catch (error) {
    console.error('Error in GET /api/profile/:userId/requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/profile/me/featured-connections
 * Get current user's featured connections
 */
router.get('/me/featured-connections', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;

    const { data, error } = await supabase
      .from('user_featured_connections')
      .select(`
        id,
        user_id,
        featured_user_id,
        featured_email,
        display_order,
        user:users!user_featured_connections_featured_user_id_fkey(
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .eq('user_id', userId)
      .order('display_order');

    if (error) {
      console.error('Error fetching featured connections:', error);
      return res.status(500).json({ error: 'Failed to fetch featured connections' });
    }

    res.json({ featured_connections: data || [] });
  } catch (error) {
    console.error('Error in GET /api/users/me/featured-connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/profile/me/featured-connections
 * Add a featured connection
 */
router.post('/me/featured-connections', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { featured_user_id, featured_email, display_order } = req.body;

    // Validate that either featured_user_id or featured_email is provided
    if (!featured_user_id && !featured_email) {
      return res.status(400).json({ error: 'Either featured_user_id or featured_email is required' });
    }

    if (featured_user_id && featured_email) {
      return res.status(400).json({ error: 'Provide either featured_user_id or featured_email, not both' });
    }

    // Check if user has reached the limit
    const { count, error: countError } = await supabase
      .from('user_featured_connections')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (countError) {
      console.error('Error counting featured connections:', countError);
      return res.status(500).json({ error: 'Failed to add featured connection' });
    }

    if ((count || 0) >= 8) {
      return res.status(400).json({ error: 'Maximum of 8 featured connections allowed' });
    }

    const { data, error } = await supabase
      .from('user_featured_connections')
      .insert({
        user_id: userId,
        featured_user_id: featured_user_id || null,
        featured_email: featured_email || null,
        display_order: display_order || count || 0
      })
      .select()
      .single();

    if (error) {
      console.error('Error adding featured connection:', error);
      return res.status(500).json({ error: 'Failed to add featured connection' });
    }

    res.json({ featured_connection: data });
  } catch (error) {
    console.error('Error in POST /api/users/me/featured-connections:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/profile/me/featured-connections/:id
 * Remove a featured connection
 */
router.delete('/me/featured-connections/:id', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    const { error } = await supabase
      .from('user_featured_connections')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error removing featured connection:', error);
      return res.status(500).json({ error: 'Failed to remove featured connection' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/users/me/featured-connections/:id:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/profile/me/featured-connections/order
 * Update display order of featured connections
 */
router.put('/me/featured-connections/order', authenticateUser, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { orders } = req.body; // Array of { id, display_order }

    if (!Array.isArray(orders)) {
      return res.status(400).json({ error: 'orders must be an array' });
    }

    // Update each connection's display order
    const updates = orders.map(({ id, display_order }) =>
      supabase
        .from('user_featured_connections')
        .update({ display_order })
        .eq('id', id)
        .eq('user_id', userId)
    );

    await Promise.all(updates);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in PUT /api/users/me/featured-connections/order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

