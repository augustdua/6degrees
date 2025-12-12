import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';
import { ForumPostCard } from './ForumPostCard';
import { NewsCard } from './NewsCard';
import { CreateForumPostModal } from './CreateForumPostModal';
import { NewsModal } from '@/components/NewsModal';
import { Plus, Loader2, Newspaper, TrendingUp, Clock, Flame, Sparkles, Users } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

interface Community {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
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
}

interface NewsArticle {
  id: string;
  title: string;
  link: string;
  description: string;
  content: string;
  pubDate: string;
  author: string;
  imageUrl?: string;
  category?: string;
}

// Type for interleaved feed items
type FeedItem = 
  | { type: 'post'; data: ForumPost }
  | { type: 'news'; data: NewsArticle };

export const ForumTabContent = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [activeCommunity, setActiveCommunity] = useState<string>('all');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [newsLoading, setNewsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [showNews, setShowNews] = useState(true);
  const [sortBy, setSortBy] = useState<'hot' | 'new' | 'top'>('hot');
  
  // News modal state
  const [selectedNewsArticle, setSelectedNewsArticle] = useState<NewsArticle | null>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);

  // Interaction tracking is provided by the root InteractionTrackerProvider

  // Fetch communities
  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const data = await apiGet('/api/forum/communities');
        setCommunities(data.communities || []);
      } catch (err) {
        console.error('Error fetching communities:', err);
      }
    };
    fetchCommunities();
  }, []);

  // Fetch news articles
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const data = await apiGet(API_ENDPOINTS.NEWS);
        if (Array.isArray(data)) {
          setNewsArticles(data);
        }
      } catch (err) {
        console.error('Error fetching news:', err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, []);

  // Fetch posts
  useEffect(() => {
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          community: activeCommunity,
          page: page.toString(),
          limit: '20'
        });
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
  }, [activeCommunity, page]);

  // Interleave posts with news (1 news every 5 posts)
  const feedItems = useMemo((): FeedItem[] => {
    const validPosts = posts.filter((post) => post?.user?.id && post?.community?.id);
    
    if (!showNews || newsArticles.length === 0) {
      return validPosts.map(post => ({ type: 'post' as const, data: post }));
    }

    const items: FeedItem[] = [];
    let newsIndex = 0;
    const NEWS_INTERVAL = 5;

    validPosts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      
      if ((index + 1) % NEWS_INTERVAL === 0 && newsIndex < newsArticles.length) {
        items.push({ type: 'news', data: newsArticles[newsIndex] });
        newsIndex++;
      }
    });

    return items;
  }, [posts, newsArticles, showNews]);

  const handleCommunityChange = (slug: string) => {
    setActiveCommunity(slug);
    setPage(1);
    setPosts([]);
  };

  const handlePostCreated = (post: ForumPost) => {
    setPosts(prev => [post, ...prev]);
    setShowCreateModal(false);
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleNewsClick = (article: NewsArticle) => {
    setSelectedNewsArticle(article);
    setShowNewsModal(true);
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
              <button
                onClick={() => setShowNews(!showNews)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  showNews ? 'bg-[#CBAA5A]/20 text-[#CBAA5A]' : 'bg-[#1a1a1a] text-[#606060] hover:text-white'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                News
              </button>
            </div>
          </div>

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
            ) : feedItems.length === 0 ? (
              <div className="text-center py-12 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg">
                <p className="text-[#808080] text-lg font-medium">No posts yet</p>
                <p className="text-[#606060] text-sm mt-1">Be the first to post!</p>
              </div>
            ) : (
              <>
                {feedItems.map((item) => (
                  item.type === 'post' ? (
                    <ForumPostCard
                      key={`post-${item.data.id}`}
                      post={item.data}
                      onDelete={() => handlePostDeleted(item.data.id)}
                    />
                  ) : (
                    <NewsCard
                      key={`news-${item.data.id}`}
                      article={item.data}
                      onClick={() => handleNewsClick(item.data)}
                    />
                  )
                ))}
                
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

      <NewsModal
        isOpen={showNewsModal}
        onClose={() => {
          setShowNewsModal(false);
          setSelectedNewsArticle(null);
        }}
        article={selectedNewsArticle}
      />
    </div>
  );
};
