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
import { useAnalytics } from '@/hooks/useAnalytics';
import { getAvatarColor, getInitials } from '@/lib/avatarUtils';
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
  XCircle,
  Eye,
} from 'lucide-react';

interface UserCardProps {
  user: DiscoveredUser;
  onSendConnectionRequest: (userId: string, message?: string) => Promise<void>;
  loading?: boolean;
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
  const { trackProfileView, trackLinkClick } = useAnalytics();

  // Track profile view when card is displayed
  useEffect(() => {
    trackProfileView(user.userId);
  }, [user.userId, trackProfileView]);

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
        <Button variant="outline" size="sm" disabled>
          <CheckCircle className="h-3 w-3 mr-1" />
          Connected
        </Button>
      );
    }

    if (user.hasPendingRequest) {
      return (
        <Button variant="outline" size="sm" disabled>
          <Clock className="h-3 w-3 mr-1" />
          Request Sent
        </Button>
      );
    }

    return (
      <Dialog open={showConnectionModal} onOpenChange={setShowConnectionModal}>
        <DialogTrigger asChild>
          <Button size="sm" disabled={loading}>
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
    <Card className="transition-all hover:shadow-md">
      <CardContent className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
          {/* Avatar & Basic Info */}
          <div className="flex items-start space-x-3 sm:flex-col sm:space-x-0 sm:space-y-2">
            <Link to={`/profile/${user.userId}`}>
              <Avatar className="h-12 w-12 sm:h-16 sm:w-16 flex-shrink-0 hover:scale-105 transition-transform cursor-pointer hover:ring-2 hover:ring-primary">
                <AvatarImage src={user.avatarUrl} alt={`${user.firstName} ${user.lastName}`} />
                <AvatarFallback className={`text-sm sm:text-lg bg-gradient-to-br ${getAvatarColor(user.userId)}`}>
                  {getInitials(user.firstName, user.lastName)}
                </AvatarFallback>
              </Avatar>
            </Link>

            <div className="sm:hidden flex-1">
              <Link to={`/profile/${user.userId}`}>
                <h3 className="font-semibold text-base hover:text-primary transition-colors cursor-pointer">
                  {user.firstName} {user.lastName}
                </h3>
              </Link>
              {user.company && user.role && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Building className="h-3 w-3" />
                  <span className="truncate">{user.role} at {user.company}</span>
                </p>
              )}
            </div>

            <div className="sm:hidden">
              {renderConnectionButton()}
            </div>
          </div>

          {/* Profile Info - Desktop */}
          <div className="hidden sm:block flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <Link to={`/profile/${user.userId}`}>
                  <h3 className="font-semibold text-lg hover:text-primary transition-colors cursor-pointer">
                    {user.firstName} {user.lastName}
                  </h3>
                </Link>
                {user.company && user.role && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    {user.role} at {user.company}
                  </p>
                )}
              </div>
              {renderConnectionButton()}
            </div>

            {/* Bio */}
            {user.bio && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {user.bio}
              </p>
            )}

            {/* Details */}
            <div className="space-y-2">
              {user.location && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {user.location}
                </div>
              )}

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Active {formatLastActive(user.lastActive)}
              </div>

              {user.mutualConnections > 0 && (
                <div className="flex items-center gap-1 text-xs text-blue-600">
                  <Users className="h-3 w-3" />
                  {user.mutualConnections} mutual connection{user.mutualConnections !== 1 ? 's' : ''}
                </div>
              )}
            </div>

            {/* Skills & Interests */}
            {(user.skills && user.skills.length > 0) && (
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {user.skills.slice(0, 3).map((skill, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {user.skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{user.skills.length - 3} more
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Actions - Desktop */}
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                asChild
                className="text-xs"
              >
                <Link to={`/profile/${user.userId}`}>
                  <Eye className="h-3 w-3" />
                  <span className="hidden sm:inline">View Profile</span>
                </Link>
              </Button>

              {user.isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChat(true)}
                  className="text-xs"
                >
                  <MessageSquare className="h-3 w-3" />
                  <span className="hidden sm:inline">Message</span>
                </Button>
              )}

              {user.linkedinUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs"
                >
                  <a
                    href={user.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                    onClick={() => trackLinkClick(user.userId, 'linkedin_profile', user.linkedinUrl, 'discover_people')}
                  >
                    <Linkedin className="h-3 w-3" />
                    <span className="hidden sm:inline">LinkedIn</span>
                    <ExternalLink className="h-2 w-2" />
                  </a>
                </Button>
              )}

              {user.email && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs"
                >
                  <a
                    href={`mailto:${user.email}`}
                    className="flex items-center gap-1"
                    onClick={() => trackLinkClick(user.userId, 'email', `mailto:${user.email}`, 'discover_people')}
                  >
                    <MessageSquare className="h-3 w-3" />
                    <span className="hidden sm:inline">Email</span>
                    <ExternalLink className="h-2 w-2" />
                  </a>
                </Button>
              )}
            </div>
          </div>

          {/* Mobile Info & Actions */}
          <div className="sm:hidden space-y-3">
            {/* Bio */}
            {user.bio && (
              <p className="text-sm text-muted-foreground line-clamp-3">
                {user.bio}
              </p>
            )}

            {/* Details */}
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {user.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{user.location}</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Active {formatLastActive(user.lastActive)}
              </div>

              {user.mutualConnections > 0 && (
                <div className="flex items-center gap-1 text-blue-600">
                  <Users className="h-3 w-3" />
                  {user.mutualConnections} mutual
                </div>
              )}
            </div>

            {/* Skills */}
            {(user.skills && user.skills.length > 0) && (
              <div className="flex flex-wrap gap-1">
                {user.skills.slice(0, 2).map((skill, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {user.skills.length > 2 && (
                  <Badge variant="outline" className="text-xs">
                    +{user.skills.length - 2}
                  </Badge>
                )}
              </div>
            )}

            {/* Actions - Mobile */}
            <div className="flex gap-2">
              {user.isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChat(true)}
                  className="text-xs flex-1"
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
                  className="text-xs flex-1"
                >
                  <a
                    href={user.linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1"
                    onClick={() => trackLinkClick(user.userId, 'linkedin_profile', user.linkedinUrl, 'discover_people_mobile')}
                  >
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
                  </a>
                </Button>
              )}

              {user.email && !user.isConnected && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="text-xs flex-1"
                >
                  <a
                    href={`mailto:${user.email}`}
                    className="flex items-center justify-center gap-1"
                    onClick={() => trackLinkClick(user.userId, 'email', `mailto:${user.email}`, 'discover_people_mobile')}
                  >
                    <MessageSquare className="h-3 w-3" />
                    Email
                  </a>
                </Button>
              )}
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