import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
  BarChart3
} from 'lucide-react';

const Dashboard = () => {
  const { user, signOut, loading: authLoading, isReady } = useAuth();
  const { getMyChains } = useRequests();
  const navigate = useNavigate();
  const [myChains, setMyChains] = useState([]);
  const [chainsLoading, setChainsLoading] = useState(false);
  const [showCreatedOnly, setShowCreatedOnly] = useState(true);

  // Load chains using the useRequests hook
  const loadChains = async () => {
    if (!user || !isReady) return;

    setChainsLoading(true);
    try {
      console.log('Loading chains for user:', user.id);
      const chains = await getMyChains();
      console.log('Loaded chains:', chains);
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
            <Button variant="outline" onClick={loadChains} disabled={chainsLoading}>
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
              <CardTitle className="text-sm font-medium">My Chains</CardTitle>
              <Network className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{myChains.length}</div>
              <p className="text-xs text-muted-foreground">
                Total participating
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Created</CardTitle>
              <Plus className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {myChains.filter(chain => {
                  const userParticipant = chain.participants.find(p => p.userid === user?.id);
                  return userParticipant?.role === 'creator';
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Chains you created
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Joined</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {myChains.filter(chain => {
                  const userParticipant = chain.participants.find(p => p.userid === user?.id);
                  return userParticipant?.role !== 'creator';
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Chains you joined
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {myChains.filter(chain => chain.status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Currently active
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="mychains" className="space-y-4">
          <TabsList>
            <TabsTrigger value="mychains">My Chains</TabsTrigger>
            <TabsTrigger value="invites">Invites</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="invites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Connection Invites
                </CardTitle>
                <CardDescription>Pending invitations to join connection chains</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No pending invites</h3>
                  <p className="text-muted-foreground">You're all caught up! Check back later for new connection opportunities.</p>
                </div>
              </CardContent>
            </Card>
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
                  <div className="space-y-4">
                    {filteredChains.map((chain) => {
                      const userParticipant = chain.participants.find(p => p.userid === user?.id);
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
                                    ${chain.total_reward} total
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {chain.participants?.length || 0} participants
                                  </div>
                                  {userParticipant?.rewardAmount && (
                                    <div className="flex items-center gap-1 text-green-600">
                                      <DollarSign className="h-3 w-3" />
                                      ${userParticipant.rewardAmount} earned
                                    </div>
                                  )}
                                </div>

                                {/* Show participants if there are any */}
                                {chain.participants && chain.participants.length > 0 && (
                                  <div className="mt-3">
                                    <p className="text-xs text-muted-foreground mb-2">Participants:</p>
                                    <div className="flex flex-wrap gap-2">
                                      {chain.participants.map((participant, index) => (
                                        <div key={participant.userid} className="flex items-center gap-1 bg-muted px-2 py-1 rounded text-xs">
                                          <span className="font-medium">
                                            {participant.firstName} {participant.lastName}
                                          </span>
                                          <Badge variant="outline" className="text-xs">
                                            {participant.role}
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center gap-2">
                                  {chain.request?.shareable_link && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => navigator.clipboard.writeText(chain.request.shareable_link)}
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
                                  Joined {new Date(userParticipant?.joinedAt || chain.created_at).toLocaleDateString()}
                                </p>
                                {chain.completed_at && (
                                  <p className="text-xs text-muted-foreground text-green-600">
                                    Completed {new Date(chain.completed_at).toLocaleDateString()}
                                  </p>
                                )}
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

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Request Performance</CardTitle>
                  <CardDescription>Click-through rates and engagement</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Analytics coming soon</p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chain Growth</CardTitle>
                  <CardDescription>How your chains have grown over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8">
                    <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Chain growth analytics coming soon</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;