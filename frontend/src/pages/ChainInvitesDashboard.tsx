import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useRequests } from '@/hooks/useRequests';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft,
  UserPlus,
  Users,
  Share2,
  Copy,
  Send,
  CheckCircle,
  Clock,
  AlertCircle,
  ExternalLink,
  Mail,
  MessageSquare,
  DollarSign,
  User,
  Search
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { convertAndFormatINR } from '@/lib/currency';
import GuestRequestView from '@/components/GuestRequestView';

type InviteStatus = 'pending' | 'accepted' | 'rejected' | string;

interface ChainInvite {
  id: string;
  requestId: string;
  chainId: string;
  shareableLink: string;
  status: InviteStatus;
  createdAt: string;
  request: {
    target: string;
    reward: number;
    message?: string;
    creator: {
      firstName: string;
      lastName: string;
      avatar?: string;
    };
  };
}

interface PlatformUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  isConnected?: boolean;
}

const ChainInvitesDashboard = () => {
  const { linkId } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, isReady } = useAuth();
  const { request, chain, loading, error, getRequestByLink } = useRequests();
  const { toast } = useToast();

  // Dashboard state
  const [invites, setInvites] = useState<ChainInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  // Invite system state
  const [platformUsers, setPlatformUsers] = useState<PlatformUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);

  // If linkId exists, show individual chain invite
  useEffect(() => {
    if (linkId) {
      getRequestByLink(linkId);
    }
  }, [linkId, getRequestByLink]);

  // Fetch user's chain invites
  useEffect(() => {
    if (user && !linkId) {
      fetchChainInvites();
      fetchPlatformUsers();
    }
  }, [user, linkId]);

  const fetchChainInvites = async () => {
    if (!user) return;

    setInvitesLoading(true);
    try {
      // This would fetch invites received by the user
      // For now, we'll show a placeholder
      const { data, error } = await supabase
        .from('chain_invites')
        .select(`
          *,
          request:connection_requests (
            target,
            reward,
            message,
            creator:users (
              first_name,
              last_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Transform data to match interface
      const transformedInvites: ChainInvite[] = (data || []).map((invite: any) => ({
        id: invite.id,
        requestId: invite.request_id,
        chainId: invite.chain_id,
        shareableLink: invite.shareable_link,
        status: (invite.status as InviteStatus) || 'pending',
        createdAt: invite.created_at,
        request: {
          target: invite.request.target,
          reward: invite.request.reward,
          message: invite.request.message,
          creator: {
            firstName: invite.request.creator.first_name,
            lastName: invite.request.creator.last_name,
            avatar: invite.request.creator.avatar_url,
          },
        },
      }));

      setInvites(transformedInvites);
    } catch (err) {
      console.error('Failed to fetch chain invites:', err);
      setInvites([]); // Show empty state for now
    } finally {
      setInvitesLoading(false);
    }
  };

  const fetchPlatformUsers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, first_name, last_name, email, avatar_url')
        .neq('id', user.id) // Exclude current user
        .limit(50);

      if (error) throw error;

      const transformedUsers = (data || []).map(u => ({
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        email: u.email,
        avatar: u.avatar_url,
        isConnected: false, // TODO: Check actual connection status
      }));

      setPlatformUsers(transformedUsers);
    } catch (err) {
      console.error('Failed to fetch platform users:', err);
    }
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u.id));
    }
    setSelectAll(!selectAll);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const sendPlatformInvites = async (requestId: string) => {
    if (selectedUsers.length === 0) return;

    setSendingInvites(true);
    try {
      // Send invites to selected platform users
      const invitePromises = selectedUsers.map(userId =>
        supabase.from('chain_invites').insert({
          user_id: userId,
          request_id: requestId,
          shareable_link: '', // backend trigger can populate or client can update later
          message: customMessage,
          status: 'pending'
        })
      );

      await Promise.all(invitePromises);

      toast({
        title: "Invites Sent!",
        description: `Sent ${selectedUsers.length} invites to platform users.`,
      });

      setSelectedUsers([]);
      setCustomMessage('');
      setSelectAll(false);
    } catch (error) {
      console.error('Failed to send invites:', error);
      toast({
        title: "Error",
        description: "Failed to send invites. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingInvites(false);
    }
  };

  const copyShareableLink = (link: string) => {
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied!",
      description: "Share this link on social media or with non-platform users.",
    });
  };

  const filteredUsers = platformUsers.filter(user =>
    `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Show loading while auth is still initializing
  if (authLoading || !isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not logged in and trying to access dashboard
  if (!user && !linkId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h1 className="text-2xl font-bold mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-6">Please log in to view your chain invites.</p>
          <Button onClick={() => navigate('/auth')} className="w-full">
            Sign In
          </Button>
        </div>
      </div>
    );
  }

  // If linkId exists, show individual chain invite
  if (linkId) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading chain invite...</p>
          </div>
        </div>
      );
    }

    if (error || !request) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <h1 className="text-2xl font-bold mb-4">Invite Not Found</h1>
            <p className="text-muted-foreground mb-6">{error || 'This chain invite could not be found.'}</p>
            <div className="space-y-3">
              {user ? (
                <Button onClick={() => navigate('/chain-invites')} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Chain Invites
                </Button>
              ) : (
                <Button onClick={() => navigate('/')} className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header with Back Button */}
          <div className="flex items-center gap-4 mb-8">
            {user ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/chain-invites')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Invites
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            )}
            <div>
              <h1 className="text-2xl font-bold">Chain Invite</h1>
              <p className="text-muted-foreground">Join this connection chain</p>
            </div>
          </div>

          {/* Main Content */}
          <GuestRequestView
            request={request}
            chain={chain}
            linkId={linkId}
          />
        </div>
      </div>
    );
  }

  // Show dashboard view
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Chain Invites</h1>
            <p className="text-muted-foreground">Manage your chain invitations and invite others</p>
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="received" className="space-y-6">
          <TabsList>
            <TabsTrigger value="received">Received Invites</TabsTrigger>
            <TabsTrigger value="send">Send Invites</TabsTrigger>
          </TabsList>

          {/* Received Invites Tab */}
          <TabsContent value="received" className="space-y-6">
            {invitesLoading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading invites...</p>
              </div>
            ) : invites.length === 0 ? (
              <Card className="text-center py-12">
                <CardContent>
                  <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Chain Invites Yet</h3>
                  <p className="text-muted-foreground mb-4">
                    You haven't received any chain invitations yet. When someone invites you to join their connection chain, they'll appear here.
                  </p>
                  <Button variant="outline" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {invites.map((invite) => (
                  <Card key={invite.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-4">
                          <Avatar>
                            <AvatarImage src={invite.request.creator.avatar} />
                            <AvatarFallback>
                              <User className="w-4 h-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <CardTitle className="text-lg">
                              {invite.request.creator.firstName} {invite.request.creator.lastName}
                            </CardTitle>
                            <CardDescription>
                              Invited you to help connect with: <strong>{invite.request.target}</strong>
                            </CardDescription>
                          </div>
                        </div>
                        <Badge
                          variant={
                            invite.status === 'accepted' ? 'default' :
                            invite.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {invite.status === 'accepted' && <CheckCircle className="w-3 h-3 mr-1" />}
                          {invite.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                          {invite.status === 'rejected' && <AlertCircle className="w-3 h-3 mr-1" />}
                          {invite.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {invite.request.message && (
                        <p className="text-muted-foreground mb-4">{invite.request.message}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span className="font-semibold">{convertAndFormatINR(invite.request.reward)}</span>
                            <span className="text-muted-foreground">reward</span>
                          </div>
                        </div>
                        <div className="space-x-2">
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => navigate(`/r/${invite.shareableLink.split('/').pop()}`)}
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                          {invite.status === 'pending' && (
                            <>
                              <Button variant="outline" size="sm">
                                Decline
                              </Button>
                              <Button size="sm">
                                Join Chain
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Send Invites Tab */}
          <TabsContent value="send" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Invite Platform Users</CardTitle>
                <CardDescription>
                  Invite other 6Degree users to join your connection chains
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Search */}
                <div className="space-y-2">
                  <Label htmlFor="search">Search Users</Label>
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
                    <Input
                      id="search"
                      placeholder="Search by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Select All */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="select-all"
                    checked={selectAll}
                    onCheckedChange={handleSelectAll}
                  />
                  <Label htmlFor="select-all" className="font-medium">
                    Select All ({filteredUsers.length} users)
                  </Label>
                </div>

                {/* User List */}
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={user.id}
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleUserSelect(user.id)}
                      />
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>
                          {user.firstName[0]}{user.lastName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Custom Message */}
                <div className="space-y-2">
                  <Label htmlFor="message">Custom Message (Optional)</Label>
                  <Textarea
                    id="message"
                    placeholder="Add a personal message to your invitation..."
                    value={customMessage}
                    onChange={(e) => setCustomMessage(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Send Button */}
                <Button
                  onClick={() => sendPlatformInvites('dummy-request-id')}
                  disabled={selectedUsers.length === 0 || sendingInvites}
                  className="w-full"
                >
                  {sendingInvites ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invites ({selectedUsers.length})
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Social Sharing */}
            <Card>
              <CardHeader>
                <CardTitle>Share on Social Media</CardTitle>
                <CardDescription>
                  Share your chain links with users not on the platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => copyShareableLink('https://example.com/r/sample-link')}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button variant="outline">
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button variant="outline">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button variant="outline">
                      <Share2 className="w-4 h-4 mr-2" />
                      LinkedIn
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share these links on social media or send directly to people who aren't on 6Degree yet.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ChainInvitesDashboard;