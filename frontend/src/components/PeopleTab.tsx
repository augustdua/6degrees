import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePeople, PeopleSearchFilters } from '@/hooks/usePeople';
import UserCard from './UserCard';
import {
  Users,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Inbox,
  Send,
  UserCheck,
} from 'lucide-react';

const PeopleTab = () => {
  const {
    discoveredUsers,
    connectionRequests,
    loading,
    error,
    hasMore,
    discoverUsers,
    sendConnectionRequest,
    respondToConnectionRequest,
    cancelConnectionRequest,
    getPendingRequestsCount,
    getSentRequestsCount,
  } = usePeople();

  const [searchQuery, setSearchQuery] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [excludeConnected, setExcludeConnected] = useState(false);
  const [activeTab, setActiveTab] = useState('discover');

  // Load data when component mounts (only happens when tab is active now)
  useEffect(() => {
    console.log('🔵 PeopleTab: Component mounted', {
      discoveredUsersLength: discoveredUsers.length,
      loading,
      connectionRequestsLength: connectionRequests.length
    });
    
    if (discoveredUsers.length === 0 && !loading) {
      console.log('🔵 PeopleTab: Triggering discoverUsers...');
      discoverUsers({ excludeConnected: false }, 20, 0, false);
    } else {
      console.log('🔵 PeopleTab: Skipping load (already have data or loading)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount
  
  // Monitor state changes
  useEffect(() => {
    console.log('🔵 PeopleTab: State changed', {
      discoveredUsersLength: discoveredUsers.length,
      loading,
      error
    });
  }, [discoveredUsers.length, loading, error]);

  const handleSearch = useCallback(() => {
    const filters: PeopleSearchFilters = {
      search: searchQuery || undefined,
      company: companyFilter || undefined,
      location: locationFilter || undefined,
      excludeConnected: excludeConnected,
    };
    discoverUsers(filters, 20, 0, false);
  }, [searchQuery, companyFilter, locationFilter, excludeConnected, discoverUsers]);

  const handleLoadMore = useCallback(() => {
    const filters: PeopleSearchFilters = {
      search: searchQuery || undefined,
      company: companyFilter || undefined,
      location: locationFilter || undefined,
      excludeConnected: excludeConnected,
    };
    discoverUsers(filters, 20, discoveredUsers.length, true);
  }, [searchQuery, companyFilter, locationFilter, excludeConnected, discoveredUsers.length, discoverUsers]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setCompanyFilter('');
    setLocationFilter('');
    setExcludeConnected(false);
    discoverUsers({ excludeConnected: false }, 20, 0, false);
  };

  const handleConnectionRequest = async (userId: string, message?: string) => {
    try {
      await sendConnectionRequest(userId, message);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const pendingRequestsCount = getPendingRequestsCount();
  const sentRequestsCount = getSentRequestsCount();

  const receivedRequests = connectionRequests.filter(req =>
    req.status === 'pending' && req.receiverId === connectionRequests.find(() => true)?.receiverId
  );

  const sentRequests = connectionRequests.filter(req =>
    req.status === 'pending' && req.senderId === connectionRequests.find(() => true)?.senderId
  );

  if (error && !discoveredUsers.length && !connectionRequests.length) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          Failed to load people: {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={() => discoverUsers({ excludeConnected: false })}
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
            People
          </h3>
          <p className="text-sm text-muted-foreground">
            Discover and connect with people in your network
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => discoverUsers({ excludeConnected: false })}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto p-1">
          <TabsTrigger value="discover" className="text-xs sm:text-sm px-2 py-2 flex-col sm:flex-row">
            <Search className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Discover</span>
            <span className="sm:hidden text-xs">Discover</span>
            {discoveredUsers.length > 0 && (
              <Badge variant="secondary" className="text-xs ml-1 sm:ml-2">
                {discoveredUsers.length}
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

        {/* Discover Tab */}
        <TabsContent value="discover" className="space-y-4">
          {/* Search & Filters */}
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, bio, company..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      className="pl-10 text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSearch} disabled={loading} size="sm" className="flex-1 sm:flex-none">
                      <Search className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Search</span>
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowFilters(!showFilters)}
                      size="sm"
                    >
                      <Filter className="h-4 w-4 sm:mr-2" />
                      <span className="hidden sm:inline">Filters</span>
                    </Button>
                  </div>
                </div>

                {showFilters && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t">
                    <Input
                      placeholder="Filter by company..."
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                    />
                    <Input
                      placeholder="Filter by location..."
                      value={locationFilter}
                      onChange={(e) => setLocationFilter(e.target.value)}
                    />
                    <div className="md:col-span-2 flex items-center justify-between">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={excludeConnected}
                          onChange={(e) => setExcludeConnected(e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-muted-foreground">Hide my connections</span>
                      </label>
                      <Button variant="outline" size="sm" onClick={handleClearFilters}>
                        Clear Filters
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {loading && discoveredUsers.length === 0 && (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="animate-pulse">
                      <div className="flex items-start space-x-4">
                        <div className="rounded-full bg-muted h-16 w-16"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-5 bg-muted rounded w-1/3"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Users List */}
          {discoveredUsers.length > 0 && (
            <div className="space-y-4">
              {discoveredUsers.map((user) => (
                <UserCard
                  key={user.userId}
                  user={user}
                  onSendConnectionRequest={handleConnectionRequest}
                  loading={loading}
                />
              ))}

              {/* Load More */}
              {hasMore && (
                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {!loading && discoveredUsers.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h4 className="font-semibold mb-2">No People Found</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Try adjusting your search filters or check back later for new members.
                </p>
                <Button onClick={() => discoverUsers({ excludeConnected: false })}>
                  Refresh Search
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Received Requests Tab */}
        <TabsContent value="received" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="h-5 w-5" />
                Connection Requests Received
                {pendingRequestsCount > 0 && (
                  <Badge variant="destructive">
                    {pendingRequestsCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                People who want to connect with you
              </CardDescription>
            </CardHeader>
          </Card>

          {receivedRequests.length > 0 ? (
            <div className="space-y-4">
              {receivedRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
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
                <p className="text-sm text-muted-foreground">
                  No pending connection requests
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sent Requests Tab */}
        <TabsContent value="sent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="h-5 w-5" />
                Connection Requests Sent
                {sentRequestsCount > 0 && (
                  <Badge variant="secondary">
                    {sentRequestsCount}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Requests you've sent to others
              </CardDescription>
            </CardHeader>
          </Card>

          {sentRequests.length > 0 ? (
            <div className="space-y-4">
              {sentRequests.map((request) => (
                <Card key={request.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
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
                          Sent {new Date(request.createdAt).toLocaleDateString()}
                        </p>
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
                <p className="text-sm text-muted-foreground">
                  No sent connection requests
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PeopleTab;