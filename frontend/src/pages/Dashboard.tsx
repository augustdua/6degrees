import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { getUserShareableLink } from '@/lib/chainsApi';
import HowItWorksModal from '@/components/HowItWorksModal';
import HelpModal from '@/components/HelpModal';
import BetaBanner from '@/components/BetaBanner';
import WalletCard from '@/components/WalletCard';
import EmailVerificationBanner from '@/components/EmailVerificationBanner';
import ConnectionsTab from '@/components/ConnectionsTab';
import PeopleTab from '@/components/PeopleTab';
import MessagesTab from '@/components/MessagesTab';
import NotificationBell from '@/components/NotificationBell';
import ErrorViewer from '@/components/ErrorViewer';
import GroupChatModal from '@/components/GroupChatModal';
import EditRequestModal from '@/components/EditRequestModal';
import { CreditBalance, CreditBalanceCard } from '@/components/CreditBalance';
import { CreditPurchaseModal } from '@/components/CreditPurchaseModal';
import { SocialShareModal } from '@/components/SocialShareModal';
import { VideoModal } from '@/components/VideoModal';
import { supabase } from '@/lib/supabase';
import { convertAndFormatINR } from '@/lib/currency';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  TrendingUp,
  Eye,
  Share2,
  CheckCircle,
  Clock,
  AlertCircle,
  DollarSign,
  Network,
  Home,
  LogOut,
  Plus,
  RefreshCw,
  Mail,
  User,
  HelpCircle,
  AlertTriangle,
  Trash2,
  MessageSquare,
  Info,
  FileText,
  Shield,
  UserPlus,
  Hash,
  Building2,
  Edit
} from 'lucide-react';

