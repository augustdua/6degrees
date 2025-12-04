import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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
  RefreshCw,
  Newspaper,
  ExternalLink,
  Gift,
  Sparkles,
  Trophy
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { createOrJoinChain } from '@/lib/chainsApi';
import { ConnectorGameSimple } from '@/components/ConnectorGameSimple';
import { VideoFeedCard } from '@/components/VideoFeedCard';
import { ConsultationCallTester } from '@/components/ConsultationCallTester';
import SocialCapitalLeaderboard from '@/components/SocialCapitalLeaderboard';
import { SocialCapitalScore } from '@/components/SocialCapitalScore';
import ForYouOffers from '@/components/ForYouOffers';
import { useOffers } from '@/hooks/useOffers';
import type { Offer } from '@/hooks/useOffers';
import BidModal from '@/components/BidModal';
import OfferDetailsModal from '@/components/OfferDetailsModal';
import { BidOnRequestModal } from '@/components/BidOnRequestModal';
import { SocialShareModal } from '@/components/SocialShareModal';
import { usePeople } from '@/hooks/usePeople';
import { useNews, NewsArticle } from '@/hooks/useNews';
import { NewsModal } from '@/components/NewsModal';
import { AnimatedKeywordBanner } from '@/components/AnimatedKeywordBanner';
import { TagSearchBar } from '@/components/TagSearchBar';
import { OfferCard } from '@/components/OfferCard';
import { RequestDetailsModal } from '@/components/RequestDetailsModal';
import { CategorySection } from '@/components/CategorySection';
import { PerksTab } from '@/components/PerksTab';
import { SwipePeopleView } from '@/components/SwipePeopleView';
import { useTags } from '@/hooks/useTags';
import { getCloudinaryLogoUrl, getCloudinaryLogoUrlPremium } from '@/utils/cloudinary';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Footer } from '@/components/Footer';

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
  tags?: string[];
  is_demo?: boolean;
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
  // console.log('🔧 normalizeFeed: Raw API response:', raw);
  
  const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
  // console.log('🔧 normalizeFeed: Extracted array:', arr);
  
  return arr.map((r: AnyObj, index: number): FeedRequest => {
    // console.log(`🔧 normalizeFeed: Processing item ${index}:`, r);
    
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
      tags: (() => {
        const tags = r.tags;
        if (typeof tags === 'string') {
          try {
            return JSON.parse(tags);
          } catch {
            return [];
          }
        }
        return Array.isArray(tags) ? tags : [];
      })(),
      is_demo: Boolean(r.is_demo ?? false),
    };
    
    // console.log(`🔧 normalizeFeed: Normalized item ${index}:`, normalized);
    return normalized;
  });
}

// Helper to get logo from logo.dev with proper formatting
const getLogoDevUrl = (companyName: string | null | undefined) => {
  if (!companyName) return null;
  // Extract domain-like name from company name (e.g., "Uber" -> "uber")
  const cleanName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://img.logo.dev/${cleanName}.com?token=pk_dvr547hlTjGTLwg7G9xcbQ&format=png`;
};

// Helper to detect if URL is SVG
const isSvgUrl = (url: string | null | undefined): boolean => {
  if (!url) return false;
  return url.endsWith('.svg') || url.includes('format=svg') || url.includes('.svg?');
};

// Remove.bg API key for background removal
const REMOVE_BG_API_KEY = 'FRZxhH7Z6kR9doaGbiM5uN8D';
const LOGO_CACHE_PREFIX = '6d_logo_';

// Get cached processed logo from localStorage
const getCachedLogo = (companyName: string): string | null => {
  try {
    const key = LOGO_CACHE_PREFIX + companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// Cache processed logo to localStorage
const setCachedLogo = (companyName: string, dataUrl: string): void => {
  try {
    const key = LOGO_CACHE_PREFIX + companyName.toLowerCase().replace(/[^a-z0-9]/g, '');
    localStorage.setItem(key, dataUrl);
  } catch (e) {
    console.warn('Failed to cache logo:', e);
  }
};

// Process logo with remove.bg API (removes background)
const processLogoWithRemoveBg = async (imageUrl: string, companyName: string): Promise<string | null> => {
  // Check cache first
  const cached = getCachedLogo(companyName);
  if (cached) {
    return cached;
  }

  try {
    const formData = new FormData();
    formData.append('image_url', imageUrl);
    formData.append('size', 'auto');
    formData.append('format', 'png');

    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: {
        'X-Api-Key': REMOVE_BG_API_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      console.warn('remove.bg API error:', response.status);
      return null;
    }

    const blob = await response.blob();
    
    // Convert blob to base64 data URL
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        // Cache the result
        setCachedLogo(companyName, dataUrl);
        resolve(dataUrl);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.warn('Failed to process logo:', e);
    return null;
  }
};

// ProcessedLogo component - handles background removal and caching
interface ProcessedLogoProps {
  companyName: string;
  fallbackUrl?: string;
  className?: string;
  alt?: string;
}

const ProcessedLogo: React.FC<ProcessedLogoProps> = ({ companyName, fallbackUrl, className = '', alt }) => {
  const [logoSrc, setLogoSrc] = useState<string | null>(null);
  const [originalLogoUrl, setOriginalLogoUrl] = useState<string | null>(null); // For hover state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false); // true = transparent bg, use invert; false = fallback to grayscale
  const [isHovered, setIsHovered] = useState(false); // Track hover state

  useEffect(() => {
    if (!companyName) {
      setError(true);
      return;
    }

    // Get the original logo URL for hover state
    const logoDevUrl = getLogoDevUrl(companyName);
    setOriginalLogoUrl(logoDevUrl);

    // Check cache first (synchronous)
    const cached = getCachedLogo(companyName);
    if (cached) {
      setLogoSrc(cached);
      setIsProcessed(true); // Cached logos are already processed
      return;
    }

    if (!logoDevUrl) {
      setError(true);
      return;
    }

    setIsProcessing(true);
    processLogoWithRemoveBg(logoDevUrl, companyName)
      .then((processedUrl) => {
        if (processedUrl) {
          setLogoSrc(processedUrl);
          setIsProcessed(true); // Background removed successfully
        } else {
          // API failed - fallback to original with grayscale
          setLogoSrc(logoDevUrl);
          setIsProcessed(false);
        }
        setIsProcessing(false);
      })
      .catch(() => {
        // API error - fallback to grayscale
        setLogoSrc(logoDevUrl);
        setIsProcessed(false);
        setIsProcessing(false);
      });
  }, [companyName]);

  if (error && !fallbackUrl) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <span className="text-2xl font-bold text-white">
          {companyName?.charAt(0)?.toUpperCase() || '?'}
        </span>
      </div>
    );
  }

  if (isProcessing || !logoSrc) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <div className="animate-pulse bg-muted/30 rounded w-16 h-16"></div>
      </div>
    );
  }

  // Default: show processed logo (transparent bg) on black - NO filter
  // On hover: show original colored logo from logo.dev
  // Fallback: grayscale if API failed
  const currentFilter = isHovered 
    ? 'none' 
    : (isProcessed ? 'none' : 'grayscale(1) brightness(1.5)'); // NO invert - just transparent on black
  
  const currentSrc = isHovered && originalLogoUrl ? originalLogoUrl : logoSrc;

  return (
    <img
      src={currentSrc}
      alt={alt || companyName || 'Logo'}
      className={`${className} transition-all duration-300`}
      style={{ filter: currentFilter }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onError={() => {
        if (fallbackUrl) {
          setLogoSrc(fallbackUrl);
          setOriginalLogoUrl(fallbackUrl);
          setIsProcessed(false); // Fallback uses grayscale
        } else {
          setError(true);
        }
      }}
    />
  );
};

