import { Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

/**
 * Get connection stories for a user
 */
export const getConnectionStories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const targetUserId = userId || req.user?.id;

    if (!targetUserId) {
      res.status(400).json({ error: 'User ID required' });
      return;
    }

    const { data, error } = await supabase
      .from('connection_stories')
      .select(`
        id,
        photo_url,
        story,
        location,
        year,
        display_order,
        featured_connection_id,
        featured_connection_name,
        created_at,
        featured_user:users!connection_stories_featured_connection_id_fkey(
          id,
          first_name,
          last_name,
          profile_picture_url
        )
      `)
      .eq('user_id', targetUserId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching connection stories:', error);
      res.status(500).json({ error: 'Failed to fetch stories' });
      return;
    }

    // Transform to include featured connection name
    const stories = (data || []).map((story: any) => {
      const featuredUser = Array.isArray(story.featured_user) 
        ? story.featured_user[0] 
        : story.featured_user;
      return {
        ...story,
        featured_connection_name: featuredUser 
          ? `${featuredUser.first_name} ${featuredUser.last_name}`
          : story.featured_connection_name,
        featured_connection_photo: featuredUser?.profile_picture_url || null
      };
    });

    res.json({ stories });
  } catch (error) {
    console.error('Error in getConnectionStories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Create a new connection story
 */
export const createConnectionStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { 
      photo_url, 
      story, 
      featured_connection_id, 
      featured_connection_name,
      featured_connection_email,
      location,
      year 
    } = req.body;

    if (!photo_url) {
      res.status(400).json({ error: 'Photo URL is required' });
      return;
    }

    // Get max display order
    const { data: maxOrder } = await supabase
      .from('connection_stories')
      .select('display_order')
      .eq('user_id', userId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    const nextOrder = (maxOrder?.display_order || 0) + 1;

    // Check max stories limit (6)
    const { count } = await supabase
      .from('connection_stories')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true);

    if ((count || 0) >= 6) {
      res.status(400).json({ error: 'Maximum 6 connection stories allowed' });
      return;
    }

    const { data, error } = await supabase
      .from('connection_stories')
      .insert({
        user_id: userId,
        photo_url,
        story: story || null,
        featured_connection_id: featured_connection_id || null,
        featured_connection_name: featured_connection_name || null,
        featured_connection_email: featured_connection_email || null,
        location: location || null,
        year: year || null,
        display_order: nextOrder
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating connection story:', error);
      res.status(500).json({ error: 'Failed to create story' });
      return;
    }

    res.status(201).json({ story: data });
  } catch (error) {
    console.error('Error in createConnectionStory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a connection story
 */
export const updateConnectionStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { storyId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { 
      photo_url, 
      story, 
      featured_connection_id, 
      featured_connection_name,
      location,
      year 
    } = req.body;

    const { data, error } = await supabase
      .from('connection_stories')
      .update({
        photo_url,
        story,
        featured_connection_id,
        featured_connection_name,
        location,
        year
      })
      .eq('id', storyId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating connection story:', error);
      res.status(500).json({ error: 'Failed to update story' });
      return;
    }

    res.json({ story: data });
  } catch (error) {
    console.error('Error in updateConnectionStory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Delete a connection story
 */
export const deleteConnectionStory = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { storyId } = req.params;

    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Soft delete
    const { error } = await supabase
      .from('connection_stories')
      .update({ is_active: false })
      .eq('id', storyId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting connection story:', error);
      res.status(500).json({ error: 'Failed to delete story' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error in deleteConnectionStory:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Reorder connection stories
 */
export const reorderConnectionStories = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { orders } = req.body; // Array of { id, display_order }

    if (!Array.isArray(orders)) {
      res.status(400).json({ error: 'orders must be an array' });
      return;
    }

    // Update each story's display order
    const updates = orders.map(({ id, display_order }) =>
      supabase
        .from('connection_stories')
        .update({ display_order })
        .eq('id', id)
        .eq('user_id', userId)
    );

    await Promise.all(updates);

    res.json({ success: true });
  } catch (error) {
    console.error('Error in reorderConnectionStories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

