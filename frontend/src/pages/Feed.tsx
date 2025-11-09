import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
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
import { formatOfferPrice } from '@/lib/currency';
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
  Gamepad2,
  Menu,
  X,
  Phone,
  Crown
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { createOrJoinChain } from '@/lib/chainsApi';
import { ConnectorGameSimple } from '@/components/ConnectorGameSimple';
import { VideoFeedCard } from '@/components/VideoFeedCard';
import { ConsultationCallTester } from '@/components/ConsultationCallTester';
import { useOffers } from '@/hooks/useOffers';
import type { Offer } from '@/hooks/useOffers';
import BidModal from '@/components/BidModal';
import OfferDetailsModal from '@/components/OfferDetailsModal';
import { BidOnRequestModal } from '@/components/BidOnRequestModal';
import { SocialShareModal } from '@/components/SocialShareModal';
import { MafiaCard } from '@/components/MafiaCard';
import { useMafias, type Mafia } from '@/hooks/useMafias';
import { JoinMafiaModal } from '@/components/JoinMafiaModal';

interface FeedRequest {
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
  currency?: string;
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
  targetOrganization?: string;
  targetOrganizationLogo?: string;
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

function normalizeFeed(raw: AnyObj): FeedRequest[] {
  console.log('🔧 normalizeFeed: Raw API response:', raw);
  
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  console.log('🔧 normalizeFeed: Extracted array:', arr);
  
  return arr.map((r: AnyObj, index: number): FeedRequest => {
    console.log(`🔧 normalizeFeed: Processing item ${index}:`, r);
    
    const normalized = {
      id: r.id ?? r.requestId ?? crypto.randomUUID(),
      creator: {
        id: r.creator?.id ?? '',
        firstName: r.creator?.firstName ?? r.creator?.first_name ?? '',
        lastName:  r.creator?.lastName  ?? r.creator?.last_name  ?? '',
        avatar:    r.creator?.avatar    ?? r.creator?.profile_picture_url ?? undefined,
        bio:       r.creator?.bio ?? ''
      },
      target: r.target ?? '',
      message: r.message ?? '',
      reward: Number(r.reward ?? 0),
      currency: r.currency ?? 'INR',
      status: (r.status === 'completed' ? 'completed' : 'active') as 'active' | 'completed',
      participantCount: Number(r.participantCount ?? r.participants?.length ?? 0),
      createdAt: r.createdAt ?? r.created_at ?? new Date().toISOString(),
      expiresAt: r.expiresAt ?? r.expires_at ?? new Date(Date.now() + 30*864e5).toISOString(),
      isLiked: Boolean(r.isLiked ?? false),
      likesCount: Number(r.likesCount ?? 0),
      canAccess: Boolean(r.canAccess ?? (r.status !== 'completed')),
      requiredCredits: (r.status === 'completed' ? (r.requiredCredits ?? undefined) : undefined),
      videoUrl: r.videoUrl ?? r.video_url ?? undefined,
      videoThumbnail: (() => {
        // Get the raw thumbnail value
        const thumb = r.videoThumbnail ?? r.video_thumbnail ?? r.video_thumbnail_url;
        // If it's a video file, ignore it (don't use video URL as thumbnail)
        if (thumb && /\.(mp4|webm|mov|avi|mkv)$/i.test(thumb)) {
          return undefined;
        }
        return thumb ?? undefined;
      })(),
      shareableLink: r.shareableLink ?? r.shareable_link ?? undefined,
      targetOrganization: r.targetOrganization ?? r.target_organization ?? r.organization?.name ?? undefined,
      targetOrganizationLogo: r.targetOrganizationLogo ?? r.target_organization_logo ?? r.organization?.logo_url ?? undefined,
    };
    
    console.log(`🔧 normalizeFeed: Normalized item ${index}:`, normalized);
    return normalized;
  });
}

const Feed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { userCurrency } = useCurrency();
  const { toast } = useToast();

