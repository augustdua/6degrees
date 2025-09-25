import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useConnections } from '@/hooks/useConnections';
import { usePeople } from '@/hooks/usePeople';
import ChatModal from './ChatModal';
import {
  Users,
  Search,
  ExternalLink,
  UserMinus,
  Calendar,
  Linkedin,
  Mail,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Inbox,
  Send,
  UserPlus,
  UserCheck,
  MessageSquare
} from 'lucide-react';

const ConnectionsTab = () => {
  const { connections, loading, error, fetchConnections, removeConnection } = useConnections();
  const {
    connectionRequests,
    respondToConnectionRequest,
    cancelConnectionRequest,
    getPendingRequestsCount,
    getSentRequestsCount,
  } = usePeople();

  const [searchQuery, setSearchQuery] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('connections');
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  const filteredConnections = connections.filter(connection =>
    `${connection.firstName} ${connection.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    connection.bio?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRemoveConnection = async (connectionId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from your connections?`)) {
      return;
    }

    setRemoving(connectionId);
    try {
      await removeConnection(connectionId);
      alert('Connection removed successfully');
    } catch (error) {
      console.error('Error removing connection:', error);
      alert('Failed to remove connection. Please try again.');
    } finally {
      setRemoving(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading && connections.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-muted h-12 w-12"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          Failed to load connections: {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={fetchConnections}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  const pendingRequestsCount = getPendingRequestsCount();
  const sentRequestsCount = getSentRequestsCount();

  const receivedRequests = connectionRequests.filter(req =>
    req.status === 'pending' && req.receiverId
  );

  const sentRequests = connectionRequests.filter(req =>
    req.status === 'pending' && req.senderId
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            My Network
          </h3>
          <p className="text-sm text-muted-foreground">
            Manage your connections and connection requests
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchConnections} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="connections" className="text-xs sm:text-sm px-2 py-2 flex-col sm:flex-row">
            <Users className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Connections</span>
            <span className="sm:hidden text-xs">Connections</span>
            {connections.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1 sm:ml-2">
                {connections.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="received" className="text-xs sm:text-sm px-2 py-2 flex-col sm:flex-row">
            <Inbox className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Received</span>
            <span className="sm:hidden text-xs">Received</span>
            {pendingRequestsCount > 0 && (
              <Badge variant="destructive" className="text-xs ml-1 sm:ml-2">
                {pendingRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-xs sm:text-sm px-2 py-2 flex-col sm:flex-row">
            <Send className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Sent</span>
            <span className="sm:hidden text-xs">Sent</span>
            {sentRequestsCount > 0 && (
              <Badge variant="secondary" className="text-xs ml-1 sm:ml-2">
                {sentRequestsCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Connections Tab */}
        <TabsContent value="connections" className="space-y-4">

      {/* Search */}
      {connections.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search connections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Empty State */}
      {connections.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No Connections Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              When your connection requests are completed, you'll see your connections here.
            </p>
            <p className="text-xs text-muted-foreground">
              Create connection requests and have others reach your targets to start building your network!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Connections List */}
      {filteredConnections.length === 0 && searchQuery && connections.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No connections found matching "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      )}

      <div className="space-y-3 sm:space-y-4">
        {filteredConnections.map((connection) => (
          <Card key={connection.connectionId} className="transition-all hover:shadow-md">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-start space-y-3 sm:space-y-0 sm:space-x-4">
                {/* Mobile Layout */}
                <div className="sm:hidden">
                  <div className="flex items-start space-x-3">
                    {/* Avatar */}
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={connection.avatarUrl} />
                      <AvatarFallback className="text-sm">
                        {connection.firstName[0]}{connection.lastName[0]}
                      </AvatarFallback>
                    </Avatar>

                    {/* Basic Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-base">
                            {connection.firstName} {connection.lastName}
                          </h4>
                          <Badge variant="outline" className="text-xs mt-1">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Connected
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Details */}
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{connection.email}</span>
                    </div>

                    {connection.bio && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {connection.bio}
                      </p>
                    )}

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(connection.connectedAt)}
                    </div>
                  </div>

                  {/* Mobile Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        console.log('🔍 Connection object:', connection);
                        console.log('🔍 Setting chatUser with id:', connection.userId);
                        setChatUser({
                          id: connection.userId,
                          name: `${connection.firstName} ${connection.lastName}`,
                          avatar: connection.avatarUrl
                        });
                        setShowChat(true);
                      }}
                      className="flex-1 text-xs"
                    >
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Message
                    </Button>

                    {connection.linkedinUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="flex-1 text-xs"
                      >
                        <a
                          href={connection.linkedinUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1"
                        >
                          <Linkedin className="h-3 w-3" />
                          LinkedIn
                        </a>
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                      onClick={() => handleRemoveConnection(
                        connection.connectionId,
                        `${connection.firstName} ${connection.lastName}`
                      )}
                      disabled={removing === connection.connectionId}
                    >
                      {removing === connection.connectionId ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                      ) : (
                        <UserMinus className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Desktop Layout */}
                <div className="hidden sm:flex sm:items-start sm:space-x-4 sm:flex-1">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={connection.avatarUrl} />
                    <AvatarFallback>
                      {connection.firstName[0]}{connection.lastName[0]}
                    </AvatarFallback>
                  </Avatar>

                  {/* Profile Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-lg">
                        {connection.firstName} {connection.lastName}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Connected
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {connection.email}
                      </div>

                      {connection.bio && (
                        <p className="text-sm text-muted-foreground">
                          {connection.bio}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Connected on {formatDate(connection.connectedAt)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Actions */}
                <div className="hidden sm:flex sm:items-center sm:gap-2 sm:ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      console.log('🔍 Connection object (desktop):', connection);
                      console.log('🔍 Setting chatUser with id (desktop):', connection.userId);
                      setChatUser({
                        id: connection.userId,
                        name: `${connection.firstName} ${connection.lastName}`,
                        avatar: connection.avatarUrl
                      });
                      setShowChat(true);
                    }}
                  >
                    <MessageSquare className="h-3 w-3 mr-1" />
                    Message
                  </Button>

                  {connection.linkedinUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                    >
                      <a
                        href={connection.linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleRemoveConnection(
                      connection.connectionId,
                      `${connection.firstName} ${connection.lastName}`
                    )}
                    disabled={removing === connection.connectionId}
                  >
                    {removing === connection.connectionId ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-1"></div>
                        Removing...
                      </>
                    ) : (
                      <>
                        <UserMinus className="h-3 w-3 mr-1" />
                        Remove
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

        </TabsContent>

        {/* Received Requests Tab */}
        <TabsContent value="received" className="space-y-4">
          {receivedRequests.length > 0 ? (
            <div className="space-y-4">
              {receivedRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.senderProfile?.avatarUrl} />
                          <AvatarFallback>
                            {request.senderProfile?.firstName?.[0]}{request.senderProfile?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {request.senderProfile?.firstName} {request.senderProfile?.lastName}
                          </h4>
                          {request.senderProfile?.company && (
                            <p className="text-sm text-muted-foreground">
                              {request.senderProfile.role} at {request.senderProfile.company}
                            </p>
                          )}
                          {request.message && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">
                              "{request.message}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Sent {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => respondToConnectionRequest(request.id, 'accepted')}
                        >
                          <UserCheck className="h-3 w-3 mr-1" />
                          Accept
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => respondToConnectionRequest(request.id, 'rejected')}
                        >
                          Decline
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Inbox className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h4 className="font-semibold mb-2">No Pending Requests</h4>
                <p className="text-sm text-muted-foreground">
                  When people send you connection requests, they'll appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sent Requests Tab */}
        <TabsContent value="sent" className="space-y-4">
          {sentRequests.length > 0 ? (
            <div className="space-y-4">
              {sentRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={request.receiverProfile?.avatarUrl} />
                          <AvatarFallback>
                            {request.receiverProfile?.firstName?.[0]}{request.receiverProfile?.lastName?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-medium">
                            {request.receiverProfile?.firstName} {request.receiverProfile?.lastName}
                          </h4>
                          {request.receiverProfile?.company && (
                            <p className="text-sm text-muted-foreground">
                              {request.receiverProfile.role} at {request.receiverProfile.company}
                            </p>
                          )}
                          {request.message && (
                            <p className="text-sm mt-2 p-2 bg-muted rounded">
                              "{request.message}"
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            <Calendar className="h-3 w-3 inline mr-1" />
                            Sent {new Date(request.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelConnectionRequest(request.id)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Send className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <h4 className="font-semibold mb-2">No Sent Requests</h4>
                <p className="text-sm text-muted-foreground">
                  Connection requests you send will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Chat Modal */}
      {showChat && chatUser && (
        <>
          {console.log('🔍 Rendering ChatModal with chatUser:', chatUser)}
          <ChatModal
            isOpen={showChat}
            onClose={() => {
              setShowChat(false);
              setChatUser(null);
            }}
            otherUserId={chatUser.id}
            otherUserName={chatUser.name}
            otherUserAvatar={chatUser.avatar}
          />
        </>
      )}
    </div>
  );
};

export default ConnectionsTab;