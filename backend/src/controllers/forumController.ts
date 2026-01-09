import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';
import { generateForumPoll } from '../services/forumPollService';
import { fetchDailyIdeaNews } from '../services/newsService';
import { fetchRedditTopPostsWithComments } from '../services/redditService';
import { generateBrandPainPointsReport } from '../services/brandPainPointsService';
import { generateReportBlocksFromMarkdown } from '../services/reportBlocksService';
import { fetchRedditThreadByUrl } from '../services/redditService';

// Allowed emojis for reactions
const ALLOWED_EMOJIS = ['❤️', '🔥', '🚀', '💯', '🙌', '🤝', '💸', '👀'];

// Quick reply types
const QUICK_REPLY_TYPES = ['can_intro', 'paid_intro', 'watching', 'ship_it', 'dm_me'];

// Quick reply display text (no emojis - keep forum UI sophisticated)
const QUICK_REPLY_TEXT: Record<string, string> = {
  can_intro: 'I can intro you',
  paid_intro: 'Paid intro available',
  watching: 'Watching this',
  ship_it: 'Ship it',
  dm_me: 'DM me'
};

// ============================================================================
// News → Forum posts (auto-sync)
// ============================================================================

let lastNewsSyncAt = 0;
let newsSyncInFlight: Promise<void> | null = null;
let lastRedditSyncAt = 0;
let redditSyncInFlight: Promise<void> | null = null;
let lastRedditAttemptAt = 0;
let lastRedditSyncError: string | null = null;
// Cache ONLY the dedicated news community id (do not cache the general fallback),
// so if/when the news community is created later, we start using it without a restart.
let cachedNewsCommunityId: string | null = null;
let cachedSystemUserId: string | null = null;

function stableHash32(input: string): number {
  // Simple deterministic hash (djb2 variant) for stable pseudonyms.
  let h = 5381;
  const s = String(input || '');
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h) ^ s.charCodeAt(i);
  }
  return h >>> 0;
}

function pseudonymForExternalAuthorId(externalAuthorId: string | null | undefined): string {
  const id = String(externalAuthorId || '').trim().toLowerCase();
  if (!id || id === '[deleted]' || id === 'deleted') return 'Anonymous_Redditor';
  const adjectives = [
    'Curious', 'Cosmic', 'Quiet', 'Bold', 'Swift', 'Clever', 'Kind', 'Witty', 'Calm', 'Brave',
    'Bright', 'Sly', 'Sharp', 'Patient', 'Stoic', 'Friendly', 'Mellow', 'Focused', 'Daring', 'Humble'
  ];
  const animals = [
    'Coyote', 'Falcon', 'Otter', 'Tiger', 'Fox', 'Panther', 'Wolf', 'Koala', 'Hawk', 'Dolphin',
    'Badger', 'Raven', 'Lynx', 'Eagle', 'Puma', 'Orca', 'Moose', 'Seal', 'Jaguar', 'Heron'
  ];
  const h = stableHash32(id);
  const adj = adjectives[h % adjectives.length];
  const animal = animals[(Math.floor(h / 97) >>> 0) % animals.length];
  const suffix = String(h % 10000).padStart(4, '0');
  return `${adj}_${animal}_${suffix}`;
}

async function reconcileRedditCommentParents(postId: string): Promise<void> {
  // Convert external_parent_id -> parent_comment_id (UUID) so UI can thread replies.
  const { data: rows, error } = await supabase
    .from('forum_comments')
    .select('id, external_id, external_parent_id')
    .eq('post_id', postId)
    .eq('external_source', 'reddit')
    .not('external_id', 'is', null);
  if (error) throw error;

  const byExternalId = new Map<string, string>();
  for (const r of (rows || []) as any[]) {
    if (r?.external_id && r?.id) byExternalId.set(String(r.external_id), String(r.id));
  }

  const updates: Array<{ id: string; parent_comment_id: string }> = [];
  for (const r of (rows || []) as any[]) {
    const childId = String(r?.id || '');
    const parentExternal = String(r?.external_parent_id || '').trim();
    if (!childId || !parentExternal) continue;
    const parentUuid = byExternalId.get(parentExternal);
    if (!parentUuid) continue;
    updates.push({ id: childId, parent_comment_id: parentUuid });
  }

  // Batch update to avoid a huge number of small requests.
  const chunkSize = 50;
  for (let i = 0; i < updates.length; i += chunkSize) {
    const chunk = updates.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map((u) =>
        supabase
          .from('forum_comments')
          .update({ parent_comment_id: u.parent_comment_id })
          .eq('id', u.id)
      )
    );
  }
}

