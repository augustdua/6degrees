import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
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
import OffersTab from '@/components/OffersTab';
import IntrosTab from '@/components/IntrosTab';
import ErrorViewer from '@/components/ErrorViewer';
import GroupChatModal from '@/components/GroupChatModal';
import EditRequestModal from '@/components/EditRequestModal';
import DashboardSidebar from '@/components/DashboardSidebar';
import { CreditBalance, CreditBalanceCard } from '@/components/CreditBalance';
import { CreditPurchaseModal } from '@/components/CreditPurchaseModal';
import { SocialShareModal } from '@/components/SocialShareModal';
import { InviteFriendModal } from '@/components/InviteFriendModal';
import { VideoModal } from '@/components/VideoModal';
import { supabase } from '@/lib/supabase';
import { convertAndFormatINR } from '@/lib/currency';
import { API_BASE_URL } from '@/lib/api';
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
  Edit,
  Handshake,
  Video,
  Target
} from 'lucide-react';

const Dashboard = () => {
  const { user, signOut, loading: authLoading, isReady } = useAuth();
  const { getMyChains } = useRequests();
  const { counts: notificationCounts } = useNotificationCounts();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [myRequests, setMyRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [showCreatedOnly, setShowCreatedOnly] = useState(true);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  const [userCredits, setUserCredits] = useState(0);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ link: string; target: string } | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<{ videoUrl: string; requestId: string; target: string; shareableLink?: string } | null>(null);
  const [showInviteFriendModal, setShowInviteFriendModal] = useState(false);

  // Get initial tab from URL params
  const initialTab = searchParams.get('tab') || 'myrequests';
  const [activeTab, setActiveTab] = useState(initialTab);

  // Update URL when tab changes
  const handleTabChange = (newTab: string) => {
    setActiveTab(newTab);
    const newUrl = new URL(window.location.href);
    if (newTab === 'myrequests') {
      newUrl.searchParams.delete('tab');
    } else {
      newUrl.searchParams.set('tab', newTab);
    }
    window.history.replaceState({}, '', newUrl.toString());
  };

  // Load chains using the useRequests hook
  const loadChains = async () => {
    if (!user || !isReady) return;

    setRequestsLoading(true);
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
      
      setMyRequests(chains || []);
    } catch (error) {
      console.error('Failed to load chains:', error);
      setMyRequests([]);
    } finally {
      setRequestsLoading(false);
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
      const originalChains = [...myRequests];
      setMyRequests(prev => prev.filter(chain => chain.request?.id !== requestId));

      try {
        await softDeleteRequest(requestId, user.id);
        console.log('Request soft deleted successfully');
        // Success message
        alert('Request deleted successfully!');
      } catch (error) {
        console.error('Soft delete failed:', error);
        // Restore the card to UI on failure
        setMyRequests(originalChains);
        throw error;
      }
    } catch (error) {
      console.error('Delete request error:', error);
      alert(error instanceof Error ? error.message : 'Failed to delete request. Please try again.');
    }
  };

  const handleOpenGroupChat = (chain: any) => {
    setSelectedRequest(chain);
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

  // Show sign-in prompt if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <Network className="h-16 w-16 mx-auto text-primary mb-4" />
            <h1 className="text-2xl font-bold mb-2">Dashboard Access Required</h1>
            <p className="text-muted-foreground">
              You need to be signed in to view your dashboard and manage your connection requests.
            </p>
          </div>
          <div className="space-y-3">
            <Button 
              onClick={() => navigate('/auth')} 
              className="w-full"
              size="lg"
            >
              Sign In
            </Button>
            <Button 
              onClick={() => navigate('/')} 
              variant="outline"
              className="w-full"
            >
              Go to Home
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Filter chains based on toggle
  const filteredChains = myRequests.filter(chain => {
    const userParticipant = chain.participants.find(p => p.userid === user?.id);
    const isCreator = userParticipant?.role === 'creator';
    return showCreatedOnly ? isCreator : !isCreator;
  });

  return (
    <div className="min-h-screen bg-background flex">
      {/* Beta Banner */}
      <BetaBanner />
      
      {/* Sidebar */}
      <DashboardSidebar
        activeTab={activeTab}
        onTabChange={handleTabChange}
        unreadMessages={notificationCounts.unreadMessages}
        networkNotifications={notificationCounts.pendingConnectionRequests + notificationCounts.acceptedConnections}
        introNotifications={notificationCounts.pendingIntroRequests}
        onInviteFriend={() => setShowInviteFriendModal(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
      {/* Navigation Bar */}
      <nav className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo/Brand - with left padding on mobile for hamburger menu */}
            <Link to="/feed" className="flex items-center space-x-2 ml-12 md:ml-0">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">6°</span>
              </div>
              <span className="font-semibold text-lg">6Degree</span>
            </Link>

            {/* Navigation Links - Removed, moved to footer */}
            <div className="hidden md:flex items-center space-x-4">
              {/* Navigation links moved to footer */}
            </div>

            {/* Mobile Menu & User Actions */}
            <div className="flex items-center space-x-2">
              {/* Invite Friend Button - Desktop */}
              <div className="hidden md:block">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowInviteFriendModal(true)}
                  className="border-white/20 hover:bg-white/5 text-white"
                >
                  <UserPlus className="w-4 h-4 mr-1" />
                  Invite Friend
                </Button>
              </div>

              {/* Invite Friend Button - Mobile (icon only) */}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowInviteFriendModal(true)}
                className="md:hidden"
              >
                <UserPlus className="w-4 h-4" />
              </Button>
              
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
                <Button variant="outline" size="sm" className="text-[#CBAA5A] border-[#CBAA5A]/50 hover:bg-[#CBAA5A]/10">
                  <AlertTriangle className="w-3 h-3 md:w-4 md:h-4 mr-1" />
                  <span className="hidden sm:inline">Add LinkedIn</span>
                </Button>
              )}

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
            <Button variant="outline" size="sm" onClick={loadChains} disabled={requestsLoading} className="text-xs md:text-sm">
              <RefreshCw className={`w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2 ${requestsLoading ? 'animate-spin' : ''}`} />
              {requestsLoading ? 'Refreshing...' : 'Refresh'}
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
              <CardTitle className="text-xs md:text-sm font-medium">My Requests</CardTitle>
              <Network className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-0 pt-1 md:pt-2">
              <div className="text-base md:text-2xl font-bold">{myRequests.length}</div>
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
                {myRequests.filter(chain => {
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
                {myRequests.filter(chain => {
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
                {myRequests.filter(chain => chain.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
          {/* Navigation moved to sidebar */}


          <TabsContent value="myrequests" className="space-y-4">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col space-y-3 md:flex-row md:items-center md:justify-between md:space-y-0">
                  <div>
                    <CardTitle className="text-lg md:text-xl">My Requests</CardTitle>
                    <CardDescription className="text-sm">
                      Networking requests you're participating in
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="request-toggle" className="text-xs md:text-sm font-medium">
                      {showCreatedOnly ? 'Created by me' : 'Joined by me'}
                    </Label>
                    <Switch
                      id="request-toggle"
                      checked={showCreatedOnly}
                      onCheckedChange={setShowCreatedOnly}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
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
                        <Card key={chain.id} className={`h-full hover:shadow-lg transition-shadow overflow-hidden border-l-4 ${chain.status === 'completed' ? 'border-l-green-500' : chain.status === 'active' ? 'border-l-indigo-500' : 'border-l-red-500'}`}>
                          <CardContent className="p-0 space-y-0">
                            {/* Organization Logo Header */}
                            <div className="flex flex-col">
                              <div className="relative w-full h-32 md:h-40 flex flex-col items-center justify-center bg-gradient-to-br from-indigo-500/8 via-background to-blue-500/12 overflow-hidden">
                                {/* Ambient glow */}
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-400/15 via-transparent to-blue-600/10"></div>
                                {/* Organization Logo Display */}
                                {chain.request?.target_organizations && chain.request.target_organizations.length > 0 ? (
                                  <div className="relative backdrop-blur-sm bg-white/60 dark:bg-slate-900/60 p-4 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 max-w-[75%] flex items-center justify-center z-10">
                                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/30 to-white/0 opacity-40 rounded-2xl"></div>
                                    <img
                                      src={chain.request.target_organizations[0].logo_url || `https://logo.clearbit.com/${chain.request.target_organizations[0].domain}`}
                                      alt={chain.request.target_organizations[0].name}
                                      className="relative z-10 max-w-full h-16 md:h-20 object-contain"
                                      style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.15))' }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <Target className="w-12 h-12 text-indigo-500 z-10" />
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

                                {/* Reward Display */}
                                <div className="flex items-center justify-between pt-2 border-t">
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                    <Users className="w-3 h-3" />
                                    <span>{chain.participants?.length || 0} referrers</span>
                                  </div>
                                  <div className="text-indigo-600 dark:text-indigo-400 font-bold text-sm md:text-base">
                                    ₹{convertAndFormatINR(chain.request?.reward || 0)}
                                  </div>
                                </div>

                                {/* Action buttons - responsive layout */}
                                <div className="flex flex-col gap-2">
                                  {(() => {
                                    // Get the user's personal shareable link from the chain
                                    const userShareableLink = getUserShareableLink(chain, user?.id || '');

                                    return userShareableLink ? (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-8 md:h-9 text-xs md:text-sm border-white/20 hover:bg-white/5 text-white"
                                        onClick={() => {
                                          setShareModalData({
                                            link: userShareableLink,
                                            target: chain.request?.target || 'Unknown Target'
                                          });
                                          setShowShareModal(true);
                                        }}
                                      >
                                        <Share2 className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                        <span>Share Request</span>
                                      </Button>
                                    ) : null;
                                  })()}
                                  {chain.request?.id && (
                                    <Button size="sm" className="w-full h-8 md:h-9 text-xs md:text-sm bg-[#CBAA5A] hover:bg-[#B28A28] text-black" asChild>
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
                                      <MessageSquare className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2" />
                                      <span>Comments</span>
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

          <TabsContent value="offers" className="space-y-4">
            <OffersTab />
          </TabsContent>

          <TabsContent value="intros" className="space-y-4">
            <IntrosTab />
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
        <div className="grid grid-cols-5 gap-1 py-2 px-1">
          <Button
            variant={activeTab === 'myrequests' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-2 h-auto"
            onClick={() => handleTabChange('myrequests')}
          >
            <Network className="w-5 h-5" />
            <span className="text-xs">Chains</span>
          </Button>
          <Button
            variant={activeTab === 'offers' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-2 h-auto"
            onClick={() => handleTabChange('offers')}
          >
            <Handshake className="w-5 h-5" />
            <span className="text-xs">Offers</span>
          </Button>
          <Button
            variant={activeTab === 'intros' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-2 h-auto"
            onClick={() => handleTabChange('intros')}
          >
            <Video className="w-5 h-5" />
            <span className="text-xs">Intros</span>
          </Button>
          <Button
            variant={activeTab === 'messages' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-2 h-auto"
            onClick={() => handleTabChange('messages')}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-xs">Messages</span>
          </Button>
          <Button
            variant={activeTab === 'network' ? 'default' : 'ghost'}
            size="sm"
            className="flex flex-col items-center gap-1 py-2 h-auto"
            onClick={() => handleTabChange('network')}
          >
            <Users className="w-5 h-5" />
            <span className="text-xs">Network</span>
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
              <Button variant="ghost" size="sm" onClick={() => setShowHowItWorks(true)} className="text-sm">
                How it Works
              </Button>
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
      {selectedRequest && showGroupChat && (
        <GroupChatModal
          isOpen={showGroupChat}
          onClose={() => {
            setShowGroupChat(false);
            setSelectedRequest(null);
          }}
          chainId={selectedRequest.id}
          chainTarget={selectedRequest.request?.target || 'Unknown Target'}
          participants={selectedRequest.participants || []}
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

      {/* Invite Friend Modal */}
      {showInviteFriendModal && (
        <InviteFriendModal
          isOpen={showInviteFriendModal}
          onClose={() => setShowInviteFriendModal(false)}
          referralLink={`${window.location.origin}/auth${user?.id ? `?ref=${user.id}` : ''}`}
        />
      )}
      </div>
      {/* End Main Content Area */}
    </div>
  );
};

export default Dashboard;