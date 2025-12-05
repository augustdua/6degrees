import { useState, useEffect, useMemo } from 'react';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';
import { ForumPostCard } from './ForumPostCard';
import { NewsCard } from './NewsCard';
import { CreateForumPostModal } from './CreateForumPostModal';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, Newspaper } from 'lucide-react';
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

  return (
    <div className="space-y-4">
      {/* Community Tabs + News Toggle */}
      <div className="flex items-center justify-between border-b border-[#1a1a1a]">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
          <button
            onClick={() => handleCommunityChange('all')}
            className={`px-4 py-2 text-[10px] font-gilroy tracking-[0.15em] uppercase whitespace-nowrap transition-all border-b-2 -mb-[2px] ${
              activeCommunity === 'all'
                ? 'text-[#CBAA5A] border-[#CBAA5A]'
                : 'text-[#666] hover:text-white border-transparent'
            }`}
          >
            All
          </button>
          {communities.map((community) => (
            <button
              key={community.id}
              onClick={() => handleCommunityChange(community.slug)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-gilroy tracking-[0.15em] uppercase whitespace-nowrap transition-all border-b-2 -mb-[2px] ${
                activeCommunity === community.slug
                  ? 'border-current'
                  : 'text-[#666] hover:text-white border-transparent'
              }`}
              style={{
                color: activeCommunity === community.slug ? community.color : undefined
              }}
            >
              <span>{community.icon}</span>
              <span>{community.name}</span>
            </button>
          ))}
        </div>

        {/* News Toggle */}
        <button
          onClick={() => setShowNews(!showNews)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-gilroy tracking-wider transition-all mb-2 ${
            showNews 
              ? 'bg-blue-500/15 text-blue-400' 
              : 'bg-[#1a1a1a] text-[#666] hover:text-white'
          }`}
        >
          <Newspaper className="w-3 h-3" />
          NEWS
        </button>
      </div>

      {/* Create Post Button */}
      <button
        onClick={() => setShowCreateModal(true)}
        className="w-full py-3 border border-[#333] hover:border-[#CBAA5A] rounded-lg text-[#888] hover:text-[#CBAA5A] font-gilroy text-sm tracking-wider transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" />
        Create Post
      </button>

      {/* Combined Feed (Posts + News) */}
      <div className="space-y-4">
        {loading && page === 1 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-12 text-[#888]">
            <p className="font-sans text-lg">No posts yet</p>
            <p className="text-sm mt-1 font-sans">Be the first to post in this community!</p>
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
                />
              )
            ))}
            
            {hasMore && (
              <Button
                onClick={() => setPage(p => p + 1)}
                variant="outline"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Load More'
                )}
              </Button>
            )}
          </>
        )}
      </div>

      {/* Create Post Modal */}
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