function stripHtmlToText(html: string): string {
  const withBreaks = (html || '')
    // preserve some structure before stripping tags
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*p\s*>/gi, '\n\n')
    .replace(/<\/\s*div\s*>/gi, '\n\n')
    .replace(/<\/\s*li\s*>/gi, '\n')
    .replace(/<\/\s*h[1-6]\s*>/gi, '\n\n');

  return withBreaks
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<img[^>]*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#8217;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .replace(/&#8230;/g, '...')
    // normalize whitespace but keep paragraph breaks
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toExcerpt(input: string, maxLen = 3500): string {
  const s = (input || '').trim();
  if (!s) return '';
  if (s.length <= maxLen) return s;
  return s.slice(0, maxLen).trimEnd() + '…';
}

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

async function getGeneralCommunityId(): Promise<string | null> {
  const { data, error } = await supabase
    .from('forum_communities')
    .select('id')
    .eq('slug', 'general')
    .single();
  if (error || !data?.id) return null;
  return data.id;
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

      const articles = await fetchDailyIdeaNews();
      if (!articles || articles.length === 0) return;

      const rows = articles
        .filter(a => a?.link)
        .slice(0, 20)
        .map((a) => {
          const publishedAt = a.pubDate ? new Date(a.pubDate).toISOString() : new Date().toISOString();
          const desc = (a.description || '').trim();
          const fullText = stripHtmlToText(a.content || '');
          // Prefer full RSS content; fall back to description if content isn't available.
          const base = fullText.length >= 200 ? fullText : desc;
          const body = toExcerpt(base, 3500);
          return {
            community_id: communityId,
            user_id: systemUserId,
            post_type: 'news',
            content: a.title,
            body,
            media_urls: a.imageUrl ? [a.imageUrl] : [],
            tags: ['news'],
            // News metadata
            news_url: a.link,
            news_source: a.author || 'News',
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

async function ensureRedditSynced(force = false): Promise<void> {
  const now = Date.now();
  const SYNC_INTERVAL_MS = 30 * 60 * 1000; // keep it light; Reddit can rate-limit

  if (!force && now - lastRedditSyncAt < SYNC_INTERVAL_MS) return;
  if (redditSyncInFlight) return redditSyncInFlight;

  redditSyncInFlight = (async () => {
    try {
      lastRedditAttemptAt = Date.now();
      lastRedditSyncError = null;
      const [generalCommunityId, systemUserId] = await Promise.all([
        getGeneralCommunityId(),
        getSystemUserId()
      ]);
      if (!generalCommunityId || !systemUserId) return;

      // Default ON: import top-level Reddit comments unless explicitly disabled.
      // Disable via: REDDIT_IMPORT_COMMENTS=0 (or "false")
      const importComments =
        !(process.env.REDDIT_IMPORT_COMMENTS === '0' || process.env.REDDIT_IMPORT_COMMENTS === 'false');

      const posts = await fetchRedditTopPostsWithComments({
        subreddit: 'StartUpIndia',
        timeframe: 'day',
        limit: 20,
        commentLimitPerPost: importComments ? 50 : 0,
        throttleMs: importComments ? 400 : 0,
      });
      if (!posts || posts.length === 0) return;

      const rows = posts.map((p) => {
        const createdAt = p.createdUtc ? new Date(p.createdUtc * 1000).toISOString() : new Date().toISOString();
        const body = (p.selftext || '').trim();
        return {
          community_id: generalCommunityId,
          user_id: systemUserId,
          post_type: 'regular',
          content: p.title,
          body: body ? body.slice(0, 3500) : null,
          media_urls: [],
          tags: ['reddit'],
          external_source: 'reddit',
          external_id: p.id,
          external_url: p.url,
          created_at: createdAt,
          updated_at: new Date().toISOString(),
          is_deleted: false,
        };
      });

      const { data: upsertedPosts, error } = await supabase
        .from('forum_posts')
        .upsert(rows as any, { onConflict: 'external_source,external_id' })
        .select('id, external_id');

      if (!error) {
        lastRedditSyncAt = Date.now();
      } else {
        lastRedditSyncError = String((error as any)?.message || 'unknown error');
        return;
      }

      // Optional: import top-level Reddit comments as forum comments (idempotent via external_source/external_id on forum_comments).
      if (importComments && upsertedPosts && upsertedPosts.length > 0) {
        const byExternalId = new Map<string, string>();
        for (const row of upsertedPosts as any[]) {
          if (row?.external_id && row?.id) byExternalId.set(String(row.external_id), String(row.id));
        }

        const commentRows: any[] = [];
        const touchedPostIds = new Set<string>();
        for (const p of posts) {
          const forumPostId = byExternalId.get(p.id);
          if (!forumPostId) continue;
          touchedPostIds.add(forumPostId);
          const comments = Array.isArray((p as any).comments) ? ((p as any).comments as any[]) : [];
          for (const c of comments) {
            const body = String(c?.body || '').trim();
            if (!c?.id || !body) continue;
            const createdAt = c?.createdUtc ? new Date(Number(c.createdUtc) * 1000).toISOString() : new Date().toISOString();
            const commentPermalink = typeof c?.permalink === 'string' ? c.permalink : null;
            const externalAuthorId = typeof c?.author === 'string' ? String(c.author) : null;
            commentRows.push({
              post_id: forumPostId,
              user_id: systemUserId,
              content: body.slice(0, 3500),
              parent_comment_id: null,
              external_source: 'reddit',
              external_id: String(c.id),
              external_parent_id: typeof c?.parentId === 'string' ? String(c.parentId) : null,
              external_author_id: externalAuthorId,
              external_author_name: pseudonymForExternalAuthorId(externalAuthorId),
              external_url: commentPermalink ? `https://www.reddit.com${commentPermalink}` : null,
              created_at: createdAt,
              updated_at: new Date().toISOString(),
              is_deleted: false,
            });
          }
        }

        if (commentRows.length > 0) {
          // If the DB hasn't been migrated yet, this upsert may fail; we swallow that error so posts still sync.
          const { error: commentErr } = await supabase
            .from('forum_comments')
            .upsert(commentRows as any, { onConflict: 'external_source,external_id' });
          if (commentErr) {
            console.warn('Reddit comment import skipped (schema missing external_* columns on forum_comments?):', (commentErr as any)?.message || commentErr);
          } else {
            // Populate parent_comment_id for nesting
            for (const pid of Array.from(touchedPostIds)) {
              try {
                await reconcileRedditCommentParents(pid);
              } catch (e) {
                console.warn('Failed to reconcile reddit comment parents for post:', pid, (e as any)?.message || e);
              }
            }
          }
        }
      }
    } catch (e: any) {
      lastRedditSyncError = String(e?.message || 'unknown error');
    } finally {
      redditSyncInFlight = null;
    }
  })();

  return redditSyncInFlight;
}

export const getRedditSyncStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const [{ count: postCount }, { count: commentCount }] = await Promise.all([
      supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .eq('external_source', 'reddit'),
      supabase
        .from('forum_comments')
        .select('*', { count: 'exact', head: true })
        .eq('external_source', 'reddit'),
    ]);

    res.json({
      ok: true,
      subreddit: 'StartUpIndia',
      last_attempt_at: lastRedditAttemptAt ? new Date(lastRedditAttemptAt).toISOString() : null,
      last_success_at: lastRedditSyncAt ? new Date(lastRedditSyncAt).toISOString() : null,
      in_flight: !!redditSyncInFlight,
      last_error: lastRedditSyncError,
      db: {
        reddit_posts: postCount ?? 0,
        reddit_comments: commentCount ?? 0,
      },
    });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || 'unknown error' });
  }
};

