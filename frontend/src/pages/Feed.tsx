import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Heart,
  Users,
  Target,
  DollarSign,
  Lock,
  Unlock,
  Calendar,
  ArrowRight,
  Settings,
  LayoutGrid,
  CheckCircle,
  Coins,
  Eye,
  Plus,
  Send,
  Navigation,
  Home,
  Wallet,
  User,
  MessageSquare,
  Gamepad2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { createOrJoinChain } from '@/lib/chainsApi';
import { ConnectorGameSimple } from '@/components/ConnectorGameSimple';
import { VideoFeedCard } from '@/components/VideoFeedCard';

interface FeedChain {
  id: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    bio?: string;
  };
  target: string;
  message?: string;
  reward: number;
  status: 'active' | 'completed';
  participantCount: number;
  createdAt: string;
  expiresAt: string;
  isLiked?: boolean;
  likesCount: number;
  canAccess: boolean;
  requiredCredits?: number;
  videoUrl?: string;
  videoThumbnail?: string;
  shareableLink?: string;
}

interface Bid {
  id: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    bio?: string;
  };
  title: string;
  description: string;
  connectionType: string;
  price: number;
  createdAt: string;
  isLiked?: boolean;
  likesCount: number;
  responseCount: number;
}

// Normalize API response to safe UI shape
type AnyObj = Record<string, any>;

function normalizeFeed(raw: AnyObj): FeedChain[] {
  console.log('🔧 normalizeFeed: Raw API response:', raw);
  
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  console.log('🔧 normalizeFeed: Extracted array:', arr);
  
  return arr.map((r: AnyObj, index: number): FeedChain => {
    console.log(`🔧 normalizeFeed: Processing item ${index}:`, r);
    
    const normalized = {
      id: r.id ?? r.requestId ?? crypto.randomUUID(),
      creator: {
        id: r.creator?.id ?? '',
        firstName: r.creator?.firstName ?? r.creator?.first_name ?? '',
        lastName:  r.creator?.lastName  ?? r.creator?.last_name  ?? '',
        avatar:    r.creator?.avatar    ?? r.creator?.avatar_url ?? undefined,
        bio:       r.creator?.bio ?? ''
      },
      target: r.target ?? '',
      message: r.message ?? '',
      reward: Number(r.reward ?? 0),
      status: (r.status === 'completed' ? 'completed' : 'active') as 'active' | 'completed',
      participantCount: Number(r.participantCount ?? r.participants?.length ?? 0),
      createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
      expiresAt: r.expiresAt ?? r.expires_at ?? new Date(Date.now() + 30*864e5).toISOString(),
      isLiked: Boolean(r.isLiked ?? false),
      likesCount: Number(r.likesCount ?? 0),
      canAccess: Boolean(r.canAccess ?? (r.status !== 'completed')),
      requiredCredits: (r.status === 'completed' ? (r.requiredCredits ?? undefined) : undefined),
      videoUrl: r.videoUrl ?? r.video_url ?? undefined,
      videoThumbnail: r.videoThumbnail ?? r.video_thumbnail ?? r.video_thumbnail_url ?? undefined,
      shareableLink: r.shareableLink ?? r.shareable_link ?? undefined,
    };
    
    console.log(`🔧 normalizeFeed: Normalized item ${index}:`, normalized);
    return normalized;
  });
}

