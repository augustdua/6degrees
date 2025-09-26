import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/lib/supabase';
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Briefcase,
  UserPlus,
  CheckCircle
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    id?: string;
    name: string;
    email?: string;
    avatar?: string;
    bio?: string;
    role?: string;
    joinedAt?: string;
    isTarget?: boolean;
    linkedinUrl?: string;
  };
  currentUserId: string;
}

const UserProfileModal = ({ isOpen, onClose, user, currentUserId }: UserProfileModalProps) => {
  const [isInviting, setIsInviting] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);

  // Debug logging
  React.useEffect(() => {
    if (isOpen) {
      console.log('UserProfileModal opened with user data:', user);
      console.log('User LinkedIn URL:', user.linkedinUrl);
    }
  }, [isOpen, user]);

  const sendConnectionInvitation = async () => {
    if (!currentUserId) {
      alert('Please log in to send invitations');
      return;
    }

    setIsInviting(true);
    try {
      // First, create a connection request for this user
      // DO NOT include creator_id - database will set it automatically from auth.uid()
      const linkId = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
      const { data: requestData, error: requestError } = await supabase
        .from('connection_requests')
        .insert({
          target: user.name,
          message: `Platform invite for ${user.name}`,
          reward: 10, // Minimum reward for platform invites
          shareable_link: `${window.location.origin}/r/${linkId}`
        })
        .select()
        .single();

      if (requestError) {
        console.error('Error creating connection request:', requestError);
        alert('Failed to create connection request. Please try again.');
        return;
      }

      // Then create an invite for this connection request
      const { data, error } = await supabase
        .from('invites')
        .insert({
          request_id: requestData.id,
          inviter_id: currentUserId,
          invitee_email: user.email || '',
          invitee_id: user.id,
          invite_link: `${window.location.origin}/r/${requestData.id}`,
          message: `You have been invited to connect with ${user.name}`,
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        })
        .select();

      if (error) {
        console.error('Error sending invitation:', error);
        alert('Failed to send invitation. Please try again.');
        return;
      }

      setInvitationSent(true);
      console.log('Invitation sent:', data);
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={user.avatar} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-xl mb-1">{user.name}</DialogTitle>
              {user.email && (
                <DialogDescription className="flex items-center gap-1 mb-2">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </DialogDescription>
              )}
              {user.role && (
                <Badge variant="outline" className="text-xs">
                  <Briefcase className="h-3 w-3 mr-1" />
                  {user.role}
                </Badge>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {user.bio && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <User className="h-4 w-4" />
                About
              </h4>
              <p className="text-sm text-muted-foreground">{user.bio}</p>
            </div>
          )}

          {user.joinedAt && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Member Since
              </h4>
              <p className="text-sm text-muted-foreground">
                {new Date(user.joinedAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          )}

          {user.isTarget && (
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-purple-600">
                <MapPin className="h-4 w-4" />
                Connection Target
              </h4>
              <p className="text-sm text-muted-foreground">
                This person is a target in a connection chain. Connect with them to expand your network!
              </p>
            </div>
          )}

          {/* LinkedIn Profile Embed */}
          {user.linkedinUrl && user.linkedinUrl.trim() && (
            <div>
              <h4 className="font-semibold mb-2 flex items-center gap-2 text-blue-600">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn Profile
              </h4>
              <div className="bg-muted/50 p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-3">
                  Click below to view their professional LinkedIn profile:
                </p>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <a href={user.linkedinUrl} target="_blank" rel="noopener noreferrer">
                    <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                    View LinkedIn Profile
                  </a>
                </Button>
              </div>
            </div>
          )}
        </div>

        <Separator className="my-4" />

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          {!invitationSent ? (
            <Button
              onClick={sendConnectionInvitation}
              disabled={isInviting}
              className="bg-primary hover:bg-primary/90"
            >
              {isInviting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Send Connection Request
                </>
              )}
            </Button>
          ) : (
            <Button disabled className="bg-green-600">
              <CheckCircle className="h-4 w-4 mr-2" />
              Invitation Sent!
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserProfileModal;