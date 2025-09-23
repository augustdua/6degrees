import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Mail,
  Users,
  DollarSign,
  Check,
  X,
  Clock,
  User
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useInvites, PendingInvite } from '@/hooks/useInvites';

export default function InviteNotifications() {
  const { pendingInvites, loading, acceptInvite, rejectInvite, getPendingInvites } = useInvites();
  const { toast } = useToast();
  const [processingInvites, setProcessingInvites] = useState<Set<string>>(new Set());

  useEffect(() => {
    getPendingInvites();
  }, [getPendingInvites]);

  const handleAcceptInvite = async (inviteId: string) => {
    setProcessingInvites(prev => new Set([...prev, inviteId]));

    try {
      const result = await acceptInvite(inviteId);

      toast({
        title: "Invite Accepted!",
        description: `You've joined the connection chain. Share your new link to continue building connections.`,
      });

      // Optionally show the new shareable link
      if (result.new_shareable_link) {
        toast({
          title: "New Link Generated",
          description: "Copy your new shareable link from the chain details.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to accept invite",
        variant: "destructive",
      });
    } finally {
      setProcessingInvites(prev => {
        const newSet = new Set(prev);
        newSet.delete(inviteId);
        return newSet;
      });
    }
  };

  const handleRejectInvite = async (inviteId: string) => {
    setProcessingInvites(prev => new Set([...prev, inviteId]));

    try {
      await rejectInvite(inviteId, "Not interested at this time");

      toast({
        title: "Invite Declined",
        description: "You've declined this connection invite.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reject invite",
        variant: "destructive",
      });
    } finally {
      setProcessingInvites(prev => {
        const newSet = new Set(prev);
        newSet.delete(inviteId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
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
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-sm text-muted-foreground">Loading invites...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingInvites.length === 0) {
    return (
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
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          Connection Invites
          <Badge variant="secondary">{pendingInvites.length}</Badge>
        </CardTitle>
        <CardDescription>Pending invitations to join connection chains</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {pendingInvites.map((invite) => (
            <Card key={invite.inviteId} className="border-l-4 border-l-blue-500">
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {/* Header with inviter info */}
                  <div className="flex items-start gap-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback>
                        <User className="w-5 h-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{invite.inviterName}</h4>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="w-3 h-3 mr-1" />
                          Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        invited you to join a connection chain
                      </p>
                    </div>
                  </div>

                  {/* Connection target info */}
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-primary" />
                      <h5 className="font-medium">Connection Target:</h5>
                    </div>
                    <p className="text-sm mb-3">{invite.target}</p>

                    {invite.message && (
                      <div className="mb-3">
                        <p className="text-sm text-muted-foreground">{invite.message}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        <span className="text-sm font-medium">${invite.reward} reward</span>
                      </div>
                    </div>
                  </div>

                  {/* Invite message */}
                  {invite.inviteMessage && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <p className="text-sm">{invite.inviteMessage}</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => handleAcceptInvite(invite.inviteId)}
                      disabled={processingInvites.has(invite.inviteId)}
                      className="flex-1"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      {processingInvites.has(invite.inviteId) ? 'Accepting...' : 'Accept Invite'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleRejectInvite(invite.inviteId)}
                      disabled={processingInvites.has(invite.inviteId)}
                      className="flex-1"
                    >
                      <X className="w-4 h-4 mr-2" />
                      {processingInvites.has(invite.inviteId) ? 'Declining...' : 'Decline'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}