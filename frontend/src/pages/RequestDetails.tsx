import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRequests, ConnectionRequest } from '@/hooks/useRequests';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
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
  AlertCircle
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChainVisualization } from '@/components/ChainVisualization';
import { RequestStatsChart } from '@/components/RequestStatsChart';
import { supabase } from '@/lib/supabase';

interface Chain {
  id: string;
  participants: Array<{
    userid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: 'creator' | 'forwarder' | 'target' | 'connector';
    joinedAt: string;
    rewardAmount?: number;
  }>;
  status: 'active' | 'completed' | 'failed';
  totalReward: number;
  completedAt?: string;
}

const RequestDetails = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState<ConnectionRequest | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRequestDetails = async () => {
      if (!requestId || !user) return;

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
            )
          `)
          .eq('id', requestId)
          .eq('creator_id', user.id) // Only allow viewing own requests
          .single();

        if (requestError) {
          throw new Error('Request not found or access denied');
        }

        // Format request data
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

        // Fetch chain data
        const { data: chainData, error: chainError } = await supabase
          .from('chains')
          .select('*')
          .eq('request_id', requestId)
          .single();

        if (chainError && chainError.code !== 'PGRST116') {
          console.error('Error fetching chain data:', chainError);
        } else if (chainData) {
          setChain(chainData);
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
  }, [requestId, user]);

  const copyLink = () => {
    if (request?.shareableLink) {
      navigator.clipboard.writeText(request.shareableLink);
      toast({
        title: "Link Copied!",
        description: "Share this link to continue building your connection chain.",
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
  const totalClicks = 0; // Real analytics data will be implemented later
  const totalShares = 0; // Real analytics data will be implemented later

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Request Details</h1>
          <p className="text-muted-foreground">Detailed view and analytics for your connection request</p>
        </div>
      </div>

      {/* Request Overview */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="text-xl">{request.target}</CardTitle>
              <CardDescription>
                {request.message || 'No additional message provided'}
              </CardDescription>
            </div>
            <Badge
              variant={getStatusColor(request.status, request.isExpired)}
              className="flex items-center gap-1"
            >
              {getStatusIcon(request.status, request.isExpired)}
              {request.isExpired ? 'Expired' : request.status}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium">${request.reward}</div>
                <div className="text-xs text-muted-foreground">Total Reward</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <div className="text-sm font-medium">{chainParticipants.length}</div>
                <div className="text-xs text-muted-foreground">Chain Length</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-purple-600" />
              <div>
                <div className="text-sm font-medium">{totalClicks}</div>
                <div className="text-xs text-muted-foreground">Total Clicks</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div>
                <div className="text-sm font-medium">
                  {new Date(request.expiresAt).toLocaleDateString()}
                </div>
                <div className="text-xs text-muted-foreground">Expires</div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button onClick={copyLink} variant="outline">
              <Copy className="w-4 h-4 mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" asChild>
              <a href={request.shareableLink} target="_blank" rel="noopener noreferrer">
                <Share2 className="w-4 h-4 mr-2" />
                View Public Page
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="chain" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="chain">Chain Visualization</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="participants">Participants</TabsTrigger>
        </TabsList>

        <TabsContent value="chain" className="space-y-4">
          <ChainVisualization requests={[request]} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Request Performance</CardTitle>
                <CardDescription>Click-through rates and engagement</CardDescription>
              </CardHeader>
              <CardContent>
                <RequestStatsChart requests={[request]} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Chain Growth</CardTitle>
                <CardDescription>How your chain has grown over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">Chain growth analytics coming soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="participants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Chain Participants</CardTitle>
              <CardDescription>
                Everyone who has joined your connection chain
              </CardDescription>
            </CardHeader>
            <CardContent>
              {chainParticipants.length === 0 ? (
                <div className="text-center py-8">
                  <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No participants yet</h3>
                  <p className="text-muted-foreground">Share your link to get people to join the chain</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {chainParticipants.map((participant, index) => (
                    <Card key={participant.userid} className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-sm font-medium">
                          {index + 1}
                        </div>
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {(participant.firstName?.[0] || '') + (participant.lastName?.[0] || '')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">
                              {participant.firstName} {participant.lastName}
                            </span>
                            <Badge variant="outline" className="text-xs capitalize">
                              {participant.role}
                            </Badge>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {participant.email}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Joined {new Date(participant.joinedAt).toLocaleDateString()}
                          </div>
                        </div>
                        {participant.rewardAmount !== undefined && (
                          <Badge variant="outline" className="bg-success/10 text-success">
                            ${participant.rewardAmount}
                          </Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default RequestDetails;