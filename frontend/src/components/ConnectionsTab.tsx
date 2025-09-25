import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useConnections } from '@/hooks/useConnections';
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
  RefreshCw
} from 'lucide-react';

const ConnectionsTab = () => {
  const { connections, loading, error, fetchConnections, removeConnection } = useConnections();
  const [searchQuery, setSearchQuery] = useState('');
  const [removing, setRemoving] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Your Connections
            {connections.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {connections.length}
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            People you're connected with through successful connection requests
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchConnections} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

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

      <div className="space-y-4">
        {filteredConnections.map((connection) => (
          <Card key={connection.connectionId} className="transition-all hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
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

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
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

      {/* Connection Tips */}
      {connections.length > 0 && (
        <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-blue-800 dark:text-blue-200">
              💡 Connection Tips
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
              <li>• These are people who have successfully helped complete your connection requests</li>
              <li>• You can reach out to them directly via LinkedIn or email for professional networking</li>
              <li>• Removing a connection doesn't delete the successful request - it just removes them from this list</li>
              <li>• Your connection network grows as more people help you reach your targets</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ConnectionsTab;