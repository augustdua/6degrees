import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { generateForumPoll } from '../services/forumPollService';
import { fetchInc42News } from '../services/newsService';

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
// News → Forum posts (auto-sync)
// ============================================================================

let lastNewsSyncAt = 0;
let newsSyncInFlight: Promise<void> | null = null;
// Cache ONLY the dedicated news community id (do not cache the general fallback),
// so if/when the news community is created later, we start using it without a restart.
let cachedNewsCommunityId: string | null = null;
let cachedSystemUserId: string | null = null;

async function getNewsCommunityId(): Promise<string | null> {
  if (cachedNewsCommunityId) return cachedNewsCommunityId;

  // Prefer dedicated "news" community; fall back to "general" if not present (for safety).
  const { data: news, error: newsErr } = await supabase
    .from('forum_communities')
    .select('id')
    .eq('slug', 'news')
    .single();

  if (!newsErr && news?.id) {
    cachedNewsCommunityId = news.id;
    return cachedNewsCommunityId;
  }

  const { data: general, error: genErr } = await supabase
    .from('forum_communities')
    .select('id')
    .eq('slug', 'general')
    .single();

  if (genErr || !general?.id) return null;
  return general.id;
}

async function getSystemUserId(): Promise<string | null> {
  if (cachedSystemUserId) return cachedSystemUserId;

  // Prefer explicit env var (lets you control authorship in production)
  const fromEnv = process.env.FORUM_SYSTEM_USER_ID;
  if (fromEnv) {
    cachedSystemUserId = fromEnv;
    return cachedSystemUserId;
  }

  // Fallback: use the oldest user as system author (pragmatic for now)
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();
  if (error || !data?.id) return null;
  cachedSystemUserId = data.id;
  return cachedSystemUserId;
}

async function ensureNewsSynced(): Promise<void> {
  const now = Date.now();
  const SYNC_INTERVAL_MS = 15 * 60 * 1000; // match RSS cache

  if (now - lastNewsSyncAt < SYNC_INTERVAL_MS) return;
  if (newsSyncInFlight) return newsSyncInFlight;

  newsSyncInFlight = (async () => {
    try {
      const [communityId, systemUserId] = await Promise.all([
        getNewsCommunityId(),
        getSystemUserId()
      ]);

      if (!communityId || !systemUserId) {
        return;
      }

      const articles = await fetchInc42News();
      if (!articles || articles.length === 0) return;

      const rows = articles
        .filter(a => a?.link)
        .slice(0, 20)
        .map((a) => {
          const publishedAt = a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString();
          return {
            community_id: communityId,
            user_id: systemUserId,
            post_type: 'news',
            content: a.title,
            body: `${a.description || ''}\n\n[Read original](${a.link})`,
            media_urls: a.imageUrl ? [a.imageUrl] : [],
            tags: ['news'],
            // News metadata
            news_url: a.link,
            news_source: a.author || 'Inc42',
            news_published_at: publishedAt,
            news_image_url: a.imageUrl || null,
            // Keep created_at close to publication date for correct ordering
            created_at: publishedAt,
            updated_at: new Date().toISOString(),
            is_deleted: false,
          };
        });

      // Upsert by unique news_url
      const { error } = await supabase
        .from('forum_posts')
        .upsert(rows as any, { onConflict: 'news_url' });

      if (!error) {
        lastNewsSyncAt = Date.now();
      } else {
        console.error('Error upserting news posts:', error);
      }
    } finally {
      newsSyncInFlight = null;
    }
  })();

  return newsSyncInFlight;
}

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
    const { community, page = '1', limit = '20', sort = 'new', tags } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const sortType = sort as string;

    // These communities must not appear as communities; they are treated as tags under General.
    const LEGACY_COMMUNITY_SLUGS = ['build-in-public', 'wins', 'failures', 'network', 'market-gaps'] as const;
    const ALLOWED_COMMUNITY_SLUGS = ['general', 'news', 'market-research', 'predictions', 'daily-standups', 'pain-points'] as const;
    const uniq = (arr: string[]) => Array.from(new Set(arr));

    const requestedCommunity = typeof community === 'string' ? community : undefined;
    let effectiveCommunity = requestedCommunity;
    let tagArray: string[] = [];
    if (tags && typeof tags === 'string') {
      tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Back-compat: if a legacy community is requested as "community", treat it as a General tag filter instead.
    if (effectiveCommunity && LEGACY_COMMUNITY_SLUGS.includes(effectiveCommunity as any)) {
      tagArray = uniq([...tagArray, effectiveCommunity]);
      effectiveCommunity = 'general';
    }

    // If forum is showing All/General, ensure news is synced into forum_posts
    if (!effectiveCommunity || effectiveCommunity === 'all' || effectiveCommunity === 'general') {
      ensureNewsSynced().catch(() => {});
    }

    let query = supabase
      .from('forum_posts')
      .select(`
        *,
        user:users(id, anonymous_name),
        community:forum_communities(id, name, slug, icon, color),
        project:forum_projects(id, name, url, logo_url)
      `)
      .eq('is_deleted', false);

    // Apply sorting
    if (sortType === 'top') {
      // Top: Sort by net votes (upvotes - downvotes) DESC
      query = query.order('upvotes', { ascending: false });
    } else if (sortType === 'hot') {
      // Hot: We'll sort by created_at for now, but calculate hot score client-side
      // In production, this would use a computed column or function
      query = query.order('created_at', { ascending: false });
    } else {
      // Default 'new': Sort by created_at DESC
      query = query.order('created_at', { ascending: false });
    }

    // If legacy tags are requested, we may need to post-filter results (since some DBs still store them as communities).
    // Fetch a bit more so the page doesn't come back empty after post-filtering.
    const needsLegacyTagPostFilter = tagArray.some(t => LEGACY_COMMUNITY_SLUGS.includes(t as any));
    const rangeMultiplier = needsLegacyTagPostFilter ? 5 : 1;
    query = query.range(offset, offset + (limitNum * rangeMultiplier) - 1);

    // Filter by community
    if (effectiveCommunity && effectiveCommunity !== 'all') {
      if (effectiveCommunity === 'general') {
        // General should include legacy-community posts as well (treated as tags).
        const { data: comms, error: commErr } = await supabase
          .from('forum_communities')
          .select('id, slug')
          .in('slug', ['general', ...LEGACY_COMMUNITY_SLUGS]);

        if (commErr) {
          console.error('Error fetching community IDs for general/legacy mapping:', commErr);
        } else if (comms && comms.length > 0) {
          query = query.in('community_id', comms.map(c => c.id));
        }
      } else if ((ALLOWED_COMMUNITY_SLUGS as readonly string[]).includes(effectiveCommunity)) {
        const { data: communityData } = await supabase
          .from('forum_communities')
          .select('id')
          .eq('slug', effectiveCommunity)
          .single();

        if (communityData) {
          query = query.eq('community_id', communityData.id);
        }
      }
    }

    // Filter by tags (comma-separated)
    // NOTE: legacy tags may still live as communities in some DBs; we handle those via post-filtering below.
    const nonLegacyTags = tagArray.filter(t => !LEGACY_COMMUNITY_SLUGS.includes(t as any));
    if (nonLegacyTags.length > 0) {
      query = query.overlaps('tags', nonLegacyTags);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching posts:', error.message, error.details, error.hint);
      res.status(500).json({ error: 'Failed to fetch posts', details: error.message });
      return;
    }

    // Fetch General community once so we can override legacy-community posts to appear under General.
    const { data: generalCommunity } = await supabase
      .from('forum_communities')
      .select('id, name, slug, icon, color')
      .eq('slug', 'general')
      .single();

    // Get reaction counts, votes, and poll data for each post
    const userId = req.user?.id;
    const postsWithData = await Promise.all(
      (data || []).map(async (post) => {
        // Runtime fallback: if a post is still in a legacy community, treat that community as a tag
        // and show the post under General.
        const legacySlug = post?.community?.slug;
        const mappedTags =
          legacySlug && LEGACY_COMMUNITY_SLUGS.includes(legacySlug as any)
            ? uniq([...(post.tags || []), legacySlug])
            : (post.tags || []);
        const mappedCommunity =
          legacySlug && LEGACY_COMMUNITY_SLUGS.includes(legacySlug as any) && generalCommunity
            ? generalCommunity
            : post.community;

        const { data: reactions } = await supabase
          .from('forum_reactions')
          .select('emoji')
          .eq('target_type', 'post')
          .eq('target_id', post.id);

        const reactionCounts: Record<string, number> = {};
        (reactions || []).forEach((r) => {
          reactionCounts[r.emoji] = (reactionCounts[r.emoji] || 0) + 1;
        });

        // Get user's vote status
        let userVote: 'up' | 'down' | null = null;
        if (userId) {
          const { data: vote } = await supabase
            .from('forum_post_votes')
            .select('vote_type')
            .eq('post_id', post.id)
            .eq('user_id', userId)
            .single();
          
          if (vote) {
            userVote = vote.vote_type as 'up' | 'down';
          }
        }

        // Get poll data if exists
        const { data: poll } = await supabase
          .from('forum_polls')
          .select('id, question, options')
          .eq('post_id', post.id)
          .single();

        let pollData = null;
        if (poll) {
          // Get vote counts for each option
          const { data: votes } = await supabase
            .from('forum_poll_votes')
            .select('option_index')
            .eq('poll_id', poll.id);

          const voteCounts = [0, 0, 0, 0];
          (votes || []).forEach((v) => {
            if (v.option_index >= 0 && v.option_index <= 3) {
              voteCounts[v.option_index]++;
            }
          });

          // Check if current user voted
          let userVote: number | undefined;
          if (userId) {
            const { data: userVoteData } = await supabase
              .from('forum_poll_votes')
              .select('option_index')
              .eq('poll_id', poll.id)
              .eq('user_id', userId)
              .single();
            
            if (userVoteData) {
              userVote = userVoteData.option_index;
            }
          }

          pollData = {
            id: poll.id,
            question: poll.question,
            options: poll.options,
            vote_counts: voteCounts,
            total_votes: voteCounts.reduce((a, b) => a + b, 0),
            user_vote: userVote
          };
        }

        // Get comment count
        const { count: commentCount } = await supabase
          .from('forum_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
          .eq('is_deleted', false);

        // Get user's vote on this post
        let userVoteType: 'up' | 'down' | null = null;
        if (userId) {
          const { data: userVoteData } = await supabase
            .from('forum_post_votes')
            .select('vote_type')
            .eq('post_id', post.id)
            .eq('user_id', userId)
            .single();
          
          if (userVoteData) {
            userVoteType = userVoteData.vote_type as 'up' | 'down';
          }
        }

        return {
          ...post,
          tags: mappedTags,
          community: mappedCommunity,
          reaction_counts: reactionCounts,
          poll: pollData,
          comment_count: commentCount || 0,
          user_vote: userVoteType,
          upvotes: post.upvotes || 0,
          downvotes: post.downvotes || 0
        };
      })
    );

    // If sorting by 'hot', calculate hot scores and re-sort
    if (sortType === 'hot') {
      const now = Date.now();
      postsWithData.sort((a, b) => {
        const ageA = (now - new Date(a.created_at).getTime()) / (1000 * 60 * 60); // hours
        const ageB = (now - new Date(b.created_at).getTime()) / (1000 * 60 * 60);
        
        // Reddit-style hot score: log(score) + age_factor
        const scoreA = Math.max(1, a.score + (a.comment_count || 0) * 0.5);
        const scoreB = Math.max(1, b.score + (b.comment_count || 0) * 0.5);
        
        const hotA = Math.log10(scoreA) - (ageA / 12); // Decay every 12 hours
        const hotB = Math.log10(scoreB) - (ageB / 12);
        
        return hotB - hotA;
      });
    }

    // Post-filter for legacy tags if needed (since legacy tags may come from community->tag mapping)
    let finalPosts = postsWithData;
    if (tagArray.length > 0) {
      finalPosts = postsWithData
        .filter((p: any) => {
          const pTags = Array.isArray(p.tags) ? p.tags : [];
          return tagArray.some(t => pTags.includes(t));
        })
        .slice(0, limitNum);
    } else {
      finalPosts = postsWithData.slice(0, limitNum);
    }

    res.json({ posts: finalPosts, page: pageNum, limit: limitNum });
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
        user:users(id, anonymous_name),
        community:forum_communities(id, name, slug, icon, color),
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

    // Get poll data if exists
    const { data: poll } = await supabase
      .from('forum_polls')
      .select('id, question, options')
      .eq('post_id', id)
      .single();

    let pollData = null;
    if (poll) {
      // Get vote counts for each option
      const { data: votes } = await supabase
        .from('forum_poll_votes')
        .select('option_index')
        .eq('poll_id', poll.id);

      const voteCounts = [0, 0, 0, 0];
      (votes || []).forEach((v) => {
        if (v.option_index >= 0 && v.option_index <= 3) {
          voteCounts[v.option_index]++;
        }
      });

      // Check if current user voted
      let userVote: number | undefined;
      if (userId) {
        const { data: userVoteData } = await supabase
          .from('forum_poll_votes')
          .select('option_index')
          .eq('poll_id', poll.id)
          .eq('user_id', userId)
          .single();
        
        if (userVoteData) {
          userVote = userVoteData.option_index;
        }
      }

      pollData = {
        id: poll.id,
        question: poll.question,
        options: poll.options,
        vote_counts: voteCounts,
        total_votes: voteCounts.reduce((a, b) => a + b, 0),
        user_vote: userVote
      };
    }

    res.json({
      post: {
        ...post,
        reaction_counts: reactionCounts,
        user_reactions: userReactions,
        poll: pollData
      }
    });
  } catch (error: any) {
    console.error('Error in getPostById:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// Get related posts (same community or tags)
export const getRelatedPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // First get the current post to find its community and tags
    const { data: currentPost, error: postError } = await supabase
      .from('forum_posts')
      .select('id, community_id, tags')
      .eq('id', id)
      .single();

    if (postError || !currentPost) {
      res.json({ posts: [] });
      return;
    }

    // Find related posts from the same community, excluding current post
    const { data: relatedPosts, error } = await supabase
      .from('forum_posts')
      .select(`
        id, content, tags, created_at,
        user:users(id, anonymous_name),
        community:forum_communities(id, name, slug, icon, color)
      `)
      .eq('is_deleted', false)
      .eq('community_id', currentPost.community_id)
      .neq('id', id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('Error fetching related posts:', error);
      res.json({ posts: [] });
      return;
    }

    res.json({ posts: relatedPosts || [] });
  } catch (error: any) {
    console.error('Error in getRelatedPosts:', error);
    res.json({ posts: [] });
  }
};

export const createPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { community_slug, content, media_urls, project_id, day_number, milestone_title, post_type, poll, tags } = req.body;

    if (!community_slug || !content) {
      res.status(400).json({ error: 'Community and content are required' });
      return;
    }

    // Get community ID
    const { data: community, error: communityError } = await supabase
      .from('forum_communities')
      .select('id')
      .eq('slug', community_slug)
      .eq('is_active', true)
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
        post_type: post_type || 'regular',
        tags: tags && Array.isArray(tags) ? tags : []
      })
      .select(`
        *,
        user:users(id, anonymous_name),
        community:forum_communities!forum_posts_community_id_fkey(id, name, slug, icon, color)
      `)
      .single();

    if (error) {
      console.error('Error creating post:', error);
      res.status(500).json({ error: 'Failed to create post' });
      return;
    }

    // Create poll if provided
    let pollData = null;
    if (poll && poll.question && poll.options && poll.options.length === 4) {
      const { data: createdPoll, error: pollError } = await supabase
        .from('forum_polls')
        .insert({
          post_id: post.id,
          question: poll.question,
          options: poll.options
        })
        .select()
        .single();

      if (!pollError && createdPoll) {
        pollData = {
          id: createdPoll.id,
          question: createdPoll.question,
          options: createdPoll.options,
          vote_counts: [0, 0, 0, 0],
          total_votes: 0,
          user_vote: undefined
        };
      }
    }

    res.status(201).json({ post: { ...post, poll: pollData } });
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
    const { content, parent_comment_id } = req.body as { content?: string; parent_comment_id?: string | null };

    if (!content) {
      res.status(400).json({ error: 'Content is required' });
      return;
    }

    // Validate parent comment (threading)
    let parentIdToUse: string | null = null;
    if (parent_comment_id) {
      const { data: parent, error: parentErr } = await supabase
        .from('forum_comments')
        .select('id, post_id')
        .eq('id', parent_comment_id)
        .eq('is_deleted', false)
        .single();

      if (parentErr || !parent) {
        res.status(400).json({ error: 'Invalid parent_comment_id' });
        return;
      }
      if (parent.post_id !== postId) {
        res.status(400).json({ error: 'parent_comment_id must belong to the same post' });
        return;
      }
      parentIdToUse = parent_comment_id;
    }

    const { data: comment, error } = await supabase
      .from('forum_comments')
      .insert({
        post_id: postId,
        user_id: userId,
        content,
        parent_comment_id: parentIdToUse
      })
      .select(`
        *,
        user:users(id, anonymous_name)
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

export const getComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id: postId } = req.params;

    const { data: comments, error } = await supabase
      .from('forum_comments')
      .select(`
        *,
        user:users(id, anonymous_name)
      `)
      .eq('post_id', postId)
      .eq('is_deleted', false)
      // Ascending works better for threaded rendering
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
      res.status(500).json({ error: 'Failed to fetch comments' });
      return;
    }

    res.json({ comments: comments || [] });
  } catch (error: any) {
    console.error('Error in getComments:', error);
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
        user:users(id, anonymous_name)
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
        user:users(id, anonymous_name)
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
        user:users(id, anonymous_name)
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

// ============================================================================
// Polls
// ============================================================================

export const generatePoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { content, community_slug } = req.body;

    if (!content || content.trim().length < 10) {
      res.status(400).json({ error: 'Content must be at least 10 characters' });
      return;
    }

    // Generate poll using AI
    const poll = await generateForumPoll(content, community_slug);

    // Track poll generation
    await supabase.from('forum_interactions').insert({
      user_id: userId,
      interaction_type: 'poll_generate',
      metadata: { content_length: content.length }
    });

    res.json({ poll });
  } catch (error: any) {
    console.error('Error in generatePoll:', error);
    res.status(500).json({ error: error.message || 'Failed to generate poll' });
  }
};

export const voteOnPoll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { pollId } = req.params;
    const { option_index } = req.body;

    if (option_index === undefined || option_index < 0 || option_index > 3) {
      res.status(400).json({ error: 'Invalid option index (must be 0-3)' });
      return;
    }

    // Check if poll exists
    const { data: poll, error: pollError } = await supabase
      .from('forum_polls')
      .select('id, post_id')
      .eq('id', pollId)
      .single();

    if (pollError || !poll) {
      res.status(404).json({ error: 'Poll not found' });
      return;
    }

    // Check if user already voted
    const { data: existingVote } = await supabase
      .from('forum_poll_votes')
      .select('id')
      .eq('poll_id', pollId)
      .eq('user_id', userId)
      .single();

    if (existingVote) {
      res.status(400).json({ error: 'You have already voted on this poll' });
      return;
    }

    // Insert vote
    const { error: voteError } = await supabase
      .from('forum_poll_votes')
      .insert({
        poll_id: pollId,
        user_id: userId,
        option_index
      });

    if (voteError) {
      console.error('Error voting:', voteError);
      res.status(500).json({ error: 'Failed to submit vote' });
      return;
    }

    // Track poll vote
    await supabase.from('forum_interactions').insert({
      user_id: userId,
      interaction_type: 'poll_vote',
      post_id: poll.post_id,
      metadata: { poll_id: pollId, option_index }
    });

    // Get updated vote counts
    const { data: votes } = await supabase
      .from('forum_poll_votes')
      .select('option_index')
      .eq('poll_id', pollId);

    const voteCounts = [0, 0, 0, 0];
    (votes || []).forEach((v) => {
      if (v.option_index >= 0 && v.option_index <= 3) {
        voteCounts[v.option_index]++;
      }
    });

    res.json({
      success: true,
      vote_counts: voteCounts,
      total_votes: voteCounts.reduce((a, b) => a + b, 0),
      user_vote: option_index
    });
  } catch (error: any) {
    console.error('Error in voteOnPoll:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Prediction Voting
// ============================================================================

export const votePrediction = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;
    const { vote } = req.body;

    if (typeof vote !== 'boolean') {
      res.status(400).json({ error: 'vote must be a boolean (true=Yes, false=No)' });
      return;
    }

    // Verify post exists and is a prediction
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('id, post_type')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (post.post_type !== 'prediction') {
      res.status(400).json({ error: 'This post is not a prediction' });
      return;
    }

    // Upsert vote (update if exists, insert if not)
    const { error: voteError } = await supabase
      .from('prediction_votes')
      .upsert(
        {
          post_id: postId,
          user_id: userId,
          vote,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'post_id,user_id' }
      );

    if (voteError) {
      console.error('Error voting on prediction:', voteError);
      res.status(500).json({ error: 'Failed to submit vote' });
      return;
    }

    // Get updated vote counts
    const counts = await getPredictionVoteCounts(postId);

    res.json({
      success: true,
      ...counts,
      user_vote: vote
    });
  } catch (error: any) {
    console.error('Error in votePrediction:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getPredictionVotes = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    // Get vote counts
    const counts = await getPredictionVoteCounts(postId);

    // Get user's vote if authenticated
    let userVote: boolean | null = null;
    if (userId) {
      const { data: vote } = await supabase
        .from('prediction_votes')
        .select('vote')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();
      
      if (vote) {
        userVote = vote.vote;
      }
    }

    res.json({
      ...counts,
      user_vote: userVote
    });
  } catch (error: any) {
    console.error('Error in getPredictionVotes:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

async function getPredictionVoteCounts(postId: string): Promise<{ yes_count: number; no_count: number; total_count: number }> {
  const { data: votes } = await supabase
    .from('prediction_votes')
    .select('vote')
    .eq('post_id', postId);

  const yesCount = (votes || []).filter(v => v.vote === true).length;
  const noCount = (votes || []).filter(v => v.vote === false).length;

  return {
    yes_count: yesCount,
    no_count: noCount,
    total_count: yesCount + noCount
  };
}

export const deletePredictionVote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;

    const { error } = await supabase
      .from('prediction_votes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting prediction vote:', error);
      res.status(500).json({ error: 'Failed to delete vote' });
      return;
    }

    // Get updated vote counts
    const counts = await getPredictionVoteCounts(postId);

    res.json({
      success: true,
      ...counts,
      user_vote: null
    });
  } catch (error: any) {
    console.error('Error in deletePredictionVote:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Research Topic Suggestions
// ============================================================================

export const createSuggestion = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { topic_text, description } = req.body;

    if (!topic_text || typeof topic_text !== 'string' || topic_text.trim().length < 10) {
      res.status(400).json({ error: 'topic_text must be at least 10 characters' });
      return;
    }

    if (topic_text.length > 500) {
      res.status(400).json({ error: 'topic_text must be less than 500 characters' });
      return;
    }

    const { data: suggestion, error } = await supabase
      .from('research_suggestions')
      .insert({
        user_id: userId,
        topic_text: topic_text.trim(),
        description: description?.trim() || null,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating suggestion:', error);
      res.status(500).json({ error: 'Failed to create suggestion' });
      return;
    }

    res.status(201).json({ suggestion });
  } catch (error: any) {
    console.error('Error in createSuggestion:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getMySuggestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: suggestions, error } = await supabase
      .from('research_suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch suggestions' });
      return;
    }

    res.json({ suggestions: suggestions || [] });
  } catch (error: any) {
    console.error('Error in getMySuggestions:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getAllSuggestions = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // This is an admin-only endpoint - for now just check if user is authenticated
    // In production, add admin role check
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const status = req.query.status as string | undefined;

    let query = supabase
      .from('research_suggestions')
      .select(`
        *,
        user:users(id, anonymous_name)
      `)
      .order('created_at', { ascending: false });

    if (status && ['pending', 'approved', 'rejected', 'completed'].includes(status)) {
      query = query.eq('status', status);
    }

    const { data: suggestions, error } = await query;

    if (error) {
      console.error('Error fetching all suggestions:', error);
      res.status(500).json({ error: 'Failed to fetch suggestions' });
      return;
    }

    res.json({ suggestions: suggestions || [] });
  } catch (error: any) {
    console.error('Error in getAllSuggestions:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Post Voting (Upvote/Downvote) - getPostVote helper
// ============================================================================

export const getPostVote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      res.json({ vote_type: null });
      return;
    }

    const { data: vote } = await supabase
      .from('forum_post_votes')
      .select('vote_type')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    res.json({ vote_type: vote?.vote_type || null });
  } catch (error: any) {
    console.error('Error in getPostVote:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Saved Posts (Bookmarks)
// ============================================================================

export const savePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;

    // Check if already saved
    const { data: existing } = await supabase
      .from('forum_saved_posts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    if (existing) {
      // Toggle off - unsave
      await supabase
        .from('forum_saved_posts')
        .delete()
        .eq('id', existing.id);
      
      res.json({ success: true, saved: false });
      return;
    }

    // Save the post
    const { error } = await supabase
      .from('forum_saved_posts')
      .insert({
        post_id: postId,
        user_id: userId
      });

    if (error) {
      console.error('Error saving post:', error);
      res.status(500).json({ error: 'Failed to save post' });
      return;
    }

    res.json({ success: true, saved: true });
  } catch (error: any) {
    console.error('Error in savePost:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const getSavedPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: savedPosts, error } = await supabase
      .from('forum_saved_posts')
      .select(`
        id,
        created_at,
        post:forum_posts(
          *,
          user:users(id, anonymous_name),
          community:forum_communities(id, name, slug, icon, color),
          project:forum_projects(id, name, url, logo_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching saved posts:', error);
      res.status(500).json({ error: 'Failed to fetch saved posts' });
      return;
    }

    // Extract posts from the join
    const posts = (savedPosts || [])
      .map(sp => sp.post)
      .filter(Boolean);

    res.json({ posts });
  } catch (error: any) {
    console.error('Error in getSavedPosts:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const isPostSaved = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { postId } = req.params;

    if (!userId) {
      res.json({ saved: false });
      return;
    }

    const { data } = await supabase
      .from('forum_saved_posts')
      .select('id')
      .eq('post_id', postId)
      .eq('user_id', userId)
      .single();

    res.json({ saved: !!data });
  } catch (error: any) {
    console.error('Error in isPostSaved:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Get Active Communities Only
// ============================================================================

export const getActiveCommunities = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Backend is source of truth for sidebar visibility:
    // - Only communities with is_active=true should be returned
    // - Prefer stable ordering by display_order (if present), otherwise fall back to created_at.
    let data: any[] | null = null;
    let error: any = null;

    // First attempt: order by display_order (requires column to exist)
    {
      const r = await supabase
        .from('forum_communities')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: true });
      data = r.data;
      error = r.error;
    }

    // Fallback if display_order isn't present yet (or any other ordering error)
    if (error) {
      const msg = String(error?.message || '');
      const missingDisplayOrder =
        msg.includes('display_order') && (msg.includes('does not exist') || msg.includes('column'));

      if (missingDisplayOrder) {
        const r2 = await supabase
          .from('forum_communities')
          .select('*')
          .eq('is_active', true)
          .order('created_at', { ascending: true });
        data = r2.data;
        error = r2.error;
      }
    }

    if (error) {
      console.error('Error fetching active communities:', error);
      res.status(500).json({ error: 'Failed to fetch communities' });
      return;
    }

    res.json({ communities: data });
  } catch (error: any) {
    console.error('Error in getActiveCommunities:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Post Voting (Upvote/Downvote)
// ============================================================================

export const votePost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;
    const { vote_type } = req.body;

    if (!vote_type || !['up', 'down'].includes(vote_type)) {
      res.status(400).json({ error: 'vote_type must be "up" or "down"' });
      return;
    }

    // Verify post exists
    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .select('id')
      .eq('id', postId)
      .eq('is_deleted', false)
      .single();

    if (postError || !post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Upsert vote
    const { error: voteError } = await supabase
      .from('user_post_votes')
      .upsert(
        {
          user_id: userId,
          post_id: postId,
          vote_type,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'user_id,post_id' }
      );

    if (voteError) {
      console.error('Error voting on post:', voteError);
      res.status(500).json({ error: 'Failed to submit vote' });
      return;
    }

    // Get updated vote counts
    const { data: updatedPost } = await supabase
      .from('forum_posts')
      .select('upvotes, downvotes')
      .eq('id', postId)
      .single();

    res.json({
      success: true,
      upvotes: updatedPost?.upvotes || 0,
      downvotes: updatedPost?.downvotes || 0,
      score: (updatedPost?.upvotes || 0) - (updatedPost?.downvotes || 0),
      user_vote: vote_type
    });
  } catch (error: any) {
    console.error('Error in votePost:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const removeVote = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { postId } = req.params;

    // Delete vote
    const { error } = await supabase
      .from('user_post_votes')
      .delete()
      .eq('user_id', userId)
      .eq('post_id', postId);

    if (error) {
      console.error('Error removing vote:', error);
      res.status(500).json({ error: 'Failed to remove vote' });
      return;
    }

    // Get updated vote counts
    const { data: updatedPost } = await supabase
      .from('forum_posts')
      .select('upvotes, downvotes')
      .eq('id', postId)
      .single();

    res.json({
      success: true,
      upvotes: updatedPost?.upvotes || 0,
      downvotes: updatedPost?.downvotes || 0,
      score: (updatedPost?.upvotes || 0) - (updatedPost?.downvotes || 0),
      user_vote: null
    });
  } catch (error: any) {
    console.error('Error in removeVote:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Tags
// ============================================================================

export const getTags = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { data: tags, error } = await supabase
      .from('forum_tags')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      res.status(500).json({ error: 'Failed to fetch tags' });
      return;
    }

    res.json({ tags: tags || [] });
  } catch (error: any) {
    console.error('Error in getTags:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

// ============================================================================
// Brand Pain Points (D2C Analysis)
// ============================================================================

// Temporarily disabled - redditService not implemented
/*
export const generatePainPointsReport = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { brand_name } = req.body;

    if (!brand_name || typeof brand_name !== 'string' || brand_name.length < 2) {
      res.status(400).json({ error: 'brand_name is required (min 2 characters)' });
      return;
    }

    // TODO: Add admin check here in production

    // Generate the report
    const report = await generateBrandPainPointsReport(brand_name);

    // Get the pain-points community
    const { data: community } = await supabase
      .from('forum_communities')
      .select('id')
      .eq('slug', 'pain-points')
      .single();

    if (!community) {
      res.status(500).json({ error: 'Pain Points community not found' });
      return;
    }

    // Create a forum post with the report
    const postContent = `Pain Points Analysis: ${brand_name}`;
    const postBody = `## ${brand_name} - Customer Pain Points Analysis

**Sentiment Score:** ${report.sentiment_score.toFixed(2)}/1.00
**Total Mentions Analyzed:** ${report.total_mentions}
**Generated:** ${new Date(report.generated_at).toLocaleDateString()}

### Top Complaints

${report.top_complaints.map((c: any, i: number) => `
**${i + 1}. ${c.category}** (${c.count} mentions)
${c.quotes.map((q: string) => `> "${q}"`).join('\n')}
`).join('\n')}

### Competitors Mentioned
${report.competitors_mentioned.length > 0 ? report.competitors_mentioned.join(', ') : 'None detected'}

### Sources
${report.source_urls.map((url: string) => `- [Reddit Thread](${url})`).join('\n')}
`;

    const { data: post, error: postError } = await supabase
      .from('forum_posts')
      .insert({
        community_id: community.id,
        user_id: userId,
        content: postContent,
        body: postBody,
        post_type: 'pain_point',
        brand_name: brand_name,
        sentiment_score: report.sentiment_score,
        pain_points: report.top_complaints,
        sources: report.source_urls
      })
      .select()
      .single();

    if (postError) {
      console.error('Error creating pain points post:', postError);
      res.status(500).json({ error: 'Failed to create post' });
      return;
    }

    res.status(201).json({ 
      success: true, 
      report,
      post_id: post.id 
    });
  } catch (error: any) {
    console.error('Error in generatePainPointsReport:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
};
*/

// ============================================================================
// Reddit Content Import (r/StartupIndia) - Temporarily disabled
// ============================================================================

// Temporarily disabled - redditService not implemented
/*
export const importRedditPosts = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // TODO: Add admin check here in production

    const { limit = 10 } = req.body;

    // Fetch and filter posts
    const { posts, filtered_count } = await fetchStartupIndiaPosts(Math.min(limit, 25));

    // Get the general community
    const { data: community } = await supabase
      .from('forum_communities')
      .select('id')
      .eq('slug', 'general')
      .single();

    if (!community) {
      res.status(500).json({ error: 'General community not found' });
      return;
    }

    // Import posts that don't already exist
    const imported: string[] = [];
    const skipped: string[] = [];

    for (const post of posts) {
      // Check if already imported
      const { data: existing } = await supabase
        .from('forum_posts')
        .select('id')
        .eq('reddit_post_id', post.id)
        .single();

      if (existing) {
        skipped.push(post.id);
        continue;
      }

      // Create forum post
      const { error: insertError } = await supabase
        .from('forum_posts')
        .insert({
          community_id: community.id,
          user_id: userId,
          content: post.title,
          body: post.selftext || null,
          post_type: 'reddit',
          tags: ['reddit'],
          reddit_post_id: post.id,
          reddit_subreddit: post.subreddit,
          upvotes: Math.max(0, Math.floor(post.score / 10)), // Scale down Reddit karma
          created_at: new Date(post.created_utc * 1000).toISOString()
        });

      if (!insertError) {
        imported.push(post.id);
      }
    }

    res.json({
      success: true,
      imported_count: imported.length,
      skipped_count: skipped.length,
      filtered_out: filtered_count,
      imported_ids: imported
    });
  } catch (error: any) {
    console.error('Error in importRedditPosts:', error);
    res.status(500).json({ error: error.message || 'Failed to import posts' });
  }
};
*/

