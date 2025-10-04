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
import { ChainParticipant } from '@/lib/chainsApi';
import {
  User,
  Mail,
  Calendar,
  MapPin,
  Briefcase,
  UserPlus,
  CheckCircle,
  Building2,
  GraduationCap
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
    organizations?: Array<{
      id: string;
      position: string;
      is_current: boolean;
      organization_type?: 'work' | 'education';
      organization: {
        id: string;
        name: string;
        logo_url: string | null;
        domain: string;
        industry: string | null;
      };
    }>;
  };
  currentUserId: string;
  participant?: ChainParticipant;
}

const UserProfileModal = ({ isOpen, onClose, user, currentUserId, participant }: UserProfileModalProps) => {
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
      // Send a direct connection request (for dashboard display)
      const { data, error } = await supabase
        .from('direct_connection_requests')
        .insert({
          sender_id: currentUserId,
          receiver_id: user.id,
          message: `Connection request from network graph`,
          status: 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error sending connection request:', error);
        alert('Failed to send connection request. Please try again.');
        return;
      }

      setInvitationSent(true);
      console.log('Connection request sent:', data);
    } catch (error) {
      console.error('Error sending connection request:', error);
      alert('Failed to send connection request. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const initials = user.name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
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

          {/* Organizations */}
          {user.organizations && user.organizations.length > 0 && (
            <div>
              {/* Work Experience */}
              {user.organizations.filter(o => o.organization_type === 'work' || !o.organization_type).length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    Work Experience
                  </h4>
                  <div className="space-y-2">
                    {user.organizations
                      .filter(o => o.organization_type === 'work' || !o.organization_type)
                      .map((org) => (
                        <div key={org.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage src={org.organization.logo_url || undefined} />
                            <AvatarFallback>
                              <Building2 className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{org.organization.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{org.position}</p>
                            {org.organization.industry && (
                              <p className="text-xs text-muted-foreground truncate">{org.organization.industry}</p>
                            )}
                          </div>
                          {org.is_current && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">Current</Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Education */}
              {user.organizations.filter(o => o.organization_type === 'education').length > 0 && (
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    Education
                  </h4>
                  <div className="space-y-2">
                    {user.organizations
                      .filter(o => o.organization_type === 'education')
                      .map((org) => (
                        <div key={org.id} className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
                          <Avatar className="h-12 w-12 flex-shrink-0">
                            <AvatarImage src={org.organization.logo_url || undefined} />
                            <AvatarFallback>
                              <GraduationCap className="h-6 w-6" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{org.organization.name}</p>
                            <p className="text-sm text-muted-foreground truncate">{org.position}</p>
                          </div>
                          {org.is_current && (
                            <Badge variant="secondary" className="text-xs flex-shrink-0">Current</Badge>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
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