const Feed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  // REAL STATE - Using real API for feed data
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'bids' | 'connector'>(
    new URLSearchParams(location.search).get('openRequest') ? 'active' : 'bids'
  );
  const [chains, setChains] = useState<FeedChain[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits] = useState(25); // Still mock credits for now
  const [showCreateBid, setShowCreateBid] = useState(false);
  const [newBid, setNewBid] = useState({
    title: '',
    description: '',
    connectionType: '',
    price: 0
  });

  // Mobile tab picker sheet
  const [tabPickerOpen, setTabPickerOpen] = useState(false);

  // If URL has ?openRequest=:id, scroll to that card and auto-open video if available
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const openRequest = params.get('openRequest');
    if (!openRequest) return;

    // Try a couple of times after data loads
    const tryFocus = () => {
      const el = document.querySelector(`[data-request-id="${openRequest}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    };

    // Initial attempt and a delayed follow-up
    setTimeout(tryFocus, 100);
    setTimeout(tryFocus, 600);
  }, [location.search, chains.length]);

  // Fetch bids data from API
  const fetchBidsData = async () => {
    console.log('🔄 Feed.tsx: fetchBidsData called');
    console.log('🔐 Feed.tsx: User state:', { 
      hasUser: !!user, 
      userId: user?.id, 
      userEmail: user?.email 
    });
    console.log('🌐 Feed.tsx: API endpoint:', API_ENDPOINTS.BIDS);
    console.log('⏰ Feed.tsx: Starting fetch at:', new Date().toISOString());
    
    setBidsLoading(true);

    try {
      console.log('🚀 Feed.tsx: Making API call to:', API_ENDPOINTS.BIDS);
      const response = await apiGet(API_ENDPOINTS.BIDS);
      console.log('✅ Feed.tsx: Raw API response received:', response);
      console.log('📊 Feed.tsx: Response type:', typeof response);
      console.log('📊 Feed.tsx: Response is array:', Array.isArray(response));
      console.log('📊 Feed.tsx: Response length:', Array.isArray(response) ? response.length : 'N/A');

      if (!Array.isArray(response)) {
        console.error('❌ Feed.tsx: API response is not an array:', response);
        throw new Error('Invalid API response format');
      }

      if (response.length === 0) {
        console.log('📭 Feed.tsx: No bids returned from API');
        setBids([]);
        return;
      }

      console.log('🔧 Feed.tsx: Processing bids data...');
      // Transform API response to match our Bid interface
      const transformedBids: Bid[] = response.map((bid: any, index: number) => {
        console.log(`🔧 Feed.tsx: Processing bid ${index}:`, {
          id: bid.id,
          title: bid.title,
          creator: bid.creator,
          price: bid.price
        });
        
        return {
          id: bid.id,
          creator: {
            id: bid.creator.id,
            firstName: bid.creator.first_name,
            lastName: bid.creator.last_name,
            avatar: bid.creator.avatar_url,
            bio: bid.creator.bio || 'Professional Network Member'
          },
          title: bid.title,
          description: bid.description,
          connectionType: bid.connection_type,
          price: bid.price,
          createdAt: bid.created_at,
          isLiked: false, // Will be determined by checking bid_likes
          likesCount: bid.likes_count || 0,
          responseCount: bid.responses_count || 0
        };
      });

      console.log('✅ Feed.tsx: Transformed bids:', transformedBids);
      console.log('📊 Feed.tsx: Setting bids state with', transformedBids.length, 'bids');
      setBids(transformedBids);
      console.log('🎉 Feed.tsx: Bids data successfully loaded and set');
    } catch (error: any) {
      console.error('❌ Feed.tsx: Error fetching bids:', error);
      console.error('❌ Feed.tsx: Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast({
        title: 'Error Loading Bids',
        description: 'Failed to load bids data. Please try again.',
        variant: 'destructive'
      });
      setBids([]);
    } finally {
      console.log('🏁 Feed.tsx: fetchBidsData completed, setting loading to false');
      setBidsLoading(false);
    }
  };

  // REAL API CALL - Fetch feed data from backend
  useEffect(() => {
    let cancelled = false;

    console.log('🔄 Feed.tsx: useEffect triggered - REFRESH DEBUG', {
      activeTab,
      userId: user?.id,
      userObject: !!user,
      timestamp: new Date().toISOString(),
      performanceNow: performance.now()
    });

    // Public users are allowed; backend uses optionalAuth. Do not skip fetch.

    // Add timeout to prevent infinite loading on refresh
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        console.error('⏰ Feed.tsx: API call timed out after 15 seconds');
        setError('Request timed out. Please try again.');
        setLoading(false);
      }
    }, 15000);

    (async () => {
      console.log('🚀 Feed.tsx: Starting fetchFeedData', {
        activeTab,
        userId: user?.id,
        timestamp: new Date().toISOString(),
        performanceNow: performance.now()
      });

      if (cancelled) {
        clearTimeout(timeoutId);
        return;
      }
      setLoading(true);
      setError(null);

      try {
        // Add cache-busting timestamp to prevent browser caching issues on refresh
        const cacheBuster = Date.now();
        const apiUrl = `${API_ENDPOINTS.FEED_DATA}?status=${activeTab}&limit=20&offset=0&_t=${cacheBuster}`;

        console.log('🌐 Feed.tsx: Making API call to:', apiUrl);
        console.log('🕐 Feed.tsx: API call start time:', new Date().toISOString());

        const resp = await apiGet(apiUrl);

        clearTimeout(timeoutId);

        if (cancelled) {
          console.log('🛑 Feed.tsx: Request cancelled after API response');
          return;
        }

        console.log('✅ Feed.tsx: Raw API response received:', resp);
        console.log('🕐 Feed.tsx: API call end time:', new Date().toISOString());

        const normalizedChains = normalizeFeed(resp);
        console.log('✅ Feed.tsx: Normalized chains:', normalizedChains);

        setChains(normalizedChains);
        setError(null);
        console.log('✅ Feed.tsx: Chains set successfully');
      } catch (e: any) {
        clearTimeout(timeoutId);

        if (cancelled) {
          console.log('🛑 Feed.tsx: Request cancelled in catch block');
          return;
        }

        console.error('❌ Feed.tsx: Error fetching feed data:', e);
        console.error('❌ Feed.tsx: Error type:', typeof e);
        console.error('❌ Feed.tsx: Error name:', e?.name);
        console.error('❌ Feed.tsx: Error message:', e?.message);
        console.error('❌ Feed.tsx: Error stack:', e?.stack);

        setChains([]);
        const errorMessage = e?.message ?? 'Failed to load feed data';
        setError(errorMessage);

        // Check if it's an auth/session error
        if (errorMessage.includes('session') || errorMessage.includes('auth') || errorMessage.includes('token')) {
          toast({
            title: 'Session Expired',
            description: 'Your session has expired. Please log in again.',
            variant: 'destructive'
          });
        } else {
          toast({
            title: 'Error Loading Feed',
            description: 'Failed to load feed data. Please try again.',
            variant: 'destructive'
          });
        }
      } finally {
        clearTimeout(timeoutId);
        if (!cancelled) {
          console.log('🏁 Feed.tsx: Setting loading to false');
          setLoading(false);
          console.log('✅ Feed.tsx: fetchFeedData completed');
        }
      }
    })();

    return () => {
      console.log('🧹 Feed.tsx: useEffect cleanup - cancelling requests');
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [activeTab, user?.id]);

  // Fetch bids data when bids tab is active
  useEffect(() => {
    console.log('🔄 Feed.tsx: useEffect for activeTab change:', { activeTab, timestamp: new Date().toISOString() });
    if (activeTab === 'bids') {
      console.log('🎯 Feed.tsx: Active tab is bids, calling fetchBidsData');
      fetchBidsData();
    } else {
      console.log('📋 Feed.tsx: Active tab is not bids, skipping fetchBidsData');
    }
  }, [activeTab]);

  // MOCK FUNCTIONS - Still using mock for now
  const handleLike = async (chainId: string, requestId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    console.log('👍 Feed.tsx: Mock like for chain:', chainId);

    // Mock like functionality
    const updatedChains = chains.map(chain => {
      if (chain.id === chainId) {
        const newLiked = !chain.isLiked;
        return {
          ...chain,
          isLiked: newLiked,
          likesCount: newLiked ? chain.likesCount + 1 : chain.likesCount - 1
        };
      }
      return chain;
    });

    setChains(updatedChains);

    toast({
      title: "Liked!",
      description: "Your interest has been noted",
    });
  };

  const handleJoinChainClick = async (requestId: string, creatorId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    console.log('🔗 Feed.tsx: Attempting to join chain for request:', requestId);

    try {
      // Join the chain using the chainsApi
      await createOrJoinChain(requestId, {
        totalReward: 0, // Will be calculated by backend
        role: 'forwarder',
        parentUserId: creatorId // Connect directly to the requestor/creator
      });

      // Award credits for joining
      await apiPost(API_ENDPOINTS.CREDITS_JOIN_CHAIN, {
        chain_id: requestId, // Using request ID since that's what we have
        request_id: requestId
      });

      toast({
        title: "Joined Chain!",
        description: "You earned 2 credits for joining this chain",
      });

      // Refresh the feed to show updated participant count
      fetchFeedData();

    } catch (error: any) {
      console.error('❌ Feed.tsx: Failed to join chain:', error);
      toast({
        title: "Failed to Join Chain",
        description: error.message || "Could not join chain. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Placeholder for fetchFeedData function
  const fetchFeedData = () => {
    // For now, just refresh the page as a fallback
    window.location.reload();
  };

  const handleUnlockChainClick = async (chainId: string, requiredCredits: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    console.log('🔓 Feed.tsx: Mock unlock chain:', chainId, 'credits:', requiredCredits);

    if (credits < requiredCredits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${requiredCredits} credits to unlock this chain. Earn more by joining active chains!`,
        variant: "destructive"
      });
      return;
    }

    // Mock unlock functionality
    const updatedChains = chains.map(chain => {
      if (chain.id === chainId) {
        return { ...chain, canAccess: true };
      }
      return chain;
    });

    setChains(updatedChains);

    toast({
      title: "Chain Unlocked!",
      description: `You can now view the details of this completed chain`,
    });
  };

  // Bid management functions
  const handleCreateBid = () => {
    console.log('➕ Feed.tsx: handleCreateBid called');
    if (!user) {
      console.log('❌ Feed.tsx: No user, redirecting to auth');
      navigate('/auth');
      return;
    }
    console.log('✅ Feed.tsx: User authenticated, showing create bid dialog');
    setShowCreateBid(true);
  };

  const handleSubmitBid = async () => {
    console.log('📝 Feed.tsx: handleSubmitBid called with:', newBid);
    
    if (!newBid.title || !newBid.description || !newBid.connectionType || newBid.price <= 0) {
      console.log('❌ Feed.tsx: Incomplete bid information');
      toast({
        title: "Incomplete Information",
        description: "Please fill in all fields with valid information",
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      console.log('❌ Feed.tsx: No user, redirecting to auth');
      navigate('/auth');
      return;
    }

    console.log('✅ Feed.tsx: User authenticated, proceeding with bid creation');
    try {
      const bidData = {
        title: newBid.title,
        description: newBid.description,
        connectionType: newBid.connectionType,
        price: newBid.price
      };

      console.log('🚀 Feed.tsx: Creating bid:', bidData);
      const response = await apiPost(API_ENDPOINTS.BIDS, bidData);
      console.log('✅ Feed.tsx: Bid created:', response);

      // Transform the response to match our Bid interface
      const newBidFromAPI: Bid = {
        id: response.id,
        creator: {
          id: response.creator.id,
          firstName: response.creator.first_name,
          lastName: response.creator.last_name,
          avatar: response.creator.avatar_url,
          bio: response.creator.bio || 'Professional Network Member'
        },
        title: response.title,
        description: response.description,
        connectionType: response.connection_type,
        price: response.price,
        createdAt: response.created_at,
        isLiked: false,
        likesCount: 0,
        responseCount: 0
      };

      setBids(prev => [newBidFromAPI, ...prev]);
      setNewBid({ title: '', description: '', connectionType: '', price: 0 });
      setShowCreateBid(false);

      toast({
        title: "Bid Created!",
        description: "Your connection bid has been posted"
      });
    } catch (error: any) {
      console.error('❌ Feed.tsx: Error creating bid:', error);
      toast({
        title: "Failed to Create Bid",
        description: error.message || "Could not create bid. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleLikeBid = async (bidId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      console.log('👍 Feed.tsx: Toggling like for bid:', bidId);
      const response = await apiPost(API_ENDPOINTS.BIDS_LIKE(bidId));
      console.log('✅ Feed.tsx: Like response:', response);

      // Update the local state based on the API response
      setBids(prev => prev.map(bid => {
        if (bid.id === bidId) {
          return {
            ...bid,
            isLiked: response.liked,
            likesCount: response.liked ? bid.likesCount + 1 : bid.likesCount - 1
          };
        }
        return bid;
      }));

      toast({
        title: response.liked ? "Liked!" : "Like Removed",
        description: response.liked ? "You liked this bid" : "You removed your like"
      });
    } catch (error: any) {
      console.error('❌ Feed.tsx: Error liking bid:', error);
      toast({
        title: "Failed to Update Like",
        description: error.message || "Could not update like. Please try again.",
        variant: "destructive"
      });
    }
  };

  // Guard list operations
  const activeChains = Array.isArray(chains) ? chains.filter(c => c.status === 'active') : [];
  const completedChains = Array.isArray(chains) ? chains.filter(c => c.status === 'completed') : [];

  console.log('📊 Feed.tsx: Render state:', { 
    loading, 
    error, 
    chainsCount: chains.length, 
    activeCount: activeChains.length, 
    completedCount: completedChains.length,
    user: !!user 
  });

  const ChainCard = ({ chain }: { chain: FeedChain }) => {
    const isCompleted = chain.status === 'completed';
    const needsUnlock = isCompleted && !chain.canAccess;

    console.log('🎴 Feed.tsx: Rendering chain card:', { 
      id: chain.id, 
      creator: chain.creator, 
      isCompleted, 
      needsUnlock 
    });

    return (
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={chain.creator.avatar || undefined} />
                <AvatarFallback>
                  {(chain.creator.firstName?.[0] ?? chain.creator.lastName?.[0] ?? '?')}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {chain.creator.firstName} {chain.creator.lastName}
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {chain.creator.bio}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isCompleted ? "secondary" : "default"}>
                    {isCompleted ? "Completed" : "Active"}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {chain.createdAt ? new Date(chain.createdAt).toLocaleDateString() : ''}
                  </span>
                </div>
              </div>
            </div>

            {needsUnlock && (
              <Lock className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">
            {/* Target Section */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="flex items-start gap-2">
                <Target className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium">Target Connection</h4>
                  <p className="text-sm font-semibold text-foreground mt-1">
                    {needsUnlock ? "Hidden until unlocked" : chain.target}
                  </p>
                  {!needsUnlock && chain.message && (
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                      {chain.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{chain.participantCount} participants</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-medium">${chain.reward}</span>
                </div>
              </div>

              {!isCompleted && chain.expiresAt && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Expires {new Date(chain.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-2">
                {!isCompleted && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleLike(chain.id, chain.id)}
                    className="flex items-center gap-1"
                  >
                    <Heart
                      className={`w-4 h-4 ${chain.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                    />
                    <span>{chain.likesCount}</span>
                  </Button>
                )}

                {isCompleted && needsUnlock && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Coins className="w-4 h-4" />
                    <span>{chain.requiredCredits ?? '—'} credits to unlock</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!isCompleted && (
                  <Button
                    onClick={() => handleJoinChainClick(chain.id, chain.creator.id)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    Join Chain
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/request/${chain.id}`)}
                  className="flex items-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  View Chain
                </Button>

                {isCompleted && needsUnlock && (
                  <Button
                    onClick={() => handleUnlockChainClick(chain.id, chain.requiredCredits ?? 0)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                    disabled={(chain.requiredCredits ?? Infinity) > credits}
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock ({chain.requiredCredits ?? '—'} credits)
                  </Button>
                )}

                {isCompleted && chain.canAccess && (
                  <Button
                    onClick={() => navigate(`/chains/${chain.id}`)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                  >
                    View Details
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    console.log('⏳ Feed.tsx: Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    );
  }

  if (error) {
    console.log('❌ Feed.tsx: Showing error state:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
            className="mr-2"
          >
            Retry
          </Button>
          <Button 
            onClick={() => navigate('/')} 
            variant="default"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Show feed for all users (including guests)
  const isGuest = !user;

  const renderGuestOverlay = (content: React.ReactNode) => {
    if (!isGuest) return content;

    return (
      <div className="relative">
        {content}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <div className="text-center">
            <Lock className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="font-medium">Sign in to view</p>
            <Button
              onClick={() => navigate('/auth')}
              size="sm"
              className="mt-2"
            >
              Join 6Degree
            </Button>
          </div>
        </div>
      </div>
    );
  };

  const BidCard = ({ bid }: { bid: Bid }) => {
    console.log('🎴 Feed.tsx: BidCard rendering:', {
      id: bid.id,
      title: bid.title,
      creator: bid.creator,
      price: bid.price
    });

    return (
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="space-y-3">
            {/* Connection Focus - Title and Type prominently displayed */}
            <div className="space-y-2">
              <h3 className="font-bold text-xl leading-tight">{bid.title}</h3>
              <Badge variant="secondary" className="text-sm font-medium">
                {bid.connectionType}
              </Badge>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">{bid.description}</p>

            {/* Creator info minimized */}
            <div className="flex items-center gap-2 pt-2 border-t">
              <Avatar className="w-6 h-6">
                <AvatarImage src={bid.creator.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {bid.creator.firstName?.[0] || bid.creator.lastName?.[0] || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {bid.creator.firstName} {bid.creator.lastName}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(bid.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-4">

            {/* Price and Stats */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-600">${bid.price}</span>
                </div>
                <div className="flex items-center gap-1">
                  <MessageSquare className="w-4 h-4 text-muted-foreground" />
                  <span>{bid.responseCount} responses</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLikeBid(bid.id)}
                className="flex items-center gap-1"
              >
                <Heart
                  className={`w-4 h-4 ${bid.isLiked ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
                />
                <span>{bid.likesCount}</span>
              </Button>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex items-center gap-1"
                  onClick={() => {
                    if (!user) {
                      navigate('/auth');
                      return;
                    }
                    toast({
                      title: "Feature Coming Soon",
                      description: "Direct messaging will be available soon!"
                    });
                  }}
                >
                  <Send className="w-4 h-4" />
                  Contact
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  console.log('✅ Feed.tsx: Rendering main feed view');
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">6Degree Feed</h1>
            <p className="text-muted-foreground">
              Discover connection opportunities and join chains
            </p>
          </div>

          <div className="flex items-center gap-4">
            {/* Credits Display */}
            <Card className="px-4 py-2">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-yellow-600" />
                <span className="font-semibold">{credits}</span>
                <span className="text-sm text-muted-foreground">credits</span>
              </div>
            </Card>

            {/* Dashboard Button */}
            <Button
              onClick={() => navigate('/dashboard')}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LayoutGrid className="w-4 h-4" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Layout: Sidebar (desktop) + Main */}
        <div className="grid md:grid-cols-[220px_1fr] gap-6">
          {/* Sidebar - Desktop only */}
          <aside className="hidden md:block sticky top-24 self-start">
            <div className="space-y-2">
              <Button
                variant={activeTab === 'bids' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('bids')}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Bids ({bids.length})
              </Button>
              <Button
                variant={activeTab === 'active' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('active')}
              >
                <Users className="w-4 h-4 mr-2" />
                Active ({activeChains.length})
              </Button>
              <Button
                variant={activeTab === 'completed' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('completed')}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete ({completedChains.length})
              </Button>
              <Button
                variant={activeTab === 'connector' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => setActiveTab('connector')}
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                Connector
              </Button>
              {!isGuest && (
                <Button className="w-full justify-start" onClick={handleCreateBid}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bid
                </Button>
              )}
            </div>
          </aside>

          {/* Main content */}
          <main>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
          console.log('🔄 Feed.tsx: Tab change requested:', { from: activeTab, to: value });
          setActiveTab(value as 'active' | 'completed' | 'bids' | 'connector');
        }}>
          {/* Mobile TabsList only */}
          <TabsList className="grid w-full grid-cols-4 max-w-2xl md:hidden">
            <TabsTrigger value="bids" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              Bids ({bids.length})
            </TabsTrigger>
            <TabsTrigger value="active" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Active ({activeChains.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              Complete ({completedChains.length})
            </TabsTrigger>
            <TabsTrigger value="connector" className="flex items-center gap-2">
              <Gamepad2 className="w-4 h-4" />
              Connector
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            {/* Reels-style vertical scroll container - snaps to each card */}
            <div className="max-w-[440px] md:max-w-2xl mx-auto h-[calc(100vh-140px)] md:h-[calc(100vh-200px)] overflow-y-auto snap-y snap-mandatory scrollbar-hide">
              {activeChains.map((chain) =>
                <div key={chain.id} className="snap-start snap-always h-[calc(100vh-140px)] md:h-[calc(100vh-200px)] flex items-stretch justify-center">
                  {isGuest ? renderGuestOverlay(
                    <VideoFeedCard
                      data-request-id={chain.id as any}
                      requestId={chain.id}
                      videoUrl={chain.videoUrl}
                      videoThumbnail={chain.videoThumbnail}
                      creator={chain.creator}
                      target="Hidden"
                      reward={chain.reward}
                      status={chain.status}
                      participantCount={chain.participantCount}
                      shareableLink={chain.shareableLink}
                    />
                  ) : (
                    <VideoFeedCard
                      data-request-id={chain.id as any}
                      requestId={chain.id}
                      videoUrl={chain.videoUrl}
                      videoThumbnail={chain.videoThumbnail}
                      creator={chain.creator}
                      target={chain.target}
                      message={chain.message}
                      reward={chain.reward}
                      status={chain.status}
                      participantCount={chain.participantCount}
                      shareableLink={chain.shareableLink}
                      onJoinChain={() => handleJoinChainClick(chain.id, chain.creator.id)}
                    />
                  )}
                </div>
              )}
            </div>

            {activeChains.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Chains</h3>
                <p className="text-muted-foreground">
                  No active chains available at the moment. Check back later!
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="completed" className="mt-6">
            <div className="max-w-2xl mx-auto space-y-4">
              {completedChains.map((chain) =>
                isGuest ? renderGuestOverlay(<ChainCard key={chain.id} chain={{ ...chain, target: "Hidden", message: undefined }} />) : <ChainCard key={chain.id} chain={chain} />
              )}
            </div>

            {completedChains.length === 0 && (
              <div className="text-center py-12">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Completed Chains</h3>
                <p className="text-muted-foreground">
                  No completed chains to explore yet. Keep participating to unlock them!
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="bids" className="mt-6">
            {(() => {
              console.log('🎯 Feed.tsx: Rendering bids tab content', { 
                activeTab, 
                bidsCount: bids.length, 
                bidsLoading, 
                isGuest,
                bids: bids 
              });
              return null;
            })()}
            <div className="max-w-2xl mx-auto space-y-4">
              {/* Create Bid Button */}
              {!isGuest && (
                <div className="flex justify-end mb-4">
                  <Dialog open={showCreateBid} onOpenChange={setShowCreateBid}>
                    <DialogTrigger asChild>
                      <Button
                        onClick={handleCreateBid}
                        className="flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Create Bid
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create Connection Bid</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="title">Title</Label>
                          <Input
                            id="title"
                            placeholder="e.g., Connect to Tech Executives"
                            value={newBid.title}
                            onChange={(e) => setNewBid(prev => ({ ...prev, title: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="connectionType">Connection Type</Label>
                          <Input
                            id="connectionType"
                            placeholder="e.g., Technology Executives, Startup Founders"
                            value={newBid.connectionType}
                            onChange={(e) => setNewBid(prev => ({ ...prev, connectionType: e.target.value }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="price">Price ($)</Label>
                          <Input
                            id="price"
                            type="number"
                            placeholder="50"
                            value={newBid.price || ''}
                            onChange={(e) => setNewBid(prev => ({ ...prev, price: Number(e.target.value) }))}
                          />
                        </div>
                        <div>
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            placeholder="Describe what connections you're offering and what you're looking for..."
                            value={newBid.description}
                            onChange={(e) => setNewBid(prev => ({ ...prev, description: e.target.value }))}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowCreateBid(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleSubmitBid}
                            className="flex-1"
                          >
                            Post Bid
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              )}

              {/* Bids List */}
              {bidsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-sm text-muted-foreground">Loading bids...</p>
                </div>
              ) : (
                (() => {
                  console.log('🎨 Feed.tsx: Rendering bids list', { 
                    bidsCount: bids.length, 
                    isGuest, 
                    bids: bids.map(b => ({ id: b.id, title: b.title }))
                  });
                  return bids.map((bid) => {
                    console.log('🎴 Feed.tsx: Rendering bid card:', { id: bid.id, title: bid.title });
                    return isGuest ? renderGuestOverlay(<BidCard key={bid.id} bid={bid} />) : <BidCard key={bid.id} bid={bid} />;
                  });
                })()
              )}
            </div>

            {!bidsLoading && bids.length === 0 && (
              <div className="text-center py-12">
                <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Bids Available</h3>
                <p className="text-muted-foreground">
                  Be the first to post a connection bid!
                </p>
                {!isGuest && (
                  <Button
                    onClick={handleCreateBid}
                    className="mt-4 flex items-center gap-2 mx-auto"
                  >
                    <Plus className="w-4 h-4" />
                    Create Your First Bid
                  </Button>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="connector" className="mt-6">
            <div className="max-w-4xl mx-auto">
              <ConnectorGameSimple />
            </div>
          </TabsContent>
        </Tabs>
          </main>
        </div>

        {/* Guest Sign-up CTA */}
        {isGuest && (
          <div className="text-center mt-12 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold mb-4">Join 6Degree to:</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Join Chains</p>
                <p className="text-sm text-muted-foreground">Connect with others and earn rewards</p>
              </div>
              <div className="text-center">
                <DollarSign className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium">Create Bids</p>
                <p className="text-sm text-muted-foreground">Monetize your connections</p>
              </div>
              <div className="text-center">
                <Coins className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="font-medium">Earn Credits</p>
                <p className="text-sm text-muted-foreground">Get credits for helping others connect</p>
              </div>
            </div>
            <div className="flex gap-4 justify-center mt-6">
              <Button
                onClick={() => navigate('/auth')}
                size="lg"
                className="flex items-center gap-2"
              >
                Sign Up Free
              </Button>
              <Button
                onClick={() => navigate('/home')}
                variant="outline"
                size="lg"
                className="flex items-center gap-2"
              >
                Learn More
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden z-50">
          <div className="flex items-center justify-between px-4 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 flex-1"
              onClick={() => setTabPickerOpen(true)}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="text-xs truncate">Sections</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 flex-1"
              onClick={() => navigate('/dashboard')}
            >
              <Navigation className="w-4 h-4" />
              <span className="text-xs truncate">Chains</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 flex-1"
              onClick={() => navigate('/dashboard?tab=wallet')}
            >
              <Wallet className="w-4 h-4" />
              <span className="text-xs truncate">Wallet</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 flex-1"
              onClick={() => navigate('/dashboard?tab=messages')}
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-xs truncate">Messages</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex flex-col items-center gap-0.5 py-2 px-1 min-w-0 flex-1"
              onClick={() => navigate('/profile')}
            >
              <User className="w-4 h-4" />
              <span className="text-xs truncate">Profile</span>
            </Button>
          </div>
        </div>
      )}

      {/* Add padding to prevent content being hidden behind mobile nav */}
      {user && <div className="h-20 md:hidden" />}

      {/* Mobile Tab Picker Sheet */}
      <Dialog open={tabPickerOpen} onOpenChange={setTabPickerOpen}>
        <DialogContent className="sm:max-w-md p-0 pb-4 rounded-t-2xl sm:rounded-lg">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Select section</DialogTitle>
          </DialogHeader>
          <div className="px-4 space-y-2">
            <Button variant={activeTab === 'bids' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('bids'); setTabPickerOpen(false); }}>
              <DollarSign className="w-4 h-4 mr-2" /> Bids ({bids.length})
            </Button>
            <Button variant={activeTab === 'active' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('active'); setTabPickerOpen(false); }}>
              <Users className="w-4 h-4 mr-2" /> Active ({activeChains.length})
            </Button>
            <Button variant={activeTab === 'completed' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('completed'); setTabPickerOpen(false); }}>
              <CheckCircle className="w-4 h-4 mr-2" /> Complete ({completedChains.length})
            </Button>
            <Button variant={activeTab === 'connector' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('connector'); setTabPickerOpen(false); }}>
              <Gamepad2 className="w-4 h-4 mr-2" /> Connector
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Feed;