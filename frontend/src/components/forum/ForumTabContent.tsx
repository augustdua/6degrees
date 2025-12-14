import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { ForumPostCard } from './ForumPostCard';
import { PredictionCard } from './PredictionCard';
import { ResearchPostCard } from './ResearchPostCard';
import { BrandPainPointCard } from './BrandPainPointCard';
import { SuggestTopicForm } from './SuggestTopicForm';
import { CreateForumPostModal } from './CreateForumPostModal';
import { Plus, Loader2, TrendingUp, Clock, Flame, Sparkles, Users, Target, FileText, Tag, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { getSeenForumPostIds } from '@/lib/forumSeen';

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
  { id: 'build-in-public', label: 'Build in Public', icon: '🚀' },
  { id: 'wins', label: 'Wins', icon: '🏆' },
  { id: 'failures', label: 'Failures', icon: '💔' },
  { id: 'network', label: 'Network', icon: '🤝' },
  { id: 'reddit', label: 'Reddit', icon: '🔴' },
];

const LEGACY_COMMUNITY_SLUGS = ['build-in-public', 'wins', 'failures', 'network', 'market-gaps'] as const;

export const ForumTabContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<string>('all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
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
        const params = new URLSearchParams({
          community: activeCommunity,
          page: page.toString(),
          limit: '20',
          sort: sortBy
        });
        
        // Add tags filter if any selected
        if (selectedTags.length > 0) {
          params.set('tags', selectedTags.join(','));
        }
        
        const data = await apiGet(`/api/forum/posts?${params}`);
        
        if (page === 1) {
          setPosts(data.posts || []);
        } else {
          setPosts(prev => [...prev, ...(data.posts || [])]);
        }
        
        setHasMore((data.posts || []).length === 20);
      } catch (err) {
        console.error('Error fetching posts:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, [activeCommunity, page, sortBy, selectedTags]);

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
    const valid = posts.filter((p) => p?.user?.id && p?.community?.id && p.community?.slug);
    if (activeCommunity !== 'all') return valid;

    const seen = getSeenForumPostIds(); // depends on localStorage; re-evaluate via seenNonce
    void seenNonce;

    const groups = new Map<string, ForumPost[]>();
    for (const p of valid) {
      const slug = p.community!.slug;
      if (!groups.has(slug)) groups.set(slug, []);
      groups.get(slug)!.push(p);
    }

    // Within each community: unread first, then newest.
    for (const [slug, arr] of groups.entries()) {
      arr.sort((a, b) => {
        const aSeen = seen.has(a.id) ? 1 : 0;
        const bSeen = seen.has(b.id) ? 1 : 0;
        if (aSeen !== bSeen) return aSeen - bSeen;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
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
  };

  const handlePostCreated = (post: ForumPost) => {
    setPosts(prev => [post, ...prev]);
    setShowCreateModal(false);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  // Interest data (static for now)
  const interests = [
    { icon: '🚀', name: 'Build in Public', percentage: 40 },
    { icon: '🤝', name: 'Network', percentage: 30 },
    { icon: '🏆', name: 'Wins', percentage: 20 },
    { icon: '💔', name: 'Failures', percentage: 10 },
  ];

  return (
    <div className="font-reddit">
      {/* Reddit-style 3-column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr] xl:grid-cols-[200px_1fr_280px] gap-4">
        
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
                  <span className="text-lg">🌐</span>
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
                    <span className="text-lg">{community.icon}</span>
                    <span className="text-sm font-medium truncate">{community.name}</span>
                  </button>
                ))}
              </div>
            </div>
            
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
        <main className="min-w-0">
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
                <span className="text-sm">🌐</span>
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
                  <span className="text-sm">{community.icon}</span>
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
              {activeCommunity === 'all' && (
                <button
                  onClick={() => setMixSeed((s) => s + 1)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all bg-[#1a1a1a] text-[#b0b0b0] hover:text-white hover:bg-[#222]"
                  title="Mix the All feed"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Mix
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
                      <span>{tag.icon}</span>
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
                  
                  // Render PredictionCard for prediction posts
                  if (post.post_type === 'prediction' || post.community?.slug === 'predictions') {
                    return (
                      <PredictionCard
                        key={`post-${post.id}`}
                        post={post}
                        onDelete={() => handlePostDeleted(post.id)}
                      />
                    );
                  }
                  
                  // Render ResearchPostCard for research_report posts
                  if (post.post_type === 'research_report' || post.community?.slug === 'market-research') {
                    return (
                      <ResearchPostCard
                        key={`post-${post.id}`}
                        post={post}
                        onDelete={() => handlePostDeleted(post.id)}
                      />
                    );
                  }
                  
                  // Render BrandPainPointCard for pain_point posts
                  if (post.post_type === 'pain_point' || post.community?.slug === 'pain-points') {
                    return (
                      <BrandPainPointCard
                        key={`post-${post.id}`}
                        post={post}
                        onDelete={() => handlePostDeleted(post.id)}
                      />
                    );
                  }
                  
                  // Default ForumPostCard
                  return (
                    <ForumPostCard
                      key={`post-${post.id}`}
                      post={post}
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
