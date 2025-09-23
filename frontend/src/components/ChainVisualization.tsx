import { useState } from 'react';
import { ConnectionRequest } from '@/hooks/useRequests';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import {
  Users,
  ArrowRight,
  Target,
  DollarSign,
  Calendar,
  Eye,
  Share2
} from 'lucide-react';

interface ChainVisualizationProps {
  requests: ConnectionRequest[];
}

interface MockChainParticipant {
  id: string;
  name: string;
  email: string;
  role: 'creator' | 'forwarder' | 'target' | 'connector';
  joinedAt: string;
  avatar?: string;
  rewardAmount?: number;
}

const ChainVisualization = ({ requests }: ChainVisualizationProps) => {
  const [selectedRequest, setSelectedRequest] = useState<ConnectionRequest | null>(
    requests.length > 0 ? requests[0] : null
  );

  // Mock chain data - in real app, this would come from the backend
  const generateMockChain = (request: ConnectionRequest): MockChainParticipant[] => {
    const chainLength = Math.floor(Math.random() * 4) + 2; // 2-5 participants
    const chain: MockChainParticipant[] = [];

    // Creator (first participant)
    chain.push({
      id: request.creator?.id || 'creator-1',
      name: request.creator ? `${request.creator.firstName} ${request.creator.lastName}` : 'You',
      email: request.creator?.email || 'you@example.com',
      role: 'creator',
      joinedAt: request.createdAt,
      rewardAmount: 0,
    });

    // Forwarders (middle participants)
    for (let i = 1; i < chainLength - 1; i++) {
      chain.push({
        id: `forwarder-${i}`,
        name: `Forwarder ${i}`,
        email: `forwarder${i}@example.com`,
        role: 'forwarder',
        joinedAt: new Date(Date.now() - (chainLength - i) * 24 * 60 * 60 * 1000).toISOString(),
        rewardAmount: request.status === 'completed' ? request.reward / chainLength : undefined,
      });
    }

    // Target (last participant)
    if (request.status === 'completed' || Math.random() > 0.5) {
      chain.push({
        id: 'target-1',
        name: request.target,
        email: `${request.target.toLowerCase().replace(' ', '.')}@example.com`,
        role: 'target',
        joinedAt: new Date().toISOString(),
        rewardAmount: request.status === 'completed' ? request.reward / chainLength : undefined,
      });
    }

    return chain;
  };

  const mockChain = selectedRequest ? generateMockChain(selectedRequest) : [];
  const mockClicks = Math.floor(Math.random() * 50) + 5;
  const mockShares = Math.floor(Math.random() * 10) + 1;

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'creator': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'forwarder': return 'bg-green-100 text-green-800 border-green-200';
      case 'target': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'connector': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'creator': return <Users className="h-3 w-3" />;
      case 'forwarder': return <Share2 className="h-3 w-3" />;
      case 'target': return <Target className="h-3 w-3" />;
      case 'connector': return <ArrowRight className="h-3 w-3" />;
      default: return <Users className="h-3 w-3" />;
    }
  };

  if (requests.length === 0) {
    return (
      <div className="text-center py-8">
        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No chains to visualize</h3>
        <p className="text-muted-foreground">Create connection requests to see chain visualization</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Request Selector */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium">Select Request to Visualize</h3>
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((request) => (
            <Button
              key={request.id}
              variant={selectedRequest?.id === request.id ? 'default' : 'outline'}
              className="justify-start h-auto p-3"
              onClick={() => setSelectedRequest(request)}
            >
              <div className="text-left">
                <div className="font-medium truncate">{request.target}</div>
                <div className="text-xs text-muted-foreground">${request.reward}</div>
              </div>
            </Button>
          ))}
        </div>
      </div>

      {selectedRequest && (
        <>
          <Separator />

          {/* Chain Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{mockClicks}</div>
                  <div className="text-xs text-muted-foreground">Total Clicks</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{mockShares}</div>
                  <div className="text-xs text-muted-foreground">Shares</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">{mockChain.length}</div>
                  <div className="text-xs text-muted-foreground">Chain Length</div>
                </div>
              </div>
            </Card>

            <Card className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="text-2xl font-bold">${selectedRequest.reward}</div>
                  <div className="text-xs text-muted-foreground">Total Reward</div>
                </div>
              </div>
            </Card>
          </div>

          {/* Chain Visualization */}
          <Card>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Connection Chain</h3>
                  <Badge variant={selectedRequest.status === 'completed' ? 'default' : 'secondary'}>
                    {selectedRequest.status === 'completed' ? 'Completed' : 'In Progress'}
                  </Badge>
                </div>

                <div className="relative">
                  {/* Chain Flow */}
                  <div className="flex items-center gap-4 overflow-x-auto pb-4">
                    {mockChain.map((participant, index) => (
                      <div key={participant.id} className="flex items-center gap-4 min-w-0">
                        {/* Participant Card */}
                        <Card className="min-w-[250px] flex-shrink-0">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={participant.avatar} />
                                <AvatarFallback>
                                  {participant.name
                                    .split(' ')
                                    .map(n => n[0])
                                    .join('')
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium truncate">{participant.name}</span>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${getRoleColor(participant.role)}`}
                                  >
                                    {getRoleIcon(participant.role)}
                                    {participant.role}
                                  </Badge>
                                </div>

                                <div className="text-xs text-muted-foreground truncate">
                                  {participant.email}
                                </div>

                                <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(participant.joinedAt).toLocaleDateString()}
                                </div>

                                {participant.rewardAmount !== undefined && (
                                  <div className="flex items-center gap-1 mt-1 text-xs font-medium text-green-600">
                                    <DollarSign className="h-3 w-3" />
                                    ${participant.rewardAmount.toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Arrow */}
                        {index < mockChain.length - 1 && (
                          <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    ))}

                    {/* Target not reached indicator */}
                    {selectedRequest.status !== 'completed' && mockChain[mockChain.length - 1]?.role !== 'target' && (
                      <div className="flex items-center gap-4">
                        <ArrowRight className="h-6 w-6 text-muted-foreground" />
                        <Card className="min-w-[250px] border-dashed border-2">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 bg-muted">
                                <AvatarFallback>
                                  <Target className="h-5 w-5" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{selectedRequest.target}</div>
                                <div className="text-xs text-muted-foreground">Target (not reached)</div>
                                <div className="text-xs text-orange-600 mt-1">
                                  Waiting for connection
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>

                {/* Chain Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Chain Progress</span>
                    <span>
                      {mockChain.length} of {mockChain.length + (selectedRequest.status !== 'completed' && mockChain[mockChain.length - 1]?.role !== 'target' ? 1 : 0)} participants
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${(mockChain.length / (mockChain.length + (selectedRequest.status !== 'completed' && mockChain[mockChain.length - 1]?.role !== 'target' ? 1 : 0))) * 100}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export { ChainVisualization };