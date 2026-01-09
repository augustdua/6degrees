import { useState, useEffect, useMemo, useRef } from 'react';
import { apiDelete, apiGet, apiPost } from '@/lib/api';
import { ForumPostCard } from './ForumPostCard';
import { PredictionCard } from './PredictionCard';
import { ResearchPostCard } from './ResearchPostCard';
import { BrandPainPointCard } from './BrandPainPointCard';
import { NewsPostCard } from './NewsPostCard';
import { SuggestTopicForm } from './SuggestTopicForm';
import { CreateForumPostModal } from './CreateForumPostModal';
import { Plus, Loader2, TrendingUp, Clock, Flame, Sparkles, Users, Target, FileText, Tag, X, RefreshCw, Newspaper, LayoutGrid, Calendar, Gift, Sun, Moon, Trophy, AlertTriangle, Lock, Video } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getRecentForumPosts, getSeenForumPostIds } from '@/lib/forumSeen';
import { useToast } from '@/hooks/use-toast';
import { RequestPostCard } from './RequestPostCard';
import { useTheme } from 'next-themes';
import { SwipePeopleView } from '@/components/SwipePeopleView';
import SocialCapitalLeaderboard from '@/components/SocialCapitalLeaderboard';
import { usePeople } from '@/hooks/usePeople';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

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

// Available tags for the General community
const AVAILABLE_TAGS = [
  { id: 'build-in-public', label: 'Build in Public' },
  { id: 'wins', label: 'Wins' },
  { id: 'failures', label: 'Failures' },
  { id: 'network', label: 'Network' },
  { id: 'reddit', label: 'Reddit' },
];

// Legacy slugs that used to be tags under General (keep for back-compat navigation).
const LEGACY_COMMUNITY_SLUGS = ['build-in-public', 'wins', 'failures', 'network'] as const;

function getCommunityIcon(slug: string) {
  switch (slug) {
    case 'all':
      return LayoutGrid;
    case 'general':
      return LayoutGrid;
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
    case 'zaurq-partners':
      return Sparkles;
    case 'offers':
      return Gift;
    case 'people':
      return Users;
    default:
      return Users;
  }
}

