import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRequests, ConnectionRequest } from '@/hooks/useRequests';
import { getUserShareableLink } from '@/lib/chainsApi';
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
  AlertCircle,
  Trash2,
  XCircle,
  MessageSquare,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ChainVisualization } from '@/components/ChainVisualization';
import { RequestStatsChart } from '@/components/RequestStatsChart';
import TargetClaimsTab from '@/components/TargetClaimsTab';
import GroupChatModal from '@/components/GroupChatModal';
import { SocialShareModal } from '@/components/SocialShareModal';
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
    parentUserId?: string;
  }>;
  status: 'active' | 'completed' | 'failed';
  totalReward: number;
  completedAt?: string;
}

const RequestDetails = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, isReady } = useAuth();
  const { toast } = useToast();
  const [request, setRequest] = useState<ConnectionRequest | null>(null);
  const [chain, setChain] = useState<Chain | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGroupChat, setShowGroupChat] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareModalData, setShareModalData] = useState<{ link: string; target: string } | null>(null);

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
            )
          `)
          .eq('id', requestId)
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

        // Fetch chain data using maybeSingle to avoid 406 errors
        const { data: chainData, error: chainError } = await supabase
          .from('chains')
          .select('*')
          .eq('request_id', requestId)
          .maybeSingle();

        if (chainError) {
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
  }, [requestId, user, isReady]);

  const handleShare = () => {
    // Get user's personal shareable link from chain, fallback to original request link
    const userShareableLink = chain && user?.id
      ? getUserShareableLink(chain, user.id)
      : null;

    const linkToShare = userShareableLink || request?.shareableLink;

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

    const linkToShare = userShareableLink || request?.shareableLink;

    if (linkToShare) {
      navigator.clipboard.writeText(linkToShare);
      toast({
        title: "Link Copied!",
        description: "Share this link to continue building the connection chain.",
      });
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
  const totalClicks = 0; // Real analytics data will be implemented later
  const totalShares = 0; // Real analytics data will be implemented later

  // Check if current user is the creator of the request
  const isCreator = request.creator.id === user.id;

  return (
    <div className="container mx-auto px-4 py-4 md:py-8">
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
          <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
              <div>
                <div className="text-sm font-medium">{convertAndFormatINR(request.reward)}</div>
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
            <Button onClick={handleShare} variant="outline" size="sm" className="text-xs md:text-sm">
              <Share2 className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Share
            </Button>
            <Button onClick={copyLink} variant="outline" size="sm" className="text-xs md:text-sm">
              <Copy className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
              Copy Link
            </Button>
            <Button variant="outline" size="sm" className="text-xs md:text-sm" asChild>
              <a href={request.shareableLink} target="_blank" rel="noopener noreferrer">
                <Eye className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">View Public Page</span>
                <span className="sm:hidden">View Page</span>
              </a>
            </Button>

            {/* Group Chat Button - show if chain exists and has participants */}
            {chain && chainParticipants.length > 1 && (
              <Button
                onClick={() => setShowGroupChat(true)}
                variant="outline"
                size="sm"
                className="text-xs md:text-sm"
              >
                <MessageSquare className="w-3 h-3 md:w-4 md:h-4 mr-1 md:mr-2" />
                <span className="hidden sm:inline">Group Chat</span>
                <span className="sm:hidden">Chat</span>
              </Button>
            )}

            {/* Creator-only buttons */}
            {isCreator && (
              <>
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
      <ChainVisualization requests={[request]} />

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
    </div>
  );
};

export default RequestDetails;