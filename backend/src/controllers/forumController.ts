import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

// Allowed emojis for reactions
const ALLOWED_EMOJIS = ['❤️', '🔥', '🚀', '💯', '🙌', '🤝', '💸', '👀'];

// Quick reply types
const QUICK_REPLY_TYPES = ['can_intro', 'paid_intro', 'watching', 'ship_it', 'dm_me'];

// Quick reply display text
const QUICK_REPLY_TEXT: Record<string, string> = {
  can_intro: 'I can intro you 🤝',
  paid_intro: 'Paid intro available 💸',
  watching: 'Watching this 👀',
  ship_it: 'Ship it 🚀',
  dm_me: 'DM me'
};

// ============================================================================
// Communities
// ============================================================================

export const getCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data, error } = await supabase
      .from('forum_communities')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching communities:', error);
      res.status(500).json({ error: 'Failed to fetch communities' });
      return;
    }

    res.json({ communities: data });
  } catch (error: any) {
    console.error('Error in getCommunities:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getCommunityBySlug = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from('forum_communities')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      res.status(404).json({ error: 'Community not found' });
      return;
    }

    res.json({ community: data });
  } catch (error: any) {
    console.error('Error in getCommunityBySlug:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Posts
// ============================================================================

export const getPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { community, page = '1', limit = '20' } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        user:users!forum_posts_user_id_fkey(id, first_name, last_name, profile_picture_url, membership_tier),
        community:forum_communities!forum_posts_community_id_fkey(id, name, slug, icon, color),
        project:forum_projects(id, name, url, logo_url)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    if (community && community !== 'all') {
      // Get community ID by slug
      const { data: communityData } = await supabase
        .from('forum_communities')
        .select('id')
        .eq('slug', community)
        .single();

      if (communityData) {
        query = query.eq('community_id', communityData.id);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error);
      res.status(500).json({ error: 'Failed to fetch posts' });
      return;
    }

    // Get reaction counts for each post
    const postsWithReactions = await Promise.all(
      (data || []).map(async (post) => {
        const { data: reactions } = await supabase
          .from('forum_reactions')
          .select('emoji')
          .eq('target_type', 'post')
          .eq('target_id', post.id);

        const reactionCounts: Record<string, number> = {};
        (reactions || []).forEach((r) => {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
        });

        // Get comment count
        const { count: commentCount } = await supabase
          .from('forum_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('is_deleted', false);

        return {
          ...post,
          reaction_counts: reactionCounts,
          comment_count: commentCount || 0
        };
      })
    );

    res.json({ posts: postsWithReactions, page: pageNum, limit: limitNum });
  } catch (error: any) {
    console.error('Error in getPosts:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPostById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const { data: post, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        user:users!forum_posts_user_id_fkey(id, first_name, last_name, profile_picture_url, membership_tier),
        community:forum_communities!forum_posts_community_id_fkey(id, name, slug, icon, color),
        project:forum_projects(id, name, url, logo_url)
      `)
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Get reactions
    const { data: reactions } = await supabase
      .from('forum_reactions')
      .select('emoji, user_id')
      .eq('target_type', 'post')
      .eq('target_id', id);

    const reactionCounts: Record<string, number> = {};
    (reactions || []).forEach((r) => {
      reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
    });

    // Get user's reactions
    const userId = req.user?.id;
    const userReactions = (reactions || [])
      .filter((r) => r.user_id === userId)
      .map((r) => r.emoji);

    // Get comments
    const { data: comments } = await supabase
      .from('forum_comments')
      .select(`
        *,
        user:users!forum_comments_user_id_fkey(id, first_name, last_name, profile_picture_url, membership_tier)
      `)
      .eq('post_id', id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    // Get reaction counts for each comment
    const commentsWithReactions = await Promise.all(
      (comments || []).map(async (comment) => {
        const { data: commentReactions } = await supabase
          .from('forum_reactions')
          .select('emoji, user_id')
          .eq('target_type', 'comment')
          .eq('target_id', comment.id);

        const commentReactionCounts: Record<string, number> = {};
        (commentReactions || []).forEach((r) => {
          commentReactionCounts[r.emoji] = (commentReactionCounts[r.emoji] || 0) + 1;
        });

        const commentUserReactions = (commentReactions || [])
          .filter((r) => r.user_id === userId)
          .map((r) => r.emoji);

        return {
          ...comment,
          reaction_counts: commentReactionCounts,
          user_reactions: commentUserReactions,
          quick_reply_text: comment.quick_reply_type ? QUICK_REPLY_TEXT[comment.quick_reply_type] : null
        };
      })
    );

    res.json({
      post: {
        ...post,
        reaction_counts: reactionCounts,
        user_reactions: userReactions,
        comments: commentsWithReactions
      }
    });
  } catch (error: any) {
    console.error('Error in getPostById:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { community_slug, content, media_urls, project_id, day_number, milestone_title, post_type } = req.body;

    if (!community_slug || !content) {
      res.status(400).json({ error: 'Community and content are required' });
      return;
    }

    // Get community ID
    const { data: community, error: communityError } = await supabase
      .from('forum_communities')
      .select('id')
      .eq('slug', community_slug)
      .single();

    if (communityError || !community) {
      res.status(400).json({ error: 'Invalid community' });
      return;
    }

    const { data: post, error } = await supabase
      .from('forum_posts')
      .insert({
        community_id: community.id,
        user_id: userId,
        content,
        media_urls: media_urls || [],
        project_id: project_id || null,
        day_number: day_number || null,
        milestone_title: milestone_title || null,
        post_type: post_type || 'regular'
      })
      .select(`
        *,
        user:users!forum_posts_user_id_fkey(id, first_name, last_name, profile_picture_url, membership_tier),
        community:forum_communities!forum_posts_community_id_fkey(id, name, slug, icon, color)
      `)
      .single();

    if (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Failed to create post' });
      return;
    }

    res.status(201).json({ post });
  } catch (error: any) {
    console.error('Error in createPost:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deletePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    // Soft delete
    const { error } = await supabase
      .from('forum_posts')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting post:', error);
      res.status(500).json({ error: 'Failed to delete post' });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error in deletePost:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Comments & Quick Replies
// ============================================================================

export const createComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id: postId } = req.params;
    const { content } = req.body;

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content
      })
      .select(`
        *,
        user:users!forum_comments_user_id_fkey(id, first_name, last_name, profile_picture_url, membership_tier)
      `)
      .single();

    if (error) {
      console.error('Error creating comment:', error);
      res.status(500).json({ error: 'Failed to create comment' });
      return;
    }

    res.status(201).json({ comment });
  } catch (error: any) {
    console.error('Error in createComment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createQuickReply = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;
    const { type } = req.body;

    if (!type || !QUICK_REPLY_TYPES.includes(type)) {
      res.status(400).json({ error: 'Invalid quick reply type' });
      return;
    }

    // Check if user already has this quick reply on this post
    const { data: existing } = await supabase
      .from('forum_comments')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .eq('quick_reply_type', type)
      .single();

    if (existing) {
      // Toggle off - delete the quick reply
      await supabase
        .from('forum_comments')
        .delete()
        .eq('id', existing.id);

      res.json({ removed: true });
      return;
    }

    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content: QUICK_REPLY_TEXT[type],
        quick_reply_type: type
      })
      .select(`
        *,
        user:users!forum_comments_user_id_fkey(id, first_name, last_name, profile_picture_url, membership_tier)
      `)
      .single();

    if (error) {
      console.error('Error creating quick reply:', error);
      res.status(500).json({ error: 'Failed to create quick reply' });
      return;
    }

    // Track interaction
    await supabase.from('forum_interactions').insert({
      user_id: userId,
      interaction_type: 'quick_reply',
      post_id: postId,
      metadata: { type }
    });

    res.status(201).json({ comment, quick_reply_text: QUICK_REPLY_TEXT[type] });
  } catch (error: any) {
    console.error('Error in createQuickReply:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const deleteComment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const { error } = await supabase
      .from('forum_comments')
      .update({ is_deleted: true })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting comment:', error);
      res.status(500).json({ error: 'Failed to delete comment' });
      return;
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error in deleteComment:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Reactions
// ============================================================================

export const toggleReaction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { target_type, target_id, emoji } = req.body;

    if (!target_type || !target_id || !emoji) {
      res.status(400).json({ error: 'target_type, target_id, and emoji are required' });
      return;
    }

    if (!['post', 'comment'].includes(target_type)) {
      res.status(400).json({ error: 'Invalid target_type' });
      return;
    }

    if (!ALLOWED_EMOJIS.includes(emoji)) {
      res.status(400).json({ error: 'Invalid emoji. Allowed: ' + ALLOWED_EMOJIS.join(' ') });
      return;
    }

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('forum_reactions')
      .select('id')
      .eq('user_id', userId)
      .eq('target_type', target_type)
      .eq('target_id', target_id)
      .eq('emoji', emoji)
      .single();

    if (existing) {
      // Remove reaction
      await supabase
        .from('forum_reactions')
        .delete()
        .eq('id', existing.id);

      res.json({ removed: true, emoji });
    } else {
      // Add reaction
      await supabase
        .from('forum_reactions')
        .insert({
          user_id: userId,
          target_type,
          target_id,
          emoji
        });

      // Track interaction
      await supabase.from('forum_interactions').insert({
        user_id: userId,
        interaction_type: 'reaction',
        post_id: target_type === 'post' ? target_id : null,
        comment_id: target_type === 'comment' ? target_id : null,
        metadata: { emoji }
      });

      res.json({ added: true, emoji });
    }
  } catch (error: any) {
    console.error('Error in toggleReaction:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPostReactions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const { data: reactions, error } = await supabase
      .from('forum_reactions')
      .select('emoji, user_id')
      .eq('target_type', 'post')
      .eq('target_id', id);

    if (error) {
      console.error('Error fetching reactions:', error);
      res.status(500).json({ error: 'Failed to fetch reactions' });
      return;
    }

    const counts: Record<string, number> = {};
    (reactions || []).forEach((r) => {
      counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    });

    const userReactions = (reactions || [])
      .filter((r) => r.user_id === userId)
      .map((r) => r.emoji);

    res.json({ counts, user_reactions: userReactions });
  } catch (error: any) {
    console.error('Error in getPostReactions:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Projects (Build in Public)
// ============================================================================

export const getMyProjects = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data, error } = await supabase
      .from('forum_projects')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      res.status(500).json({ error: 'Failed to fetch projects' });
      return;
    }

    res.json({ projects: data });
  } catch (error: any) {
    console.error('Error in getMyProjects:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const createProject = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, url, description, logo_url } = req.body;

    if (!name) {
      res.status(400).json({ error: 'Project name is required' });
      return;
    }

    const { data: project, error } = await supabase
      .from('forum_projects')
      .insert({
        user_id: userId,
        name,
        url: url || null,
        description: description || null,
        logo_url: logo_url || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
      return;
    }

    res.status(201).json({ project });
  } catch (error: any) {
    console.error('Error in createProject:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getProjectTimeline = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get project
    const { data: project, error: projectError } = await supabase
      .from('forum_projects')
      .select(`
        *,
        user:users!forum_projects_user_id_fkey(id, first_name, last_name, profile_picture_url, membership_tier)
      `)
      .eq('id', id)
      .single();

    if (projectError || !project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    // Get all posts for this project
    const { data: posts, error: postsError } = await supabase
      .from('forum_posts')
      .select(`
        *,
        user:users!forum_posts_user_id_fkey(id, first_name, last_name, profile_picture_url, membership_tier)
      `)
      .eq('project_id', id)
      .eq('is_deleted', false)
      .order('day_number', { ascending: true });

    if (postsError) {
      console.error('Error fetching timeline:', postsError);
      res.status(500).json({ error: 'Failed to fetch timeline' });
      return;
    }

    res.json({ project, posts: posts || [] });
  } catch (error: any) {
    console.error('Error in getProjectTimeline:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Interaction Tracking
// ============================================================================

export const trackInteractionBatch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { interactions } = req.body;

    if (!Array.isArray(interactions) || interactions.length === 0) {
      res.status(400).json({ error: 'interactions array is required' });
      return;
    }

    // Limit to 100 interactions per batch
    const batch = interactions.slice(0, 100).map((i: any) => ({
      user_id: userId,
      interaction_type: i.type,
      post_id: i.post_id || null,
      comment_id: i.comment_id || null,
      community_id: i.community_id || null,
      metadata: i.metadata || {}
    }));

    const { error } = await supabase
      .from('forum_interactions')
      .insert(batch);

    if (error) {
      console.error('Error tracking interactions:', error);
      // Don't fail the request - tracking is fire-and-forget
    }

    res.json({ tracked: batch.length });
  } catch (error: any) {
    console.error('Error in trackInteractionBatch:', error);
    // Still return success - tracking shouldn't block UX
    res.json({ tracked: 0 });
  }
};

