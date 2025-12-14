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

  const url = `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/top.json?t=${encodeURIComponent(timeframe)}&limit=${encodeURIComponent(
    String(limit)
  )}`;

  const res = await fetch(url, {
    headers: {
      // Reddit expects a descriptive UA; generic UAs are often blocked/rate-limited.
      'User-Agent': '6DegreesForum/1.0 (server-side sync; contact: support@6degree.app)',
      'Accept': 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Reddit fetch failed: ${res.status}`);
  }

  const json = (await res.json()) as RedditListing;
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


