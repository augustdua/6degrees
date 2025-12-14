const KEY = 'forum_seen_posts_v1';
const MAX_ITEMS = 500;

type SeenMap = Record<string, number>;

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

export function markForumPostSeen(postId: string): void {
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
}