const Dashboard = () => {
  const { user, signOut, loading: authLoading, isReady } = useAuth();
  const { getMyChains } = useRequests();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [myChains, setMyChains] = useState([]);
  const [chainsLoading, setChainsLoading] = useState(false);
  const [showCreatedOnly, setShowCreatedOnly] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [selectedChain, setSelectedChain] = useState<any>(null);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ link: string; target: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ videoUrl: string; requestId: string; target: string; shareableLink?: string } | null>(null);

  // Get initial tab from URL params
  const initialTab = searchParams.get('tab') || 'mychains';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newUrl = new URL(window.location.href);
    if (newTab === 'mychains') {
      newUrl.searchParams.delete('tab');
    } else {
      newUrl.searchParams.set('tab', newTab);
    }
    window.history.replaceState({}, '', newUrl.toString());
  };

  // Load chains using the useRequests hook
  const loadChains = async () => {
    if (!user || !isReady) return;

    setChainsLoading(true);
    try {
      console.log('Loading chains for user:', user.id);
      const chains = await getMyChains();
      console.log('Loaded chains:', chains);
      
      // Debug: Check if request data is available
      chains?.forEach((chain, index) => {
        console.log(`Chain ${index}:`, {
          id: chain.id,
          requestId: chain.requestId,
          hasRequest: !!chain.request,
          requestDataId: chain.request?.id,
          shareableLink: chain.request?.shareableLink
        });
      });
      
      setMyChains(chains || []);
    } catch (error) {
      console.error('Failed to load chains:', error);
      setMyChains([]);
    } finally {
      setChainsLoading(false);
    }
  };

  // Load chains when component mounts
  useEffect(() => {
    if (user && isReady) {
      loadChains();
    }
  }, [user?.id, isReady]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const softDeleteRequest = async (requestId: string, userId: string) => {
    const { data, error } = await supabase.rpc('soft_delete_connection_request', {
      p_request_id: requestId
    });

    if (error) throw error;
    return data;
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (!user) return;

    const confirmed = confirm('Are you sure you want to delete this request? This action cannot be undone.');
    if (!confirmed) return;

    try {
      console.log('Attempting to soft delete request:', requestId, 'for user:', user.id);

      // Optimistically remove from UI first for better UX
      const originalChains = [...myChains];
      setMyChains(prev => prev.filter(chain => chain.request?.id !== requestId));

      try {
        await softDeleteRequest(requestId, user.id);
        console.log('Request soft deleted successfully');
        // Success message
        alert('Request deleted successfully!');
      } catch (error) {
        console.error('Soft delete failed:', error);
        // Restore the card to UI on failure
        setMyChains(originalChains);
        throw error;
      }
    } catch (error) {
      console.error('Delete request error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete request. Please try again.');
    }
  };

  const handleOpenGroupChat = (chain: any) => {
    setSelectedChain(chain);
    setShowGroupChat(true);
  };

  const handleUpdateRequest = async (updatedRequest: any) => {
    // Reload chains to get fresh data including organization info
    await loadChains();
  };

  // Show loading while auth is still initializing
  if (authLoading || !isReady) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to home if user is not authenticated
  if (!user) {
    navigate('/');
    return null;
  }

  // Filter chains based on toggle
  const filteredChains = myChains.filter(chain => {
    const userParticipant = chain.participants.find(p => p.userid === user?.id);
    const isCreator = userParticipant?.role === 'creator';
    return showCreatedOnly ? isCreator : !isCreator;
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Beta Banner */}
      <BetaBanner />
      {/* Navigation Bar */}
      <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo/Brand */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">6°</span>
              </div>
              <span className="font-semibold text-lg">6Degree</span>
            </Link>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/chain-invites">
                  <UserPlus className="w-4 h-4 mr-1" />
                  Chain Invites
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowHowItWorks(true)}>
                How it Works
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/about">
                  <Info className="w-4 h-4 mr-1" />
                  About
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/legal">
                  <FileText className="w-4 h-4 mr-1" />
                  Legal
                </Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)}>
                <HelpCircle className="w-4 h-4 mr-1" />
                Help
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </Button>
            </div>

            {/* Mobile Menu & User Actions */}
            <div className="flex items-center space-x-2">
              {/* Credits - Desktop */}
              <div className="hidden md:block">
                <CreditBalance
                  onPurchaseClick={() => setShowCreditPurchase(true)}
                  showPurchaseButton={true}
                />
              </div>

              {/* Notification Bell */}
              <NotificationBell />

              {/* LinkedIn Alert */}
              {!user?.linkedinUrl && (
                <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-600 hover:bg-yellow-50 dark:hover:bg-yellow-950">
                  <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  <span className="hidden sm:inline">Add LinkedIn</span>
                </Button>
              )}

              {/* Profile Button - Mobile */}
              <Button variant="ghost" size="sm" asChild className="md:hidden">
                <Link to="/profile">
                  <User className="w-4 h-4" />
                </Link>
              </Button>

              {/* How it Works - Mobile */}
              <Button variant="ghost" size="sm" onClick={() => setShowHowItWorks(true)} className="md:hidden">
                <HelpCircle className="w-4 h-4" />
              </Button>

              {/* Logout */}
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
                <span className="hidden md:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mx-auto px-3 md:px-4 py-4 md:py-6">

      {/* Email Verification Banner */}
      <EmailVerificationBanner />

      <div className="flex flex-col space-y-4 md:space-y-6">
        <div className="flex flex-col space-y-4 md:flex-row md:justify-between md:items-start md:space-y-0">
          <div className="flex flex-col space-y-1 md:space-y-2">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Monitor your connection requests and network growth
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button variant="outline" size="sm" onClick={loadChains} disabled={chainsLoading} className="text-xs md:text-sm">
              <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 ${chainsLoading ? 'animate-spin' : ''}`} />
              {chainsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button asChild size="sm" className="text-xs md:text-sm">
              <Link to="/create">
                <Plus className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Create Request</span>
                <span className="sm:hidden">Create</span>
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-2 md:gap-3 grid-cols-2 md:grid-cols-4">
          <Card className="p-2 md:p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-0">
              <CardTitle className="text-xs md:text-sm font-medium">My Chains</CardTitle>
              <Network className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-1 md:pt-2">
              <div className="text-base md:text-2xl font-bold">{myChains.length}</div>
              <p className="text-xs text-muted-foreground">
                Total participating
              </p>
            </CardContent>
          </Card>

          <Card className="p-2 md:p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-0">
              <CardTitle className="text-xs md:text-sm font-medium">Created</CardTitle>
              <Plus className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-1 md:pt-2">
              <div className="text-base md:text-2xl font-bold">
                {myChains.filter(chain => {
                  const userParticipant = chain.participants.find(p => p.userid === user?.id);
                  return userParticipant?.role === 'creator';
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Chains created
              </p>
            </CardContent>
          </Card>

          <Card className="p-2 md:p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-0">
              <CardTitle className="text-xs md:text-sm font-medium">Joined</CardTitle>
              <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-1 md:pt-2">
              <div className="text-base md:text-2xl font-bold">
                {myChains.filter(chain => {
                  const userParticipant = chain.participants.find(p => p.userid === user?.id);
                  return userParticipant?.role !== 'creator';
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Chains joined
              </p>
            </CardContent>
          </Card>

          <Card className="p-2 md:p-3">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-0">
              <CardTitle className="text-xs md:text-sm font-medium">Active</CardTitle>
              <Clock className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-1 md:pt-2">
              <div className="text-base md:text-2xl font-bold">
                {myChains.filter(chain => chain.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          <TabsList className={`hidden md:grid w-full h-auto p-1 ${process.env.NODE_ENV === 'development' ? 'grid-cols-6' : 'grid-cols-5'}`}>
            <TabsTrigger value="mychains" className="text-xs md:text-sm px-2 py-2">
              <Network className="w-4 h-4 md:mr-2" />
              <span className="hidden sm:inline">My Chains</span>
              <span className="sm:hidden">Chains</span>
            </TabsTrigger>
            <TabsTrigger value="wallet" className="text-xs md:text-sm px-2 py-2">
              <DollarSign className="w-4 h-4 md:mr-2" />
              <span className="hidden sm:inline">Wallet</span>
              <span className="sm:hidden">Wallet</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="text-xs md:text-sm px-2 py-2">
              <MessageSquare className="w-4 h-4 md:mr-2" />
              <span className="hidden sm:inline">Messages</span>
              <span className="sm:hidden">Messages</span>
            </TabsTrigger>
            <TabsTrigger value="network" className="text-xs md:text-sm px-2 py-2">
              <Users className="w-4 h-4 md:mr-2" />
              <span className="hidden sm:inline">My Network</span>
              <span className="sm:hidden">Network</span>
            </TabsTrigger>
            <TabsTrigger value="people" className="text-xs md:text-sm px-2 py-2">
              <User className="w-4 h-4 md:mr-2" />
              <span className="hidden sm:inline">Discover People</span>
              <span className="sm:hidden">Discover</span>
            </TabsTrigger>
            {process.env.NODE_ENV === 'development' && (
              <TabsTrigger value="debug" className="text-xs md:text-sm px-2 py-2">
                <AlertTriangle className="w-4 h-4 md:mr-2" />
                <span className="hidden sm:inline">Debug Errors</span>
                <span className="sm:hidden">Debug</span>
              </TabsTrigger>
            )}
          </TabsList>


          <TabsContent value="mychains" className="space-y-4">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div>
                    <CardTitle className="text-lg md:text-xl">My Chains</CardTitle>
                    <CardDescription className="text-sm">
                      Connection chains you're participating in
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="chain-toggle" className="text-xs md:text-sm font-medium">
                      {showCreatedOnly ? 'Created by me' : 'Joined by me'}
                    </Label>
                    <Switch
                      id="chain-toggle"
                      checked={showCreatedOnly}
                      onCheckedChange={setShowCreatedOnly}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {chainsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading chains...</p>
                  </div>
                ) : filteredChains.length === 0 ? (
                  <div className="text-center py-8">
                    <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {showCreatedOnly ? 'No chains created yet' : 'No chains joined yet'}
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {showCreatedOnly
                        ? "You haven't created any connection chains yet"
                        : "You haven't joined any connection chains yet"
                      }
                    </p>
                    {showCreatedOnly && (
                      <Button asChild>
                        <Link to="/create">Create Your First Request</Link>
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4">
                    {filteredChains.map((chain) => {
                      const userParticipant = chain.participants.find(p => p.userid === user?.id);
                      const isCreator = userParticipant?.role === 'creator';

                      return (
                        <Card key={chain.id} className={`h-full border-l-4 ${chain.status === 'completed' ? 'border-l-green-500' : chain.status === 'active' ? 'border-l-blue-500' : 'border-l-red-500'}`}>
                          <CardContent className="p-0">
                            {/* Compact card with thumbnail on top */}
                            <div className="flex flex-col">
                              <div className={`relative aspect-video w-full rounded-t-md overflow-hidden ${(chain.request?.videoUrl || chain.request?.video_url) ? 'bg-gradient-to-br from-slate-900 to-slate-800' : 'bg-black'}`}>
                                {(chain.request?.videoUrl || chain.request?.video_url) ? (
                                  <>
                                    <video
                                      src={chain.request.videoUrl || chain.request.video_url}
                                      poster={chain.request?.video_thumbnail_url || chain.request.videoUrl || chain.request.video_url}
                                      className="w-full h-full object-contain"
                                      muted
                                      playsInline
                                      preload="metadata"
                                      onLoadedMetadata={(e) => {
                                        const video = e.currentTarget;
                                        // Seek to 0.5 seconds to get a good thumbnail frame
                                        video.currentTime = 0.5;
                                      }}
                                    />
                                    {/* Clickable overlay - entire area is clickable */}
                                    <button
                                      onClick={() => {
                                        if (chain.request?.id) {
                                          setSelectedVideo({
                                            videoUrl: chain.request.videoUrl || chain.request.video_url,
                                            requestId: chain.request.id,
                                            target: chain.request.target || 'Unknown Target',
                                            shareableLink: getUserShareableLink(chain, user?.id || '')
                                          });
                                          setShowVideoModal(true);
                                        }
                                      }}
                                      className="absolute inset-0 flex items-center justify-center group cursor-pointer bg-black/0 hover:bg-black/5 transition-all duration-200"
                                      aria-label="Play video"
                                    >
                                      {/* 6Degree branded play button - responsive size */}
                                      <svg className="w-12 h-12 sm:w-14 sm:h-14 drop-shadow-xl transform group-hover:scale-110 transition-all duration-200" viewBox="0 0 56 56" fill="none">
                                        <g filter="url(#shadow)">
                                          <path d="M20 14 L20 42 L42 28 Z" fill="url(#gradient)" className="group-hover:opacity-90"/>
                                        </g>
                                        <defs>
                                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" style={{stopColor: '#37d5a3', stopOpacity: 1}} />
                                            <stop offset="100%" style={{stopColor: '#2ab88a', stopOpacity: 1}} />
                                          </linearGradient>
                                          <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                                            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.5"/>
                                          </filter>
                                        </defs>
                                      </svg>
                                    </button>
                                  </>
                                ) : (
                                  <div className="w-full h-full grid place-items-center text-muted-foreground">
                                    {isCreator ? (
                                      <div className="flex flex-col items-center gap-3 px-4">
                                        <div className="text-center">
                                          <p className="text-sm font-medium mb-1">No video yet</p>
                                          <p className="text-xs text-muted-foreground">Add a video to boost engagement</p>
                                        </div>
                                        <Button size="sm" onClick={() => chain.request?.id && navigate(`/video-studio?requestId=${encodeURIComponent(chain.request.id)}&target=${encodeURIComponent(chain.request.target || '')}&message=${encodeURIComponent(chain.request.message || '')}`)}>
                                          Add Video
                                        </Button>
                                      </div>
                                    ) : (
                                      <div className="text-center px-4">
                                        <p className="text-sm text-muted-foreground">No video available</p>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>

                              <div className="p-3 md:p-5 space-y-2 md:space-y-3">
                                {/* Target name and org logo */}
                                <div className="flex items-start gap-2 md:gap-3">
                                  {chain.request?.target_organizations && chain.request.target_organizations.length > 0 && (
                                    <div className="flex -space-x-2 flex-shrink-0">
                                      {chain.request.target_organizations.slice(0, 3).map((org: any, index: number) => (
                                        <Avatar key={org.id || index} className="h-7 w-7 md:h-8 md:w-8 border-2 border-background">
                                          <AvatarImage
                                            src={org.logo_url || (org.domain ? `https://logo.clearbit.com/${org.domain}` : undefined)}
                                            alt={org.name}
                                          />
                                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                                            <Building2 className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                                          </AvatarFallback>
                                        </Avatar>
                                      ))}
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <h3 className="font-semibold text-sm md:text-base line-clamp-2 leading-snug">{chain.request?.target || 'Unknown Target'}</h3>
                                  </div>
                                </div>

                                {/* Action buttons - responsive layout */}
                                <div className="flex flex-col gap-2">
                                  {(() => {
                                    // Get the user's personal shareable link from the chain
                                    const userShareableLink = getUserShareableLink(chain, user?.id || '');
                                    const hasVideo = !!(chain.request?.videoUrl || chain.request?.video_url);

                                    // Extract linkId from shareable link for video sharing
                                    const linkId = userShareableLink ? userShareableLink.match(/\/r\/(.+)$/)?.[1] : null;

                                    // Construct share link based on whether video exists
                                    // Use backend URL for video shares to serve OG tags for social media previews
                                    const isProd = import.meta.env.PROD;
                                    const backendUrl = isProd
                                      ? 'https://6degreesbackend-production.up.railway.app'
                                      : (import.meta.env.VITE_API_URL || 'http://localhost:3001');

                                    const shareLink = hasVideo && linkId
                                      ? `${backendUrl}/video-share?requestId=${encodeURIComponent(chain.request.id)}&ref=${encodeURIComponent(linkId)}`
                                      : userShareableLink;

                                    return shareLink ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-8 md:h-9 text-xs md:text-sm"
                                        onClick={() => {
                                          setShareModalData({
                                            link: shareLink,
                                            target: chain.request?.target || 'Unknown Target'
                                          });
                                          setShowShareModal(true);
                                        }}
                                      >
                                        <Share2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                        <span>{hasVideo ? 'Share Video' : 'Share Request'}</span>
                                      </Button>
                                    ) : null;
                                  })()}
                                  {chain.request?.id && (
                                    <Button variant="outline" size="sm" className="w-full h-8 md:h-9 text-xs md:text-sm" asChild>
                                      <Link to={`/request/${chain.request.id}`}>
                                        <Eye className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                        <span>View Details</span>
                                      </Link>
                                    </Button>
                                  )}
                                  {chain.participants?.length > 1 && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="w-full h-8 md:h-9 text-xs md:text-sm"
                                      onClick={() => handleOpenGroupChat(chain)}
                                    >
                                      <Hash className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                      <span>Group Chat</span>
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wallet" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <CreditBalanceCard onPurchaseClick={() => setShowCreditPurchase(true)} />
              <WalletCard />
            </div>
          </TabsContent>

          <TabsContent value="messages" className="space-y-4">
            <MessagesTab />
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <ConnectionsTab />
          </TabsContent>

          <TabsContent value="people" className="space-y-4">
            <PeopleTab />
          </TabsContent>

          {process.env.NODE_ENV === 'development' && (
            <TabsContent value="debug" className="space-y-4">
              <ErrorViewer />
            </TabsContent>
          )}

        </Tabs>
      </div>
      </div>

      {/* Mobile Bottom Navigation - LinkedIn Style */}
      <div className="fixed bottom-0 left-0 right-0 bg-card border-t md:hidden z-50">
        <div className="flex items-center justify-around py-2">
          <Button
            variant={activeTab === 'mychains' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-3"
            onClick={() => handleTabChange('mychains')}
          >
            <Network className="w-5 h-5" />
            <span className="text-xs">Chains</span>
          </Button>
          <Button
            variant={activeTab === 'wallet' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-3"
            onClick={() => handleTabChange('wallet')}
          >
            <DollarSign className="w-5 h-5" />
            <span className="text-xs">Wallet</span>
          </Button>
          <Button
            variant={activeTab === 'messages' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-3"
            onClick={() => handleTabChange('messages')}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs">Messages</span>
          </Button>
          <Button
            variant={activeTab === 'network' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-3"
            onClick={() => handleTabChange('network')}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs">Network</span>
          </Button>
          <Button
            variant={activeTab === 'people' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-3"
            onClick={() => handleTabChange('people')}
          >
            <User className="w-5 h-5" />
            <span className="text-xs">People</span>
          </Button>
        </div>
      </div>

      {/* Add padding to prevent content being hidden behind mobile nav */}
      <div className="h-20 md:hidden" />

      {/* Footer */}
      <footer className="border-t bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50 mt-12">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground">
                © 2024 Grapherly OÜ. All rights reserved.
              </p>
              <Badge variant="outline" className="text-xs">
                Beta v0.1.0
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                About
              </Link>
              <Link to="/legal" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Legal
              </Link>
              <Button variant="ghost" size="sm" onClick={() => setShowHelp(true)} className="text-sm">
                Help
              </Button>
            </div>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showHowItWorks && <HowItWorksModal onClose={() => setShowHowItWorks(false)} />}
      {showHelp && <HelpModal isOpen={showHelp} onClose={() => setShowHelp(false)} />}
      <CreditPurchaseModal
        isOpen={showCreditPurchase}
        onClose={() => setShowCreditPurchase(false)}
        currentCredits={userCredits}
        onPurchaseSuccess={() => {
          // Refresh credits after purchase
          window.location.reload();
        }}
      />

      {/* Group Chat Modal */}
      {selectedChain && showGroupChat && (
        <GroupChatModal
          isOpen={showGroupChat}
          onClose={() => {
            setShowGroupChat(false);
            setSelectedChain(null);
          }}
          chainId={selectedChain.id}
          chainTarget={selectedChain.request?.target || 'Unknown Target'}
          participants={selectedChain.participants || []}
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

      {/* Edit Request Modal */}
      {editingRequest && (
        <EditRequestModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            setEditingRequest(null);
          }}
          request={editingRequest}
          onUpdate={handleUpdateRequest}
        />
      )}

      {/* Video Modal */}
      {selectedVideo && (
        <VideoModal
          isOpen={showVideoModal}
          onClose={() => {
            setShowVideoModal(false);
            setSelectedVideo(null);
          }}
          videoUrl={selectedVideo.videoUrl}
          requestId={selectedVideo.requestId}
          target={selectedVideo.target}
          shareableLink={selectedVideo.shareableLink}
          onShare={() => {
            if (selectedVideo.shareableLink) {
              setShareModalData({
                link: selectedVideo.shareableLink,
                target: selectedVideo.target
              });
              setShowShareModal(true);
            }
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;