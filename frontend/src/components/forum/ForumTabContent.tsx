import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { ForumPostCard } from './ForumPostCard';
import { PredictionCard } from './PredictionCard';
import { ResearchPostCard } from './ResearchPostCard';
import { BrandPainPointCard } from './BrandPainPointCard';
import { SuggestTopicForm } from './SuggestTopicForm';
import { CreateForumPostModal } from './CreateForumPostModal';
import { Plus, Loader2, TrendingUp, Clock, Flame, Sparkles, Users, Target, FileText, Tag, X, RefreshCw, Newspaper, LayoutGrid } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getRecentForumPosts, getSeenForumPostIds } from '@/lib/forumSeen';
import { useToast } from '@/hooks/use-toast';

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

const LEGACY_COMMUNITY_SLUGS = ['build-in-public', 'wins', 'failures', 'network', 'market-gaps'] as const;

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
    case 'pain-points':
      return Target;
    default:
      return Users;
  }
}

export const ForumTabContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<string>('all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [redditSyncing, setRedditSyncing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  const [mixSeed, setMixSeed] = useState(0);
  const [seenNonce, setSeenNonce] = useState(0);
  
  // Tag filtering
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

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

  // Back-compat: if user somehow lands on a legacy community slug, treat it as a tag under General.
  useEffect(() => {
    if ((LEGACY_COMMUNITY_SLUGS as readonly string[]).includes(activeCommunity)) {
      setActiveCommunity('general');
      setSelectedTags(prev => (prev.includes(activeCommunity) ? prev : [...prev, activeCommunity]));
      setPage(1);
    }
  }, [activeCommunity]);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
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

        // If user explicitly requested a Reddit sync, ask backend to force it.
        // (Only relevant for feeds where Reddit posts are blended in: All + General.)
        const forceReddit = (activeCommunity === 'all' || activeCommunity === 'general') && page === 1 && mixSeed > 0;
        if (forceReddit) {
          params.set('force_reddit', '1');
          // Bust the frontend GET cache so the sync always triggers a network request.
          params.set('sync_nonce', String(mixSeed));
        }
        
        const debugSync = typeof window !== 'undefined' && (window.localStorage?.getItem('debug_reddit_sync') === '1');
        if (forceReddit && debugSync) {
          console.log('[reddit-sync] fetch posts start', {
            activeCommunity,
            page,
            sortBy,
            selectedTags,
            mixSeed,
            url: `/api/forum/posts?${params.toString()}`,
          });
        }

        let data = await apiGet(`/api/forum/posts?${params}`, { skipCache: forceReddit });

        // If "All" is dominated by one community on page 1 (often News), fetch one more page and merge.
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
      } finally {
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

  const handleCommunityChange = (slug: string) => {
    setActiveCommunity(slug);
    setPage(1);
    setPosts([]);
    setSelectedTags([]); // Clear tags when changing community
    setMixSeed(0);
    setRedditSyncing(false);
  };

  const handlePostCreated = (post: ForumPost) => {
    setPosts(prev => [post, ...prev]);
    setShowCreateModal(false);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Interest data (static for now) - no emojis
  const interests = [
    { name: 'Build in Public', percentage: 40 },
    { name: 'Network', percentage: 30 },
    { name: 'Wins', percentage: 20 },
    { name: 'Failures', percentage: 10 },
  ];

  return (
    <div className="font-reddit h-full overflow-hidden">
      {/* Reddit-style 3-column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr] xl:grid-cols-[200px_1fr_280px] gap-4 h-full overflow-hidden">
        
        {/* LEFT SIDEBAR - Communities (hidden on mobile/tablet) */}
        <aside className="hidden xl:block">
          <div className="sticky top-4">
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1a1a1a]">
                <h3 className="text-[10px] font-bold text-[#606060] uppercase tracking-wider">Communities</h3>
              </div>
              <div className="py-1">
                <button
                  onClick={() => handleCommunityChange('all')}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                    activeCommunity === 'all'
                      ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                      : 'text-[#b0b0b0] hover:bg-[#111]'
                  }`}
                >
                  {(() => {
                    const Icon = getCommunityIcon('all');
                    return <Icon className="w-4 h-4" />;
                  })()}
                  <span className="text-sm font-medium">All</span>
                </button>
                {communities.map((community) => (
                  <button
                    key={community.id}
                    onClick={() => handleCommunityChange(community.slug)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                      activeCommunity === community.slug
                        ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                        : 'text-[#b0b0b0] hover:bg-[#111]'
                    }`}
                  >
                    {(() => {
                      const Icon = getCommunityIcon(community.slug);
                      return <Icon className="w-4 h-4" />;
                    })()}
                    <span className="text-sm font-medium truncate">{community.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {recent.length > 0 && (
              <div className="mt-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#1a1a1a]">
                  <h3 className="text-[10px] font-bold text-[#606060] uppercase tracking-wider">Recently viewed</h3>
                </div>
                <div className="py-1 max-h-[240px] overflow-auto">
                  {recent.slice(0, 10).map((p) => (
                    <Link
                      key={p.id}
                      to={`/forum/post/${p.id}`}
                      className="block px-3 py-2 text-xs text-[#b0b0b0] hover:bg-[#111] hover:text-white transition-colors"
                      title={p.title}
                    >
                      <span className="line-clamp-2">{p.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            <button
              onClick={() => setShowCreateModal(true)}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#CBAA5A] hover:bg-[#D4B76A] text-black font-bold text-sm rounded-full transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Post
            </button>
          </div>
        </aside>

        {/* CENTER FEED - Main Content */}
        <main className="min-w-0 h-full overflow-y-auto pr-1 hide-scrollbar">
          {/* Mobile Community Icons (hidden on xl+) */}
          <div className="xl:hidden bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg mb-3">
            <div className="flex items-center gap-1 p-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleCommunityChange('all')}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                  activeCommunity === 'all'
                    ? 'bg-[#CBAA5A] text-black'
                    : 'bg-[#1a1a1a] text-[#808080] hover:bg-[#252525]'
                }`}
              >
                {(() => {
                  const Icon = getCommunityIcon('all');
                  return <Icon className="w-4 h-4" />;
                })()}
              </button>
              {communities.map((community) => (
                <button
                  key={community.id}
                  onClick={() => handleCommunityChange(community.slug)}
                  className={`flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                    activeCommunity === community.slug
                      ? 'bg-[#CBAA5A] ring-2 ring-[#CBAA5A]/50'
                      : 'bg-[#1a1a1a] hover:bg-[#252525]'
                  }`}
                >
                  {(() => {
                    const Icon = getCommunityIcon(community.slug);
                    return <Icon className="w-4 h-4 text-[#b0b0b0]" />;
                  })()}
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg mb-3">
            <div className="flex items-center justify-between p-2">
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSortBy('hot')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'hot' ? 'bg-[#1a1a1a] text-white' : 'text-[#606060] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  Hot
                </button>
                <button
                  onClick={() => setSortBy('new')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'new' ? 'bg-[#1a1a1a] text-white' : 'text-[#606060] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  New
                </button>
                <button
                  onClick={() => setSortBy('top')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'top' ? 'bg-[#1a1a1a] text-white' : 'text-[#606060] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  Top
                </button>
              </div>
              {(activeCommunity === 'all' || activeCommunity === 'general') && (
                <button
                  onClick={() => {
                    setRedditSyncing(true);
                    setPage(1);
                    setMixSeed((s) => s + 1);
                    toast({
                      title: 'Syncing Reddit…',
                      description: 'Fetching latest posts',
                    });
                  }}
                  disabled={redditSyncing}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-[#1a1a1a] text-[#b0b0b0] hover:text-white hover:bg-[#222]"
                  title="Sync Reddit (fetch latest posts)"
                >
                  {redditSyncing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5" />
                  )}
                  Sync Reddit
                </button>
              )}
            </div>
          </div>

          {/* Tag Filters - Only show for General community */}
          {activeCommunity === 'general' && (
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg mb-3 p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-[#606060]" />
                  <h3 className="text-xs font-bold text-[#606060] uppercase tracking-wider">Filter by Tags</h3>
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
                          : 'bg-[#1a1a1a] text-[#888] hover:bg-[#252525] hover:text-white border border-[#333]'
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
            onClick={() => setShowCreateModal(true)}
            className="xl:hidden bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-2 mb-3 flex items-center gap-3 cursor-pointer hover:border-[#333] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#606060]">
              <Plus className="w-4 h-4" />
            </div>
            <div className="flex-1 bg-[#1a1a1a] rounded border border-[#333] px-3 py-2 text-[#606060] text-sm">
              Create Post
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-3">
            {loading && page === 1 ? (
              <div className="flex items-center justify-center py-12 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                <p className="text-[#808080] text-lg font-medium">No posts yet</p>
                <p className="text-[#606060] text-sm mt-1">Be the first to post!</p>
              </div>
            ) : (
              <>
                {/* Suggest Topic Form for Market Research community */}
                {activeCommunity === 'market-research' && (
                  <SuggestTopicForm />
                )}
                
                {interleavedPosts.map((post) => {
                  const isSeen = seenIds.has(post.id);
                  
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
                  
                  // Render BrandPainPointCard for pain_point posts
                  if (post.post_type === 'pain_point' || post.community?.slug === 'pain-points') {
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
                    className="w-full py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg text-[#808080] hover:text-white hover:bg-[#111] transition-colors font-bold text-sm"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Load More'}
                  </button>
                )}
              </>
            )}
          </div>
        </main>

        {/* RIGHT SIDEBAR - Offers, Matches & Interests (hidden on mobile/tablet) */}
        <aside className="hidden xl:block w-72 flex-shrink-0">
          <div className="sticky top-4 space-y-3">
            {/* Offers For You - Coming Soon */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#CBAA5A]" />
                <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">Offers For You</h3>
              </div>
              <div className="p-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-[#CBAA5A]/50" />
                  </div>
                  <p className="text-sm font-medium text-[#808080]">Coming Soon</p>
                  <p className="text-[10px] text-[#505050] mt-1 leading-relaxed">
                    Personalized offers based on your forum activity
                  </p>
                </div>
              </div>
            </div>

            {/* Potential Matches - Coming Soon */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#CBAA5A]" />
                <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">Potential Matches</h3>
              </div>
              <div className="p-4">
                <div className="text-center py-4">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#CBAA5A]/50" />
                  </div>
                  <p className="text-sm font-medium text-[#808080]">Coming Soon</p>
                  <p className="text-[10px] text-[#505050] mt-1 leading-relaxed">
                    GNN-powered networking matches based on your interests
                  </p>
                </div>
              </div>
            </div>

            {/* Your Interests */}
            <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
              <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#CBAA5A]" />
                <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">Your Interests</h3>
              </div>
              <div className="p-3 space-y-2.5">
                {interests.map((interest) => (
                  <div key={interest.name} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{interest.icon}</span>
                        <span className="text-xs text-[#b0b0b0]">{interest.name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#CBAA5A]">{interest.percentage}%</span>
                    </div>
                    <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#CBAA5A] rounded-full"
                        style={{ width: `${interest.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
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
