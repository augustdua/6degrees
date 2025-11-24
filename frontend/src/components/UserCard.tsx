import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DiscoveredUser } from '@/hooks/usePeople';
import ChatModal from './ChatModal';
import ProfileCollage from './ProfileCollage';
import { useAnalytics } from '@/hooks/useAnalytics';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';
import { apiGet } from '@/lib/api';
import {
  Building,
  MapPin,
  Users,
  Linkedin,
  ExternalLink,
  UserPlus,
  MessageSquare,
  Clock,
  CheckCircle,
  Building2,
  Mail,
} from 'lucide-react';

interface UserCardProps {
  user: DiscoveredUser;
  onSendConnectionRequest: (userId: string, message?: string) => Promise<void>;
  loading?: boolean;
}

interface CollageOrganization {
  id: string;
  name: string;
  logo_url: string | null;
  source: 'own' | 'featured_connection';
}

const UserCard: React.FC<UserCardProps> = ({
  user,
  onSendConnectionRequest,
  loading = false
}) => {
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [collageOrgs, setCollageOrgs] = useState<CollageOrganization[]>([]);
  const { trackProfileView, trackLinkClick } = useAnalytics();

  // Track profile view when card is displayed
  useEffect(() => {
    if (user?.userId) {
      trackProfileView(user.userId);
    }
  }, [user?.userId, trackProfileView]);

  // Load profile collage data
  useEffect(() => {
    const loadCollageData = async () => {
      if (!user?.userId) return;
      
      try {
        // Use backend API instead of direct RPC (which hangs in Telegram Mini App)
        const profileData = await apiGet(`/api/profile/${user.userId}`);
        if (!profileData) return;

        const orgs: CollageOrganization[] = [];
        
        // Add user's own organizations
        if (profileData.organizations) {
          profileData.organizations.forEach((org: any) => {
            if (org.logo_url) {
              orgs.push({
                id: org.id,
                name: org.name,
                logo_url: org.logo_url,
                source: 'own'
              });
            }
          });
        }
        
        setCollageOrgs(orgs.slice(0, 8)); // Limit to 8 for the card
      } catch (err) {
        // Silent fail for UI polish
      }
    };

    loadCollageData();
  }, [user?.userId]);

  if (!user) return null;

  const handleSendRequest = async () => {
    setSending(true);
    try {
      await onSendConnectionRequest(user.userId, connectionMessage);
      setShowConnectionModal(false);
      setConnectionMessage('');
    } catch (error) {
      console.error('Error sending connection request:', error);
    } finally {
      setSending(false);
    }
  };

  const formatLastActive = (lastActive?: string) => {
    if (!lastActive) return 'Never';
    const date = new Date(lastActive);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const renderConnectionButton = () => {
    if (user.isConnected) {
      return (
        <Button variant="outline" size="sm" disabled className="w-full">
          <CheckCircle className="h-3 w-3 mr-1" />
          Connected
        </Button>
      );
    }

    if (user.hasPendingRequest) {
      return (
        <Button variant="outline" size="sm" disabled className="w-full">
          <Clock className="h-3 w-3 mr-1" />
          Request Sent
        </Button>
      );
    }

    return (
      <Dialog open={showConnectionModal} onOpenChange={setShowConnectionModal}>
        <DialogTrigger asChild>
          <Button size="sm" disabled={loading} className="w-full">
            <UserPlus className="h-3 w-3 mr-1" />
            Connect
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Connection Request</DialogTitle>
            <DialogDescription>
              Send a connection request to {user.firstName} {user.lastName}
            </DialogDescription>
          </DialogHeader>
            <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Avatar className="h-12 w-12 hover:scale-105 transition-transform">
                <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(user.userId)}`}>
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h4 className="font-medium">
                  {user.firstName} {user.lastName}
                </h4>
                {user.company && user.role && (
                  <p className="text-sm text-muted-foreground">
                    {user.role} at {user.company}
                  </p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Message (Optional)
              </label>
              <Textarea
                placeholder="Hi, I'd like to connect with you on 6Degree..."
                value={connectionMessage}
                onChange={(e) => setConnectionMessage(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {connectionMessage.length}/300 characters
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConnectionModal(false)}
              disabled={sending}
            >
              Cancel
            </Button>
            <Button onClick={handleSendRequest} disabled={sending}>
              {sending ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                  Sending...
                </>
              ) : (
                'Send Request'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 overflow-hidden border border-border hover:border-primary bg-card">
      <CardContent className="p-0">
        {/* Header with Collage Background */}
        <Link to={`/profile/${user.userId}`} className="block">
          <div className="relative h-40 bg-muted overflow-hidden flex items-center justify-center">
            {collageOrgs.length > 0 ? (
              <div className="absolute inset-0 flex items-center justify-center z-0">
                <ProfileCollage organizations={collageOrgs} size="compact" />
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted z-0">
                <Building2 className="h-16 w-16 text-muted-foreground/30" />
              </div>
            )}
            
            {/* Simple gradient overlay for readability */}
            <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent z-10" />
            
            {/* Connection Status Badge */}
            {user.isConnected && (
              <div className="absolute top-3 right-3 z-20">
                <Badge className="bg-white text-black border-0">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
            )}
            
            {user.hasPendingRequest && !user.isConnected && (
              <div className="absolute top-3 right-3 z-20">
                <Badge className="bg-white text-black border-0">
                  <Clock className="h-3 w-3 mr-1" />
                  Pending
                </Badge>
              </div>
            )}
          </div>
        </Link>

        {/* Profile Content */}
        <div className="p-4 pt-0 relative">
          {/* Avatar */}
          <div className="flex justify-center -mt-12 mb-3 relative z-30">
            <Link to={`/profile/${user.userId}`}>
              <Avatar className="h-24 w-24 border-4 border-background ring-2 ring-border hover:ring-primary transition-all shadow-md">
                <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className={`text-2xl font-bold bg-gradient-to-br ${getAvatarColor(user.userId)}`}>
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>

          {/* Name & Title */}
          <div className="text-center mb-3">
            <Link to={`/profile/${user.userId}`}>
              <h3 className="font-bold text-lg hover:text-primary transition-colors cursor-pointer line-clamp-1">
                {user.firstName} {user.lastName}
              </h3>
            </Link>
            {user.company && user.role && (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1 mt-1">
                <Building className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{user.role} at {user.company}</span>
              </p>
            )}
          </div>

          {/* Bio */}
          {user.bio && (
            <p className="text-xs text-muted-foreground text-center mb-3 line-clamp-2 min-h-[2.5rem]">
              {user.bio}
            </p>
          )}

          {/* Stats */}
          <div className="flex items-center justify-center gap-4 mb-3 pb-3 border-b">
            {user.location && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-[80px]">{user.location}</span>
              </div>
            )}

            {user.mutualConnections > 0 && (
              <div className="flex items-center gap-1 text-xs text-primary font-medium">
                <Users className="h-3 w-3 flex-shrink-0" />
                <span>{user.mutualConnections} mutual</span>
              </div>
            )}
          </div>

          {/* Skills */}
          {(user.skills && user.skills.length > 0) && (
            <div className="flex flex-wrap gap-1 justify-center mb-3">
              {user.skills.slice(0, 3).map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-[10px] px-2 py-0">
                  {skill}
                </Badge>
              ))}
              {user.skills.length > 3 && (
                <Badge variant="outline" className="text-[10px] px-2 py-0">
                  +{user.skills.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Primary Action */}
            <div className="w-full">
              {renderConnectionButton()}
            </div>

            {/* Secondary Actions */}
            <div className="flex gap-1.5">
              {user.isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChat(true)}
                  className="flex-1 text-xs h-8"
                >
                  <MessageSquare className="h-3 w-3 mr-1" />
                  Message
                </Button>
              )}

              {user.linkedinUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex-1 text-xs h-8"
                >
                  <a
                    href={user.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => {
                      e.stopPropagation();
                      trackLinkClick(user.userId, 'linkedin_profile', user.linkedinUrl, 'discover_people');
                    }}
                  >
                    <Linkedin className="h-3 w-3 mr-1" />
                    LinkedIn
                  </a>
                </Button>
              )}

              {user.email && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="flex-1 text-xs h-8"
                >
                  <a
                    href={`mailto:${user.email}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      trackLinkClick(user.userId, 'email', `mailto:${user.email}`, 'discover_people');
                    }}
                  >
                    <Mail className="h-3 w-3 mr-1" />
                    Email
                  </a>
                </Button>
              )}
            </div>

            {/* Last Active */}
            <div className="text-center">
              <span className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
                <Clock className="h-2.5 w-2.5" />
                Active {formatLastActive(user.lastActive)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>

      {/* Chat Modal */}
      <ChatModal
        isOpen={showChat}
        onClose={() => setShowChat(false)}
        otherUserId={user.userId}
        otherUserName={`${user.firstName} ${user.lastName}`}
        otherUserAvatar={user.avatarUrl}
      />
    </Card>
  );
};

export default UserCard;
