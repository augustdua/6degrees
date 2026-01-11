import { useState, useEffect, useMemo, useRef } from 'react';
import { apiGet } from '@/lib/api';
import { ForumPostCard } from './ForumPostCard';
import { PredictionCard } from './PredictionCard';
import { ResearchPostCard } from './ResearchPostCard';
import { BrandPainPointCard } from './BrandPainPointCard';
import { NewsPostCard } from './NewsPostCard';
import { Loader2, TrendingUp, Clock, Flame, Sparkles, Users, Target, FileText, Newspaper, LayoutGrid, Calendar, Gift, Sun, Moon, Trophy, AlertTriangle, Lock, Video, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { getRecentForumPosts, getSeenForumPostIds } from '@/lib/forumSeen';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from 'next-themes';
import { SwipePeopleView } from '@/components/SwipePeopleView';
import SocialCapitalLeaderboard from '@/components/SocialCapitalLeaderboard';
import { usePeople } from '@/hooks/usePeople';
import { Input } from '@/components/ui/input';
import { RightSidebarNetworkCard } from '@/components/home/RightSidebarNetworkCard';
import { RightSidebarIntegrationsCard } from '@/components/home/RightSidebarIntegrationsCard';
import { WhatsAppInviteModal } from '@/components/home/WhatsAppInviteModal';
import { RightSidebarAgendaCard } from '@/components/home/RightSidebarAgendaCard';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  display_order?: number;
}

interface Poll {
  id: string;
  question: string;
  options: string[];
  vote_counts: number[];
  total_votes: number;
  user_vote?: number;
}

interface ForumPost {
  id: string;
  content: string;
  body?: string | null;
  media_urls: string[] | null;
  post_type: string;
  day_number: number | null;
  milestone_title: string | null;
  created_at: string;
  upvotes?: number;
  downvotes?: number;
  tags?: string[];
  user?: {
    id: string;
    anonymous_name: string;
  } | null;
  community?: Community | null;
  project?: {
    id: string;
    name: string;
    url: string;
    logo_url: string;
  } | null;
  reaction_counts: Record<string, number> | null;
  poll?: Poll | null;
  comment_count?: number;
  // Prediction-specific fields
  headline?: string | null;
  company?: string | null;
  resolution_date?: string | null;
  resolution_source?: string | null;
  prediction_category?: string | null;
  initial_probability?: number | null;
  resolved_outcome?: boolean | null;
  // Pain Point specific fields
  brand_name?: string | null;
  sentiment_score?: number | null;
  pain_points?: any;
  sources?: string[];
}

// PRM transition: hide these forum-only communities from the UI and from Catch-Up.
const HIDDEN_COMMUNITY_SLUGS = new Set(['general', 'news', 'market-research', 'predictions']);

// Tags and General community UI removed (PRM surface).

function getCommunityIcon(slug: string) {
  switch (slug) {
    case 'all':
      return LayoutGrid;
    case 'general':
      return LayoutGrid;
    case 'moments':
      return Sparkles;
    case 'news':
      return Newspaper;
    case 'predictions':
      return TrendingUp;
    case 'market-research':
      return FileText;
    case 'market-gaps':
      return AlertTriangle;
    case 'events':
      return Calendar;
    case 'gifts':
      return Gift;
    case 'trips':
      return Target;
    case 'people':
      return Users;
    default:
      return Users;
  }
}

const SIDEBAR_COMMUNITY_ORDER = ['moments', 'gifts', 'events', 'trips'] as const;

function orderSidebarCommunities(list: Community[]): Community[] {
  // Desired order: Catch-Up (handled by 'all' button), then:
  // Moments, Gifts, Events, Trips
  const idx = (slug: string) => {
    const i = SIDEBAR_COMMUNITY_ORDER.indexOf(slug as any);
    return i === -1 ? Number.POSITIVE_INFINITY : i;
  };

  const filtered = [...list]
    // PRM transition: remove forum-only communities
    .filter((c) => !HIDDEN_COMMUNITY_SLUGS.has(c.slug))
    .filter((c) => c.slug !== 'market-gaps'); // legacy merge into market-research

  // Ensure Moments is always present even if backend does not return it.
  if (!filtered.some((c) => c.slug === 'moments')) {
    filtered.push({
      id: 'moments',
      name: 'Moments',
      slug: 'moments',
      description: 'Birthdays, follow-ups, reminders',
      icon: '✨',
      color: '#CBAA5A',
      display_order: -1,
    });
  }

  return filtered
    .sort((a, b) => {
      const ai = idx(a.slug);
      const bi = idx(b.slug);
      if (ai !== bi) return ai - bi;

      // Preserve backend ordering when slugs are not in the primary list.
      const ao = a.display_order ?? 9999;
      const bo = b.display_order ?? 9999;
      if (ao !== bo) return ao - bo;

      return String(a.name || '').localeCompare(String(b.name || ''));
    });
}

