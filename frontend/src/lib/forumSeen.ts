const KEY = 'forum_seen_posts_v1';
const RECENT_KEY = 'forum_recent_posts_v1';
const MAX_ITEMS = 500;
const MAX_RECENT = 25;

type SeenMap = Record<string, number>;
export type RecentForumPost = {
  id: string;
  title: string;
  communitySlug?: string;
  ts: number;
};

function safeParse(json: string | null): SeenMap {
  if (!json) return {};
  try {
    const v = JSON.parse(json);
    if (v && typeof v === 'object') return v as SeenMap;
    return {};
  } catch {
    return {};
  }
}

export function getSeenForumPostIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  const map = safeParse(window.localStorage.getItem(KEY));
  return new Set(Object.keys(map));
}

function safeParseRecent(json: string | null): RecentForumPost[] {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    if (Array.isArray(v)) return v as RecentForumPost[];
    return [];
  } catch {
    return [];
  }
}

export function getRecentForumPosts(): RecentForumPost[] {
  if (typeof window === 'undefined') return [];
  const list = safeParseRecent(window.localStorage.getItem(RECENT_KEY));
  return list
    .filter((x) => x && typeof x.id === 'string' && typeof x.title === 'string')
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, MAX_RECENT);
}

export function pushRecentForumPost(input: { id: string; title: string; communitySlug?: string; ts?: number }): void {
  if (typeof window === 'undefined') return;
  if (!input?.id || !input?.title) return;
  const now = typeof input.ts === 'number' ? input.ts : Date.now();
  const prev = safeParseRecent(window.localStorage.getItem(RECENT_KEY));
  const next: RecentForumPost[] = [
    { id: input.id, title: input.title, communitySlug: input.communitySlug, ts: now },
    ...prev.filter((p) => p?.id !== input.id),
  ];
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next.slice(0, MAX_RECENT)));
}

export function markForumPostSeen(
  postId: string,
  meta?: { title?: string; communitySlug?: string }
): void {
  if (typeof window === 'undefined') return;
  if (!postId) return;

  const now = Date.now();
  const map = safeParse(window.localStorage.getItem(KEY));
  map[postId] = now;

  // Prune oldest
  const entries = Object.entries(map);
  if (entries.length > MAX_ITEMS) {
    entries.sort((a, b) => a[1] - b[1]); // oldest first
    for (let i = 0; i < entries.length - MAX_ITEMS; i++) {
      delete map[entries[i][0]];
    }
  }

  window.localStorage.setItem(KEY, JSON.stringify(map));

  if (meta?.title) {
    pushRecentForumPost({ id: postId, title: meta.title, communitySlug: meta.communitySlug, ts: now });
  }
}


