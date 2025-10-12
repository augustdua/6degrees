import { useState, useEffect } from 'react';
import Joyride, { Step } from 'react-joyride';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRequests, ConnectionRequest } from '@/hooks/useRequests';
import { getUserShareableLink, ChainData } from '@/lib/chainsApi';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  ArrowRight,
  Users,
  Eye,
  Share2,
  DollarSign,
  Calendar,
  Copy,
  Target,
  BarChart3,
  Network,
  CheckCircle,
  Clock,
  AlertCircle,
  Trash2,
  XCircle,
  MessageSquare,
  Info,
  Building2,
  Edit,
  Video
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';
import { ChainVisualization } from '@/components/ChainVisualization';
import { RequestStatsChart } from '@/components/RequestStatsChart';
import TargetClaimsTab from '@/components/TargetClaimsTab';
import GroupChatModal from '@/components/GroupChatModal';
import { SocialShareModal } from '@/components/SocialShareModal';
import { VideoModal } from '@/components/VideoModal';
import { AIVideoGenerator } from '@/components/AIVideoGenerator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { convertAndFormatINR } from '@/lib/currency';

const RequestDetails = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, isReady } = useAuth();
  const { toast } = useToast();
  const { trackShare } = useAnalytics();
  const [request, setRequest] = useState<ConnectionRequest | null>(null);
  const [chain, setChain] = useState<ChainData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ link: string; target: string } | null>(null);
  const [showExplainer, setShowExplainer] = useState(false);
  const [explainerSlide, setExplainerSlide] = useState(0);
  const [runTour, setRunTour] = useState(false);
  const [currentTargetSelector, setCurrentTargetSelector] = useState<string | null>(null);
  const [pointerPosition, setPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [totalShares, setTotalShares] = useState<number>(0);
  const [showVideoGenerator, setShowVideoGenerator] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!requestId || !user || !isReady) return;

      setLoading(true);
      setError(null);

      try {
        // Fetch request details
        const { data: requestData, error: requestError } = await supabase
          .from('connection_requests')
          .select(`
            *,
            creator:users!creator_id (
              id,
              first_name,
              last_name,
              email,
              avatar_url,
              bio,
              linkedin_url,
              twitter_url
            ),
            target_organization:organizations!target_organization_id (
              id,
              name,
              logo_url,
              domain
            )
          `)
          .eq('id', requestId)
          .single();

        if (requestError) {
          throw new Error('Request not found or access denied');
        }

        // Format request data
        // Safely normalize optional organization and video fields from Supabase response
        const targetOrgRaw: any = (requestData as any).target_organization;
        const targetOrg = Array.isArray(targetOrgRaw)
          ? (targetOrgRaw[0] || null)
          : (typeof targetOrgRaw === 'object' ? targetOrgRaw : null);

        const formattedRequest: ConnectionRequest = {
          id: requestData.id,
          target: requestData.target,
          message: requestData.message,
          reward: requestData.reward,
          status: requestData.status,
          expiresAt: requestData.expires_at,
          shareableLink: requestData.shareable_link,
          isExpired: new Date(requestData.expires_at) < new Date(),
          isActive: requestData.status === 'active' && new Date(requestData.expires_at) > new Date(),
          createdAt: requestData.created_at,
          updatedAt: requestData.updated_at,
          clickCount: (requestData as any).click_count || 0,
          lastClickedAt: (requestData as any).last_clicked_at,
          // Use normalized organization object if present
          target_organization_id: (requestData as any).target_organization_id || (targetOrg?.id ?? null),
          target_organization: targetOrg ? {
            id: targetOrg.id,
            name: targetOrg.name,
            logo_url: targetOrg.logo_url,
            domain: targetOrg.domain,
          } : null,
          creator: {
            id: requestData.creator.id,
            firstName: requestData.creator.first_name,
            lastName: requestData.creator.last_name,
            email: requestData.creator.email,
            avatar: requestData.creator.avatar_url,
            bio: requestData.creator.bio,
            linkedinUrl: requestData.creator.linkedin_url,
            twitterUrl: requestData.creator.twitter_url,
          },
        };

        setRequest(formattedRequest);

        // Check if request has video
        if ((requestData as any).video_url) {
          setHasVideo(true);
          setVideoUrl((requestData as any).video_url as string);
        } else {
          setHasVideo(false);
          setVideoUrl(null);
        }

        // Fetch chain data using maybeSingle to avoid 406 errors
        const { data: chainData, error: chainError } = await supabase
          .from('chains')
          .select('*')
          .eq('request_id', requestId)
          .maybeSingle();

        if (chainError) {
          console.error('Error fetching chain data:', chainError);
        } else if (chainData) {
          setChain(chainData as unknown as ChainData);
        }

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch request details';
        setError(errorMessage);
        console.error('Error fetching request details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRequestDetails();
  }, [requestId, user, isReady]);

  // Decide whether to show explainer on first visit per request
  useEffect(() => {
    if (requestId && user && !loading && !error) {
      const key = `request_explainer_seen_${requestId}_${user.id}`;
      const seen = sessionStorage.getItem(key);
      if (!seen) {
        setShowExplainer(true);
      }
    }
  }, [requestId, user, loading, error]);

  const startTourAndRemember = () => {
    if (!requestId || !user) return;
    const key = `request_explainer_seen_${requestId}_${user.id}`;
    sessionStorage.setItem(key, 'true');
    setShowExplainer(false);
    setRunTour(true);
  };

  const tourSteps = [
    {
      target: 'body',
      content: (
        <div className="space-y-2">
          <h3 className="text-base font-semibold">Let me show you around 👋</h3>
          <p className="text-sm">This will take ~30 seconds.</p>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '.inviter-name',
      content: (
        <div>
          <h4 className="font-semibold mb-1">Who created this</h4>
          <p className="text-sm">See the request creator’s info here.</p>
        </div>
      ),
      placement: 'bottom',
    },
    {
      target: '.target-card',
      content: (
        <div>
          <h4 className="font-semibold mb-1">🎯 The Goal</h4>
          <p className="text-sm">Help reach the target shown here.</p>
        </div>
      ),
      placement: 'right',
    },
    {
      target: '.earning-breakdown',
      content: (
        <div>
          <h4 className="font-semibold mb-1">💰 Reward</h4>
          <p className="text-sm">Understand reward and activity stats.</p>
        </div>
      ),
      placement: 'left',
    },
    {
      target: '.chain-visualization',
      content: (
        <div>
          <h4 className="font-semibold mb-1">🔗 The Chain</h4>
          <p className="text-sm">Interactive network of participants.</p>
        </div>
      ),
      placement: 'top',
    },
    {
      target: '.share-button',
      content: (
        <div>
          <h4 className="font-semibold mb-1">Share</h4>
          <p className="text-sm">Share your link to grow the chain.</p>
        </div>
      ),
      placement: 'top',
      spotlightClicks: true,
    },
  ];

  // Helper to add spotlight class and compute pointer position for special steps
  const applyHighlight = (selector: string | undefined) => {
    try {
      // Remove any existing spotlight
      document.querySelectorAll('.spotlight-active').forEach((el) => el.classList.remove('spotlight-active'));

      if (!selector) {
        setCurrentTargetSelector(null);
        setPointerPosition(null);
        return;
      }

      const element = document.querySelector(selector) as HTMLElement | null;
      if (element) {
        element.classList.add('spotlight-active');
        setCurrentTargetSelector(selector);

        // Only show pointer on share step for now
        if (selector === '.share-button') {
          const rect = element.getBoundingClientRect();
          setPointerPosition({
            x: rect.left + rect.width / 2 + window.scrollX,
            y: rect.top - 32 + window.scrollY,
          });
        } else {
          setPointerPosition(null);
        }
      } else {
        setCurrentTargetSelector(null);
        setPointerPosition(null);
      }
    } catch (e) {
      // No-op: highlighting is best-effort
    }
  };

  // Update pointer position on scroll/resize while visible
  useEffect(() => {
    if (!currentTargetSelector) return;
    const handler = () => {
      const element = document.querySelector(currentTargetSelector!) as HTMLElement | null;
      if (!element) return;
      if (currentTargetSelector === '.share-button') {
        const rect = element.getBoundingClientRect();
        setPointerPosition({
          x: rect.left + rect.width / 2 + window.scrollX,
          y: rect.top - 32 + window.scrollY,
        });
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler as any);
      window.removeEventListener('resize', handler as any);
    };
  }, [currentTargetSelector]);

  // Fetch total shares for the request
  useEffect(() => {
    const fetchShares = async () => {
      if (!request?.id) return;

      try {
        const res = await fetch(`/api/clicks/shares/${request.id}`);
        if (!res.ok) return;
        const json = await res.json();
        const val = json?.data?.total_shares ?? 0;
        setTotalShares(typeof val === 'number' ? val : 0);
      } catch (e) {
        // Non-blocking
        setTotalShares(0);
      }
    };
    fetchShares();
  }, [request?.id]);

  const handleShare = () => {
    // Get user's personal shareable link from chain, fallback to original request link
    const userShareableLink = chain && user?.id
      ? getUserShareableLink(chain, user.id)
      : null;

    // Prioritize video share URL if video exists
    const hasVideo = !!(request?.videoUrl || request?.video_url);
    
    // Extract linkId from shareable link for video sharing
    const linkId = userShareableLink ? userShareableLink.match(/\/r\/(.+)$/)?.[1] : null;

    // Construct share link based on whether video exists
    // Use backend URL for video shares to serve OG tags for social media previews
    const isProd = import.meta.env.PROD;
    const backendUrl = isProd
      ? 'https://6degreesbackend-production.up.railway.app'
      : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

    const linkToShare = hasVideo && linkId
      ? `${backendUrl}/video-share?requestId=${encodeURIComponent(request.id)}&ref=${encodeURIComponent(linkId)}`
      : userShareableLink || request?.shareableLink;

    if (linkToShare && request) {
      setShareModalData({
        link: linkToShare,
        target: request.target
      });
      setShowShareModal(true);
    }
  };

  const copyLink = () => {
    // Get user's personal shareable link from chain, fallback to original request link
    const userShareableLink = chain && user?.id
      ? getUserShareableLink(chain, user.id)
      : null;

    // Prioritize video share URL if video exists
    const hasVideo = !!(request?.videoUrl || request?.video_url);
    const linkId = userShareableLink ? userShareableLink.match(/\/r\/(.+)$/)?.[1] : null;
    const isProd = import.meta.env.PROD;
    const backendUrl = isProd
      ? 'https://6degreesbackend-production.up.railway.app'
      : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

    const linkToShare = hasVideo && linkId
      ? `${backendUrl}/video-share?requestId=${encodeURIComponent(request.id)}&ref=${encodeURIComponent(linkId)}`
      : userShareableLink || request?.shareableLink;

    if (linkToShare) {
      navigator.clipboard.writeText(linkToShare);
      toast({
        title: "Link Copied!",
        description: "Share this link to continue building the connection chain.",
      });

      // Track share as copy_link
      trackShare(
        '',
        'connection',
        'copy_link',
        linkToShare,
        { target: request?.target }
      );
    }
  };

  const cancelRequest = async () => {
    if (!request) return;

    try {
      const { error } = await supabase
        .from('connection_requests')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', request.id)
        .eq('creator_id', user!.id);

      if (error) throw error;

      toast({
        title: "Request Cancelled",
        description: "Your connection request has been cancelled successfully.",
      });

      // Update local state
      setRequest(prev => prev ? { ...prev, status: 'cancelled' } : null);

    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to cancel request",
        variant: "destructive",
      });
    }
  };

  const deleteRequest = async () => {
    if (!request) return;

    try {
      console.log('Attempting to delete request:', request.id, 'for user:', user!.id);

      // First delete the associated chain (if it exists)
      const { error: chainError } = await supabase
        .from('chains')
        .delete()
        .eq('request_id', request.id);

      if (chainError) {
        console.error('Error deleting chain:', chainError);
        // Continue with request deletion even if chain deletion fails
      }

      // Now delete the request itself
      const { data, error } = await supabase
        .from('connection_requests')
        .delete()
        .eq('id', request.id)
        .eq('creator_id', user!.id)
        .select();

      console.log('Delete result:', { data, error });

      if (error) {
        console.error('Deletion error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('No rows were deleted. Request may not exist or you may not have permission.');
      }

      toast({
        title: "Request Deleted",
        description: "Your connection request has been permanently deleted.",
      });

      // Navigate back to dashboard with refresh flag
      navigate('/dashboard', { state: { refreshData: true } });

    } catch (error) {
      console.error('Delete request error:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete request",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string, isExpired: boolean) => {
    if (isExpired || status === 'expired') return 'destructive';
    if (status === 'completed') return 'default';
    if (status === 'active') return 'secondary';
    return 'outline';
  };

  const getStatusIcon = (status: string, isExpired: boolean) => {
    if (isExpired || status === 'expired') return <AlertCircle className="h-4 w-4" />;
    if (status === 'completed') return <CheckCircle className="h-4 w-4" />;
    if (status === 'active') return <Clock className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  // Show loading while auth is still initializing
  if (authLoading || !isReady) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    );
  }

  // Show access denied only after auth has finished loading
  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to view request details.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading request details...</p>
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Request Not Found</h1>
          <p className="text-muted-foreground mb-6">{error || 'This request could not be found.'}</p>
          <Button asChild>
            <Link to="/dashboard">Back to Dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  const chainParticipants = chain?.participants || [];
  const totalClicks = request.clickCount || 0;
  // Note: we show combined shares fetched from API (not participants count)

  // Check if current user is the creator of the request
  const isCreator = request.creator.id === user.id;

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
      {/* Joyride Tour */}
      {/* @ts-ignore - react-joyride type incompatibility with React 18 */}
      <Joyride
        steps={tourSteps as any}
        run={runTour}
        continuous={true}
        showProgress={true}
        showSkipButton={true}
        scrollToFirstStep={true}
        callback={(data: any) => {
          if (data.type === 'step:after' || data.type === 'tour:start' || data.type === 'step:before') {
            const step = (data.step || {}) as any;
            applyHighlight(step.target);
          }
          if (data.type === 'tour:end') {
            applyHighlight(undefined);
            setRunTour(false);
          }
        }}
        styles={{
          options: {
            primaryColor: '#37d5a3',
            backgroundColor: '#0f1419',
            textColor: '#fafafa',
            overlayColor: 'rgba(0, 0, 0, 0.75)',
            arrowColor: '#0f1419',
            zIndex: 10000,
          },
          tooltip: {
            backgroundColor: '#0f1419',
            borderRadius: '12px',
            color: '#fafafa',
            fontSize: '14px',
          },
          tooltipTitle: {
            color: '#fafafa',
            fontSize: '16px',
          },
          buttonNext: {
            backgroundColor: '#37d5a3',
            color: '#0f1419',
            borderRadius: '8px',
            fontSize: '14px',
            padding: '8px 16px',
          },
          buttonBack: {
            color: '#9ca3af',
            marginRight: '8px',
          },
          buttonSkip: {
            color: '#9ca3af',
          },
        }}
      />

      {/* Animated pointer shown on share step */}
      {pointerPosition && (
        <div
          className="fixed z-[10001] pointer-events-none animate-bounce"
          style={{ left: pointerPosition.x, top: pointerPosition.y, transform: 'translate(-50%, -100%)' }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24">
            <path d="M12 2L12 18M12 18L6 12M12 18L18 12" stroke="#f59e0b" strokeWidth="3" fill="none" />
          </svg>
        </div>
      )}

      {/* Five-slide explainer modal */}
      <Dialog open={showExplainer} onOpenChange={setShowExplainer}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl">Welcome to Request Details</DialogTitle>
            <DialogDescription>Quick overview before we guide you.</DialogDescription>
          </DialogHeader>

          {explainerSlide === 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Escape cold outreach</h3>
              <p className="text-sm text-muted-foreground">Use your network to make warm introductions.</p>
            </div>
          )}

          {explainerSlide === 1 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Your Invitation</h3>
              <p className="text-sm text-muted-foreground">See who created this and the target you’re reaching.</p>
            </div>
          )}

          {explainerSlide === 2 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">How it works</h3>
              <p className="text-sm text-muted-foreground">Join → Share → Earn. We’ll highlight each part.</p>
            </div>
          )}

          {explainerSlide === 3 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">What you’ll earn</h3>
              <p className="text-sm text-muted-foreground">Credits for your contribution; target may receive cash for time.</p>
            </div>
          )}

          {explainerSlide === 4 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Using credits</h3>
              <p className="text-sm text-muted-foreground">Use credits to create your own requests later.</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <Button variant="ghost" onClick={() => setShowExplainer(false)} className="text-xs">Skip</Button>
            <div className="flex items-center gap-2">
              {explainerSlide > 0 && (
                <Button variant="outline" size="sm" onClick={() => setExplainerSlide((s) => Math.max(0, s - 1))}>Back</Button>
              )}
              {explainerSlide < 4 ? (
                <Button size="sm" onClick={() => setExplainerSlide((s) => Math.min(4, s + 1))}>Next</Button>
              ) : (
                <Button size="sm" onClick={startTourAndRemember}>Start tour</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Header */}
      <div className="flex flex-col space-y-3 md:flex-row md:items-center md:gap-4 md:space-y-0 mb-4 md:mb-6">
        <Button variant="outline" size="sm" onClick={() => navigate('/dashboard', { state: { refreshData: true } })} className="self-start">
          <ArrowLeft className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
          <span className="text-xs md:text-sm">Back to Dashboard</span>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Request Details</h1>
          <p className="text-sm md:text-base text-muted-foreground">Detailed view for your connection request</p>
        </div>
      </div>

      {/* Request Overview */}
      <Card className="mb-8 target-card">
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              {/* Video Thumbnail - Dashboard sized, top left */}
              {hasVideo && videoUrl && (
                <div className="relative w-32 aspect-[4/3] bg-black rounded-md overflow-hidden flex-shrink-0">
                  <video
                    src={videoUrl}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    onLoadedData={(e) => {
                      const video = e.currentTarget;
                      video.currentTime = 0.5;
                    }}
                  />
                  {/* Entire thumbnail is clickable */}
                  <button
                    onClick={() => setShowVideoModal(true)}
                    className="absolute inset-0 flex items-center justify-center group cursor-pointer bg-black/0 hover:bg-black/5 transition-all duration-200"
                    aria-label="Play video"
                  >
                    {/* 6Degree branded play button */}
                    <svg className="w-11 h-11 drop-shadow-xl transform group-hover:scale-110 transition-all duration-200" viewBox="0 0 44 44" fill="none">
                      <g filter="url(#shadow-small)">
                        <path d="M16 11 L16 33 L33 22 Z" fill="url(#gradient-small)" className="group-hover:opacity-90"/>
                      </g>
                      <defs>
                        <linearGradient id="gradient-small" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" style={{stopColor: '#37d5a3', stopOpacity: 1}} />
                          <stop offset="100%" style={{stopColor: '#2ab88a', stopOpacity: 1}} />
                        </linearGradient>
                        <filter id="shadow-small" x="-50%" y="-50%" width="200%" height="200%">
                          <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5"/>
                        </filter>
                      </defs>
                    </svg>
                  </button>
                </div>
              )}

              <div className="space-y-2 flex-1">
                <div className="flex items-start gap-3">
                  {request.target_organization?.logo_url && (
                    <Avatar className="h-12 w-12 mt-1">
                      <AvatarImage
                        src={request.target_organization.logo_url}
                        alt={request.target_organization.name}
                      />
                      <AvatarFallback>
                        <Building2 className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="flex-1">
                    <CardTitle className="text-xl">{request.target}</CardTitle>
                    {request.target_organization && (
                      <p className="text-sm text-muted-foreground mt-1">
                        at {request.target_organization.name}
                      </p>
                    )}
                  </div>
                </div>
                <CardDescription>
                  {request.message || 'No additional message provided'}
                </CardDescription>
                <p className="text-xs text-muted-foreground inviter-name">Created by {request.creator.firstName} {request.creator.lastName}</p>
              </div>
            </div>

            <Badge
              variant={getStatusColor(request.status, request.isExpired)}
              className="flex items-center gap-1 flex-shrink-0"
            >
              {getStatusIcon(request.status, request.isExpired)}
              {request.isExpired ? 'Expired' : request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4 earning-breakdown">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium cash-reward-badge">{convertAndFormatINR(request.reward)}</div>
                <div className="text-xs text-muted-foreground">Reward</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">{chainParticipants.length}</div>
                <div className="text-xs text-muted-foreground">Chain Length</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-3 w-3 md:h-4 md:w-4 text-purple-600" />
              <div>
                <div className="text-sm font-medium">{totalClicks}</div>
                <div className="text-xs text-muted-foreground">Clicks</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
              <div>
                <div className="text-sm font-medium">
                  {new Date(request.expiresAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">Expires</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <Button onClick={handleShare} variant="outline" size="sm" className="text-xs md:text-sm share-button">
              <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Share
            </Button>
            <Button
              onClick={() => {
                if (hasVideo && videoUrl) {
                  navigator.clipboard.writeText(videoUrl);
                  toast({ title: 'Video link copied', description: 'Share this video directly.' });
                } else {
                  copyLink();
                }
              }}
              variant="outline"
              size="sm"
              className="text-xs md:text-sm"
            >
              <Copy className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              {hasVideo ? 'Copy Video' : 'Copy Link'}
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" asChild>
              <a href={request.shareableLink} target="_blank" rel="noopener noreferrer">
                <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">View Public Page</span>
                <span className="sm:hidden">View Page</span>
              </a>
            </Button>
            {isCreator && !hasVideo && (
              <Button 
                onClick={() => setShowVideoGenerator(true)} 
                variant="default" 
                size="sm" 
                className="text-xs md:text-sm bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                <Video className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                Generate AI Video
              </Button>
            )}

            {/* Comments Button - show if chain exists and has participants */}
            {chain && chainParticipants.length > 1 && (
              <Button
                onClick={() => setShowGroupChat(true)}
                variant="outline"
                size="sm"
                className="text-xs md:text-sm"
              >
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Comments</span>
                <span className="sm:hidden">Comments</span>
              </Button>
            )}

            {/* Creator-only buttons */}
            {isCreator && (
              <>
                {/* Edit button - always show for creator */}
                {request.status === 'active' && !request.isExpired && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs md:text-sm"
                    onClick={() => navigate(`/create-request?edit=${request.id}`)}
                  >
                    <Edit className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Edit Request</span>
                    <span className="sm:hidden">Edit</span>
                  </Button>
                )}

                {/* Video Studio button - always show */}
                {request.status === 'active' && (
                  <Button
                    variant="default"
                    size="sm"
                    className="text-xs md:text-sm bg-purple-600 hover:bg-purple-700"
                    onClick={() => navigate(`/video-studio?requestId=${encodeURIComponent(request.id)}&target=${encodeURIComponent(request.target)}&message=${encodeURIComponent(request.message || '')}`)}
                  >
                    <Video className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">{hasVideo ? 'Update Video' : 'Add Video'}</span>
                    <span className="sm:hidden">Video</span>
                  </Button>
                )}

                {/* Cancel button - only show for active requests */}
                {request.status === 'active' && !request.isExpired && (
                  <Button onClick={cancelRequest} variant="outline" size="sm" className="text-xs md:text-sm">
                    <XCircle className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                    <span className="hidden sm:inline">Cancel Request</span>
                    <span className="sm:hidden">Cancel</span>
                  </Button>
                )}

                {/* Delete button - show for any request that's not completed */}
                {request.status !== 'completed' && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="text-xs md:text-sm">
                        <Trash2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Connection Request</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to permanently delete this connection request?
                          This action cannot be undone and will remove the entire chain.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={deleteRequest}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete Permanently
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Target Claims Review - Only show for request creators */}
      {isCreator && (
        <div className="mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Target Claims Review
              </CardTitle>
              <CardDescription>
                Review and approve target claims for this connection request.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TargetClaimsTab />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Chain Visualization */}
      <div className="chain-visualization">
        <ChainVisualization requests={[request]} totalClicks={totalClicks} totalShares={totalShares} />
      </div>

      {/* Group Chat Modal */}
      {chain && showGroupChat && (
        <GroupChatModal
          isOpen={showGroupChat}
          onClose={() => setShowGroupChat(false)}
          chainId={chain.id}
          chainTarget={request.target}
          participants={chainParticipants}
        />
      )}

      {/* Social Share Modal */}
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

      {/* Video Modal */}
      {hasVideo && videoUrl && (
        <VideoModal
          isOpen={showVideoModal}
          onClose={() => setShowVideoModal(false)}
          videoUrl={videoUrl}
          requestId={request.id}
          target={request.target}
          shareableLink={chain && user?.id ? getUserShareableLink(chain, user.id) : request.shareableLink}
          onShare={() => {
            const userShareableLink = chain && user?.id ? getUserShareableLink(chain, user.id) : null;
            const hasVideo = !!(request?.videoUrl || request?.video_url);
            const linkId = userShareableLink ? userShareableLink.match(/\/r\/(.+)$/)?.[1] : null;
            const isProd = import.meta.env.PROD;
            const backendUrl = isProd
              ? 'https://6degreesbackend-production.up.railway.app'
              : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

            const linkToShare = hasVideo && linkId
              ? `${backendUrl}/video-share?requestId=${encodeURIComponent(request.id)}&ref=${encodeURIComponent(linkId)}`
              : userShareableLink || request.shareableLink;
            if (linkToShare) {
              setShareModalData({
                link: linkToShare,
                target: request.target
              });
              setShowShareModal(true);
            }
          }}
        />
      )}

      {/* Video Generator Dialog */}
      <Dialog open={showVideoGenerator} onOpenChange={setShowVideoGenerator}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Generate AI Video</DialogTitle>
            <DialogDescription>
              Create an engaging AI-powered video for your connection request. This will make your request more appealing and increase engagement.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            <AIVideoGenerator
              requestId={request.id}
              target={request.target}
              message={request.message || ''}
              onVideoReady={(url) => {
                setVideoUrl(url);
                setHasVideo(true);
                setShowVideoGenerator(false);
                toast({
                  title: "Video Generated!",
                  description: "Your AI video is ready. It will now appear on your request.",
                });
                // Refresh the page to show the video
                window.location.reload();
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RequestDetails;