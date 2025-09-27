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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { credits, handleJoinChain, handleUnlockChain } = useCredits();
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [chains, setChains] = useState<FeedChain[]>([]);
  const [loading, setLoading] = useState(true);


  // Fetch real feed data from API
  useEffect(() => {
    const fetchFeedData = async () => {
      setLoading(true);

      try {
        // Get feed data based on active tab
        const feedData = await apiGet(`${API_ENDPOINTS.FEED_DATA}?status=${activeTab}&limit=20&offset=0`);
        setChains(feedData || []);
      } catch (error) {
        console.error('Error fetching feed data:', error);
        // Fallback to empty array if API fails
        setChains([]);
      } finally {
        setLoading(false);
      }
    };

    fetchFeedData();
  }, [activeTab, user]);

  const handleLike = async (chainId: string, requestId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      const result = await apiPost(API_ENDPOINTS.CREDITS_LIKE, {
        chain_id: chainId,
        request_id: requestId
      });

      // Update UI optimistically
      const updatedChains = chains.map(chain => {
        if (chain.id === chainId) {
          return {
            ...chain,
            isLiked: result.liked,
            likesCount: result.liked ? chain.likesCount + 1 : chain.likesCount - 1
          };
        }
        return chain;
      });

      setChains(updatedChains);

      toast({
        title: result.liked ? "Liked!" : "Removed like",
        description: "Your interest has been noted",
      });
    } catch (error) {
      console.error('Error toggling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like status",
        variant: "destructive"
      });
    }
  };

  const handleJoinChainClick = async (chainId: string) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // Award credits for joining
    const success = await handleJoinChain(chainId);

    if (success) {
      toast({
        title: "Joined Chain!",
        description: "You earned 2 credits for joining this chain",
      });
    }

    // Navigate to chain invite page
    navigate(`/r/${chainId}`);
  };

  const handleUnlockChainClick = async (chainId: string, requiredCredits: number) => {
    if (!user) {
      navigate('/auth');
      return;
    }

    if (credits < requiredCredits) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${requiredCredits} credits to unlock this chain. Earn more by joining active chains!`,
        variant: "destructive"
      });
      return;
    }

    // Spend credits to unlock chain
    const success = await handleUnlockChain(chainId, requiredCredits);

    if (success) {
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
    }
  };

  const activeChains = chains.filter(chain => chain.status === 'active');
  const completedChains = chains.filter(chain => chain.status === 'completed');

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
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading feed...</p>
        </div>
      </div>
    );
  }

  // Show limited feed for non-authenticated users
  if (!user) {
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
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'active' | 'completed')}>
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
};

export default Feed;