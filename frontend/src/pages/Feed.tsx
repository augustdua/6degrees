/*
 * DEBUGGING MODE: ALL API CALLS DISABLED
 *
 * The following API calls have been disabled for debugging feed crashes:
 * 1. Feed data fetch (apiGet to FEED_DATA endpoint) - replaced with mock data
 * 2. Like functionality (apiPost to CREDITS_LIKE endpoint) - replaced with mock response
 * 3. Join chain (handleJoinChain from useCredits hook) - replaced with mock success
 * 4. Unlock chain (handleUnlockChain from useCredits hook) - replaced with mock success
 *
 * All toast notifications have also been disabled to prevent additional errors.
 * Extensive console logging has been added throughout the component lifecycle.
 *
 * To re-enable API calls, search for "DISABLED" comments and uncomment the original code.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useCredits } from '@/hooks/useCredits';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Coins
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  canAccess: boolean; // For completed chains
  requiredCredits?: number; // For completed chains
}

const Feed = () => {
  console.log('🚀 Feed.tsx: Component initializing - EMERGENCY MINIMAL VERSION');

  // EMERGENCY: Return minimal component to test if Feed component itself causes crashes
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Feed Page - Emergency Debug Mode</h1>
        <p className="text-muted-foreground">
          This is a minimal version to test if the Feed component causes crashes.
        </p>
        <p className="text-sm mt-4">
          Check console for any error messages.
        </p>
      </div>
    </div>
  );

  // ORIGINAL CODE DISABLED FOR EMERGENCY TESTING
  /*
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  // TEMPORARILY DISABLED - const { credits, handleJoinChain, handleUnlockChain } = useCredits();
  const credits = 50; // Mock credits for testing
  const handleJoinChain = async () => true; // Mock function
  const handleUnlockChain = async () => true; // Mock function
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [chains, setChains] = useState<FeedChain[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  console.log('📋 Feed.tsx: Initial component state:', {
    user: user?.id,
    credits,
    activeTab,
    chainsLength: chains.length,
    loading,
    error,
    timestamp: new Date().toISOString()
  });


  // Fetch real feed data from API - DISABLED FOR DEBUGGING
  useEffect(() => {
    console.log('🚀 Feed.tsx: Starting fetchFeedData useEffect - API CALLS DISABLED');
    console.log('🔍 Feed.tsx: useEffect triggered with params:', {
      activeTab,
      userId: user?.id,
      userObject: user,
      timestamp: new Date().toISOString()
    });

    // Only fetch if user is defined
    if (!user) {
      console.log('❌ Feed.tsx: No user found, exiting useEffect');
      return;
    }

    let isCancelled = false;

    const fetchFeedData = async () => {
      console.log('🚀 Feed.tsx: Starting fetchFeedData function', {
        activeTab,
        userId: user?.id,
        isCancelled,
        timestamp: new Date().toISOString()
      });

      if (isCancelled) {
        console.log('🛑 Feed.tsx: Request cancelled, exiting fetchFeedData');
        return;
      }

      console.log('⏳ Feed.tsx: Setting loading to true');
      setLoading(true);
      console.log('🧹 Feed.tsx: Clearing error state');
      setError(null);

      try {
        console.log('🌐 Feed.tsx: RE-ENABLING FEED API CALL - Calling:', `${API_ENDPOINTS.FEED_DATA}?status=${activeTab}&limit=20&offset=0`);

        // RE-ENABLED API CALL - Testing if this causes crashes
        const feedData = await apiGet(`${API_ENDPOINTS.FEED_DATA}?status=${activeTab}&limit=20&offset=0`);

        // Mock data for testing (keeping as backup)
        // const feedData = [
        //   {
        //     id: 'mock-1',
        //     creator: {
        //       id: 'user-1',
        //       firstName: 'Mock',
        //       lastName: 'User',
        //       bio: 'This is mock data for debugging'
        //     },
        //     target: 'Mock Target Person',
        //     message: 'This is a mock connection request for testing',
        //     reward: 100,
        //     status: activeTab,
        //     participantCount: 5,
        //     createdAt: new Date().toISOString(),
        //     expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        //     isLiked: false,
        //     likesCount: 3,
        //     canAccess: true,
        //     requiredCredits: 10
        //   }
        // ];

        if (isCancelled) {
          console.log('🛑 Feed.tsx: Request cancelled after API response');
          return;
        }

        console.log('✅ Feed.tsx: API response received:', feedData);
        console.log('📊 Feed.tsx: Setting chains with', feedData?.length || 0, 'items from API');
        setChains(feedData || []);
        setError(null);
        console.log('✅ Feed.tsx: Chains set successfully from API data');
      } catch (error) {
        if (isCancelled) {
          console.log('🛑 Feed.tsx: Request cancelled in catch block');
          return;
        }

        console.error('❌ Feed.tsx: Error in fetchFeedData from API call:', error);
        console.error('❌ Feed.tsx: Error stack:', error instanceof Error ? error.stack : 'No stack');
        console.error('❌ Feed.tsx: Error details:', {
          name: error instanceof Error ? error.name : 'Unknown',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });

        // Set appropriate error message
        const errorMessage = error instanceof Error ? error.message : 'Failed to load feed data';
        setError(errorMessage);

        // Show user-friendly error message - DISABLED FOR DEBUGGING
        console.log('🚫 Feed.tsx: Toast notification disabled for debugging');
        /*
        if (errorMessage.includes('timeout')) {
          toast({
            title: "Connection Timeout",
            description: "The request took too long to complete. Please check your connection and try again.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error Loading Feed",
            description: "Failed to load feed data. Please try again.",
            variant: "destructive"
          });
        }
        */

        // Fallback to empty array if API fails
        console.log('🔄 Feed.tsx: Setting empty chains array as fallback');
        setChains([]);
      } finally {
        if (!isCancelled) {
          console.log('🏁 Feed.tsx: Setting loading to false');
          setLoading(false);
          console.log('✅ Feed.tsx: fetchFeedData completed successfully');
        } else {
          console.log('🛑 Feed.tsx: fetchFeedData completed but was cancelled');
        }
      }
    };

    console.log('🔄 Feed.tsx: useEffect about to call fetchFeedData');
    fetchFeedData();

    return () => {
      console.log('🧹 Feed.tsx: useEffect cleanup - setting isCancelled to true');
      isCancelled = true;
    };
  }, [activeTab, user?.id]); // Only depend on user.id, not the whole user object

  const handleLike = async (chainId: string, requestId: string) => {
    console.log('❤️ Feed.tsx: handleLike called - API DISABLED', {
      chainId,
      requestId,
      user: user?.id,
      timestamp: new Date().toISOString()
    });

    if (!user) {
      console.log('🚫 Feed.tsx: No user, redirecting to auth');
      navigate('/auth');
      return;
    }

    try {
      console.log('🌐 Feed.tsx: LIKE API CALL DISABLED - Would have called:', API_ENDPOINTS.CREDITS_LIKE);
      console.log('📝 Feed.tsx: Would have sent payload:', {
        chain_id: chainId,
        request_id: requestId
      });

      // DISABLED API CALL - Using mock result instead
      // const result = await apiPost(API_ENDPOINTS.CREDITS_LIKE, {
      //   chain_id: chainId,
      //   request_id: requestId
      // });

      // Mock result for testing
      const result = {
        liked: !chains.find(c => c.id === chainId)?.isLiked,
        message: 'Mock like toggle'
      };

      console.log('✅ Feed.tsx: Mock like result:', result);

      // Update UI optimistically
      const updatedChains = chains.map(chain => {
        if (chain.id === chainId) {
          const updated = {
            ...chain,
            isLiked: result.liked,
            likesCount: result.liked ? chain.likesCount + 1 : chain.likesCount - 1
          };
          console.log('🔄 Feed.tsx: Updated chain like status:', updated);
          return updated;
        }
        return chain;
      });

      console.log('📊 Feed.tsx: Setting updated chains after like toggle');
      setChains(updatedChains);

      console.log('🚫 Feed.tsx: Toast notification disabled for debugging - would have shown:', {
        title: result.liked ? "Liked!" : "Removed like",
        description: "Your interest has been noted"
      });

      // DISABLED TOAST FOR DEBUGGING
      // toast({
      //   title: result.liked ? "Liked!" : "Removed like",
      //   description: "Your interest has been noted",
      // });
    } catch (error) {
      console.error('❌ Feed.tsx: Error in handleLike (should not happen with mock data):', error);
      console.error('❌ Feed.tsx: Like error stack:', error instanceof Error ? error.stack : 'No stack');

      console.log('🚫 Feed.tsx: Error toast disabled for debugging - would have shown error');
      // DISABLED ERROR TOAST FOR DEBUGGING
      // toast({
      //   title: "Error",
      //   description: "Failed to update like status",
      //   variant: "destructive"
      // });
    }
  };

  const handleJoinChainClick = async (chainId: string) => {
    console.log('🔗 Feed.tsx: handleJoinChainClick called - API DISABLED', {
      chainId,
      user: user?.id,
      timestamp: new Date().toISOString()
    });

    if (!user) {
      console.log('🚫 Feed.tsx: No user, redirecting to auth');
      navigate('/auth');
      return;
    }

    console.log('💰 Feed.tsx: CREDITS API CALL DISABLED - Would have called handleJoinChain');

    // DISABLED - Award credits for joining
    // const success = await handleJoinChain(chainId);

    // Mock success for testing
    const success = true;
    console.log('✅ Feed.tsx: Mock join chain success:', success);

    if (success) {
      console.log('🚫 Feed.tsx: Success toast disabled for debugging - would have shown join success');
      // DISABLED TOAST FOR DEBUGGING
      // toast({
      //   title: "Joined Chain!",
      //   description: "You earned 2 credits for joining this chain",
      // });
    }

    // Navigate to chain invite page
    console.log('🧭 Feed.tsx: Navigating to chain invite page:', `/r/${chainId}`);
    navigate(`/r/${chainId}`);
  };

  const handleUnlockChainClick = async (chainId: string, requiredCredits: number) => {
    console.log('🔓 Feed.tsx: handleUnlockChainClick called - API DISABLED', {
      chainId,
      requiredCredits,
      user: user?.id,
      currentCredits: credits,
      timestamp: new Date().toISOString()
    });

    if (!user) {
      console.log('🚫 Feed.tsx: No user, redirecting to auth');
      navigate('/auth');
      return;
    }

    if (credits < requiredCredits) {
      console.log('💸 Feed.tsx: Insufficient credits', {
        required: requiredCredits,
        current: credits,
        deficit: requiredCredits - credits
      });

      console.log('🚫 Feed.tsx: Insufficient credits toast disabled for debugging');
      // DISABLED TOAST FOR DEBUGGING
      // toast({
      //   title: "Insufficient Credits",
      //   description: `You need ${requiredCredits} credits to unlock this chain. Earn more by joining active chains!`,
      //   variant: "destructive"
      // });
      return;
    }

    console.log('💰 Feed.tsx: UNLOCK CHAIN API CALL DISABLED - Would have called handleUnlockChain');

    // DISABLED - Spend credits to unlock chain
    // const success = await handleUnlockChain(chainId, requiredCredits);

    // Mock success for testing
    const success = true;
    console.log('✅ Feed.tsx: Mock unlock chain success:', success);

    if (success) {
      const updatedChains = chains.map(chain => {
        if (chain.id === chainId) {
          const updated = { ...chain, canAccess: true };
          console.log('🔄 Feed.tsx: Updated chain access status:', updated);
          return updated;
        }
        return chain;
      });

      console.log('📊 Feed.tsx: Setting updated chains after unlock');
      setChains(updatedChains);

      console.log('🚫 Feed.tsx: Unlock success toast disabled for debugging');
      // DISABLED TOAST FOR DEBUGGING
      // toast({
      //   title: "Chain Unlocked!",
      //   description: `You can now view the details of this completed chain`,
      // });
    }
  };

  const activeChains = chains.filter(chain => chain.status === 'active');
  const completedChains = chains.filter(chain => chain.status === 'completed');

  console.log('📊 Feed.tsx: Component render state:', {
    loading,
    error,
    chainsCount: chains.length,
    activeChainCount: activeChains.length,
    completedChainCount: completedChains.length,
    activeTab,
    user: user?.id,
    credits,
    timestamp: new Date().toISOString()
  });

  const ChainCard = ({ chain }: { chain: FeedChain }) => {
    const isCompleted = chain.status === 'completed';
    const needsUnlock = isCompleted && !chain.canAccess;

    return (
      <Card className="hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={chain.creator.avatar} />
                <AvatarFallback>
                  {chain.creator.firstName[0]}{chain.creator.lastName[0]}
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
                    {new Date(chain.createdAt).toLocaleDateString()}
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

              {!isCompleted && (
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
                    <span>{chain.requiredCredits} credits to unlock</span>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                {!isCompleted && (
                  <Button
                    onClick={() => handleJoinChainClick(chain.id)}
                    size="sm"
                    className="flex items-center gap-1"
                  >
                    Join Chain
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}

                {isCompleted && needsUnlock && (
                  <Button
                    onClick={() => handleUnlockChainClick(chain.id, chain.requiredCredits!)}
                    size="sm"
                    variant="outline"
                    className="flex items-center gap-1"
                    disabled={credits < chain.requiredCredits!}
                  >
                    <Unlock className="w-4 h-4" />
                    Unlock ({chain.requiredCredits} credits)
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
    console.log('⏳ Feed.tsx: Rendering loading state');
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
    console.log('❌ Feed.tsx: Rendering error state:', error);
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold mb-2">Connection Error</h2>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button
            onClick={() => {
              console.log('🔄 Feed.tsx: Retry button clicked - reloading window');
              window.location.reload();
            }}
            variant="outline"
            className="mr-2"
          >
            Retry
          </Button>
          <Button
            onClick={() => {
              console.log('🏠 Feed.tsx: Go Home button clicked');
              navigate('/');
            }}
            variant="default"
          >
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  // Show limited feed for non-authenticated users
  if (!user) {
    console.log('👤 Feed.tsx: Rendering non-authenticated user view');
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-6">
          {/* Header for guest users */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold">6Degree Feed</h1>
              <p className="text-muted-foreground">
                Join the community to unlock all features
              </p>
            </div>

            <div className="flex items-center gap-4">
              <Button
                onClick={() => navigate('/auth')}
                variant="default"
                className="flex items-center gap-2"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/home')}
                variant="outline"
                className="flex items-center gap-2"
              >
                Learn More
              </Button>
            </div>
          </div>

          {/* Limited preview for guests */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {chains.slice(0, 3).map((chain) => (
              <Card key={chain.id} className="hover:shadow-lg transition-shadow duration-200 relative">
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex items-center justify-center rounded-lg">
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
                <ChainCard chain={{ ...chain, target: "Hidden", message: undefined }} />
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <h3 className="text-xl font-semibold mb-4">Join 6Degree to:</h3>
            <div className="grid gap-4 md:grid-cols-3 max-w-2xl mx-auto">
              <div className="text-center">
                <Users className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="font-medium">Join Chains</p>
                <p className="text-sm text-muted-foreground">Connect with others and earn rewards</p>
              </div>
              <div className="text-center">
                <Coins className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                <p className="font-medium">Earn Credits</p>
                <p className="text-sm text-muted-foreground">Get credits for helping others connect</p>
              </div>
              <div className="text-center">
                <Unlock className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="font-medium">Unlock Insights</p>
                <p className="text-sm text-muted-foreground">Access completed chain details</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  console.log('✅ Feed.tsx: Rendering main authenticated user view');

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
              <Settings className="w-4 h-4" />
              Dashboard
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(value) => {
          console.log('🔄 Feed.tsx: Tab changed', { from: activeTab, to: value });
          setActiveTab(value as 'active' | 'completed');
        }}>
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="active" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Active Chains ({activeChains.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              Completed ({completedChains.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {activeChains.map((chain) => (
                <ChainCard key={chain.id} chain={chain} />
              ))}
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
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {completedChains.map((chain) => (
                <ChainCard key={chain.id} chain={chain} />
              ))}
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
        </Tabs>
      </div>
    </div>
  );
  */
};

export default Feed;