const Feed = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { userCurrency } = useCurrency();
  const { toast } = useToast();
  const { 
    discoveredUsers, 
    loading: peopleLoading, 
    discoverUsers,
  } = usePeople();
  
  // Placeholder for userCount since it's not exported from usePeople
  const userCount = 0;

  // News state
  const { articles: newsArticles, loading: newsLoading } = useNews();
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [showNewsModal, setShowNewsModal] = useState(false);

  // Tags state
  const { popularTags } = useTags();
  const [selectedOfferTags, setSelectedOfferTags] = useState<string[]>([]);
  const [selectedRequestTags, setSelectedRequestTags] = useState<string[]>([]);
  
  // Offers view toggle: 'all' or 'for-you'
  const [offersView, setOffersView] = useState<'all' | 'for-you'>('all');

  // People view toggle: 'swipe' (recommended) or 'leaderboard'
  const [peopleViewMode, setPeopleViewMode] = useState<'swipe' | 'leaderboard'>('swipe');

  // REAL STATE - Using real API for feed data
  const [activeTab, setActiveTab] = useState<'requests' | 'bids' | 'connector' | 'consultation' | 'people' | 'news' | 'perks'>(() => {
    // Check URL for tab parameter on initial load
    const params = new URLSearchParams(window.location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && ['requests', 'bids', 'connector', 'consultation', 'people', 'news', 'perks'].includes(tabFromUrl)) {
      return tabFromUrl as 'requests' | 'bids' | 'connector' | 'consultation' | 'people' | 'news' | 'perks';
    }
    return 'bids';
  });
  
  // Sync activeTab with URL changes (for bottom nav navigation)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tabFromUrl = params.get('tab');
    if (tabFromUrl && ['requests', 'bids', 'connector', 'consultation', 'people', 'news', 'perks'].includes(tabFromUrl)) {
      if (tabFromUrl !== activeTab) {
        setActiveTab(tabFromUrl as typeof activeTab);
      }
    }
  }, [location.search]);

  // Update URL when tab changes (so refresh preserves the tab)
  // Note: Using only activeTab as dependency to prevent infinite loop
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const currentTabInUrl = params.get('tab');
    if (currentTabInUrl !== activeTab) {
      params.set('tab', activeTab);
      // Use window.history directly to avoid re-triggering location.search effect
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }
  }, [activeTab]);
  
  // Load people when People tab becomes active
  useEffect(() => {
    console.log('🟢 Feed: Tab changed to', activeTab, {
      hasUser: !!user,
      discoveredUsersLength: discoveredUsers.length,
      peopleLoading
    });
    
    if (user && activeTab === 'people' && discoveredUsers.length === 0 && !peopleLoading) {
      console.log('🟢 Feed: Triggering discoverUsers for People tab');
      discoverUsers({ excludeConnected: false }, 20, 0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]); // Only trigger when tab changes to 'people'
  const [requests, setRequests] = useState<FeedRequest[]>([]);
  const [bids, setBids] = useState<Bid[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [offersLoading, setOffersLoading] = useState(false);
  const [offersOffset, setOffersOffset] = useState(0);
  const [hasMoreOffers, setHasMoreOffers] = useState(true);
  const [loadingMoreOffers, setLoadingMoreOffers] = useState(false);
  
  // Refs for infinite scroll
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const offersOffsetRef = useRef(0); // Use ref to avoid stale closure in observer
  const { getOffers, bidOnOffer } = useOffers();
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
  
  // Request details modal state
  const [showRequestDetailsModal, setShowRequestDetailsModal] = useState(false);
  const [selectedRequestForDetails, setSelectedRequestForDetails] = useState<FeedRequest | null>(null);
  
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
    // console.log('🔄 Feed.tsx: fetchBidsData called');
    // console.log('🔐 Feed.tsx: User state:', { 
    //   hasUser: !!user, 
    //   userId: user?.id, 
    //   userEmail: user?.email 
    // });
    // console.log('🌐 Feed.tsx: API endpoint:', API_ENDPOINTS.BIDS);
    // console.log('⏰ Feed.tsx: Starting fetch at:', new Date().toISOString());
    
    setBidsLoading(true);

    try {
      // console.log('🚀 Feed.tsx: Making API call to:', API_ENDPOINTS.BIDS);
      const response = await apiGet(API_ENDPOINTS.BIDS);
      // console.log('✅ Feed.tsx: Raw API response received:', response);
      // console.log('📊 Feed.tsx: Response type:', typeof response);
      // console.log('📊 Feed.tsx: Response is array:', Array.isArray(response));
      // console.log('📊 Feed.tsx: Response length:', Array.isArray(response) ? response.length : 'N/A');

      if (!Array.isArray(response)) {
        console.error('❌ Feed.tsx: API response is not an array:', response);
        throw new Error('Invalid API response format');
      }

      if (response.length === 0) {
        // console.log('📭 Feed.tsx: No bids returned from API');
        setBids([]);
        return;
      }

      // console.log('🔧 Feed.tsx: Processing bids data...');
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
        const queryParams = new URLSearchParams({
          status: activeTab,
          limit: '100',
          offset: '0',
          include_demo: 'true',
          _t: cacheBuster.toString()
        });
        
        // Add tag filtering if selected
        if (selectedRequestTags && selectedRequestTags.length > 0) {
          queryParams.append('tags', selectedRequestTags.join(','));
        }
        
        const apiUrl = `${API_ENDPOINTS.FEED_DATA}?${queryParams.toString()}`;

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

  // Load offers once on mount - single source of truth
  useEffect(() => {
    loadMarketplaceOffers();
  }, []);

  // Load marketplace offers (active offers only) with pagination
  const OFFERS_PAGE_SIZE = 20;
  
  const loadMarketplaceOffers = async (tags?: string[], append = false) => {
    // Prevent duplicate calls
    if (append && loadingMoreOffers) return;
    
    if (append) {
      setLoadingMoreOffers(true);
    } else {
      setOffersLoading(true);
      setOffersOffset(0);
      offersOffsetRef.current = 0;
    }
    
    try {
      // Use ref for offset to avoid stale closure issues
      const currentOffset = append ? offersOffsetRef.current : 0;
      const data = await getOffers({ 
        status: 'active', 
        limit: OFFERS_PAGE_SIZE,
        offset: currentOffset,
        tags: tags || selectedOfferTags,
        include_demo: true
      });
      
      const newOffers = data || [];
      
      if (append) {
        setOffers(prev => [...prev, ...newOffers]);
      } else {
        setOffers(newOffers);
      }
      
      // Update both state and ref
      const newOffset = currentOffset + newOffers.length;
      setOffersOffset(newOffset);
      offersOffsetRef.current = newOffset;
      
      // Check if there are more offers to load
      setHasMoreOffers(newOffers.length === OFFERS_PAGE_SIZE);
      
    } catch (error) {
      console.error('Error loading marketplace offers:', error);
      toast({
        title: 'Error',
        description: 'Failed to load marketplace offers',
        variant: 'destructive'
      });
    } finally {
      setOffersLoading(false);
      setLoadingMoreOffers(false);
    }
  };
  
  // Auto-load more when sentinel becomes visible
  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel || !hasMoreOffers || loadingMoreOffers || offersLoading) return;
    
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Disconnect immediately to prevent multiple triggers
          observer.disconnect();
          loadMarketplaceOffers(selectedOfferTags, true);
        }
      },
      { 
        root: null, // Use viewport
        rootMargin: '100px',
        threshold: 0
      }
    );
    
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (loadMoreRef.current) {
        observer.observe(loadMoreRef.current);
      }
    }, 100);
    
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, [hasMoreOffers, loadingMoreOffers, offersLoading, offers.length]);

  // Memoize grouped offers to avoid re-computing on every render
  const groupedOffers = useMemo(() => {
    const grouped: Record<string, Offer[]> = {};
    offers.forEach(offer => {
      const primaryTag = offer.tags?.[0] || 'Other';
      if (!grouped[primaryTag]) {
        grouped[primaryTag] = [];
      }
      grouped[primaryTag].push(offer);
    });
    return grouped;
  }, [offers]);

  const CATEGORY_DESCRIPTIONS: Record<string, string> = {
    "Hiring": "Find talent and job opportunities.",
    "Investment": "Connect with investors and startups.",
    "Mentorship": "Get guidance from industry experts.",
    "Partnership": "Build strategic business alliances.",
    "Travel": "Corporate travel and logistics solutions.",
    "Real Estate": "Office space and property deals.",
    "Finance": "Banking, insurance, and fintech services.",
    "Software": "SaaS tools and developer platforms.",
    "Marketing": "Growth, SEO, and branding services.",
    "Other": "Miscellaneous opportunities."
  };

  const getRequestCategory = (request: FeedRequest) => {
    if (request.tags && request.tags.length > 0) return request.tags[0];
    // Fallback to keywords in target description if no tags
    const text = (request.target || '').toLowerCase();
    if (text.includes('hiring') || text.includes('talent') || text.includes('engineer')) return 'Hiring';
    if (text.includes('invest') || text.includes('funding')) return 'Investment';
    if (text.includes('mentor')) return 'Mentorship';
    if (text.includes('partner')) return 'Partnership';
    
    return 'Other';
  };

  // Group requests by primary tag for category display
  const groupRequestsByTag = (requests: FeedRequest[]) => {
    const grouped: Record<string, FeedRequest[]> = {};
    
    requests.forEach(request => {
      const primaryTag = getRequestCategory(request);
      if (!grouped[primaryTag]) {
        grouped[primaryTag] = [];
      }
      grouped[primaryTag].push(request);
    });
    
    return grouped;
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

            {/* Creator info - NO AVATAR */}
            <div className="flex items-center gap-2 pt-2 border-t">
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
  const demoOffers = [
    {
      id: 'demo-1',
      title: 'WARM INTRO TO YC PARTNER',
      target_organization: 'Y COMBINATOR',
      target_position: 'PARTNER',
      target_logo_url: 'https://img.logo.dev/ycombinator.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
      description: 'GET A WARM INTRODUCTION TO A YC PARTNER FOCUSED ON FINTECH FOUNDERS.',
      asking_price_inr: 50000,
      tags: ['WARM INTRO', 'FINTECH', 'SEED'],
      likes_count: 12,
      bids_count: 3,
      // No avatar -> will use deterministic face
    },
    {
      id: 'demo-2',
      title: 'CONNECT WITH STRIPE VP',
      target_organization: 'STRIPE',
      target_position: 'VP OF PARTNERSHIPS',
      target_logo_url: 'https://img.logo.dev/stripe.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
      description: 'PERSONAL INTRODUCTION TO A STRIPE VP FOR STRATEGIC PARTNERSHIPS.',
      asking_price_inr: 35000,
      tags: ['FINTECH', 'PARTNERSHIPS'],
      likes_count: 8,
      bids_count: 2,
      // No avatar -> will use deterministic face
    },
    {
      id: 'demo-3',
      title: 'PITCH DECK REVIEW',
      target_organization: 'SEQUOIA CAPITAL',
      target_position: 'PARTNER',
      target_logo_url: 'https://img.logo.dev/sequoiacap.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
      description: 'RECEIVE FEEDBACK ON YOUR SERIES A PITCH DECK FROM A SEQUOIA PARTNER.',
      asking_price_inr: 40000,
      tags: ['VC', 'SERIES A', 'FUNDRAISING'],
      likes_count: 15,
      bids_count: 5,
      // No avatar -> will use deterministic face
    },
    {
      id: 'demo-4',
      title: 'GOOGLE AI REFERRAL',
      target_organization: 'GOOGLE',
      target_position: 'ENGINEERING LEAD',
      target_logo_url: 'https://img.logo.dev/google.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
      description: 'WARM REFERRAL TO AN ENGINEERING LEAD IN GOOGLE AI ORG.',
      asking_price_inr: 30000,
      tags: ['HIRING', 'AI/ML', 'REFERRAL'],
      likes_count: 6,
      bids_count: 1,
      // No avatar -> will use deterministic face
    },
    {
      id: 'demo-5',
      title: 'STRATEGY WITH LIGHTSPEED',
      target_organization: 'LIGHTSPEED',
      target_position: 'GENERAL PARTNER',
      target_logo_url: 'https://img.logo.dev/lsvp.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
      description: 'DISCUSS YOUR GTM STRATEGY WITH A LIGHTSPEED GENERAL PARTNER.',
      asking_price_inr: 45000,
      tags: ['STRATEGY', 'GTM', 'VC'],
      likes_count: 10,
      bids_count: 4,
      // No avatar -> will use deterministic face
    }
  ];
  // Tab icons for the collapsed sidebar
  const tabIcons: { id: 'requests' | 'bids' | 'connector' | 'consultation' | 'people' | 'news' | 'perks'; icon: any; label: string }[] = [
    { id: 'bids', icon: DollarSign, label: 'Offers' },
    { id: 'requests', icon: Target, label: 'Requests' },
    { id: 'people', icon: Users, label: 'People' },
    { id: 'news', icon: Newspaper, label: 'News' },
    { id: 'perks', icon: Gift, label: 'Perks' },
  ];

  return (
  <div className="min-h-screen bg-background w-full">
      {/* Collapsed Icon Bar - Desktop only, hidden on mobile */}
      <div className={`fixed top-0 left-0 h-full w-14 bg-background/95 backdrop-blur-sm border-r border-border z-40 hidden md:flex flex-col items-center py-4 transition-opacity duration-300 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Logo Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="bg-black p-2 rounded-lg shadow-lg hover:scale-110 transition-transform mb-6 border border-[#333]"
          aria-label="Open menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
            <text x="12" y="17" fontFamily="Arial, sans-serif" fontSize="12" fontWeight="bold" textAnchor="middle" fill="#CBAA5A">6°</text>
          </svg>
        </button>

        {/* Tab Icons - no flex-1, keeps profile closer */}
        <div className="flex flex-col gap-2">
          {tabIcons.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-3 rounded-xl transition-all group relative ${
                  isActive 
                    ? 'bg-[#CBAA5A] text-black' 
                    : 'text-muted-foreground hover:text-white hover:bg-white/10'
                }`}
                aria-label={tab.label}
              >
                <Icon className="w-5 h-5" />
                {/* Tooltip */}
                <span className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="w-8 h-px bg-border my-4" />

        {/* Profile Button */}
        <button
          onClick={() => navigate(user ? '/profile' : '/auth')}
          className="p-2 rounded-full border-2 border-[#CBAA5A]/50 hover:border-[#CBAA5A] transition-all group relative"
          aria-label="Profile"
        >
          {user ? (
            <Avatar className="w-6 h-6">
              <AvatarImage src={user.avatar || undefined} />
              <AvatarFallback className="bg-[#CBAA5A] text-black text-xs">
                {user.firstName?.[0] || user.lastName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <User className="w-6 h-6 text-[#CBAA5A]" />
          )}
          <span className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Profile
          </span>
        </button>
      </div>

      {/* Mobile Header - Logo and Menu Button */}
      <div className={`fixed top-0 left-0 right-0 h-14 bg-background/95 backdrop-blur-sm border-b border-border z-40 md:hidden flex items-center justify-between px-4 ${sidebarOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="bg-[#CBAA5A] text-black p-1.5 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
              <text x="12" y="16" fontFamily="Arial, sans-serif" fontSize="11" fontWeight="bold" textAnchor="middle" fill="currentColor">6°</text>
            </svg>
          </div>
          <span className="font-semibold text-lg">6Degrees</span>
        </div>
        
        {/* Menu Button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Profile Button - Top Right (only when sidebar is open) */}
      <button
        onClick={() => navigate(user ? '/profile' : '/auth')}
        className={`fixed top-4 right-4 z-50 bg-background border-2 border-primary hover:bg-primary/10 p-2 rounded-full shadow-lg hover:scale-110 transition-all ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
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

      <div className="w-full pt-16 md:pt-6 py-6 px-4 md:px-0 md:pl-16 pb-24 md:pb-6">
        {/* Mobile Sidebar Overlay - shows when sidebar is open */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Layout: Sidebar (desktop/toggleable) + Main */}
        <div className="grid md:grid-cols-1 gap-6">
          {/* Sidebar - Toggleable on both mobile and desktop */}
          <aside className={`fixed top-0 left-0 h-full w-64 bg-background z-50 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} shadow-lg overflow-y-auto border-r`}>
            <div className="p-4 space-y-2">
              {/* Logo and Close Button */}
              <div className="flex items-center justify-between mb-4 pt-2">
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg shadow-md hover:scale-105 transition-transform"
                  aria-label="Close menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
                    <rect width="32" height="32" rx="6" fill="black" stroke="#333" strokeWidth="1"/>
                    <text x="16" y="22" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" textAnchor="middle" fill="#CBAA5A">6°</text>
                  </svg>
                </button>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                  aria-label="Close sidebar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Profile Section */}
              {user && (
                <div className="bg-muted/50 rounded-lg p-3 mb-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user.firstName?.[0] || user.lastName?.[0] || user.email?.[0]?.toUpperCase() || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {user.firstName} {user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {typeof user.socialCapitalScore === 'number' && user.socialCapitalScore >= 0 && (
                    <SocialCapitalScore
                      score={user.socialCapitalScore}
                      size="sm"
                    />
                  )}
                </div>
              )}
              
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
                variant={activeTab === 'people' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('people');
                  setSidebarOpen(false);
                }}
              >
                <Users className="w-4 h-4 mr-2" />
                People ({discoveredUsers.length || userCount})
              </Button>
              <Button
                variant={activeTab === 'news' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('news');
                  setSidebarOpen(false);
                }}
              >
                <Newspaper className="w-4 h-4 mr-2" />
                News ({newsArticles.length})
              </Button>
              <Button
                variant={activeTab === 'perks' ? 'default' : 'ghost'}
                className="w-full justify-start"
                onClick={() => {
                  setActiveTab('perks');
                  setSidebarOpen(false);
                }}
              >
                <Gift className="w-4 h-4 mr-2" />
                Perks
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

              {/* Legal Links - Sidebar Footer */}
              <div className="pt-8 mt-auto">
                <div className="flex flex-col gap-2 px-4 pb-4 text-xs text-muted-foreground">
                  <div className="flex flex-wrap gap-x-4 gap-y-2">
                    <button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors">
                      Privacy Policy
                    </button>
                    <button onClick={() => navigate('/terms')} className="hover:text-white transition-colors">
                      Terms of Service
                    </button>
                  </div>
                  <div className="text-[10px] text-[#444]">
                    © {new Date().getFullYear()} 6Degrees
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="min-w-0 overflow-hidden">
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(value) => {
          console.log('🔄 Feed.tsx: Tab change requested:', { from: activeTab, to: value });
          setActiveTab(value as 'requests' | 'bids' | 'connector' | 'consultation' | 'people' | 'news' | 'perks');
        }}>

          <TabsContent value="requests" className="mt-4 md:mt-6">
      <div className="w-full max-w-[100vw] px-4 space-y-4 overflow-hidden">
              {/* Animated Keyword Banner - hide on mobile via CSS */}
              <div className="keyword-banner">
              <AnimatedKeywordBanner
                keywords={popularTags.map(t => t.name)}
                onKeywordClick={(keyword) => {
                  setSelectedRequestTags([keyword]);
                  // Filter requests by tag - will need to add API support
                }}
                interval={3000}
              />
              </div>

              {/* Heading */}
              <div className="px-2 md:px-6 lg:px-10 max-w-[1200px] mx-auto pt-4">
                <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Requests</h1>
                <p className="text-muted-foreground mt-2">Active requests for connections and services.</p>
              </div>

              {/* Tag Search Bar */}
              <TagSearchBar
                selectedTags={selectedRequestTags}
                onTagsChange={(tags) => {
                  setSelectedRequestTags(tags);
                  // Filter requests by tags - will need to add API support
                }}
                placeholder="Search requests by tags..."
              />

              {/* Requests by Category */}
              {loading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading requests...</p>
                </div>
              ) : activeRequests.length > 0 ? (
                <div>
                  {Object.entries(groupRequestsByTag(activeRequests)).map(([category, categoryRequests]) => (
                    <CategorySection
                      key={category}
                      categoryName={category}
                      description={CATEGORY_DESCRIPTIONS[category]}
                      itemCount={categoryRequests.length}
                      onViewAll={() => {
                        setSelectedRequestTags([category]);
                        // Filter to show only this category
                      }}
                    >
                      {categoryRequests.map((request) => (
                        <Card
                          key={request.id}
                          className="group w-full h-full hover:shadow-lg transition-shadow overflow-hidden rounded-xl border-indigo-500/10 hover:border-indigo-500/30 transition-colors cursor-pointer"
                          onClick={() => {
                            setSelectedRequestForDetails(request);
                            setShowRequestDetailsModal(true);
                          }}
                        > 
                          <CardContent className="p-0 space-y-0 h-full flex flex-col">
                            {/* Organization Logo - Full Upper Section */}
                            <div className="relative w-full h-32 md:h-40 overflow-hidden bg-black shrink-0 flex items-center justify-center">
                            {request.targetOrganization ? (
                              <ProcessedLogo
                                companyName={request.targetOrganization}
                                fallbackUrl={request.targetOrganizationLogo}
                                alt={request.targetOrganization || 'Organization'}
                                className="w-full h-full object-contain p-4 transition-all duration-500 group-hover:scale-105"
                              />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 via-background to-blue-500/10">
                                  <Target className="w-16 h-16 text-indigo-500/40" />
                                </div>
                            )}
                        </div>

                            <div className="p-3 md:p-4 space-y-2 md:space-y-3 flex flex-col flex-grow">
                              <div className="flex-grow">
                            <p className="font-semibold text-xs md:text-sm mb-1 text-muted-foreground">Looking for:</p>
                            <p className="cred-data text-sm line-clamp-2 leading-relaxed font-medium">{request.target}</p>
                          
                          {/* Hide details on mobile, show on desktop */}
                          <div className="hidden md:block">
                            {request.message && (
                                    <p className="cred-data text-xs md:text-sm text-muted-foreground line-clamp-2 leading-relaxed mt-2">{request.message}</p>
                            )}
                          </div>
                              </div>

                              {/* Footer - Hidden on mobile */}
                              <div className="hidden md:block pt-3 border-t mt-auto">
                                <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 text-xs md:text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Users className="w-3.5 h-3.5" />
                                <span className="cred-data">{request.participantCount || 0}</span>
                              </div>
                            </div>
                            <div className="cred-data text-indigo-600 dark:text-indigo-400 font-bold text-base md:text-lg">
                              ₹{request.reward.toLocaleString()}
                            </div>
                                </div>
                          </div>

                          {/* Action Buttons - Hidden on mobile */}
                          <div className="hidden md:flex gap-2 pt-3">
                            <Button
                              variant="outline"
                                  className="flex-1 px-2 text-xs h-9 border-white/20 hover:bg-[#CBAA5A] hover:border-[#CBAA5A] text-white hover:text-black transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!user) {
                                  navigate('/auth');
                                  return;
                                }
                                handleJoinRequestClick(request.id, request.creator.id, request.target);
                              }}
                            >
                                  <Send className="w-3.5 h-3.5 mr-1.5" />
                              Refer
                            </Button>
                            <Button
                                  className="flex-1 px-2 text-xs h-9 bg-white hover:bg-[#CBAA5A] text-black hover:text-black transition-all duration-300"
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
                                  <DollarSign className="w-3.5 h-3.5 mr-1.5" />
                              Bid
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CategorySection>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Requests Available</h3>
              <p className="text-muted-foreground">
                {selectedRequestTags.length > 0 
                  ? 'No requests found matching your selected tags. Try different tags or clear filters.'
                  : 'No connection requests at the moment. Check back later!'}
              </p>
              {selectedRequestTags.length > 0 && (
                <Button 
                  variant="outline"
                  onClick={() => setSelectedRequestTags([])}
                  className="mt-4"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          )}
        </div>
      </TabsContent>

          <TabsContent value="people" className="mt-6">
            <div className="max-w-4xl mx-auto">
              {/* Toggle: Recommended (Swipe) vs Leaderboard */}
              <div className="flex items-center justify-center gap-2 mb-6">
                <button
                  onClick={() => setPeopleViewMode('swipe')}
                  className={`px-4 py-2 rounded-full font-gilroy text-[11px] font-bold tracking-[0.1em] uppercase transition-all ${
                    peopleViewMode === 'swipe'
                      ? 'bg-[#CBAA5A] text-black'
                      : 'bg-[#1a1a1a] text-[#888] border border-[#333] hover:border-[#CBAA5A]'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Heart className="w-3.5 h-3.5" />
                    Recommended
                  </span>
                </button>
                <button
                  onClick={() => setPeopleViewMode('leaderboard')}
                  className={`px-4 py-2 rounded-full font-gilroy text-[11px] font-bold tracking-[0.1em] uppercase transition-all ${
                    peopleViewMode === 'leaderboard'
                      ? 'bg-[#CBAA5A] text-black'
                      : 'bg-[#1a1a1a] text-[#888] border border-[#333] hover:border-[#CBAA5A]'
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
                <div className="h-[600px] max-h-[70vh] rounded-2xl overflow-hidden border border-[#222]">
                  <SwipePeopleView onViewMatches={() => setPeopleViewMode('leaderboard')} />
                </div>
              )}

              {/* Leaderboard View */}
              {peopleViewMode === 'leaderboard' && (
                <SocialCapitalLeaderboard />
              )}
            </div>
          </TabsContent>

          <TabsContent value="news" className="mt-6">
            <div className="max-w-5xl mx-auto">
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-bold mb-2">Startup News</h2>
                <p className="text-muted-foreground">Latest news and updates from Inc42</p>
              </div>

              {/* News Grid */}
              {newsLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Loading news...</p>
                </div>
              ) : newsArticles.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {newsArticles.map((article) => (
                    <Card 
                      key={article.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer overflow-hidden group"
                      onClick={() => {
                        setSelectedArticle(article);
                        setShowNewsModal(true);
                      }}
                    >
                      <CardContent className="p-0 space-y-0">
                        {/* Featured Image */}
                        <div className="relative w-full h-48 overflow-hidden bg-gradient-to-br from-muted/30 to-muted/10 flex items-center justify-center">
                          {article.imageUrl ? (
                            <>
                              <Newspaper className="absolute w-16 h-16 text-muted-foreground opacity-30" />
                              <img
                                src={article.imageUrl}
                                alt={article.title}
                                className="absolute inset-0 w-full h-full object-cover z-10"
                                loading="lazy"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            </>
                          ) : (
                            <Newspaper className="w-16 h-16 text-muted-foreground opacity-50" />
                          )}
                        </div>

                        {/* Content Section */}
                        <div className="p-4 space-y-3">
                          {/* Inc42 Badge */}
                          <Badge className="bg-white/10 text-white/70 text-xs border border-white/20">
                            Inc42 • {article.category || 'News'}
                          </Badge>

                          {/* Title */}
                          <h3 className="font-bold text-base leading-tight line-clamp-3 text-white group-hover:text-[#CBAA5A] transition-colors">
                            {article.title}
                          </h3>

                          {/* Description */}
                          <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                            {article.description}
                          </p>

                          {/* Meta */}
                          <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {article.author}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(article.pubDate).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {/* Read More Indicator */}
                          <div className="pt-2 flex items-center justify-center text-[#CBAA5A] text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                            <span>Click to read more</span>
                            <ExternalLink className="w-3 h-3 ml-1" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Newspaper className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No News Available</h3>
                  <p className="text-muted-foreground">
                    Check back later for the latest startup news from Inc42
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="perks" className="mt-6">
            <PerksTab 
              user={user} 
              onCheckScore={() => {
                // If user has no score, we might want to trigger a calculation or show details
                // For now, we can navigate to profile or show a toast
                if (user) {
                  navigate('/profile');
                } else {
                  navigate('/auth');
                }
              }} 
            />
          </TabsContent>

          <TabsContent value="bids" className="mt-4 md:mt-6">
            <div className="w-full max-w-[100vw] px-4 space-y-4 overflow-hidden">
              {/* Heading with All/For You Toggle */}
              <div className="px-2 md:px-6 lg:px-10 max-w-[1200px] mx-auto pt-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold tracking-tight">Offers</h1>
                    <p className="text-muted-foreground mt-2">
                      {offersView === 'all' 
                        ? 'Marketplace offers available for bidding.' 
                        : 'Personalized offers curated just for you.'}
                    </p>
                  </div>
                  
                  {/* Discover / For You Toggle */}
                  <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-[#111] rounded-full border border-[#333] w-fit">
                    <button
                      onClick={() => setOffersView('all')}
                      className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-riccione text-sm sm:text-base transition-all whitespace-nowrap ${
                        offersView === 'all'
                          ? 'bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black'
                          : 'text-[#888] hover:text-white'
                      }`}
                    >
                      Discover
                    </button>
                    <button
                      onClick={() => setOffersView('for-you')}
                      className={`px-3 sm:px-5 py-1.5 sm:py-2 rounded-full font-riccione text-sm sm:text-base transition-all flex items-center gap-1 sm:gap-2 whitespace-nowrap ${
                        offersView === 'for-you'
                          ? 'bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black'
                          : 'text-[#888] hover:text-white'
                      }`}
                    >
                      <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                      For You
                    </button>
                  </div>
                </div>
              </div>

              {/* Conditional content based on toggle */}
              {offersView === 'for-you' ? (
                <ForYouOffers 
                  onViewOffer={(offer) => {
                    setSelectedOfferForDetails(offer as any);
                    setShowOfferDetailsModal(true);
                  }}
                />
              ) : (
                <>
                  <div className="keyword-banner">
                    <AnimatedKeywordBanner
                      keywords={popularTags.map((t) => t.name)}
                      onKeywordClick={(keyword) => {
                        setSelectedOfferTags([keyword]);
                        loadMarketplaceOffers([keyword]);
                      }}
                    />
                  </div>

              <TagSearchBar
                selectedTags={selectedOfferTags}
                onTagsChange={(tags) => {
                  setSelectedOfferTags(tags);
                  loadMarketplaceOffers(tags);
                }}
                placeholder="Search offers by tags..."
              />

              {offersLoading ? (
                <div className="text-center py-16">
                  <div className="mobile-loading-spinner mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading offers...</p>
                </div>
              ) : offers.length === 0 ? (
                <div className="space-y-6">
                  <div
                    className="flex gap-6 overflow-x-auto pb-8 -mx-4 px-4 snap-x snap-mandatory scroll-smooth hide-scrollbar cursor-grab active:cursor-grabbing"
                    style={{
                      WebkitOverflowScrolling: 'touch',
                      scrollBehavior: 'smooth',
                      touchAction: 'pan-x'
                    }}
                  >
                    {demoOffers.map((offer) => (
                      <OfferCard
                        key={offer.id}
                        offer={offer}
                        className="shrink-0 w-[85vw] sm:w-[calc(33.333%-1rem)] lg:w-[calc(33.333%-1rem)] xl:w-[calc(25%-1rem)] snap-center"
                        onClick={() => {
                          toast({
                            title: "Demo Offer",
                            description: "This is a preview of the new offer card design."
                          });
                        }}
                        onBook={() => {
                          toast({
                            title: "Demo Action",
                            description: "Booking is disabled for demo offers."
                          });
                        }}
                        onBid={() => {
                          toast({
                            title: "Demo Action",
                            description: "Bidding is disabled for demo offers."
                          });
                        }}
                      />
                    ))}
                    <div className="w-2 shrink-0" />
                  </div>

                  <div className="flex flex-col items-center text-center space-y-3 mt-8">
                    <DollarSign className="w-10 h-10 text-muted-foreground" />
                    <div>
                      <p className="font-semibold">No offers available yet</p>
                      <p className="text-muted-foreground text-sm">
                        Approved offers will appear here. In the meantime, preview our demo cards.
                      </p>
                    </div>
                    {!isGuest && (
                      <Button onClick={() => navigate('/profile?tab=offers')}>
                        Create an Offer
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  {Object.entries(groupedOffers).map(([category, categoryOffers]) => (
                    <CategorySection
                      key={category}
                      categoryName={category}
                      description={CATEGORY_DESCRIPTIONS[category]}
                      itemCount={categoryOffers.length}
                      onViewAll={() => {
                        setSelectedOfferTags([category]);
                        loadMarketplaceOffers([category]);
                      }}
                    >
                      {categoryOffers.map((offer) => (
                        <OfferCard
                          key={offer.id}
                          offer={offer}
                          className="w-full"
                          onClick={() => {
                            setSelectedOfferForDetails(offer);
                            setShowOfferDetailsModal(true);
                          }}
                          onBook={async (e) => {
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
                          onBid={(e) => {
                            if (!user) {
                              navigate('/auth');
                              return;
                            }
                            setSelectedOfferForBid(offer);
                            setShowBidModal(true);
                          }}
                        />
                      ))}
                </CategorySection>
              ))}
              
              {/* Load more section - clickable button */}
              <div 
                ref={loadMoreRef} 
                className="min-h-[120px] flex items-center justify-center py-8"
              >
                {loadingMoreOffers ? (
                  <div className="flex flex-col items-center gap-3">
                    <RefreshCw className="w-8 h-8 animate-spin text-[#CBAA5A]" />
                    <span className="text-sm text-muted-foreground">Loading more offers...</span>
                  </div>
                ) : hasMoreOffers ? (
                  <button
                    onClick={() => loadMarketplaceOffers(selectedOfferTags, true)}
                    className="flex flex-col items-center gap-2 px-8 py-4 rounded-xl border border-[#333] hover:border-[#CBAA5A] hover:bg-[#CBAA5A]/5 transition-all cursor-pointer group"
                  >
                    <div className="w-10 h-10 rounded-full border-2 border-dashed border-[#444] group-hover:border-[#CBAA5A] flex items-center justify-center transition-colors">
                      <Plus className="w-5 h-5 text-[#666] group-hover:text-[#CBAA5A] transition-colors" />
                    </div>
                    <span className="text-sm text-muted-foreground group-hover:text-[#CBAA5A] transition-colors">Load More Offers</span>
                  </button>
                ) : offers.length > 0 ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-[#CBAA5A]/20 flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-[#CBAA5A]" />
                    </div>
                    <span className="text-sm text-muted-foreground">You've seen all {offers.length} offers</span>
                  </div>
                ) : null}
              </div>
            </div>
          )}
                </>
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
            <Button variant={activeTab === 'people' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('people'); setTabPickerOpen(false); }}>
              <Users className="w-4 h-4 mr-2" /> People ({discoveredUsers.length || userCount})
            </Button>
            <Button variant={activeTab === 'news' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('news'); setTabPickerOpen(false); }}>
              <Newspaper className="w-4 h-4 mr-2" /> News ({newsArticles.length})
            </Button>
            <Button variant={activeTab === 'perks' ? 'default' : 'outline'} className="w-full justify-start" onClick={() => { setActiveTab('perks'); setTabPickerOpen(false); }}>
              <Gift className="w-4 h-4 mr-2" /> Perks
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
            additional_org_logos: (selectedOfferForDetails as any).additional_org_logos || [],
            connection: selectedOfferForDetails.connection
          }}
          onBidClick={() => {
            setSelectedOfferForBid(selectedOfferForDetails);
            setShowBidModal(true);
          }}
        />
      )}

      {/* Request Details Modal */}
      {selectedRequestForDetails && (
        <RequestDetailsModal
          isOpen={showRequestDetailsModal}
          onClose={() => {
            setShowRequestDetailsModal(false);
            setSelectedRequestForDetails(null);
          }}
          request={{
            id: selectedRequestForDetails.id,
            target: selectedRequestForDetails.target,
            message: selectedRequestForDetails.message,
            targetOrganization: selectedRequestForDetails.targetOrganization,
            targetOrganizationLogo: selectedRequestForDetails.targetOrganizationLogo,
            reward: selectedRequestForDetails.reward,
            currency: selectedRequestForDetails.currency,
            participantCount: selectedRequestForDetails.participantCount,
            creator: selectedRequestForDetails.creator
          }}
          onRefer={() => {
            handleJoinRequestClick(selectedRequestForDetails.id, selectedRequestForDetails.creator.id, selectedRequestForDetails.target);
          }}
          onBid={() => {
            setSelectedRequestForBid(selectedRequestForDetails);
            setShowRequestBidModal(true);
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

      {/* News Modal */}
      <NewsModal
        isOpen={showNewsModal}
        onClose={() => {
          setShowNewsModal(false);
          setSelectedArticle(null);
        }}
        article={selectedArticle}
      />

      {/* Footer with Legal & Company Info */}
      <Footer className="mt-8 mb-20 md:mb-0" />

      {/* Mobile Bottom Navigation - Unified across app */}
      <BottomNavigation />
    </div>
  );
};

export default Feed;