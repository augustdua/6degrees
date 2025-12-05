import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';
import { ForumPostCard } from './ForumPostCard';
import { NewsCard } from './NewsCard';
import { CreateForumPostModal } from './CreateForumPostModal';
import { ForumLeftSidebar } from './ForumLeftSidebar';
import { ForumRightSidebar } from './ForumRightSidebar';
import { ForumMobileTopBar } from './ForumMobileTopBar';
import { NewsModal } from '@/components/NewsModal';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Newspaper, TrendingUp, Clock, Flame } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useForumInteractionTracker } from '@/hooks/useForumInteractionTracker';

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

  // Initialize interaction tracker
  useForumInteractionTracker();

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
    const NEWS_INTERVAL = 5; // Insert news every 5 posts

    validPosts.forEach((post, index) => {
      items.push({ type: 'post', data: post });
      
      // Insert news after every NEWS_INTERVAL posts
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

  return (
    <div className="font-reddit">
      {/* 3-Column Layout */}
      <div className="flex gap-4">
        {/* Left Sidebar - Communities */}
        <ForumLeftSidebar
          communities={communities}
          activeCommunity={activeCommunity}
          onCommunityChange={handleCommunityChange}
          onCreatePost={() => setShowCreateModal(true)}
        />

        {/* Center Feed */}
        <div className="flex-1 min-w-0 space-y-0">
          {/* Mobile Top Bar - Offers & Interests (hidden on xl+) */}
          <ForumMobileTopBar activeCommunity={activeCommunity} />

          {/* Mobile Community Icons (hidden on desktop) */}
          <div className="lg:hidden bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm mb-2">
            <div className="flex items-center gap-1 p-2 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleCommunityChange('all')}
                className={`flex items-center justify-center w-8 h-8 rounded-full transition-all flex-shrink-0 ${
                  activeCommunity === 'all'
                    ? 'bg-[#CBAA5A] text-black'
                    : 'bg-[#1a1a1a] text-[#808080] hover:bg-[#252525]'
                }`}
                title="All Communities"
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
                  title={community.name}
                >
                  <span className="text-sm">{community.icon}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sort Options + News Toggle */}
          <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm mb-2">
            <div className="flex items-center justify-between gap-2 p-2">
              {/* Sort Options */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSortBy('hot')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'hot'
                      ? 'bg-[#1a1a1a] text-white'
                      : 'text-[#606060] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                  <span className="hidden sm:inline">Hot</span>
                </button>
                <button
                  onClick={() => setSortBy('new')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'new'
                      ? 'bg-[#1a1a1a] text-white'
                      : 'text-[#606060] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  <span className="hidden sm:inline">New</span>
                </button>
                <button
                  onClick={() => setSortBy('top')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    sortBy === 'top'
                      ? 'bg-[#1a1a1a] text-white'
                      : 'text-[#606060] hover:bg-[#1a1a1a] hover:text-white'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                  <span className="hidden sm:inline">Top</span>
                </button>
              </div>

              {/* News Toggle */}
              <button
                onClick={() => setShowNews(!showNews)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  showNews 
                    ? 'bg-[#CBAA5A]/20 text-[#CBAA5A]' 
                    : 'bg-[#1a1a1a] text-[#606060] hover:text-white hover:bg-[#252525]'
                }`}
              >
                <Newspaper className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">News</span>
              </button>
            </div>
          </div>

          {/* Create Post Input - Reddit style (mobile only, desktop uses sidebar button) */}
          <div 
            onClick={() => setShowCreateModal(true)}
            className="lg:hidden bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm p-2 mb-2 flex items-center gap-3 cursor-pointer hover:border-[#333] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#606060]">
              <Plus className="w-4 h-4" />
            </div>
            <div className="flex-1 bg-[#1a1a1a] rounded border border-[#333] px-3 py-2 text-[#606060] text-sm hover:border-[#CBAA5A] hover:bg-[#111] transition-colors">
              Create Post
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-2">
            {loading && page === 1 ? (
              <div className="flex items-center justify-center py-12 bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm">
                <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
              </div>
            ) : feedItems.length === 0 ? (
              <div className="text-center py-12 bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm">
                <p className="text-[#808080] text-lg font-medium">No posts yet</p>
                <p className="text-[#606060] text-sm mt-1">Be the first to post in this community!</p>
              </div>
            ) : (
              <>
                {feedItems.map((item, index) => (
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
                    className="w-full py-3 bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm text-[#808080] hover:text-white hover:bg-[#111] transition-colors font-bold text-sm"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                    ) : (
                      'Load More'
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Sidebar - Offers & Interests */}
        <ForumRightSidebar activeCommunity={activeCommunity} />
      </div>

      {/* Create Post Modal */}
      <CreateForumPostModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        communities={communities}
        onPostCreated={handlePostCreated}
        defaultCommunity={activeCommunity !== 'all' ? activeCommunity : undefined}
      />

      {/* News Modal - Opens inside app */}
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