  // REAL STATE - Using real API for feed data
  const [activeTab, setActiveTab] = useState<'requests' | 'bids' | 'mafias' | 'connector' | 'consultation'>('bids');
  const [requests, setRequests] = useState<FeedRequest[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const { getOffers, bidOnOffer } = useOffers();
  const { getAllMafias } = useMafias();
  const [mafias, setMafias] = useState<Mafia[]>([]);
  const [mafiasLoading, setMafiasLoading] = useState(false);
  const [selectedMafiaForJoin, setSelectedMafiaForJoin] = useState<Mafia | null>(null);
  const [showJoinMafiaModal, setShowJoinMafiaModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credits] = useState(25); // Still mock credits for now
  const [showCreateBid, setShowCreateBid] = useState(false);
  const [newBid, setNewBid] = useState({
    title: '',
    description: '',
    connectionType: '',
    price: 0
  });
  
  // Bid modal state (for offers)
  const [showBidModal, setShowBidModal] = useState(false);
  const [selectedOfferForBid, setSelectedOfferForBid] = useState<Offer | null>(null);
  const [placingBid, setPlacingBid] = useState(false);
  
  // Bid modal state (for requests)
  const [showRequestBidModal, setShowRequestBidModal] = useState(false);
  const [selectedRequestForBid, setSelectedRequestForBid] = useState<FeedRequest | null>(null);
  
  // Social share modal state (after referring)
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ link: string; target: string } | null>(null);
  
  // Offer details modal state
  const [showOfferDetailsModal, setShowOfferDetailsModal] = useState(false);
  const [selectedOfferForDetails, setSelectedOfferForDetails] = useState<Offer | null>(null);

  // Mobile tab picker sheet
  const [tabPickerOpen, setTabPickerOpen] = useState(false);

  // Sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inCallMode, setInCallMode] = useState(false);

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
  }, [location.search, requests.length]);

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
            avatar: bid.creator.profile_picture_url,
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

        const normalizedRequests = normalizeFeed(resp);
        console.log('✅ Feed.tsx: Normalized requests:', normalizedRequests);

        setRequests(normalizedRequests);
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

        setRequests([]);
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

  // Load offers count on mount for sidebar display
  useEffect(() => {
    loadMarketplaceOffers();
  }, []);

  // Fetch offers data when bids tab is active (PayNet marketplace)
  useEffect(() => {
    console.log('🔄 Feed.tsx: useEffect for activeTab change:', { activeTab, timestamp: new Date().toISOString() });
    if (activeTab === 'bids') {
      console.log('🎯 Feed.tsx: Active tab is bids, loading marketplace offers');
      loadMarketplaceOffers();
    } else if (activeTab === 'mafias') {
      console.log('🎯 Feed.tsx: Active tab is mafias, loading mafias');
      loadMafias();
    } else {
      console.log('📋 Feed.tsx: Active tab is not bids/mafias, skipping fetch');
    }
  }, [activeTab]);

  // Load marketplace offers (active offers only)
  const loadMarketplaceOffers = async () => {
    setOffersLoading(true);
    try {
      const data = await getOffers({ status: 'active', limit: 50 });
      setOffers(data || []);
    } catch (error) {
      console.error('Error loading marketplace offers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load marketplace offers',
        variant: 'destructive'
      });
    } finally {
      setOffersLoading(false);
    }
  };

  // Load mafias
  const loadMafias = async () => {
    setMafiasLoading(true);
    try {
      const data = await getAllMafias();
      setMafias(data || []);
    } catch (error) {
      console.error('Error loading mafias:', error);
      toast({
        title: 'Error',
        description: 'Failed to load mafias',
        variant: 'destructive'
      });
    } finally {
      setMafiasLoading(false);
    }
  };

  const handleViewMafiaDetails = (mafiaId: string) => {
    navigate(`/mafias/${mafiaId}`);
  };

  const handleJoinMafia = (mafiaId: string) => {
    const mafia = mafias.find((m) => m.id === mafiaId);
    if (mafia) {
      setSelectedMafiaForJoin(mafia);
      setShowJoinMafiaModal(true);
    }
  };

  // MOCK FUNCTIONS - Still using mock for now
  const handleLike = async (chainId: string, requestId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    console.log('👍 Feed.tsx: Mock like for chain:', chainId);

    // Mock like functionality
    const updatedRequests = requests.map(request => {
      if (request.id === chainId) {
        const newLiked = !request.isLiked;
        return {
          ...request,
          isLiked: newLiked,
          likesCount: newLiked ? request.likesCount + 1 : request.likesCount - 1
        };
      }
      return request;
    });

    setRequests(updatedRequests);

    toast({
      title: "Liked!",
      description: "Your interest has been noted",
    });
  };

  const handleJoinRequestClick = async (requestId: string, creatorId: string, targetName?: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    console.log('🔗 Feed.tsx: Attempting to join chain for request:', requestId);

    try {
      // Try to join the chain using the chainsApi
      const chainData = await createOrJoinChain(requestId, {
        totalReward: 0, // Will be calculated by backend
        role: 'forwarder',
        parentUserId: creatorId // Connect directly to the requestor/creator
      });

      console.log('✅ Feed.tsx: Successfully joined chain:', chainData.id);

      // Award credits for joining
      await apiPost(API_ENDPOINTS.CREDITS_JOIN_CHAIN, {
        chain_id: chainData.id, // ✅ Use the actual chain ID, not request ID
        request_id: requestId,
        creator_id: creatorId // Backend requires this field
      });

      // Find the user's shareable link from the chain participants
      const userParticipant = chainData.participants?.find((p: any) => p.userid === user.id);
      const userShareableLink = userParticipant?.shareableLink;

      toast({
        title: "You're Now Part of This Request! 🎉",
        description: "Share your link with your network to help make this connection!",
      });

      // Show social share modal with user's personal link
      if (userShareableLink) {
        setShareModalData({
          link: userShareableLink,
          target: targetName || 'this connection'
        });
        setShowShareModal(true);
      }

      // Refresh the feed to show updated participant count
      fetchFeedData();

    } catch (error: any) {
      console.error('❌ Feed.tsx: Error with chain:', error);
      
      // If user is already part of the chain, just show them the share modal
      if (error.message?.includes('already part of this chain')) {
        console.log('User already in chain, fetching their link...');
        
        try {
          // Fetch the existing chain to get user's link
          const { data: chainData, error: chainError } = await supabase
            .from('chains')
            .select('*')
            .eq('request_id', requestId)
            .single();

          if (chainError) throw chainError;

          // Find the user's shareable link from the chain participants
          const participants = (chainData?.participants as any[]) || [];
          const userParticipant = participants.find((p: any) => p.userid === user.id);
          const userShareableLink = userParticipant?.shareableLink;

          if (userShareableLink) {
      toast({
              title: "Share Your Referral Link! 📤",
              description: "You're already part of this request. Share your link to grow the network!",
            });

            setShareModalData({
              link: userShareableLink,
              target: targetName || 'this connection'
            });
            setShowShareModal(true);
          } else {
            toast({
              title: "Already Joined",
              description: "You're already part of this request.",
            });
          }
        } catch (fetchError) {
          console.error('Failed to fetch chain data:', fetchError);
          toast({
            title: "Already Joined",
            description: "You're already part of this request.",
          });
        }
      } else {
        // Show error for other types of errors
        toast({
          title: "Failed to Join Request",
          description: error.message || "Could not join request. Please try again.",
        variant: "destructive"
      });
      }
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
    const updatedRequests = requests.map(request => {
      if (request.id === chainId) {
        return { ...request, canAccess: true };
      }
      return request;
    });

    setRequests(updatedRequests);

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
          avatar: response.creator.profile_picture_url,
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
  const activeRequests = Array.isArray(requests) ? requests.filter(c => c.status === 'active') : [];
  const completedRequests = Array.isArray(requests) ? requests.filter(c => c.status === 'completed') : [];

  console.log('📊 Feed.tsx: Render state:', { 
    loading, 
    error, 
    requestsCount: requests.length, 
    activeCount: activeRequests.length, 
    completedCount: completedRequests.length,
    user: !!user 
  });

  // UNUSED: RequestCard component deleted - replaced with inline grid cards in requests tab

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

  // Show feed for all users (including guests) - NO OVERLAYS
  const isGuest = !user;

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
      {/* Logo Button to Toggle Sidebar - Mobile & Desktop */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="fixed top-4 left-4 z-50 bg-primary text-primary-foreground p-2 rounded-full shadow-lg hover:scale-110 transition-transform"
        aria-label="Toggle menu"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
          <rect width="32" height="32" rx="6" fill="currentColor"/>
          <text x="16" y="22" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" textAnchor="middle" fill="white">6°</text>
        </svg>
      </button>

      {/* Profile Button - Top Right */}
      <button
        onClick={() => navigate(user ? '/profile' : '/auth')}
        className="fixed top-4 right-4 z-50 bg-background border-2 border-primary hover:bg-primary/10 p-2 rounded-full shadow-lg hover:scale-110 transition-all"
        aria-label="Profile"
      >
        {user ? (
          <Avatar className="w-8 h-8">
            <AvatarImage src={user.avatar || undefined} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user.firstName?.[0] || user.lastName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
            </AvatarFallback>
          </Avatar>
        ) : (
          <User className="w-8 h-8 text-primary" />
        )}
      </button>

      <div className="container mx-auto px-4 py-6">
        {/* Mobile Sidebar Overlay - shows when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Layout: Sidebar (desktop/toggleable) + Main */}
        <div className={`grid ${inCallMode ? 'md:grid-cols-1' : 'md:grid-cols-[220px_1fr]'} gap-6`}>
          {/* Sidebar - Slide-in on mobile, always visible on desktop (unless hidden in call mode) */}
          <aside className={`fixed md:sticky top-0 left-0 h-full w-64 bg-background z-50 md:z-auto transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} ${!inCallMode ? 'md:translate-x-0' : ''} md:top-6 md:self-start md:w-auto shadow-lg md:shadow-none`}>
            <div className="p-4 md:p-0 space-y-2">
              {/* Dashboard Link */}
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  navigate('/dashboard');
                  setSidebarOpen(false);
                }}
              >
                <LayoutGrid className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
              
              {/* Divider */}
              <div className="border-t my-2"></div>
              
              <Button
                variant={activeTab === 'bids' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('bids');
                  setSidebarOpen(false);
                }}
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Offers ({offers.length})
              </Button>
              <Button
                variant={activeTab === 'requests' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('requests');
                  setSidebarOpen(false);
                }}
              >
                <Target className="w-4 h-4 mr-2" />
                Requests ({activeRequests.length})
              </Button>
              <Button
                variant={activeTab === 'mafias' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('mafias');
                  setSidebarOpen(false);
                }}
              >
                <Crown className="w-4 h-4 mr-2" />
                Mafias ({mafias.length})
              </Button>
              <Button
                variant={activeTab === 'connector' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('connector');
                  setSidebarOpen(false);
                }}
              >
                <Gamepad2 className="w-4 h-4 mr-2" />
                Connector
              </Button>
              <Button
                variant={activeTab === 'consultation' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('consultation');
                  setSidebarOpen(false);
                }}
              >
                <Phone className="w-4 h-4 mr-2" />
                AI Co-Pilot Test
              </Button>
            </div>
          </aside>

          {/* Main content */}
          <main>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
          console.log('🔄 Feed.tsx: Tab change requested:', { from: activeTab, to: value });
          setActiveTab(value as 'requests' | 'bids' | 'mafias' | 'connector' | 'consultation');
        }}>

          <TabsContent value="requests" className="mt-6">
            <div className="max-w-5xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Connection Requests</h2>
                <p className="text-muted-foreground">Help connect people to professionals and earn rewards</p>
              </div>

              {/* Requests Grid */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading requests...</p>
                </div>
              ) : activeRequests.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {activeRequests.map((request) => (
                    <Card 
                      key={request.id} 
                      className="hover:shadow-lg transition-shadow overflow-hidden border-indigo-500/10 hover:border-indigo-500/30 transition-colors"
                    >
                      <CardContent className="p-0 space-y-0">
                        {/* Organization Logo with Indigo Gradient Background */}
                        <div className="relative w-full h-48 md:h-56 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/8 via-background to-blue-500/12 overflow-hidden">
                          {/* Ambient glow */}
                          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/15 via-transparent to-blue-600/10"></div>
                          
                          {/* Organization Name */}
                          {request.targetOrganization && (
                            <h3 className="relative z-20 text-lg md:text-xl font-bold text-foreground mb-3 text-center px-4">
                              {request.targetOrganization}
                            </h3>
                          )}
                          
                          {/* Glass card for logo */}
                          <div className="relative backdrop-blur-sm bg-white/60 dark:bg-slate-900/60 p-5 md:p-6 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 max-w-[75%] flex items-center justify-center">
                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-40 rounded-2xl"></div>
                            
                            {request.targetOrganizationLogo ? (
                              <img
                                src={request.targetOrganizationLogo}
                                alt={request.targetOrganization || 'Organization'}
                                className="relative z-10 max-w-full h-20 md:h-24 object-contain"
                                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                                }}
                              />
                            ) : (
                              <Target className="w-16 h-16 text-indigo-500" />
                            )}
                </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-4 md:p-5 space-y-3">
                          {/* Target Description */}
                          <div>
                            <p className="font-semibold text-sm mb-1">Looking for:</p>
                            <p className="text-sm line-clamp-2 leading-relaxed">{request.target}</p>
                          </div>

                          {/* Message */}
                          {request.message && (
                            <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{request.message}</p>
                          )}

                          {/* Stats */}
                          <div className="flex items-center justify-between pt-3 border-t mt-3">
                            <div className="flex items-center gap-2.5 text-xs md:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                <span>{request.participantCount || 0}</span>
                              </div>
                            </div>
                            <div className="text-indigo-600 dark:text-indigo-400 font-bold text-base md:text-lg">
                              ₹{request.reward.toLocaleString()}
                            </div>
            </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 pt-3">
                            <Button
                              variant="outline"
                              className="flex-1 border-indigo-500/30 hover:bg-indigo-500/10 hover:border-indigo-500/50 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!user) {
                                  navigate('/auth');
                                  return;
                                }
                                handleJoinRequestClick(request.id, request.creator.id, request.target);
                              }}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              Refer
                            </Button>
                            <Button
                              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!user) {
                                  navigate('/auth');
                                  return;
                                }
                                setSelectedRequestForBid(request);
                                setShowRequestBidModal(true);
                              }}
                            >
                              <DollarSign className="w-4 h-4 mr-2" />
                              Bid
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
              <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Requests Available</h3>
                <p className="text-muted-foreground">
                    No connection requests at the moment. Check back later!
                </p>
              </div>
            )}
            </div>
          </TabsContent>

          <TabsContent value="bids" className="mt-6">
            <div className="max-w-5xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Offers</h2>
                <p className="text-muted-foreground">Browse approved connection offers and bid for intro sessions</p>
              </div>

              {/* Offers Grid */}
              {offersLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading offers...</p>
                </div>
              ) : offers.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {offers.map((offer) => (
                    <Card 
                      key={offer.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedOfferForDetails(offer);
                        setShowOfferDetailsModal(true);
                      }}
                    >
                      <CardContent className="p-0 space-y-0">
                        {/* Target Organization Logo - Large at Top with Glass Effect */}
                        {offer.target_logo_url ? (
                          <div className="relative w-full h-48 md:h-56 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
                            {/* Ambient glow */}
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
                            
                            {/* Company Name */}
                            {offer.target_organization && (
                              <h3 className="relative z-20 text-lg md:text-xl font-bold text-foreground mb-3 text-center px-4">
                                {offer.target_organization}
                              </h3>
                            )}
                            
                            {/* Glass card for logo */}
                            <div className="relative backdrop-blur-sm bg-white/60 dark:bg-slate-900/60 p-5 md:p-6 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 max-w-[75%] flex items-center justify-center">
                              {/* Shine effect */}
                              <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-40 rounded-2xl"></div>
                              
                              <img
                                src={offer.target_logo_url}
                                alt={offer.target_organization || 'Organization'}
                                className="relative z-10 max-w-full h-20 md:h-24 object-contain"
                                style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </div>
                          </div>
                        ) : (offer as any).offer_photo_url ? (
                          <div className="relative w-full h-40 md:h-48 overflow-hidden bg-muted">
                            <img
                              src={(offer as any).offer_photo_url}
                              alt="Offer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="relative w-full h-40 md:h-48 flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
                            <div className="text-center text-muted-foreground">
                              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                              <p className="text-xs">Connection Offer</p>
                            </div>
                          </div>
                        )}

                        {/* Content Section */}
                        <div className="p-4 md:p-5 space-y-3">
                          {/* Connection Info - Position and Organization */}
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-9 w-9 flex-shrink-0 ring-2 ring-primary/10">
                            <AvatarImage src={offer.connection?.avatar_url} />
                              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-xs">
                                {offer.target_position?.[0] || offer.target_organization?.[0] || '?'}
                              </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            {/* Show position instead of name (privacy) */}
                            {offer.target_position ? (
                                <p className="font-semibold text-sm truncate">{offer.target_position}</p>
                            ) : (
                                <p className="font-semibold text-sm truncate text-muted-foreground">Professional Connection</p>
                            )}
                            {offer.target_organization && (
                              <p className="text-xs text-muted-foreground truncate">{offer.target_organization}</p>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                          <p className="text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed">{offer.description}</p>

                        {/* Additional Organization Logos */}
                        {(offer as any).additional_org_logos && Array.isArray((offer as any).additional_org_logos) && (offer as any).additional_org_logos.length > 0 && (
                          <div className="flex flex-col gap-2">
                            <p className="text-xs text-muted-foreground font-medium">Also connects to:</p>
                              <div className="flex flex-wrap gap-1.5">
                              {(offer as any).additional_org_logos.map((org: { name: string; logo_url: string }, index: number) => (
                                  <div key={index} className="flex items-center gap-1.5 px-2 py-1.5 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm">
                                  {org.logo_url && (
                                    <img
                                      src={org.logo_url}
                                      alt={org.name}
                                        className="w-6 h-6 object-contain rounded"
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  )}
                                  <span className="text-xs font-medium">{org.name}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Stats */}
                          <div className="flex items-center justify-between pt-3 border-t mt-3">
                            <div className="flex items-center gap-2.5 text-xs md:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5" />
                            <span>{offer.likes_count || 0}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                            <span>{offer.bids_count || 0}</span>
                          </div>
                            </div>
                            <div className="text-primary font-bold text-base md:text-lg">
                            {formatOfferPrice(offer, userCurrency)}
                          </div>
                        </div>

                        {/* Action Buttons */}
                          <div className="flex gap-2 pt-3">
                          <Button
                            className="flex-1"
                            onClick={async (e) => {
                              e.stopPropagation(); // Prevent card click
                              if (!user) {
                                navigate('/auth');
                                return;
                              }
                              try {
                                await apiPost(`/api/offers/${offer.id}/request-call`, {});
                                toast({
                                  title: 'Request Sent!',
                                  description: 'Check your Messages tab for approval from the creator.'
                                });
                              } catch (error: any) {
                                toast({
                                  variant: 'destructive',
                                  title: 'Error',
                                  description: error.message || 'Failed to send call request'
                                });
                              }
                            }}
                          >
                            <Phone className="h-4 w-4 mr-2" />
                            Book a Call
                          </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent card click
                            if (!user) {
                              navigate('/auth');
                              return;
                            }
                            setSelectedOfferForBid(offer);
                            setShowBidModal(true);
                          }}
                        >
                          <DollarSign className="h-4 w-4 mr-2" />
                          Place Bid
                        </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Offers Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Check back soon! Approved offers will appear here.
                  </p>
                  {!isGuest && (
                    <Button onClick={() => navigate('/dashboard?tab=offers')}>
                      Create an Offer
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="mafias" className="mt-6">
            <div className="max-w-5xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Mafias</h2>
                <p className="text-muted-foreground">Exclusive subscription-based professional communities</p>
              </div>

              {/* Mafias Grid */}
              {mafiasLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading mafias...</p>
                </div>
              ) : mafias.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {mafias.map((mafia) => (
                    <MafiaCard
                      key={mafia.id}
                      mafia={mafia}
                      onViewDetails={handleViewMafiaDetails}
                      onJoin={user ? handleJoinMafia : undefined}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Crown className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No Mafias Available</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to create an exclusive professional community!
                  </p>
                  {user && (
                    <Button onClick={() => navigate('/dashboard?tab=mafias')}>
                      <Crown className="w-4 h-4 mr-2" />
                      Create a Mafia
                    </Button>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="connector" className="mt-6">
            <div className="max-w-4xl mx-auto">
              <ConnectorGameSimple />
            </div>
          </TabsContent>

          <TabsContent value="consultation" className="mt-6">
            <div className="max-w-4xl mx-auto">
              <ConsultationCallTester onCallStateChange={setInCallMode} />
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
                <p className="font-medium">Create Offers</p>
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


      {/* Mobile Tab Picker Sheet */}
      <Dialog open={tabPickerOpen} onOpenChange={setTabPickerOpen}>
        <DialogContent className="sm:max-w-md p-0 pb-4 rounded-t-2xl sm:rounded-lg">
          <DialogHeader className="px-4 pt-4 pb-2">
            <DialogTitle>Select section</DialogTitle>
          </DialogHeader>
          <div className="px-4 space-y-2">
            <Button variant={activeTab === 'bids' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('bids'); setTabPickerOpen(false); }}>
              <DollarSign className="w-4 h-4 mr-2" /> Offers ({offers.length})
            </Button>
            <Button variant={activeTab === 'requests' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('requests'); setTabPickerOpen(false); }}>
              <Target className="w-4 h-4 mr-2" /> Requests ({activeRequests.length})
            </Button>
            <Button variant={activeTab === 'mafias' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('mafias'); setTabPickerOpen(false); }}>
              <Crown className="w-4 h-4 mr-2" /> Mafias ({mafias.length})
            </Button>
            <Button variant={activeTab === 'connector' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('connector'); setTabPickerOpen(false); }}>
              <Gamepad2 className="w-4 h-4 mr-2" /> Connector
            </Button>
            <Button variant={activeTab === 'consultation' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('consultation'); setTabPickerOpen(false); }}>
              <Phone className="w-4 h-4 mr-2" /> AI Co-Pilot Test
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Offer Details Modal */}
      {selectedOfferForDetails && (
        <OfferDetailsModal
          isOpen={showOfferDetailsModal}
          onClose={() => {
            setShowOfferDetailsModal(false);
            setSelectedOfferForDetails(null);
          }}
          offer={{
            id: selectedOfferForDetails.id,
            title: selectedOfferForDetails.title,
            description: selectedOfferForDetails.description || '',
            target_position: selectedOfferForDetails.target_position,
            target_organization: selectedOfferForDetails.target_organization,
            target_logo_url: selectedOfferForDetails.target_logo_url,
            asking_price_inr: selectedOfferForDetails.asking_price_inr,
            asking_price_eur: (selectedOfferForDetails.asking_price_eur ?? 0),
            currency: selectedOfferForDetails.currency,
            likes_count: (selectedOfferForDetails as any).likes_count || 0,
            bids_count: (selectedOfferForDetails as any).bids_count || 0,
            use_cases: (selectedOfferForDetails as any).use_cases || [],
            additional_org_logos: (selectedOfferForDetails as any).additional_org_logos || []
          }}
        />
      )}

      {/* Bid Modal */}
      {selectedOfferForBid && (
        <BidModal
          isOpen={showBidModal}
          onClose={() => {
            setShowBidModal(false);
            setSelectedOfferForBid(null);
          }}
          offer={{
            id: selectedOfferForBid.id,
            title: selectedOfferForBid.title,
            asking_price_inr: selectedOfferForBid.asking_price_inr,
            asking_price_eur: selectedOfferForBid.asking_price_eur ?? 0
          }}
          loading={placingBid}
          onSubmit={async (bidData) => {
            setPlacingBid(true);
            try {
              await apiPost(`/api/offers/${selectedOfferForBid.id}/bids`, bidData);
              toast({
                title: 'Bid Placed!',
                description: 'The creator will review your bid in their Messages tab.'
              });
              setShowBidModal(false);
              setSelectedOfferForBid(null);
            } catch (error: any) {
              toast({
                variant: 'destructive',
                title: 'Error',
                description: error.message || 'Failed to place bid'
              });
              throw error;
            } finally {
              setPlacingBid(false);
            }
          }}
        />
      )}

      {/* Bid on Request Modal */}
      {selectedRequestForBid && (
        <BidOnRequestModal
          isOpen={showRequestBidModal}
          onClose={() => {
            setShowRequestBidModal(false);
            setSelectedRequestForBid(null);
          }}
          request={{
            id: selectedRequestForBid.id,
            target: selectedRequestForBid.target,
            targetOrganization: selectedRequestForBid.targetOrganization,
            targetOrganizationLogo: selectedRequestForBid.targetOrganizationLogo,
            reward: selectedRequestForBid.reward,
            currency: selectedRequestForBid.currency,
            creator: selectedRequestForBid.creator
          }}
        />
      )}

      {/* Social Share Modal (after joining/referring) */}
      {shareModalData && (
        <SocialShareModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShareModalData(null);
          }}
          shareableLink={shareModalData.link}
          targetName={shareModalData.target}
        />
      )}

      {/* Join Mafia Modal */}
      <JoinMafiaModal
        isOpen={showJoinMafiaModal}
        onClose={() => {
          setShowJoinMafiaModal(false);
          setSelectedMafiaForJoin(null);
        }}
        mafia={selectedMafiaForJoin}
        onSuccess={() => {
          loadMafias();
        }}
      />
    </div>
  );
};

export default Feed;