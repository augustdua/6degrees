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
  };
  currentUserId: string;
}

const UserProfileModal = ({ isOpen, onClose, user, currentUserId }: UserProfileModalProps) => {
  const [isInviting, setIsInviting] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);

  const sendConnectionInvitation = async () => {
    if (!currentUserId) {
      alert('Please log in to send invitations');
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase
        .from('connection_invitations')
        .insert({
          sender_id: currentUserId,
          recipient_id: user.id || `target-${user.name}`,
          status: 'pending',
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