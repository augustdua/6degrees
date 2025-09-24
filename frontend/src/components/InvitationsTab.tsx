import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  UserPlus,
  Check,
  X,
  Mail,
  Clock
} from 'lucide-react';

interface ConnectionInvitation {
  id: string;
  sender_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: {
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
  };
}

const InvitationsTab = () => {
  const { user } = useAuth();
  const [invitations, setInvitations] = useState<ConnectionInvitation[]>([]);
  const [sentInvitations, setSentInvitations] = useState<ConnectionInvitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadInvitations();
    }
  }, [user]);

  const loadInvitations = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load received invitations
      const { data: receivedData, error: receivedError } = await supabase
        .from('connection_invitations')
        .select(`
          *,
          sender:users!sender_id (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('recipient_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (receivedError) throw receivedError;

      // Load sent invitations
      const { data: sentData, error: sentError } = await supabase
        .from('connection_invitations')
        .select(`
          *,
          recipient:users!recipient_id (
            first_name,
            last_name,
            email,
            avatar_url
          )
        `)
        .eq('sender_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (sentError) throw sentError;

      setInvitations(receivedData || []);
      setSentInvitations(sentData || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToInvitation = async (invitationId: string, status: 'accepted' | 'rejected') => {
    try {
      const { error } = await supabase
        .from('connection_invitations')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', invitationId);

      if (error) throw error;

      // Remove from pending list
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));

      // If accepted, create connection record
      if (status === 'accepted') {
        const invitation = invitations.find(inv => inv.id === invitationId);
        if (invitation) {
          const { error: connectionError } = await supabase
            .from('connections')
            .insert({
              user1_id: invitation.sender_id,
              user2_id: invitation.recipient_id,
              created_at: new Date().toISOString()
            });

          if (connectionError) {
            console.error('Error creating connection:', connectionError);
          }
        }
      }
    } catch (error) {
      console.error('Error responding to invitation:', error);
      alert('Failed to respond to invitation');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-sm text-muted-foreground">Loading invitations...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Received Invitations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Connection Requests
          </CardTitle>
          <CardDescription>People who want to connect with you</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length === 0 ? (
            <div className="text-center py-8">
              <UserPlus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No pending requests</h3>
              <p className="text-muted-foreground">You're all caught up! Check back later for new connection requests.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={invitation.sender?.avatar_url} />
                      <AvatarFallback>
                        {invitation.sender?.first_name?.[0]}{invitation.sender?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">
                          {invitation.sender?.first_name} {invitation.sender?.last_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(invitation.created_at).toLocaleDateString()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{invitation.sender?.email}</p>
                      <p className="text-sm text-muted-foreground mt-1">wants to connect with you</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => respondToInvitation(invitation.id, 'accepted')}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respondToInvitation(invitation.id, 'rejected')}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sent Invitations */}
      {sentInvitations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Sent Requests
            </CardTitle>
            <CardDescription>Connection requests you've sent</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sentInvitations.map((invitation) => (
                <Card key={invitation.id} className="p-4 bg-muted/50">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(invitation as any).recipient?.avatar_url} />
                      <AvatarFallback>
                        {(invitation as any).recipient?.first_name?.[0]}{(invitation as any).recipient?.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">
                          {(invitation as any).recipient?.first_name} {(invitation as any).recipient?.last_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sent on {new Date(invitation.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default InvitationsTab;