export const ForumTabContent = () => {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<
    Array<{ displayName: string; photoUrl?: string | null; nextOccurrenceIso: string; daysUntil: number }>
  >([]);
  const [birthdaysLoading, setBirthdaysLoading] = useState(false);
  const [birthdaysSyncing, setBirthdaysSyncing] = useState(false);
  const [connectionCount, setConnectionCount] = useState<number | null>(null);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<string>('all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWhatsAppInviteModal, setShowWhatsAppInviteModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [seenNonce, setSeenNonce] = useState(0);

  // PRM "Today" card state (lightweight, per-day local progress)
  const todayKey = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `zaurq_today_actions_${y}-${m}-${day}`;
  }, []);
  const [todayDone, setTodayDone] = useState<Record<string, boolean>>(() => {
    try {
      const raw = window.localStorage.getItem(todayKey);
      return raw ? (JSON.parse(raw) as any) : {};
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(todayKey, JSON.stringify(todayDone || {}));
    } catch {
      // ignore
    }
  }, [todayKey, todayDone]);

  // Gifts catalog state
  const [giftsQuery, setGiftsQuery] = useState('');
  const [giftsLoading, setGiftsLoading] = useState(false);
  const [gifts, setGifts] = useState<any[]>([]);
  const [giftsError, setGiftsError] = useState<string | null>(null);

  // People community state
  const [peopleViewMode, setPeopleViewMode] = useState<'swipe' | 'leaderboard'>('swipe');
  const { 
    discoveredUsers, 
    loading: peopleLoading, 
    discoverUsers,
  } = usePeople();

  // Community stats removed (PRM surface: no forum stats)

  // Load people when People community becomes active
  useEffect(() => {
    if (user && activeCommunity === 'people' && discoveredUsers.length === 0 && !peopleLoading) {
      discoverUsers({ excludeConnected: false }, 20, 0, false);
    }
  }, [activeCommunity, user, discoveredUsers.length, peopleLoading, discoverUsers]);

  // Load gifts catalog when Gifts community becomes active
  useEffect(() => {
    if (!user || activeCommunity !== 'gifts') return;
    let cancelled = false;
    const run = async () => {
      setGiftsLoading(true);
      setGiftsError(null);
      try {
        const params = new URLSearchParams();
        if (giftsQuery.trim()) params.set('q', giftsQuery.trim());
        params.set('limit', '36');
        const r = await apiGet(`/api/gifts/products?${params.toString()}`, { skipCache: true });
        if (!cancelled) setGifts(Array.isArray(r?.products) ? r.products : []);
      } catch (e: any) {
        if (!cancelled) {
          setGifts([]);
          setGiftsError(e?.message || 'Failed to load gifts');
        }
      } finally {
        if (!cancelled) setGiftsLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCommunity, user?.id]);

  // Re-run gifts query with a small debounce (search-as-you-type)
  useEffect(() => {
    if (!user || activeCommunity !== 'gifts') return;
    const t = window.setTimeout(async () => {
      setGiftsLoading(true);
      setGiftsError(null);
      try {
        const params = new URLSearchParams();
        if (giftsQuery.trim()) params.set('q', giftsQuery.trim());
        params.set('limit', '36');
        const r = await apiGet(`/api/gifts/products?${params.toString()}`, { skipCache: true });
        setGifts(Array.isArray(r?.products) ? r.products : []);
      } catch (e: any) {
        setGifts([]);
        setGiftsError(e?.message || 'Failed to load gifts');
      } finally {
        setGiftsLoading(false);
      }
    }, 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [giftsQuery, activeCommunity, user?.id]);

  // Interaction tracking is provided by the root InteractionTrackerProvider

  // Fetch active communities only
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const data = await apiGet('/api/forum/communities/active');
        // Backend is the source of truth for sidebar visibility & ordering.
        const fetched = (data.communities || []) as Community[];
        setCommunities(fetched);
      } catch (err) {
        console.error('Error fetching communities:', err);
      }
    };
    fetchCommunities();
  }, []);

  // "Moments": upcoming birthdays for in-app connections (birthdays collected in Zaurq).
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      setBirthdaysLoading(true);
      try {
        const r = await apiGet('/api/connections/birthdays/upcoming?days=14&limit=6', { skipCache: true });
        const list = Array.isArray(r?.upcoming) ? r.upcoming : [];
        if (!cancelled) setUpcomingBirthdays(list);
      } catch {
        if (!cancelled) setUpcomingBirthdays([]);
      } finally {
        if (!cancelled) setBirthdaysLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Connection count (used for demo fallbacks when user has 0 connections)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    const run = async () => {
      try {
        const r = await apiGet('/api/connections', { skipCache: true });
        const n = Array.isArray(r) ? r.length : 0;
        if (!cancelled) setConnectionCount(n);
      } catch {
        if (!cancelled) setConnectionCount(null);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const demoBirthdays = useMemo(() => {
    const mk = (name: string, daysUntil: number) => ({
      displayName: name,
      photoUrl: null as string | null,
      nextOccurrenceIso: new Date(Date.now() + daysUntil * 24 * 60 * 60 * 1000).toISOString(),
      daysUntil,
    });
    return [mk('Aarav Mehta', 2), mk('Sana Kapoor', 6), mk('Rohan Gupta', 11)];
  }, []);

  // Offers removed: no sponsored offer injection and no offers community view.

  // Back-compat: legacy communities redirected to Catch-Up.
  useEffect(() => {
    if (activeCommunity === 'pain-points' || activeCommunity === 'market-gaps' || activeCommunity === 'market-research') {
      setActiveCommunity('all');
      setPage(1);
    }
  }, [activeCommunity]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      // PRM transition: these surfaces are not forum feeds.
      if (HIDDEN_COMMUNITY_SLUGS.has(activeCommunity) || activeCommunity === 'moments' || activeCommunity === 'people') {
        setPosts([]);
        setLoading(false);
        setHasMore(false);
        return;
      }

      // Special: Gifts is a catalog, not a post feed.
      if (activeCommunity === 'gifts') {
        setPosts([]);
        setLoading(false);
        setHasMore(false);
        return;
      }

      setLoading(true);
      try {
        const limit = activeCommunity === 'all' ? 40 : 20;
        const params = new URLSearchParams({
          community: activeCommunity,
          page: page.toString(),
          limit: limit.toString(),
          sort: sortBy,
        });

        let data = await apiGet(`/api/forum/posts?${params.toString()}`);

        // If "All" is dominated by one community on page 1, fetch one more page and merge.
        if (activeCommunity === 'all' && page === 1) {
          const first = (data.posts || []) as ForumPost[];
          const slugs = new Set(first.map((p) => p?.community?.slug).filter(Boolean) as string[]);
          if (slugs.size <= 1) {
            const p2 = new URLSearchParams(params);
            p2.set('page', '2');
            try {
              const more = await apiGet(`/api/forum/posts?${p2.toString()}`);
              data = { ...data, posts: [...first, ...((more?.posts || []) as ForumPost[])] };
            } catch {
              // ignore
            }
          }
        }

        if (page === 1) setPosts(data.posts || []);
        else setPosts((prev) => [...prev, ...(data.posts || [])]);

        setHasMore((data.posts || []).length === limit);
      } catch (err) {
        console.error('Error fetching posts:', err);
        if (page === 1) setPosts([]);
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [activeCommunity, page, sortBy]);

  // When user returns from a post detail page, refresh "seen" state so unread posts float up.
  useEffect(() => {
    const onFocus = () => setSeenNonce((n) => n + 1);
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const orderedCommunitySlugs = useMemo(() => {
    // Default order: use backend display_order if present; otherwise keep API order.
    const sorted = [...communities].sort((a, b) => (a.display_order ?? 999) - (b.display_order ?? 999));
    return sorted.map((c) => c.slug);
  }, [communities]);

  const interleavedPosts = useMemo(() => {
    // Some system/imported posts may not include a hydrated `user` object (RLS / joins).
    // Still render them; the card will fall back to a safe author label.
    const valid = posts.filter((p) => {
      const slug = p?.community?.slug;
      if (!p?.community?.id || !slug) return false;
      // PRM transition: never render posts from removed forum-only communities.
      if (HIDDEN_COMMUNITY_SLUGS.has(slug)) return false;
      return true;
    });
    if (activeCommunity !== 'all') return valid;

    void seenNonce; // depends on localStorage; re-evaluate via seenNonce

    const groups = new Map<string, ForumPost[]>();
    for (const p of valid) {
      const slug = p.community!.slug;
      if (!groups.has(slug)) groups.set(slug, []);
      groups.get(slug)!.push(p);
    }

    // Within each community: newest first (we fade "seen" posts instead of reshuffling on back).
    for (const [slug, arr] of groups.entries()) {
      arr.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      groups.set(slug, arr);
    }

    const rotation = orderedCommunitySlugs.length > 0 ? orderedCommunitySlugs : Array.from(groups.keys());

    const result: ForumPost[] = [];
    let added = true;
    while (added) {
      added = false;
      for (const slug of rotation) {
        const arr = groups.get(slug);
        if (arr && arr.length > 0) {
          result.push(arr.shift()!);
          added = true;
        }
      }
      // Pick up any slugs that weren't in the active communities list.
      for (const [slug, arr] of groups.entries()) {
        if (rotation.includes(slug)) continue;
        if (arr.length > 0) {
          result.push(arr.shift()!);
          added = true;
        }
      }
    }

    return result;
  }, [posts, activeCommunity, orderedCommunitySlugs, seenNonce]);

  type FeedItem = { kind: 'post'; post: ForumPost };

  const feedItems: FeedItem[] = useMemo(() => {
    return interleavedPosts.map((p) => ({ kind: 'post', post: p }));
  }, [interleavedPosts]);

  const seenIds = useMemo(() => {
    void seenNonce;
    return getSeenForumPostIds();
  }, [seenNonce]);

  const recent = useMemo(() => {
    void seenNonce;
    return getRecentForumPosts();
  }, [seenNonce]);
  
  const handleCommunityChange = async (slug: string) => {
    setActiveCommunity(slug);
    setPage(1);
    setPosts([]);

    // Keep URL in sync so mobile drawers / deep links can switch communities.
    try {
      const params = new URLSearchParams(location.search);
      params.set('c', slug);
      navigate({ search: `?${params.toString()}` }, { replace: true });
    } catch {}
  };

  // If URL has ?c=..., switch communities (used by mobile drawer navigation).
  useEffect(() => {
    try {
      const c = new URLSearchParams(location.search).get('c');
      if (!c) return;
      // If deep-link points to a removed community, fall back to Catch-Up.
      const next = HIDDEN_COMMUNITY_SLUGS.has(c) ? 'all' : c;
      if (next === activeCommunity) return;
      // Fire-and-forget (handleCommunityChange already resets state)
      void handleCommunityChange(next);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="font-reddit bg-background text-foreground">
      {/* Single forum surface (partner concept removed) */}
      
      {/* Reddit-style 3-column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr] xl:grid-cols-[240px_1fr_300px] gap-4">
        
        {/* LEFT SIDEBAR - Communities (hidden on mobile/tablet) */}
        <aside className="hidden xl:flex xl:flex-col h-full max-h-[calc(100vh-2rem)]">
          {/* Communities card - scrollable with max height */}
          <div
            className="bg-card border border-border rounded-lg overflow-hidden flex flex-col"
            style={{ maxHeight: '60vh' }}
          >
            <div className="px-3 py-2 border-b border-border flex-shrink-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Communities</h3>
              </div>
            </div>
            {/* Partner sidebar gets long: keep it compact + scrollable, but hide the scrollbar */}
            <div className="py-1 flex-1 overflow-y-auto hide-scrollbar">
                <button
                  onClick={() => handleCommunityChange('all')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    activeCommunity === 'all'
                      ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {(() => {
                    const Icon = getCommunityIcon('all');
                    return <Icon className="w-4 h-4" />;
                  })()}
                  <span className="text-sm font-medium">Catch-Up</span>
                </button>

                {/* Normal communities list */}
                {orderSidebarCommunities(communities).map((community) => (
                    <button
                      key={community.id}
                      onClick={() => handleCommunityChange(community.slug)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                        activeCommunity === community.slug
                          ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {(() => {
                        const Icon = getCommunityIcon(community.slug);
                        return <Icon className="w-4 h-4" />;
                      })()}
                      <span className="text-sm font-medium truncate">{community.name}</span>
                    </button>
                  ))}
                {/* Special "People" community (discover members) */}
                <button
                  onClick={() => handleCommunityChange('people')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    activeCommunity === 'people'
                      ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-medium">People</span>
                </button>
            </div>
          </div>

          {/* Recently Viewed - fixed below the communities list (restore comfortable size) */}
          {recent.length > 0 && (
            <div className="mt-3 bg-card border border-border rounded-lg overflow-hidden flex-shrink-0">
              <div className="px-3 py-2 border-b border-border">
                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recently viewed</h3>
              </div>
              <div className="py-1 max-h-[220px] overflow-auto hide-scrollbar">
                {recent.slice(0, 10).map((p) => (
                  <Link
                    key={p.id}
                    to={`/forum/post/${p.id}`}
                    className="block px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    title={p.title}
                  >
                    <span className="line-clamp-2">{p.title}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* CENTER FEED - Main Content */}
        <main className="min-w-0">
          {/* Mobile Community Icons (hidden on xl+) */}
          <div className="xl:hidden bg-card border border-border rounded-lg mb-3">
            <div className="flex items-center gap-1 p-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleCommunityChange('all')}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                  activeCommunity === 'all'
                    ? 'bg-[#CBAA5A] text-black'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {(() => {
                  const Icon = getCommunityIcon('all');
                  return <Icon className="w-4 h-4" />;
                })()}
              </button>
              {orderSidebarCommunities(communities).map((community) => (
                <button
                  key={community.id}
                  onClick={() => handleCommunityChange(community.slug)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                    activeCommunity === community.slug
                      ? 'bg-[#CBAA5A] ring-2 ring-[#CBAA5A]/50'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {(() => {
                    const Icon = getCommunityIcon(community.slug);
                    return <Icon className="w-4 h-4 text-muted-foreground" />;
                  })()}
                </button>
              ))}
              {/* People community (mobile) */}
              <button
                onClick={() => handleCommunityChange('people')}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                  activeCommunity === 'people'
                    ? 'bg-[#CBAA5A] ring-2 ring-[#CBAA5A]/50'
                    : 'bg-[#1a1a1a] hover:bg-[#252525]'
                }`}
              >
                <Users className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Sort Options */}
          <div className="bg-card border border-border rounded-lg mb-3">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSortBy('hot')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'hot' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  Hot
                </button>
                <button
                  onClick={() => setSortBy('new')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'new' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  New
                </button>
                <button
                  onClick={() => setSortBy('top')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'top' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Top
                </button>
              </div>
              <div className="flex items-center gap-2">
                {/* Theme toggle */}
                <button
                  onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-muted text-foreground hover:bg-accent border border-border"
                  title="Toggle light/dark mode"
                >
                  {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
                  {theme === 'light' ? 'Dark' : 'Light'}
                </button>

                {/* PRM surface: forum sync removed */}
              </div>
            </div>
          </div>

          {/* Thursday ritual (lightweight) - keep on All feed so it's one combined surface */}
          {activeCommunity === 'all' && (
            <div className="bg-card border border-border rounded-lg mb-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Thursday</div>
                  <div className="text-sm font-semibold text-foreground truncate">Keep 3 relationships warm today</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/messages')}
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A] hover:underline"
                  >
                    Messages
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A] hover:underline"
                  >
                    Profile
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                We’ll auto-suggest 3–5 actions here (message, catch-up, intro) in the next iteration.
              </div>
            </div>
          )}

          {/* PRM Today card (Catch-Up) */}
          {activeCommunity === 'all' && (
            <div className="bg-card border border-border rounded-lg mb-3 p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Today</div>
                  <div className="text-sm font-semibold text-foreground truncate">Keep relationships warm</div>
                </div>
                <div className="text-[10px] text-muted-foreground shrink-0">
                  {Object.values(todayDone).filter(Boolean).length}/3 done
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {[
                  {
                    id: 'warm_1',
                    title: 'Warm 1 relationship',
                    desc: 'Send a quick message to someone you care about.',
                    cta: 'Messages',
                    onClick: () => navigate('/messages'),
                  },
                  {
                    id: 'add_5',
                    title: 'Add 5 contacts',
                    desc: 'Import recent WhatsApp contacts and start building your network.',
                    cta: 'Network',
                    onClick: () => navigate('/profile?tab=network'),
                  },
                  {
                    id: 'schedule',
                    title: 'Schedule 1 catch-up',
                    desc: 'Pick one person and put a 15-minute slot on the calendar.',
                    cta: 'Calendar',
                    onClick: () => navigate('/profile'),
                  },
                ].map((a) => {
                  const done = Boolean(todayDone[a.id]);
                  return (
                    <div key={a.id} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setTodayDone((prev) => ({ ...(prev || {}), [a.id]: !Boolean((prev as any)?.[a.id]) }))}
                            className={`w-4 h-4 rounded border border-border flex items-center justify-center ${
                              done ? 'bg-[#CBAA5A] text-black' : 'bg-background text-muted-foreground'
                            }`}
                            aria-label={done ? 'Mark as not done' : 'Mark as done'}
                          >
                            {done ? <CheckCircle className="w-3 h-3" /> : null}
                          </button>
                          <div className={`text-sm font-medium truncate ${done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {a.title}
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{a.desc}</div>
                      </div>
                      <button
                        type="button"
                        onClick={a.onClick}
                        className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A] hover:underline shrink-0"
                      >
                        {a.cta}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* PRM surface: tag filters + create-post entry points removed */}

          {/* Feed */}
          <div className="space-y-3">
            {/* Moments: birthdays (Catch-Up surface) */}
            {activeCommunity === 'all' && (
              <div className="bg-card border border-border rounded-lg p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#CBAA5A]" />
                    <div className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground">
                      Moments
                    </div>
                    <div className="text-xs text-muted-foreground">Upcoming birthdays</div>
                  </div>
                  <button
                    onClick={async () => {
                      setBirthdaysSyncing(true);
                      try {
                        const r = await apiGet('/api/connections/birthdays/upcoming?days=14&limit=6', { skipCache: true });
                        setUpcomingBirthdays(Array.isArray(r?.upcoming) ? r.upcoming : []);
                        toast({ title: 'Refreshed', description: 'Updated upcoming birthdays.' });
                      } catch (e: any) {
                        toast({ title: 'Could not refresh', description: e?.message || 'Please try again.', variant: 'destructive' });
                      } finally {
                        setBirthdaysSyncing(false);
                      }
                    }}
                    className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground hover:underline disabled:opacity-60"
                    disabled={birthdaysSyncing}
                  >
                    {birthdaysSyncing ? 'Refreshing…' : 'Refresh'}
                  </button>
                </div>

                {birthdaysLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
                  </div>
                ) : upcomingBirthdays.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    {connectionCount === 0 ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-yellow-500/80">Demo</span>
                          <span className="text-sm text-muted-foreground">Here's what Moments will look like once you add contacts.</span>
                        </div>
                        <div className="mt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setShowWhatsAppInviteModal(true)}
                            className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A] hover:underline"
                          >
                            Add your first 5 contacts
                          </button>
                        </div>
                        <div className="mt-3 flex flex-col gap-3">
                          {demoBirthdays.map((b, idx) => (
                            <div key={`${b.displayName}-${b.nextOccurrenceIso}`} className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 shrink-0">
                                <AvatarImage src={b.photoUrl || undefined} alt={b.displayName} />
                                <AvatarFallback className={getAvatarColor(`demo-${idx}`)}>
                                  {getInitials(b.displayName.split(' ')[0] || '', b.displayName.split(' ')[1] || '')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-foreground truncate">{b.displayName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {b.daysUntil === 0 ? '🎂 Today!' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`}
                                </div>
                              </div>
                              <div className="text-[10px] text-muted-foreground shrink-0">
                                {new Date(String(b.nextOccurrenceIso)).toLocaleDateString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        No upcoming birthdays yet.
                        <div className="mt-1 text-xs text-muted-foreground">
                          Tip: ask your connections to add their birthday in Profile → Settings.
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {upcomingBirthdays.map((b, idx) => (
                      <div key={`${b.displayName}-${b.nextOccurrenceIso}`} className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={b.photoUrl || undefined} alt={b.displayName} />
                          <AvatarFallback className={getAvatarColor(`bday-${idx}`)}>
                            {getInitials(b.displayName.split(' ')[0] || '', b.displayName.split(' ')[1] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{b.displayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {b.daysUntil === 0 ? '🎂 Today!' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`}
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(String(b.nextOccurrenceIso)).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Special rendering for People community */}
            {activeCommunity === 'gifts' ? (
              <div className="space-y-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <Gift className="w-4 h-4 text-[#CBAA5A]" />
                    <div className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground">Gifts</div>
                    <div className="ml-auto text-[10px] text-muted-foreground">
                      {giftsLoading ? 'Loading…' : `${gifts.length} items`}
                    </div>
                  </div>
                  <div className="mt-2">
                    <Input
                      value={giftsQuery}
                      onChange={(e) => setGiftsQuery(e.target.value)}
                      placeholder="Search gifts…"
                      className="bg-black/40 border-[#333] text-white"
                    />
                  </div>
                  {giftsError ? (
                    <div className="mt-2 text-xs text-red-400">{giftsError}</div>
                  ) : null}
                </div>

                {giftsLoading ? (
                  <div className="flex items-center justify-center py-10 bg-card border border-border rounded-lg">
                    <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
                  </div>
                ) : gifts.length === 0 ? (
                  <div className="text-center py-12 bg-card border border-border rounded-lg">
                    <p className="text-muted-foreground text-lg font-medium">No gifts found</p>
                    <p className="text-muted-foreground/80 text-sm mt-1">Try a different search.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {gifts.map((p: any) => (
                      <a
                        key={String(p.shopify_product_id || p.handle)}
                        href={`https://boxupgifting.com/products/${encodeURIComponent(String(p.handle || ''))}`}
                        target="_blank"
                        rel="noreferrer"
                        className="bg-card border border-border rounded-lg overflow-hidden hover:border-[#CBAA5A]/50 transition-colors"
                        title={String(p.title || '')}
                      >
                        <div className="aspect-square bg-black/40 overflow-hidden">
                          {p.primary_image_url ? (
                            <img
                              src={String(p.primary_image_url)}
                              alt={String(p.title || 'Gift')}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="p-2">
                          <div className="text-xs font-semibold text-foreground line-clamp-2">{String(p.title || '')}</div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {p.price_min != null && p.price_max != null
                              ? `₹${p.price_min}–₹${p.price_max}`
                              : p.price_min != null
                                ? `₹${p.price_min}`
                                : '—'}
                          </div>
                        </div>
                      </a>
                    ))}
                  </div>
                )}
              </div>
            ) : activeCommunity === 'moments' ? (
              <div className="space-y-3">
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#CBAA5A]" />
                      <div className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground">Moments</div>
                    </div>
                    <button
                      onClick={async () => {
                        setBirthdaysSyncing(true);
                        try {
                          const r = await apiGet('/api/connections/birthdays/upcoming?days=14&limit=6', { skipCache: true });
                          setUpcomingBirthdays(Array.isArray(r?.upcoming) ? r.upcoming : []);
                          toast({ title: 'Refreshed', description: 'Updated upcoming birthdays.' });
                        } catch (e: any) {
                          toast({ title: 'Could not refresh', description: e?.message || 'Please try again.', variant: 'destructive' });
                        } finally {
                          setBirthdaysSyncing(false);
                        }
                      }}
                      className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground hover:underline disabled:opacity-60"
                      disabled={birthdaysSyncing}
                    >
                      {birthdaysSyncing ? 'Refreshing…' : 'Refresh'}
                    </button>
                  </div>

                  {birthdaysLoading ? (
                    <div className="flex items-center justify-center py-6">
                      <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
                    </div>
                  ) : upcomingBirthdays.length === 0 ? (
                    <div className="text-sm text-muted-foreground">
                      {connectionCount === 0 ? (
                        <>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-yellow-500/80">Demo</span>
                            <span>Moments will populate as you add connections.</span>
                          </div>
                        <div className="mt-2 flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => setShowWhatsAppInviteModal(true)}
                            className="px-4 py-2 rounded-full text-sm font-bold bg-[#CBAA5A] text-black hover:bg-[#D4B76A] transition-colors"
                          >
                            Add your first 5 contacts
                          </button>
                        </div>
                          <div className="mt-3 flex flex-col gap-3">
                            {demoBirthdays.map((b, idx) => (
                              <div key={`${b.displayName}-${b.nextOccurrenceIso}`} className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 shrink-0">
                                  <AvatarImage src={b.photoUrl || undefined} alt={b.displayName} />
                                  <AvatarFallback className={getAvatarColor(`demo-mom-${idx}`)}>
                                    {getInitials(b.displayName.split(' ')[0] || '', b.displayName.split(' ')[1] || '')}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-foreground truncate">{b.displayName}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {b.daysUntil === 0 ? '🎂 Today!' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`}
                                  </div>
                                </div>
                                <div className="text-[10px] text-muted-foreground shrink-0">
                                  {new Date(String(b.nextOccurrenceIso)).toLocaleDateString()}
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <>No upcoming birthdays yet.</>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3">
                      {upcomingBirthdays.map((b, idx) => (
                        <div key={`${b.displayName}-${b.nextOccurrenceIso}`} className="flex items-center gap-3">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarImage src={b.photoUrl || undefined} alt={b.displayName} />
                            <AvatarFallback className={getAvatarColor(`bday-mom-${idx}`)}>
                              {getInitials(b.displayName.split(' ')[0] || '', b.displayName.split(' ')[1] || '')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">{b.displayName}</div>
                            <div className="text-xs text-muted-foreground">
                              {b.daysUntil === 0 ? '🎂 Today!' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`}
                            </div>
                          </div>
                          <div className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(String(b.nextOccurrenceIso)).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Moments timeline (lightweight) */}
                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">This week</div>
                    {connectionCount === 0 ? (
                      <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-yellow-500/80">Demo</div>
                    ) : null}
                  </div>

                  <div className="mt-2 space-y-2">
                    {(() => {
                      const real = upcomingBirthdays.map((b) => ({
                        kind: 'birthday' as const,
                        title: `${b.displayName} • Birthday`,
                        when:
                          b.daysUntil === 0 ? 'Today' : b.daysUntil === 1 ? 'Tomorrow' : `In ${b.daysUntil} days`,
                        iso: b.nextOccurrenceIso,
                      }));

                      const demo = [
                        { kind: 'birthday' as const, title: 'Aarav Mehta • Birthday', when: 'In 2 days', iso: String(new Date(Date.now() + 2 * 86400000).toISOString()) },
                        { kind: 'promotion' as const, title: 'Sana Kapoor • Promotion', when: 'This week', iso: String(new Date().toISOString()) },
                        { kind: 'anniversary' as const, title: 'Rohan Gupta • Work anniversary', when: 'In 6 days', iso: String(new Date(Date.now() + 6 * 86400000).toISOString()) },
                      ];

                      const items = real.length > 0 ? real : connectionCount === 0 ? demo : [];

                      if (items.length === 0) {
                        return <div className="text-sm text-muted-foreground">No moments yet.</div>;
                      }

                      return items.slice(0, 6).map((e) => {
                        const Icon = e.kind === 'birthday' ? Gift : e.kind === 'promotion' ? Trophy : Calendar;
                        return (
                          <div key={`${e.kind}-${e.title}-${e.iso}`} className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/30 px-3 py-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <Icon className="w-4 h-4 text-[#CBAA5A]" />
                                <div className="text-sm font-medium text-foreground truncate">{e.title}</div>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5">{e.when}</div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => navigate('/messages')}
                                className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A] hover:underline"
                              >
                                Message
                              </button>
                              <button
                                type="button"
                                onClick={() => navigate('/profile')}
                                className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground"
                              >
                                Log
                              </button>
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div className="bg-card border border-border rounded-lg p-3">
                  <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-muted-foreground">Quick actions</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate('/messages')}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-muted text-foreground hover:bg-accent border border-border"
                    >
                      Send a note
                    </button>
                    <button
                      onClick={() => navigate('/profile?tab=network')}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-muted text-foreground hover:bg-accent border border-border"
                    >
                      View network
                    </button>
                    <button
                      onClick={() => navigate('/profile')}
                      className="px-3 py-1.5 rounded-full text-xs font-bold bg-muted text-foreground hover:bg-accent border border-border"
                    >
                      Add details
                    </button>
                  </div>
                </div>
              </div>
            ) : activeCommunity === 'people' ? (
              <div className="space-y-4">
                {/* View Mode Toggle */}
                <div className="flex items-center gap-2 p-2 bg-card border border-border rounded-lg">
                  <button
                    onClick={() => setPeopleViewMode('swipe')}
                    className={`px-4 py-2 rounded-full font-gilroy text-[11px] font-bold tracking-[0.1em] uppercase transition-all ${
                      peopleViewMode === 'swipe'
                        ? 'bg-[#CBAA5A] text-black'
                        : 'bg-muted text-muted-foreground border border-border hover:border-[#CBAA5A]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" />
                      Discover
                    </span>
                  </button>
                  <button
                    onClick={() => setPeopleViewMode('leaderboard')}
                    className={`px-4 py-2 rounded-full font-gilroy text-[11px] font-bold tracking-[0.1em] uppercase transition-all ${
                      peopleViewMode === 'leaderboard'
                        ? 'bg-[#CBAA5A] text-black'
                        : 'bg-muted text-muted-foreground border border-border hover:border-[#CBAA5A]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <Trophy className="w-3.5 h-3.5" />
                      Leaderboard
                    </span>
                  </button>
                </div>

                {/* Swipe View */}
                {peopleViewMode === 'swipe' && (
                  <div className="h-[600px] max-h-[70vh] rounded-2xl overflow-hidden border border-border">
                    <SwipePeopleView onViewMatches={() => setPeopleViewMode('leaderboard')} />
                  </div>
                )}

                {/* Leaderboard View */}
                {peopleViewMode === 'leaderboard' && (
                  <SocialCapitalLeaderboard />
                )}
              </div>
            ) : loading && page === 1 ? (
              <div className="flex items-center justify-center py-12 bg-card border border-border rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
              </div>
            ) : posts.length === 0 ? (
              activeCommunity === 'all' && connectionCount === 0 ? (
                <div className="bg-card border border-border rounded-lg p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground">Catch-Up</div>
                    <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A]">Demo</div>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    Your Catch-Up feed will populate once you add connections. Here are a few examples to get started.
                  </div>
                  <div className="mt-3 space-y-2">
                    {[
                      { title: 'Send a note', desc: '“Hey — was thinking of you. How have things been?”', cta: 'Messages', onClick: () => navigate('/messages') },
                      { title: 'Schedule a catch-up', desc: 'Book a 15-minute slot with someone important.', cta: 'Calendar', onClick: () => navigate('/profile') },
                      { title: 'Add contacts from WhatsApp', desc: 'Import recents and invite them to Zaurq.', cta: 'Add', onClick: () => setShowWhatsAppInviteModal(true) },
                    ].map((x) => (
                      <div key={x.title} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-foreground">{x.title}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{x.desc}</div>
                          </div>
                          <button
                            type="button"
                            onClick={x.onClick}
                            className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A] hover:underline shrink-0"
                          >
                            {x.cta}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => setShowWhatsAppInviteModal(true)}
                      className="px-4 py-2 rounded-full text-sm font-bold bg-[#CBAA5A] text-black hover:bg-[#D4B76A] transition-colors"
                    >
                      Add your first 5 contacts
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-card border border-border rounded-lg">
                  <p className="text-muted-foreground text-lg font-medium">No posts yet</p>
                  <p className="text-muted-foreground/80 text-sm mt-1">Be the first to post!</p>
                </div>
              )
            ) : (
              <>
                {feedItems.map((item) => {
                  const post = item.post;
                  const isSeen = seenIds.has(post.id);
                  
                  // Render compact NewsPostCard for news posts (match sponsored offer sizing)
                  if (post.post_type === 'news' || post.community?.slug === 'news') {
                    return (
                      <div key={`post-${post.id}`} className={isSeen ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}>
                        <NewsPostCard post={post as any} />
                      </div>
                    );
                  }

                  // Render PredictionCard for prediction posts
                  if (post.post_type === 'prediction' || post.community?.slug === 'predictions') {
                    return (
                      <div key={`post-${post.id}`} className={isSeen ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}>
                        <PredictionCard
                          post={post}
                          onDelete={() => handlePostDeleted(post.id)}
                        />
                      </div>
                    );
                  }
                  
                  // Render ResearchPostCard for research_report posts
                  if (post.post_type === 'research_report' || post.community?.slug === 'market-research') {
                    return (
                      <div key={`post-${post.id}`} className={isSeen ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}>
                        <ResearchPostCard
                          post={post}
                          onDelete={() => handlePostDeleted(post.id)}
                        />
                      </div>
                    );
                  }
                  
                  // Render BrandPainPointCard for market gap posts
                  if (post.post_type === 'market-gap' || post.post_type === 'pain_point' || post.community?.slug === 'market-gaps' || post.community?.slug === 'pain-points') {
                    return (
                      <div key={`post-${post.id}`} className={isSeen ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}>
                        <BrandPainPointCard
                          post={post}
                          onDelete={() => handlePostDeleted(post.id)}
                        />
                      </div>
                    );
                  }

                  // Default ForumPostCard
                  return (
                    <ForumPostCard
                      key={`post-${post.id}`}
                      post={post}
                      isSeen={isSeen}
                      onDelete={() => handlePostDeleted(post.id)}
                    />
                  );
                })}
                
                {hasMore && (
                  <button
                    onClick={() => setPage(p => p + 1)}
                    disabled={loading}
                    className="w-full py-3 bg-card border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors font-bold text-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load More'}
                  </button>
                )}
              </>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR - Community Info & Matches (hidden on mobile/tablet) */}
        <aside className="hidden xl:block flex-shrink-0">
          <div className="sticky top-4 space-y-3">
            {/* PRM: Network */}
            <RightSidebarNetworkCard onAddContacts={() => setShowWhatsAppInviteModal(true)} />
            {/* PRM: Integrations + Add contact */}
            <RightSidebarIntegrationsCard onAddContact={() => setShowWhatsAppInviteModal(true)} />
            {/* PRM: Agenda (Google Calendar) */}
            <RightSidebarAgendaCard />

            {/* Potential Matches - Coming Soon */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-border flex items-center gap-2">
                <Users className="w-4 h-4 text-[#CBAA5A]" />
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Potential Matches</h3>
              </div>
              <div className="p-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-muted flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#CBAA5A]/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Coming Soon</p>
                  <p className="text-[10px] text-muted-foreground/80 mt-1 leading-relaxed">
                    GNN-powered networking matches based on your interests
                  </p>
                </div>
              </div>
            </div>

          </div>
        </aside>
      </div>

      {/* PRM: Add contacts via WhatsApp */}
      <WhatsAppInviteModal open={showWhatsAppInviteModal} onOpenChange={setShowWhatsAppInviteModal} />

    </div>
  );
};
