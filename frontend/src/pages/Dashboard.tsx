import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Users,
  Link as LinkIcon,
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
  RefreshCw
} from 'lucide-react';
import { ChainVisualization } from '@/components/ChainVisualization';
import { RequestStatsChart } from '@/components/RequestStatsChart';
import InviteNotifications from '@/components/InviteNotifications';
import { Link } from 'react-router-dom';

interface DashboardStats {
  totalRequests: number;
  activeRequests: number;
  completedRequests: number;
  expiredRequests: number;
  totalClicks: number;
  totalChainParticipants: number;
  totalRewardsPaid: number;
  averageChainLength: number;
}

const Dashboard = () => {
  const { user, signOut, loading: authLoading, isReady } = useAuth();
  const { getMyChains } = useRequests();
  const location = useLocation();
  const navigate = useNavigate();
  const [myChains, setMyChains] = useState<any[]>([]);
  const [chainsLoading, setChainsLoading] = useState(false);
  const [showCreatedOnly, setShowCreatedOnly] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalRequests: 0,
    activeRequests: 0,
    completedRequests: 0,
    expiredRequests: 0,
    totalClicks: 0,
    totalChainParticipants: 0,
    totalRewardsPaid: 0,
    averageChainLength: 0,
  });

  useEffect(() => {
    if (user && isReady) {
      loadMyChains();
    }
  }, [user, isReady, loadMyChains]);

  const loadMyChains = useCallback(async () => {
    if (!user || !isReady) return;

    setChainsLoading(true);
    try {
      const chains = await getMyChains();
      setMyChains(chains);
    } catch (error) {
      console.error('Failed to load chains:', error);
    } finally {
      setChainsLoading(false);
    }
  }, [getMyChains, user, isReady]);

  // Refresh data when returning to dashboard (e.g., after deletion)
  useEffect(() => {
    if (user && isReady && location.state?.refreshData) {
      loadMyChains();
      // Clear the state to prevent unnecessary re-fetching
      window.history.replaceState({}, document.title);
    }
  }, [location.state, user, isReady, loadMyChains]);

  useEffect(() => {
    if (myChains.length > 0) {
      calculateStats();
    }
  }, [myChains, calculateStats]);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/'); // Redirect to home page after logout
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const calculateStats = useCallback(async () => {
    // Calculate stats from myChains data
    const createdChains = myChains.filter(chain => {
      const userParticipant = chain.participants.find((p: any) => p.userid === user?.id);
      return userParticipant?.role === 'creator';
    });

    const totalRequests = createdChains.length;
    const activeRequests = createdChains.filter(c => c.status === 'active' && c.request && !c.request.isExpired).length;
    const completedRequests = createdChains.filter(c => c.status === 'completed').length;
    const expiredRequests = createdChains.filter(c => c.request?.isExpired || c.status === 'failed').length;

    // Calculate rewards from completed chains
    const totalRewardsPaid = myChains
      .filter(c => c.status === 'completed')
      .reduce((sum, c) => {
        const userParticipant = c.participants.find((p: any) => p.userid === user?.id);
        return sum + (userParticipant?.rewardAmount || 0);
      }, 0);

    // Calculate total participants across all chains user is involved in
    const totalChainParticipants = myChains.reduce((sum, chain) => {
      return sum + (chain.participants?.length || 0);
    }, 0);

    const averageChainLength = myChains.length > 0 ? totalChainParticipants / myChains.length : 0;

    setStats({
      totalRequests,
      activeRequests,
      completedRequests,
      expiredRequests,
      totalClicks: 0, // Real analytics data will be implemented later
      totalChainParticipants,
      totalRewardsPaid,
      averageChainLength,
    });
  }, [myChains, user?.id]);

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
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Redirect to home if user is not authenticated
  useEffect(() => {
    if (isReady && !user) {
      navigate('/');
    }
  }, [isReady, user, navigate]);

  // Don't render anything if user is not authenticated (will redirect)
  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with navigation */}
      <header className="flex justify-between items-center mb-6">
        <Button variant="ghost" asChild>
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </Button>
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </header>

      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-start">
          <div className="flex flex-col space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor your connection requests and network growth
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => loadMyChains()} disabled={chainsLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${chainsLoading ? 'animate-spin' : ''}`} />
              {chainsLoading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button asChild>
              <Link to="/create">
                <Plus className="w-4 h-4 mr-2" />
                Create Request
              </Link>
            </Button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalRequests}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeRequests} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Clicks</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClicks}</div>
              <p className="text-xs text-muted-foreground">
                Across all links
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chain Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalChainParticipants}</div>
              <p className="text-xs text-muted-foreground">
                Avg {stats.averageChainLength.toFixed(1)} per chain
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rewards Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${stats.totalRewardsPaid}</div>
              <p className="text-xs text-muted-foreground">
                {stats.completedRequests} completed
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="mychains" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mychains">My Chains</TabsTrigger>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="chains">Chain Visualization</TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="space-y-4">
            <InviteNotifications />
          </TabsContent>

          <TabsContent value="mychains" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>My Chains</CardTitle>
                    <CardDescription>
                      Connection chains you're participating in
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="chain-toggle" className="text-sm font-medium">
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
                ) : (() => {
                  // Filter chains based on toggle
                  const filteredChains = myChains.filter(chain => {
                    const userParticipant = chain.participants.find((p: any) => p.userid === user?.id);
                    const isCreator = userParticipant?.role === 'creator';
                    return showCreatedOnly ? isCreator : !isCreator;
                  });

                  if (filteredChains.length === 0) {
                    return (
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
                    );
                  }

                  return (
                    <div className="space-y-4">
                      {filteredChains.map((chain) => {
                      const userParticipant = chain.participants.find((p: any) => p.userid === user?.id);
                      const isCreator = userParticipant?.role === 'creator';

                      return (
                        <Card key={chain.id} className={`border-l-4 ${chain.status === 'completed' ? 'border-l-green-500' : chain.status === 'active' ? 'border-l-blue-500' : 'border-l-red-500'}`}>
                          <CardContent className="pt-6">
                            <div className="flex items-start justify-between">
                              <div className="space-y-2 flex-1">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold">{chain.request?.target || 'Unknown Target'}</h3>
                                  <Badge
                                    variant={chain.status === 'completed' ? 'default' : chain.status === 'active' ? 'secondary' : 'destructive'}
                                    className="flex items-center gap-1"
                                  >
                                    {chain.status === 'completed' && <CheckCircle className="h-3 w-3" />}
                                    {chain.status === 'active' && <Clock className="h-3 w-3" />}
                                    {chain.status === 'failed' && <AlertCircle className="h-3 w-3" />}
                                    {chain.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {isCreator ? 'Creator' : userParticipant?.role || 'Participant'}
                                  </Badge>
                                </div>

                                {chain.request?.message && (
                                  <p className="text-sm text-muted-foreground">{chain.request.message}</p>
                                )}

                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <div className="flex items-center gap-1">
                                    <DollarSign className="h-3 w-3" />
                                    ${chain.totalReward} total
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {chain.chainLength} participants
                                  </div>
                                  {userParticipant?.rewardAmount && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <DollarSign className="h-3 w-3" />
                                      ${userParticipant.rewardAmount} earned
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-2">
                                  {chain.request?.shareableLink && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigator.clipboard.writeText(chain.request.shareableLink)}
                                    >
                                      <Share2 className="h-4 w-4 mr-1" />
                                      Copy Link
                                    </Button>
                                  )}
                                  {chain.request?.id && (
                                    <Button variant="outline" size="sm" asChild>
                                      <Link to={`/request/${chain.request.id}`}>
                                        <Eye className="h-4 w-4 mr-1" />
                                        View Details
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <div className="text-right space-y-1">
                                <p className="text-xs text-muted-foreground">
                                  Joined {new Date(userParticipant?.joinedAt || chain.createdAt).toLocaleDateString()}
                                </p>
                                {chain.completedAt && (
                                  <p className="text-xs text-muted-foreground text-green-600">
                                    Completed {new Date(chain.completedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                })()}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Request Performance</CardTitle>
                  <CardDescription>Click-through rates and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <RequestStatsChart requests={myChains.filter(chain => {
                    const userParticipant = chain.participants.find((p: any) => p.userid === user?.id);
                    return userParticipant?.role === 'creator';
                  }).map(chain => chain.request).filter(Boolean)} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Success Rate</CardTitle>
                  <CardDescription>Completion rate of your requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Completed</span>
                      <span className="text-sm text-muted-foreground">
                        {stats.completedRequests}/{stats.totalRequests}
                      </span>
                    </div>
                    <Progress
                      value={(stats.completedRequests / Math.max(stats.totalRequests, 1)) * 100}
                      className="w-full"
                    />
                    <div className="grid grid-cols-3 gap-4 text-center text-sm">
                      <div>
                        <div className="font-semibold text-green-600">{stats.completedRequests}</div>
                        <div className="text-muted-foreground">Completed</div>
                      </div>
                      <div>
                        <div className="font-semibold text-blue-600">{stats.activeRequests}</div>
                        <div className="text-muted-foreground">Active</div>
                      </div>
                      <div>
                        <div className="font-semibold text-red-600">{stats.expiredRequests}</div>
                        <div className="text-muted-foreground">Expired</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="chains" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Chain Visualization</CardTitle>
                <CardDescription>
                  Visual representation of your connection chains
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChainVisualization requests={myChains.filter(chain => {
                  const userParticipant = chain.participants.find((p: any) => p.userid === user?.id);
                  return userParticipant?.role === 'creator';
                }).map(chain => chain.request).filter(Boolean)} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;