type RedditListing = {
  data?: {
    children?: Array<{
      data?: {
        id?: string;
        title?: string;
        permalink?: string;
        url?: string;
        selftext?: string;
        created_utc?: number;
        score?: number;
        ups?: number;
        downs?: number;
        num_comments?: number;
        author?: string;
        subreddit?: string;
        thumbnail?: string;
        preview?: any;
      };
    }>;
  };
};

export type RedditTopPost = {
  id: string;
  title: string;
  permalink: string;
  url: string;
  createdUtc?: number;
  selftext?: string;
  subreddit?: string;
  author?: string;
  score?: number;
  numComments?: number;
};

let cache: { at: number; posts: RedditTopPost[] } | null = null;

type RedditTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number; // seconds
  scope?: string;
};

type RedditComment = {
  id: string;
  parentId?: string;
  author?: string;
  body?: string;
  score?: number;
  createdUtc?: number;
  permalink?: string;
};

export type RedditTopPostWithComments = RedditTopPost & {
  comments?: RedditComment[];
};

export type RedditThread = {
  post: RedditTopPost;
  comments: RedditComment[];
};

let oauthCache: { accessToken: string; expiresAtMs: number } | null = null;

function getRedditUserAgent(): string {
  return process.env.REDDIT_USER_AGENT || '6DegreesForum/1.0 (server-side sync; contact: support@6degree.app)';
}

function hasRedditOAuth(): boolean {
  return !!(process.env.REDDIT_CLIENT_ID && process.env.REDDIT_CLIENT_SECRET);
}

async function getRedditAccessToken(): Promise<string | null> {
  if (!hasRedditOAuth()) return null;

  const now = Date.now();
  if (oauthCache && oauthCache.expiresAtMs - now > 30_000) {
    return oauthCache.accessToken;
  }

  const clientId = process.env.REDDIT_CLIENT_ID!;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET!;

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${basic}`,
      'User-Agent': getRedditUserAgent(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Reddit OAuth token fetch failed: ${res.status} ${text}`.trim());
  }

  const json = (await res.json()) as RedditTokenResponse;
  const token = String(json?.access_token || '').trim();
  const expiresIn = typeof json?.expires_in === 'number' ? json.expires_in : 3600;
  if (!token) throw new Error('Reddit OAuth token fetch failed: empty access_token');

  oauthCache = { accessToken: token, expiresAtMs: now + expiresIn * 1000 };
  return token;
}

async function redditFetchJson<T>(url: string): Promise<T> {
  const token = await getRedditAccessToken();
  const headers: Record<string, string> = {
    'User-Agent': getRedditUserAgent(),
    'Accept': 'application/json',
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(url, { headers });
  if (res.status === 401 && token) {
    // Token expired/invalid; refresh once and retry.
    oauthCache = null;
    const refreshed = await getRedditAccessToken();
    const retryHeaders = { ...headers, Authorization: `Bearer ${refreshed}` };
    const retry = await fetch(url, { headers: retryHeaders });
    if (!retry.ok) {
      const text = await retry.text().catch(() => '');
      throw new Error(`Reddit fetch failed: ${retry.status} ${text}`.trim());
    }
    return (await retry.json()) as T;
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Reddit fetch failed: ${res.status} ${text}`.trim());
  }
  return (await res.json()) as T;
}

function getRedditBaseHost(): string {
  // Prefer oauth host when available; it tends to be more reliable for heavier usage.
  return hasRedditOAuth() ? 'https://oauth.reddit.com' : 'https://www.reddit.com';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchRedditTopPosts(params: {
  subreddit: string;
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
  cacheMs?: number;
}): Promise<RedditTopPost[]> {
  const subreddit = params.subreddit;
  const timeframe = params.timeframe || 'day';
  const limit = params.limit ?? 20;
  const cacheMs = params.cacheMs ?? 15 * 60 * 1000;

  const now = Date.now();
  if (cache && now - cache.at < cacheMs) return cache.posts;

  const base = getRedditBaseHost();
  const url = `${base}/r/${encodeURIComponent(subreddit)}/top.json?t=${encodeURIComponent(timeframe)}&limit=${encodeURIComponent(
    String(limit)
  )}&raw_json=1`;

  const json = await redditFetchJson<RedditListing>(url);
  const children = json?.data?.children || [];
  const posts: RedditTopPost[] = children
    .map((c) => c?.data)
    .filter(Boolean)
    .map((p) => {
      const id = String(p!.id || '');
      const permalink = String(p!.permalink || '');
      const url = String(p!.url || (permalink ? `https://www.reddit.com${permalink}` : ''));
      return {
        id,
        title: String(p!.title || '').trim(),
        permalink,
        url,
        createdUtc: typeof p!.created_utc === 'number' ? p!.created_utc : undefined,
        selftext: typeof p!.selftext === 'string' ? p!.selftext : undefined,
        subreddit: typeof p!.subreddit === 'string' ? p!.subreddit : subreddit,
        author: typeof p!.author === 'string' ? p!.author : undefined,
        score: typeof p!.score === 'number' ? p!.score : undefined,
        numComments: typeof p!.num_comments === 'number' ? p!.num_comments : undefined,
      };
    })
    .filter((p) => p.id && p.title && p.url);

  cache = { at: now, posts };
  return posts;
}

type RedditCommentListing = {
  kind?: string;
  data?: {
    children?: Array<{
      kind?: string;
      data?: {
        id?: string;
        parent_id?: string;
        author?: string;
        body?: string;
        score?: number;
        created_utc?: number;
        permalink?: string;
        replies?: any;
      };
    }>;
  };
};

