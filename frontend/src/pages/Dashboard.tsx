import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
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
  const { user, logout } = useAuth();
  const { requests, loading, getMyRequests } = useRequests();
  const location = useLocation();
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
    if (user) {
      getMyRequests();
    }
  }, [user, getMyRequests]);

  // Refresh data when returning to dashboard (e.g., after deletion)
  useEffect(() => {
    if (user && location.state?.refreshData) {
      getMyRequests();
      // Clear the state to prevent unnecessary re-fetching
      window.history.replaceState({}, document.title);
    }
  }, [location.state, user, getMyRequests]);

  useEffect(() => {
    if (requests.length > 0) {
      calculateStats();
    }
  }, [requests]);

  const calculateStats = async () => {
    const totalRequests = requests.length;
    const activeRequests = requests.filter(r => r.status === 'active' && !r.isExpired).length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    const expiredRequests = requests.filter(r => r.isExpired || r.status === 'expired').length;

    // Calculate real analytics from actual request data
    const totalRewardsPaid = requests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.reward, 0);

    // Fetch real chain participants from Supabase
    let totalChainParticipants = 0;
    try {
      const { data: chains, error } = await supabase
        .from('chains')
        .select('participants')
        .in('request_id', requests.map(r => r.id));

      if (!error && chains) {
        totalChainParticipants = chains.reduce((sum, chain) => {
          return sum + (chain.participants?.length || 0);
        }, 0);
      }
    } catch (error) {
      console.error('Error fetching chain participants:', error);
    }

    const averageChainLength = totalRequests > 0 ? totalChainParticipants / totalRequests : 0;

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

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground">Please log in to view your dashboard.</p>
        </div>
      </div>
    );
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
        <Button variant="outline" onClick={logout}>
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
            <Button variant="outline" onClick={() => getMyRequests()} disabled={loading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Refreshing...' : 'Refresh'}
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

        <Tabs defaultValue="invites" className="space-y-4">
          <TabsList>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            <TabsTrigger value="requests">My Requests</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="chains">Chain Visualization</TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="space-y-4">
            <InviteNotifications />
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connection Requests</CardTitle>
                <CardDescription>
                  Manage and track your connection requests
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-2 text-sm text-muted-foreground">Loading requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-8">
                    <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No requests yet</h3>
                    <p className="text-muted-foreground mb-4">Create your first connection request to get started</p>
                    <Button asChild>
                      <Link to="/create">Create Request</Link>
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requests.map((request) => (
                      <Card key={request.id} className="border-l-4 border-l-primary/20">
                        <CardContent className="pt-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-2 flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold">{request.target}</h3>
                                <Badge
                                  variant={getStatusColor(request.status, request.isExpired)}
                                  className="flex items-center gap-1"
                                >
                                  {getStatusIcon(request.status, request.isExpired)}
                                  {request.isExpired ? 'Expired' : request.status}
                                </Badge>
                              </div>

                              {request.message && (
                                <p className="text-sm text-muted-foreground">{request.message}</p>
                              )}

                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3" />
                                  ${request.reward}
                                </div>
                                <div className="flex items-center gap-1">
                                  <Eye className="h-3 w-3" />
                                  0 clicks
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  0 participants
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => navigator.clipboard.writeText(request.shareableLink)}
                                >
                                  <Share2 className="h-4 w-4 mr-1" />
                                  Copy Link
                                </Button>
                                <Button variant="outline" size="sm" asChild>
                                  <Link to={`/request/${request.id}`}>
                                    View Details
                                  </Link>
                                </Button>
                              </div>
                            </div>

                            <div className="text-right space-y-1">
                              <p className="text-xs text-muted-foreground">
                                Created {new Date(request.createdAt).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Expires {new Date(request.expiresAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
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
                  <RequestStatsChart requests={requests} />
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
                <ChainVisualization requests={requests} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;