export const ForumTabContent = () => {
  const { user, refreshProfile } = useAuth();
  const isPartner = (user as any)?.role === 'ZAURQ_PARTNER';
  const isRoleLoading = !!user && !(user as any)?.role;
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const debugSync = typeof window !== 'undefined' && (window.localStorage?.getItem('debug_reddit_sync') === '1');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<string>('all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [clubLoading, setClubLoading] = useState(false);
  const [clubMembers, setClubMembers] = useState<any[]>([]);
  const [redditSyncing, setRedditSyncing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [mixSeed, setMixSeed] = useState(0);
  const [seenNonce, setSeenNonce] = useState(0);

  // Tag filtering
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // People community state
  const [peopleViewMode, setPeopleViewMode] = useState<'swipe' | 'leaderboard'>('swipe');
  const { 
    discoveredUsers, 
    loading: peopleLoading, 
    discoverUsers,
  } = usePeople();

  // Community stats state
  const [communityStats, setCommunityStats] = useState<{
    memberCount: number;
    onlineCount: number;
    postsCount: number;
  } | null>(null);

  const fetchCommunityStats = async (slug: string) => {
    try {
      const data = await apiGet(`/api/forum/communities/${slug}/stats`);
      if (data) {
        setCommunityStats({
          memberCount: data.memberCount || 0,
          onlineCount: data.onlineCount || 1,
          postsCount: data.postsCount || 0,
        });
      }
    } catch (e) {
      console.error('Failed to fetch community stats:', e);
      setCommunityStats(null);
    }
  };

  // Fetch stats when community changes
  useEffect(() => {
    fetchCommunityStats(activeCommunity);
  }, [activeCommunity]);

  // Load people when People community becomes active
  useEffect(() => {
    if (user && activeCommunity === 'people' && discoveredUsers.length === 0 && !peopleLoading) {
      discoverUsers({ excludeConnected: false }, 20, 0, false);
    }
  }, [activeCommunity, user, discoveredUsers.length, peopleLoading, discoverUsers]);

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

  // Ensure role is up to date (common after server-side admin updates via SQL).
  useEffect(() => {
    if (!user) return;
    // Best-effort: refresh profile once on mount.
    refreshProfile?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Offers removed: no sponsored offer injection and no offers community view.

  // Back-compat: if user lands on a legacy community slug (old tags), treat it as a tag under General.
  useEffect(() => {
    if ((LEGACY_COMMUNITY_SLUGS as readonly string[]).includes(activeCommunity)) {
      setActiveCommunity('general');
      setSelectedTags(prev => (prev.includes(activeCommunity) ? prev : [...prev, activeCommunity]));
      setPage(1);
    }
  }, [activeCommunity]);

  // Back-compat: `pain-points` and `market-gaps` communities redirected to `market-research`.
  // The market-gaps community has been merged into market-research as a unified report.
  useEffect(() => {
    if (activeCommunity === 'pain-points' || activeCommunity === 'market-gaps') {
      setActiveCommunity('market-research');
      setPage(1);
    }
  }, [activeCommunity]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        // Special: Your Club (partners only)
        if (activeCommunity === 'your-club') {
          setClubMembers([]);
          setLoading(false);
          setClubLoading(true);
          try {
            const data = await apiGet('/api/zaurq/club', { skipCache: true });
            setClubMembers(Array.isArray(data?.members) ? data.members : []);
          } catch (e) {
            console.error('Error fetching club:', e);
            setClubMembers([]);
          } finally {
            setClubLoading(false);
          }
          return;
        }

        const limit = activeCommunity === 'all' ? 40 : 20;
        const params = new URLSearchParams({
          community: activeCommunity,
          page: page.toString(),
          limit: limit.toString(),
          sort: sortBy
        });
        
        // Add tags filter if any selected
        if (selectedTags.length > 0) {
          params.set('tags', selectedTags.join(','));
        }

        // Requests feed needs body so we can render LinkedIn preview (avatar/name/summary).
        if (activeCommunity === 'requests') {
          params.set('include_body', '1');
        }

        // If user explicitly requested a Reddit sync, ask backend to force it.
        // (Only relevant for feeds where Reddit posts are blended in: All + General.)
        const forceReddit = (activeCommunity === 'all' || activeCommunity === 'general') && page === 1 && mixSeed > 0;
        if (forceReddit) {
          params.set('force_reddit', '1');
          // Bust the frontend GET cache so the sync always triggers a network request.
          params.set('sync_nonce', String(mixSeed));
        }
        
        if (forceReddit && debugSync) {
          const label = `[reddit-sync] fetchPosts mixSeed=${mixSeed} community=${activeCommunity}`;
          console.groupCollapsed(label);
          console.log('params', {
            activeCommunity,
            page,
            sortBy,
            selectedTags,
            mixSeed,
            url: `/api/forum/posts?${params.toString()}`,
          });
          console.time(label);
        }

        // Special: Zaurq Partners curated feed
        let data =
          activeCommunity === 'zaurq-partners'
            ? await apiGet(`/api/forum/partners-feed?${params}`, { skipCache: true })
            : await apiGet(`/api/forum/posts?${params}`, { skipCache: forceReddit });

        if (forceReddit && debugSync) {
          const list = Array.isArray(data?.posts) ? (data.posts as any[]) : [];
          const redditTagged = list.filter((p) => Array.isArray(p?.tags) && p.tags.includes('reddit'));
          const missingUser = list.filter((p) => !p?.user);
          const missingCommunity = list.filter((p) => !p?.community);

          console.log('response summary', {
            totalPosts: list.length,
            redditTagged: redditTagged.length,
            missingUser: missingUser.length,
            missingCommunity: missingCommunity.length,
          });
          console.log(
            'reddit sample',
            redditTagged.slice(0, 5).map((p) => ({
              id: p?.id,
              content: String(p?.content || '').slice(0, 120),
              external_url: p?.external_url,
              external_id: p?.external_id,
              tags: p?.tags,
            }))
          );
        }

        // If "All" is dominated by one community on page 1 (often News), fetch one more page and merge.
        // (Only applies to the normal forum feed, not the partners feed)
        if (activeCommunity === 'all' && page === 1) {
          const first = (data.posts || []) as ForumPost[];
          const slugs = new Set(first.map((p) => p?.community?.slug).filter(Boolean) as string[]);
          if (slugs.size <= 1) {
            const p2 = new URLSearchParams(params);
            p2.set('page', '2');
            try {
              const more = await apiGet(`/api/forum/posts?${p2}`, { skipCache: forceReddit });
              data = { ...data, posts: [...first, ...((more?.posts || []) as ForumPost[])] };
            } catch {
              // ignore
            }
          }
        }
        
        if (page === 1) {
          setPosts(data.posts || []);
        } else {
          setPosts(prev => [...prev, ...(data.posts || [])]);
        }
        
        setHasMore((data.posts || []).length === limit);

        if (forceReddit) {
          const redditCount = Array.isArray(data?.posts)
            ? (data.posts as any[]).filter((p) => Array.isArray(p?.tags) && p.tags.includes('reddit')).length
            : 0;
          toast({
            title: 'Reddit sync triggered',
            description: `Fetched ${(data?.posts || []).length} posts (${redditCount} tagged reddit)`,
          });
          if (debugSync) {
            try {
              const status = await apiGet('/api/forum/reddit/status', { skipCache: true });
              console.log('[reddit-sync] status', status);
            } catch (e) {
              console.warn('[reddit-sync] status check failed', e);
            }
          }
        }
      } catch (err) {
        console.error('Error fetching posts:', err);
        if (redditSyncing) {
          toast({
            title: 'Reddit sync failed',
            description: String((err as any)?.message || err || 'Unknown error'),
            variant: 'destructive',
          });
        }
        if (debugSync) {
          console.warn('[reddit-sync] fetchPosts error details', {
            message: (err as any)?.message,
            stack: (err as any)?.stack,
          });
        }
      } finally {
        if (debugSync && (activeCommunity === 'all' || activeCommunity === 'general') && page === 1 && mixSeed > 0) {
          const label = `[reddit-sync] fetchPosts mixSeed=${mixSeed} community=${activeCommunity}`;
          console.timeEnd(label);
          console.groupEnd();
        }
        setLoading(false);
        setRedditSyncing(false);
      }
    };
    fetchPosts();
  }, [activeCommunity, page, sortBy, selectedTags, mixSeed]);

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
    const valid = posts.filter((p) => p?.community?.id && p.community?.slug);
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

    const slugs = orderedCommunitySlugs.length > 0 ? orderedCommunitySlugs : Array.from(groups.keys());
    const start = slugs.length ? (mixSeed % slugs.length) : 0;
    const rotation = slugs.length ? [...slugs.slice(start), ...slugs.slice(0, start)] : [];

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
  }, [posts, activeCommunity, orderedCommunitySlugs, mixSeed, seenNonce]);

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
  
  // Helper to toggle tag selection
  const toggleTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(t => t !== tagId)
        : [...prev, tagId]
    );
    setPage(1); // Reset to first page when tags change
  };
  
  const clearTags = () => {
    setSelectedTags([]);
    setPage(1);
  };

  const handleCommunityChange = async (slug: string) => {
    // Partner-only locks (even if visible in normal list)
    const lockedSlugs = ['market-research', 'events', 'zaurq-partners', 'your-club'];
    if (!isPartner && lockedSlugs.includes(slug)) {
      // Try a quick refresh in case the user's role was upgraded while logged in.
      try {
        await refreshProfile?.();
      } catch {}
      // Re-check from latest state (refreshProfile updates global auth state).
      if ((user as any)?.role !== 'ZAURQ_PARTNER') {
      toast({
        title: 'Zaurq Partners only',
        description: 'Apply or get invited by an existing Zaurq Partner to unlock this area.',
        variant: 'destructive',
      });
      return;
      }
    }
    setActiveCommunity(slug);
    setPage(1);
    setPosts([]);
    setSelectedTags([]); // Clear tags when changing community
    setMixSeed(0);
    setRedditSyncing(false);

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
      if (c === activeCommunity) return;
      // Fire-and-forget (handleCommunityChange already resets state)
      void handleCommunityChange(c);
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const handlePostCreated = (post: ForumPost) => {
    setPosts(prev => [post, ...prev]);
    setShowCreateModal(false);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  return (
    <div className="font-reddit h-full overflow-hidden bg-background text-foreground">
      {/* No membership banner: access is role-based (ZAURQ_USER / ZAURQ_PARTNER) */}
      
      {/* Reddit-style 3-column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr] xl:grid-cols-[240px_1fr_300px] gap-4 h-full overflow-hidden">
        
        {/* LEFT SIDEBAR - Communities (hidden on mobile/tablet) */}
        <aside className="hidden xl:flex xl:flex-col h-full max-h-[calc(100vh-2rem)]">
          {/* Communities card - scrollable with max height */}
          <div
            className="bg-card border border-border rounded-lg overflow-hidden flex flex-col"
            style={{ maxHeight: isPartner ? '52vh' : '60vh' }}
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
                  className={`w-full flex items-center gap-3 px-3 ${isPartner ? 'py-1.5' : 'py-2'} text-left transition-colors ${
                    activeCommunity === 'all'
                      ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {(() => {
                    const Icon = getCommunityIcon('all');
                    return <Icon className="w-4 h-4" />;
                  })()}
                  <span className="text-sm font-medium">All</span>
                </button>
                {/* Zaurq Partners section (partners only; hide entirely for ZAURQ_USER to avoid clutter) */}
                {isPartner && (
                  <div className="mt-1">
                    <div className="px-3 py-1.5">
                      <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-muted-foreground">
                        Zaurq Partners
                      </div>
                    </div>

                    {/* Zaurq Partners curated feed */}
                    <button
                      onClick={() => handleCommunityChange('zaurq-partners')}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 text-left transition-colors ${
                        activeCommunity === 'zaurq-partners'
                          ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="w-4 h-4 flex items-center justify-center">✦</span>
                      <span className="text-sm font-medium truncate">Partners Feed</span>
                    </button>

                    {/* Your Club */}
                    <button
                      onClick={() => handleCommunityChange('your-club')}
                      className={`w-full flex items-center gap-3 px-3 py-1.5 text-left transition-colors ${
                        activeCommunity === 'your-club'
                          ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                          : 'text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      <span className="w-4 h-4 flex items-center justify-center">◦</span>
                      <span className="text-sm font-medium truncate">Your Club</span>
                    </button>

                    {/* Partner-only communities */}
                    {(['market-research', 'events'] as const).map((slug) => {
                      const Icon = getCommunityIcon(slug);
                      const label = slug === 'market-research' ? 'Market Research' : 'Events';
                      const isActive = activeCommunity === slug;
                      return (
                        <button
                          key={slug}
                          onClick={() => handleCommunityChange(slug)}
                          className={`w-full flex items-center gap-3 px-3 py-1.5 text-left transition-colors ${
                            isActive
                              ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                              : 'text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span className="text-sm font-medium truncate">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Normal communities list */}
                {communities
                  .filter((c) => c.slug !== 'market-gaps') // market-gaps merged into market-research
                  .filter((c) => {
                    // If partner, avoid duplicates (partner-only slugs are rendered above).
                    if (
                      isPartner &&
                      (c.slug === 'market-research' || c.slug === 'events' || c.slug === 'zaurq-partners' || c.slug === 'your-club')
                    ) {
                      return false;
                    }
                    // If non-partner, hide partner-only slugs completely (no locked clutter).
                    if (
                      !isPartner &&
                      (c.slug === 'market-research' || c.slug === 'events' || c.slug === 'zaurq-partners' || c.slug === 'your-club')
                    ) {
                      return false;
                    }
                    return true;
                  })
                  .map((community) => (
                    <button
                      key={community.id}
                      onClick={() => handleCommunityChange(community.slug)}
                      className={`w-full flex items-center gap-3 px-3 ${isPartner ? 'py-1.5' : 'py-2'} text-left transition-colors ${
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
                {/* Special "Offers" community (data from offers table, not forum_posts) */}
                <button
                  onClick={() => handleCommunityChange('offers')}
                  className={`w-full flex items-center gap-3 px-3 ${isPartner ? 'py-1.5' : 'py-2'} text-left transition-colors ${
                    activeCommunity === 'offers'
                      ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <Gift className="w-4 h-4" />
                  <span className="text-sm font-medium">Offers</span>
                </button>
                {/* Special "People" community (discover members) */}
                <button
                  onClick={() => handleCommunityChange('people')}
                  className={`w-full flex items-center gap-3 px-3 ${isPartner ? 'py-1.5' : 'py-2'} text-left transition-colors ${
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
        <main className="min-w-0 h-full overflow-y-auto pr-1 hide-scrollbar">
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
              {communities
                .filter((c) => c.slug !== 'market-gaps') // market-gaps merged into market-research
                .filter((c) => {
                  // Hide partner-only slugs on mobile for ZAURQ_USER to avoid clutter.
                  if (
                    !isPartner &&
                    (c.slug === 'market-research' || c.slug === 'events' || c.slug === 'zaurq-partners' || c.slug === 'your-club')
                  ) {
                    return false;
                  }
                  // Avoid duplicates for partners if these are rendered elsewhere / special.
                  return true;
                })
                .map((community) => (
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
              {/* Offers community (mobile) */}
              <button
                onClick={() => handleCommunityChange('offers')}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                  activeCommunity === 'offers'
                    ? 'bg-[#CBAA5A] ring-2 ring-[#CBAA5A]/50'
                    : 'bg-[#1a1a1a] hover:bg-[#252525]'
                }`}
              >
                <Gift className="w-4 h-4 text-muted-foreground" />
              </button>
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

                {(activeCommunity === 'all' || activeCommunity === 'general') && (
                  <button
                    onClick={() => {
                      if (debugSync) {
                        console.log('[reddit-sync] button click', {
                          activeCommunity,
                          page,
                          sortBy,
                          selectedTags,
                          mixSeed_before: mixSeed,
                          will_set_mixSeed_to: mixSeed + 1,
                        });
                      }
                      setRedditSyncing(true);
                      setPage(1);
                      setMixSeed((s) => s + 1);
                      toast({
                        title: 'Syncing Reddit…',
                        description: 'Fetching latest posts',
                      });
                    }}
                    disabled={redditSyncing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-muted text-foreground hover:bg-accent border border-border"
                    title="Sync Reddit (fetch latest posts)"
                  >
                    {redditSyncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                    Sync
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Tag Filters - Only show for General community */}
          {activeCommunity === 'general' && (
            <div className="bg-card border border-border rounded-lg mb-3 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Filter by Tags</h3>
                </div>
                {selectedTags.length > 0 && (
                  <button
                    onClick={clearTags}
                    className="flex items-center gap-1 text-xs text-[#CBAA5A] hover:text-[#D4B76A] transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Clear
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => toggleTag(tag.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                        isSelected
                          ? 'bg-[#CBAA5A] text-black'
                          : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground border border-border'
                      }`}
                    >
                      <span>{tag.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Create Post (mobile) */}
          <div 
            onClick={() => {
              setShowCreateModal(true);
            }}
            className={`xl:hidden bg-card border border-border rounded-lg p-2 mb-3 flex items-center gap-3 cursor-pointer transition-colors ${
              'hover:border-border/80'
            }`}
          >
            <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <Plus className="w-4 h-4" />
            </div>
            <div className="flex-1 bg-muted rounded border border-border px-3 py-2 text-muted-foreground text-sm">
              Create Post
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-3">
            {/* Special rendering for People community */}
            {activeCommunity === 'your-club' ? (
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground">Your Club</div>
                    <div className="text-sm text-foreground mt-1">Curated members (invite-only, &lt; 10)</div>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {clubMembers.length}/10
                  </div>
                </div>

                {clubLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
                  </div>
                ) : clubMembers.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    Your Club is empty right now. Members are added after review.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clubMembers.slice(0, 10).map((m: any) => {
                      const name = `${m.first_name || ''} ${m.last_name || ''}`.trim() || 'Member';
                      return (
                        <button
                          key={m.id}
                          onClick={() => navigate(`/profile/${m.id}`)}
                          className="w-full text-left rounded-xl border border-border bg-black/10 hover:bg-black/20 transition-colors p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-muted overflow-hidden flex items-center justify-center text-xs font-bold">
                              {m.profile_picture_url ? (
                                <img src={m.profile_picture_url} alt={name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-muted-foreground">{name[0]?.toUpperCase() || 'Z'}</span>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-semibold text-foreground truncate">{name}</div>
                              <div className="text-xs text-muted-foreground truncate">
                                {m.bio || 'Refined member'}
                              </div>
                            </div>
                            <div className="text-[#CBAA5A] text-lg">›</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
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
              <div className="text-center py-12 bg-card border border-border rounded-lg">
                <p className="text-muted-foreground text-lg font-medium">No posts yet</p>
                <p className="text-muted-foreground/80 text-sm mt-1">Be the first to post!</p>
              </div>
            ) : (
              <>
                {/* Suggest Topic Form for Market Research community */}
                {activeCommunity === 'market-research' && (
                  <SuggestTopicForm />
                )}
                
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

                  // Render RequestPostCard for warm intro requests
                  if (post.post_type === 'request' || post.community?.slug === 'requests') {
                    return (
                      <div key={`post-${post.id}`} className={isSeen ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}>
                        <RequestPostCard post={post as any} isSeen={isSeen} />
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
            {/* Community Info */}
            <div className="bg-card border border-border rounded-lg overflow-hidden">
              {(() => {
                // Get current community info
                const currentCommunity = activeCommunity === 'all'
                  ? { name: 'All Communities', slug: 'all', description: 'Browse posts from all communities' }
                  : activeCommunity === 'people'
                  ? { name: 'People', slug: 'people', description: 'Discover and connect with other members' }
                  : activeCommunity === 'your-club'
                  ? { name: 'Your Club', slug: 'your-club', description: 'Your curated inner circle of trusted connections' }
                  : activeCommunity === 'zaurq-partners'
                  ? { name: 'Partners Feed', slug: 'zaurq-partners', description: 'Exclusive content for Zaurq Partners' }
                  : communities.find((c) => c.slug === activeCommunity) || { name: 'Community', slug: activeCommunity, description: '' };

                const Icon = getCommunityIcon(currentCommunity.slug);
                
                // Use real stats from API
                const memberCount = communityStats?.memberCount || 0;
                const onlineCount = communityStats?.onlineCount || 1;
                const postsCount = communityStats?.postsCount || 0;

                return (
                  <>
                    {/* Banner */}
                    <div className="h-16 bg-gradient-to-r from-[#CBAA5A]/20 to-[#CBAA5A]/5" />
                    
                    {/* Icon overlay */}
                    <div className="px-4 -mt-6">
                      <div className="w-12 h-12 rounded-full bg-card border-4 border-card flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#CBAA5A]" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="px-4 pb-4 pt-2">
                      <h3 className="font-bold text-foreground">{currentCommunity.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {currentCommunity.description}
                      </p>

                      {/* Stats */}
                      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-border">
                        <div>
                          <div className="text-sm font-bold text-foreground">{memberCount.toLocaleString()}</div>
                          <div className="text-[10px] text-muted-foreground">Members</div>
                        </div>
                        <div>
                          <div className="flex items-center gap-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-sm font-bold text-foreground">{onlineCount}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">Online</div>
                        </div>
                        <div>
                          <div className="text-sm font-bold text-foreground">{postsCount > 0 ? postsCount.toLocaleString() : '—'}</div>
                          <div className="text-[10px] text-muted-foreground">Posts</div>
                        </div>
                      </div>

                      {/* Reddit-style CTA lives in the community info card */}
                      {activeCommunity !== 'people' && activeCommunity !== 'offers' && (
                        <button
                          onClick={() => setShowCreateModal(true)}
                          className="w-full mt-4 px-4 py-2 rounded-full text-sm font-bold bg-[#CBAA5A] text-black hover:bg-[#D4B76A] transition-colors"
                        >
                          Create Post
                        </button>
                      )}
                    </div>
                  </>
                );
              })()}
            </div>

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

      {/* Modals */}
      <CreateForumPostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        communities={communities}
        onPostCreated={handlePostCreated}
        defaultCommunity={activeCommunity !== 'all' ? activeCommunity : undefined}
      />

    </div>
  );
};