/**
 * POST /api/forum/reddit/backfill-comments
 * Partner-only maintenance endpoint to import Reddit comments (threaded) for already-imported Reddit posts.
 *
 * Body (optional):
 * - limitPosts: number (default 100, max 500)
 * - commentLimitPerPost: number (default 50, max 200)
 * - throttleMs: number (default 250)
 */
export const backfillRedditComments = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const limitPosts = Math.max(1, Math.min(500, Number(req.body?.limitPosts ?? 100)));
    const commentLimitPerPost = Math.max(1, Math.min(200, Number(req.body?.commentLimitPerPost ?? 50)));
    const throttleMs = Math.max(0, Math.min(2000, Number(req.body?.throttleMs ?? 250)));

    const systemUserId = await getSystemUserId();
    if (!systemUserId) {
      res.status(500).json({ error: 'System user not configured' });
      return;
    }

    // Find existing Reddit-imported posts that we can fetch threads for.
    const { data: redditPosts, error: postsErr } = await supabase
      .from('forum_posts')
      .select('id, external_url, external_id, created_at')
      .eq('external_source', 'reddit')
      .not('external_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limitPosts);

    if (postsErr) throw postsErr;

    const posts = (redditPosts || []).filter((p: any) => !!p?.external_url);
    let postsProcessed = 0;
    let commentsUpserted = 0;

    for (const p of posts as any[]) {
      const threadUrl = String(p.external_url || '').trim();
      if (!threadUrl) continue;

      const thread = await fetchRedditThreadByUrl(threadUrl, { commentLimit: commentLimitPerPost });
      const comments = Array.isArray(thread?.comments) ? thread.comments : [];
      if (comments.length === 0) {
        postsProcessed += 1;
        if (throttleMs > 0) await new Promise((r) => setTimeout(r, throttleMs));
        continue;
      }

      const commentRows: any[] = [];
      for (const c of comments) {
        const body = String(c?.body || '').trim();
        if (!c?.id || !body) continue;
        const createdAt = c?.createdUtc ? new Date(Number(c.createdUtc) * 1000).toISOString() : new Date().toISOString();
        const commentPermalink = typeof c?.permalink === 'string' ? c.permalink : null;
        const externalAuthorId = typeof c?.author === 'string' ? String(c.author) : null;
        commentRows.push({
          post_id: p.id,
          user_id: systemUserId,
          content: body.slice(0, 3500),
          parent_comment_id: null,
          external_source: 'reddit',
          external_id: String(c.id),
          external_parent_id: typeof c?.parentId === 'string' ? String(c.parentId) : null,
          external_author_id: externalAuthorId,
          external_author_name: pseudonymForExternalAuthorId(externalAuthorId),
          external_url: commentPermalink ? `https://www.reddit.com${commentPermalink}` : null,
          created_at: createdAt,
          updated_at: new Date().toISOString(),
          is_deleted: false,
        });
      }

      if (commentRows.length > 0) {
        const { error: upsertErr } = await supabase
          .from('forum_comments')
          .upsert(commentRows as any, { onConflict: 'external_source,external_id' });
        if (upsertErr) throw upsertErr;
        commentsUpserted += commentRows.length;
        await reconcileRedditCommentParents(String(p.id));
      }

      postsProcessed += 1;
      if (throttleMs > 0) await new Promise((r) => setTimeout(r, throttleMs));
    }

    res.json({
      ok: true,
      limitPosts,
      commentLimitPerPost,
      postsFound: posts.length,
      postsProcessed,
      commentsUpserted,
    });
  } catch (error: any) {
    console.error('Error in backfillRedditComments:', error);
    res.status(500).json({
      error: error.message || 'Internal server error',
      hint: 'Ensure external_* columns + unique indexes exist on forum_posts/forum_comments (see latest migration).',
    });
  }
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
    const { community, page = '1', limit = '20', sort = 'new', tags, force_reddit, include_body, include_blocks } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;
    const sortType = sort as string;
    const wantBody = include_body === '1' || include_body === 'true';
    const wantBlocks = include_blocks === '1' || include_blocks === 'true';

    // These communities must not appear as communities; they are treated as tags under General.
    const LEGACY_COMMUNITY_SLUGS = ['build-in-public', 'wins', 'failures', 'network'] as const;
    const ALLOWED_COMMUNITY_SLUGS = ['general', 'news', 'market-research', 'predictions', 'market-gaps', 'requests', 'events'] as const;
    const uniq = (arr: string[]) => Array.from(new Set(arr));

    const requestedCommunity = typeof community === 'string' ? community : undefined;
    let effectiveCommunity = requestedCommunity;
    // Back-compat: `pain-points` was renamed to `market-gaps`.
    if (effectiveCommunity === 'pain-points') {
      effectiveCommunity = 'market-gaps';
    }

    let tagArray: string[] = [];
    if (tags && typeof tags === 'string') {
      tagArray = tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Back-compat: if a legacy community is requested as "community", treat it as a General tag filter instead.
    if (effectiveCommunity && LEGACY_COMMUNITY_SLUGS.includes(effectiveCommunity as any)) {
      tagArray = uniq([...tagArray, effectiveCommunity]);
      effectiveCommunity = 'general';
    }

    // Partner-only community locks (server-side)
    if (effectiveCommunity === 'market-research' || effectiveCommunity === 'events') {
      const role = (req.user as any)?.role;
      if (role !== 'ZAURQ_PARTNER') {
        res.status(403).json({
          error: 'Zaurq Partner required',
          reason: 'This community is only available to Zaurq Partners',
          community: effectiveCommunity,
          role
        });
        return;
      }
    }

    // If forum is showing All/General, ensure news is synced into forum_posts
    if (!effectiveCommunity || effectiveCommunity === 'all' || effectiveCommunity === 'general') {
      ensureNewsSynced().catch(() => {});
    }

    // If forum is showing All/General, opportunistically sync Reddit top posts into General (tagged as 'reddit').
    if (!effectiveCommunity || effectiveCommunity === 'all' || effectiveCommunity === 'general') {
      const force = force_reddit === '1' || force_reddit === 'true';
      ensureRedditSynced(force).catch(() => {});
    }

    // IMPORTANT: keep list payload light (exclude large columns like body/report_blocks unless explicitly requested).
    // The detail endpoint /posts/:id is the source of truth for full content.
    const baseCols = [
      'id',
      'community_id',
      'user_id',
      'project_id',
      'content',
      'media_urls',
      'post_type',
      'day_number',
      'milestone_title',
      'created_at',
      'updated_at',
      'tags',
      'upvotes',
      'downvotes',
      // External / imported content
      'external_url',
      'external_id',
      // Predictions
      'headline',
      'company',
      'resolution_date',
      'resolution_source',
      'prediction_category',
      'initial_probability',
      'resolved_outcome',
      // Market gaps / brand analyses
      'brand_name',
      'sentiment_score',
      'pain_points',
      'sources',
      // News metadata (stored as posts)
      'news_url',
      'news_source',
      'news_published_at',
      'news_image_url',
    ];
    if (wantBody) baseCols.push('body');
    if (wantBlocks) baseCols.push('report_blocks');

    const selectClause = `
      ${baseCols.join(',')},
        user:users(id, anonymous_name),
        community:forum_communities(id, name, slug, icon, color),
        project:forum_projects(id, name, url, logo_url)
    `;

    let query = supabase
      .from('forum_posts')
      .select(selectClause)
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

    // Batch-load post metadata to avoid N+1 queries (critical for feed latency).
    const userId = req.user?.id;
    const rows = Array.isArray(data) ? data : [];
    const postIds: string[] = rows.map((p: any) => p?.id).filter(Boolean);

    const reactionCountsByPost: Record<string, Record<string, number>> = {};
    const userVoteByPost: Record<string, 'up' | 'down'> = {};
    const commentCountByPost: Record<string, number> = {};
    const pollByPost: Record<string, { id: string; question: string; options: any }> = {};
    const pollVoteCountsByPoll: Record<string, number[]> = {};
    const pollUserVoteByPoll: Record<string, number> = {};

    if (postIds.length > 0) {
      const [reactionsRes, votesRes, commentsRes, pollsRes] = await Promise.all([
        supabase
          .from('forum_reactions')
          .select('target_id, emoji')
          .eq('target_type', 'post')
          .in('target_id', postIds),
        userId
          ? supabase
            .from('forum_post_votes')
              .select('post_id, vote_type')
            .eq('user_id', userId)
              .in('post_id', postIds)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('forum_comments')
          .select('post_id')
          .eq('is_deleted', false)
          .in('post_id', postIds),
        supabase
          .from('forum_polls')
          .select('id, post_id, question, options')
          .in('post_id', postIds),
      ]);

      const reactions = (reactionsRes as any)?.data || [];
      for (const r of reactions) {
        const pid = String(r?.target_id || '');
        const emoji = String(r?.emoji || '');
        if (!pid || !emoji) continue;
        if (!reactionCountsByPost[pid]) reactionCountsByPost[pid] = {};
        reactionCountsByPost[pid][emoji] = (reactionCountsByPost[pid][emoji] || 0) + 1;
      }

      const votes = (votesRes as any)?.data || [];
      for (const v of votes) {
        const pid = String(v?.post_id || '');
        const vt = String(v?.vote_type || '');
        if (!pid || (vt !== 'up' && vt !== 'down')) continue;
        userVoteByPost[pid] = vt as 'up' | 'down';
      }

      const comments = (commentsRes as any)?.data || [];
      for (const c of comments) {
        const pid = String(c?.post_id || '');
        if (!pid) continue;
        commentCountByPost[pid] = (commentCountByPost[pid] || 0) + 1;
            }

      const polls = (pollsRes as any)?.data || [];
      const pollIds: string[] = [];
      for (const p of polls) {
        const pid = String(p?.post_id || '');
        const pollId = String(p?.id || '');
        if (!pid || !pollId) continue;
        pollByPost[pid] = { id: pollId, question: p?.question, options: p?.options };
        pollIds.push(pollId);
      }

      if (pollIds.length > 0) {
        const [pollVotesRes, pollUserVotesRes] = await Promise.all([
          supabase.from('forum_poll_votes').select('poll_id, option_index').in('poll_id', pollIds),
          userId
            ? supabase
              .from('forum_poll_votes')
                .select('poll_id, option_index')
              .eq('user_id', userId)
                .in('poll_id', pollIds)
            : Promise.resolve({ data: [] as any[] }),
        ]);

        const pv = (pollVotesRes as any)?.data || [];
        for (const v of pv) {
          const pid = String(v?.poll_id || '');
          const idx = Number(v?.option_index);
          if (!pid || !Number.isFinite(idx)) continue;
          const arr = (pollVoteCountsByPoll[pid] ||= [0, 0, 0, 0]);
          if (idx >= 0 && idx < arr.length) arr[idx] += 1;
        }

        const puv = (pollUserVotesRes as any)?.data || [];
        for (const v of puv) {
          const pid = String(v?.poll_id || '');
          const idx = Number(v?.option_index);
          if (!pid || !Number.isFinite(idx)) continue;
          pollUserVoteByPoll[pid] = idx;
        }
      }
    }

    const postsWithData = rows.map((post: any) => {
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

      const pid = String(post?.id || '');
      const pollRow = pollByPost[pid];
      let pollData: any = null;
      if (pollRow?.id) {
        const counts = pollVoteCountsByPoll[pollRow.id] || [0, 0, 0, 0];
          pollData = {
          id: pollRow.id,
          question: pollRow.question,
          options: pollRow.options,
          vote_counts: counts,
          total_votes: counts.reduce((a, b) => a + b, 0),
          user_vote: pollUserVoteByPoll[pollRow.id],
        };
        }

        return {
          ...post,
          tags: mappedTags,
          community: mappedCommunity,
        reaction_counts: reactionCountsByPost[pid] || {},
          poll: pollData,
        comment_count: commentCountByPost[pid] || 0,
        user_vote: userVoteByPost[pid] || null,
          upvotes: post.upvotes || 0,
        downvotes: post.downvotes || 0,
        score: (post.upvotes || 0) - (post.downvotes || 0),
        };
    });

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

// Generate and store report_blocks for a post (markdown -> JSON blocks)
export const generateReportBlocksForPost = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    if (!id) {
      res.status(400).json({ error: 'Missing post id' });
      return;
    }

    const { data: post, error } = await supabase
      .from('forum_posts')
      .select('id, content, body, post_type')
      .eq('id', id)
      .eq('is_deleted', false)
      .single();

    if (error || !post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    const body = String(post.body || '').trim();
    if (!body) {
      res.status(400).json({ error: 'Post has no markdown body' });
      return;
    }

    // Only generate blocks for report-like posts
    const pt = String(post.post_type || '').toLowerCase();
    if (!(pt === 'research_report' || pt === 'market-gap')) {
      res.status(400).json({ error: 'Post type is not a report', post_type: post.post_type });
      return;
    }

    const doc = await generateReportBlocksFromMarkdown({
      markdown: body,
      fallbackTitle: String(post.content || '').slice(0, 120),
    });

    const { data: updated, error: upErr } = await supabase
      .from('forum_posts')
      .update({ report_blocks: doc, updated_at: new Date().toISOString() } as any)
      .eq('id', id)
      .select('id, report_blocks')
      .single();

    if (upErr) {
      res.status(500).json({ error: 'Failed to save report blocks' });
      return;
    }

    res.json({ success: true, post_id: id, report_blocks: updated?.report_blocks });
  } catch (e: any) {
    console.error('Error in generateReportBlocksForPost:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
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

    const { community_slug, content, body, media_urls, project_id, day_number, milestone_title, post_type, poll, tags } = req.body;

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
        body: typeof body === 'string' ? body : null,
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
        external_author_id,
        external_author_name,
        external_parent_id,
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
    const debug = req.body?.debug === true || req.body?.debug === 'true';
    const { report, artifacts } = await generateBrandPainPointsReport({
      brandName: brand_name,
      countryContext: req.body?.country_context || 'India',
      maxUrls: typeof req.body?.max_urls === 'number' ? req.body.max_urls : 15,
      maxCommentsPerPost: typeof req.body?.max_comments_per_post === 'number' ? req.body.max_comments_per_post : 50,
      debug,
    });

    // Get the market-gaps community (formerly pain-points)
    const { data: community } = await supabase
      .from('forum_communities')
      .select('id')
      .eq('slug', 'market-gaps')
      .single();

    if (!community) {
      res.status(500).json({ error: 'Market Gaps community not found' });
      return;
    }

    // Create a forum post with the report
    const postContent = `Market Gaps: ${brand_name}`;
    const postBody = `## ${brand_name} - Market Gaps Analysis

**Sentiment Score:** ${report.sentiment_score.toFixed(2)}/1.00
**Total Mentions Analyzed:** ${report.total_mentions}
**Generated:** ${new Date(report.generated_at).toLocaleDateString()}

### Top Issues / Gaps

${report.top_complaints.map((c: any, i: number) => `
**${i + 1}. ${c.category}** (${c.count} mentions)
${c.quotes.map((q: string) => `> "${q}"`).join('\n')}
`).join('\n')}

### Competitors Mentioned
${report.competitors_mentioned.length > 0 ? report.competitors_mentioned.join(', ') : 'None detected'}

### Opportunities
${report.opportunities?.length ? report.opportunities.map((o: string) => `- ${o}`).join('\n') : 'None detected'}

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
        post_type: 'market-gap',
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

    // Save DB insert payload into run artifacts (if enabled)
    if (artifacts) {
      try {
        const fs = await import('fs/promises');
        const path = await import('path');
        const payloadPath = path.join(artifacts.dir, 'step5_db_insert.json');
        await fs.writeFile(payloadPath, JSON.stringify({
          community_id: community.id,
          user_id: userId,
          content: postContent,
          body: postBody,
          post_type: 'market-gap',
          brand_name: brand_name,
          sentiment_score: report.sentiment_score,
          pain_points: report.top_complaints,
          sources: report.source_urls,
          inserted_post_id: post.id
        }, null, 2), 'utf8');
      } catch (e) {
        // ignore artifact failures
      }
    }

    res.status(201).json({ 
      success: true, 
      report,
      post_id: post.id,
      debug: artifacts ? { run_id: artifacts.run_id, dir: artifacts.dir, files: artifacts.files } : undefined,
    });
  } catch (error: any) {
    console.error('Error in generatePainPointsReport:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report' });
  }
};

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


// ============================================================================
// Zaurq Partners Feed (curated)
// ============================================================================

/**
 * GET /api/forum/partners-feed
 * Curated feed for Zaurq Partners:
 * - only shows posts from ZAURQ_USER authors
 * - only posts that are "gaining traction"
 */
export const getPartnersFeed = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const role = (req.user as any)?.role;
    if (role !== 'ZAURQ_PARTNER') {
      res.status(403).json({ error: 'Zaurq Partner required' });
      return;
    }

    const limitNum = Math.max(1, Math.min(50, parseInt(String(req.query.limit || '20'), 10) || 20));
    const days = Math.max(1, Math.min(30, parseInt(String(req.query.days || '7'), 10) || 7));
    const since = new Date(Date.now() - days * 864e5).toISOString();

    const { data: rows, error } = await supabase
      .from('forum_posts')
      .select(`
        *,
        user:users(id, anonymous_name, first_name, last_name, profile_picture_url, role),
        community:forum_communities(id, name, slug, icon, color),
        project:forum_projects(id, name, url, logo_url)
      `)
      .eq('is_deleted', false)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(250);

    if (error) throw error;

    const all = (rows || []) as any[];
    const fromNormalUsers = all.filter((p) => (p?.user as any)?.role === 'ZAURQ_USER');

    // Count comments for scoring
    const postIds = fromNormalUsers.map((p) => p.id).filter(Boolean);
    const commentCountByPost: Record<string, number> = {};
    if (postIds.length) {
      const { data: commentRows } = await supabase
        .from('forum_comments')
        .select('post_id')
        .in('post_id', postIds)
        .eq('is_deleted', false);

      for (const c of (commentRows || []) as any[]) {
        const pid = String(c.post_id || '');
        if (!pid) continue;
        commentCountByPost[pid] = (commentCountByPost[pid] || 0) + 1;
      }
    }

    const now = Date.now();
    const scored = fromNormalUsers.map((p) => {
      const up = Number(p?.upvotes || 0);
      const down = Number(p?.downvotes || 0);
      const score = up - down;
      const comments = commentCountByPost[String(p.id)] || 0;
      const ageHrs = (now - new Date(p.created_at).getTime()) / 36e5;

      // Hot-like score: log(score+comments boost) minus age decay
      const raw = Math.max(1, score + comments * 2);
      const hot = Math.log10(raw) - (ageHrs / 12);

      return {
        ...p,
        comment_count: comments,
        upvotes: up,
        downvotes: down,
        score,
        _hot: hot,
      };
    });

    // Require some engagement to qualify
    const filtered = scored.filter((p) => (p.score >= 2 || (p.comment_count || 0) >= 1));
    filtered.sort((a, b) => (b._hot || 0) - (a._hot || 0));

    res.json({ posts: filtered.slice(0, limitNum) });
  } catch (error: any) {
    console.error('Error in getPartnersFeed:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

/**
 * GET /api/forum/communities/:slug/stats
 * Returns community statistics: member count, online count, posts count
 */
export const getCommunityStats = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { slug } = req.params;
    
    // Get total member count (all users)
    const { count: totalUsers, error: usersError } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    if (usersError) throw usersError;
    
    // Get online users (users with interactions in last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentInteractions, error: interactionsError } = await supabase
      .from('interactions')
      .select('user_id')
      .gte('created_at', tenMinutesAgo);
    
    // Count unique users online
    const onlineUserIds = new Set((recentInteractions || []).map((i: any) => i.user_id));
    const onlineCount = onlineUserIds.size;
    
    // Get posts count for the specific community
    let postsCount = 0;
    let communityInfo = null;
    
    if (slug === 'all') {
      // All posts across all communities
      const { count, error: postsError } = await supabase
        .from('forum_posts')
        .select('*', { count: 'exact', head: true })
        .eq('is_deleted', false);
      
      if (postsError) throw postsError;
      postsCount = count || 0;
    } else if (slug === 'offers' || slug === 'people' || slug === 'your-club' || slug === 'zaurq-partners') {
      // Special communities - no forum posts
      postsCount = 0;
    } else {
      // Regular community - get community ID first
      const { data: community, error: communityError } = await supabase
        .from('forum_communities')
        .select('id, name, slug, description, icon, color, created_at')
        .eq('slug', slug)
        .single();
      
      if (communityError && communityError.code !== 'PGRST116') throw communityError;
      
      if (community) {
        communityInfo = community;
        
        // Count posts in this community
        const { count, error: postsError } = await supabase
          .from('forum_posts')
          .select('*', { count: 'exact', head: true })
          .eq('community_id', community.id)
          .eq('is_deleted', false);
        
        if (postsError) throw postsError;
        postsCount = count || 0;
      }
    }
    
    res.json({
      slug,
      memberCount: totalUsers || 0,
      onlineCount: Math.max(onlineCount, 1), // At least 1 (the current user)
      postsCount,
      community: communityInfo,
    });
  } catch (error: any) {
    console.error('Error in getCommunityStats:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