async function fetchRedditCommentsForPermalink(permalink: string, limit = 50): Promise<RedditComment[]> {
  const base = getRedditBaseHost();
  const path = permalink.startsWith('/') ? permalink : `/${permalink}`;
  const url = `${base}${path}.json?limit=${encodeURIComponent(String(limit))}&raw_json=1`;

  // The permalink.json response is [postListing, commentListing]
  const json = await redditFetchJson<any>(url);
  const commentListing = Array.isArray(json) ? (json[1] as RedditCommentListing | undefined) : undefined;
  const children = commentListing?.data?.children || [];

  const out: RedditComment[] = [];

  const walk = (nodes: any[], parentId?: string) => {
    for (const n of nodes || []) {
      if (out.length >= limit) return;
      if (!n || n.kind !== 't1') continue; // skip 'more' and unknown kinds
      const d = n.data || {};
      const id = typeof d.id === 'string' ? d.id : null;
      const body = typeof d.body === 'string' ? d.body : null;
      if (!id || !body) continue;

      // Prefer explicit parent passed down; fall back to parent_id if present (t1_xxx / t3_xxx)
      const parentFromApi =
        typeof d.parent_id === 'string' && d.parent_id.startsWith('t1_') ? d.parent_id.slice(3) : undefined;
      const effectiveParent = parentId || parentFromApi;

      out.push({
        id: String(id),
        parentId: effectiveParent,
        author: typeof d.author === 'string' ? d.author : undefined,
        body: String(body),
        score: typeof d.score === 'number' ? d.score : undefined,
        createdUtc: typeof d.created_utc === 'number' ? d.created_utc : undefined,
        permalink: typeof d.permalink === 'string' ? d.permalink : undefined,
      });

      // Recurse into replies, if any (Reddit returns '' or a listing object)
      const replies = d.replies;
      const replyChildren =
        replies && typeof replies === 'object' ? (replies?.data?.children as any[] | undefined) : undefined;
      if (Array.isArray(replyChildren) && replyChildren.length > 0) {
        walk(replyChildren, String(id));
      }
    }
  };

  walk(children);
  return out;
}

function normalizeThreadPermalinkFromUrl(threadUrl: string): string | null {
  try {
    const u = new URL(threadUrl);
    const host = u.hostname.replace(/^www\./, '');
    if (host !== 'reddit.com') return null;
    const path = u.pathname.replace(/\/$/, '');
    if (!path.includes('/comments/')) return null;
    return path.startsWith('/') ? path : `/${path}`;
  } catch {
    return null;
  }
}

export async function fetchRedditThreadByUrl(
  threadUrl: string,
  opts?: { commentLimit?: number }
): Promise<RedditThread> {
  const commentLimit = opts?.commentLimit ?? 50;
  const permalink = normalizeThreadPermalinkFromUrl(threadUrl);
  if (!permalink) {
    throw new Error(`Invalid Reddit thread URL: ${threadUrl}`);
  }

  // Fetch the post listing + comment listing
  const base = getRedditBaseHost();
  const url = `${base}${permalink}.json?limit=${encodeURIComponent(String(commentLimit))}&raw_json=1`;
  const json = await redditFetchJson<any>(url);
  const postListing = Array.isArray(json) ? (json[0] as RedditListing | undefined) : undefined;
  const postData = postListing?.data?.children?.[0]?.data;
  if (!postData?.id) {
    throw new Error(`Reddit thread fetch failed: missing post data for ${threadUrl}`);
  }

  const subreddit = typeof postData.subreddit === 'string' ? postData.subreddit : undefined;
  const id = String(postData.id || '');
  const pPermalink = String(postData.permalink || permalink);
  const pUrl = String(postData.url || (pPermalink ? `https://www.reddit.com${pPermalink}` : threadUrl));

  const post: RedditTopPost = {
    id,
    title: String(postData.title || '').trim(),
    permalink: pPermalink,
    url: pUrl,
    createdUtc: typeof postData.created_utc === 'number' ? postData.created_utc : undefined,
    selftext: typeof postData.selftext === 'string' ? postData.selftext : undefined,
    subreddit,
    author: typeof postData.author === 'string' ? postData.author : undefined,
    score: typeof postData.score === 'number' ? postData.score : undefined,
    numComments: typeof postData.num_comments === 'number' ? postData.num_comments : undefined,
  };

  const comments = await fetchRedditCommentsForPermalink(pPermalink, commentLimit);
  return { post, comments };
}

export async function fetchRedditTopPostsWithComments(params: {
  subreddit: string;
  timeframe?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  limit?: number;
  cacheMs?: number;
  commentLimitPerPost?: number;
  throttleMs?: number;
}): Promise<RedditTopPostWithComments[]> {
  const commentLimitPerPost = params.commentLimitPerPost ?? 50;
  const throttleMs = params.throttleMs ?? 350;

  const posts = await fetchRedditTopPosts(params);
  const out: RedditTopPostWithComments[] = [];

  // Keep this sequential by default to stay well below Reddit’s rate limits.
  for (const p of posts) {
    try {
      const comments = p.permalink ? await fetchRedditCommentsForPermalink(p.permalink, commentLimitPerPost) : [];
      out.push({ ...p, comments });
    } catch {
      out.push({ ...p, comments: [] });
    }
    if (throttleMs > 0) await sleep(throttleMs);
  }

  return out;
}


