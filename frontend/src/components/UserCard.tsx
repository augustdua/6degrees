import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DiscoveredUser } from '@/hooks/usePeople';
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
              <Avatar className="h-12 w-12">
                <AvatarImage src={user.avatarUrl} />
                <AvatarFallback>
                  {user.firstName[0]}{user.lastName[0]}
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
                placeholder="Hi, I'd like to connect with you on 6Degrees..."
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
      <CardContent className="p-4">
        <div className="flex items-start space-x-4">
          {/* Avatar */}
          <Avatar className="h-16 w-16">
            <AvatarImage src={user.avatarUrl} />
            <AvatarFallback className="text-lg">
              {user.firstName[0]}{user.lastName[0]}
            </AvatarFallback>
          </Avatar>

          {/* Profile Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h3 className="font-semibold text-lg">
                  {user.firstName} {user.lastName}
                </h3>
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

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
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
                  >
                    <Linkedin className="h-3 w-3" />
                    LinkedIn
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
                  >
                    <MessageSquare className="h-3 w-3" />
                    Email
                    <ExternalLink className="h-2 w-2" />
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserCard;