import { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionRequest, Chain } from '@/hooks/useRequests';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ForceGraph2D } from 'react-force-graph';
import {
  Users,
  Target,
  DollarSign,
  Eye,
  Share2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ChainVisualizationProps {
  requests: ConnectionRequest[];
}

interface ChainParticipant {
  userid: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'creator' | 'forwarder' | 'target' | 'connector';
  joinedAt: string;
  avatar?: string;
  rewardAmount?: number;
}

const ChainVisualization = ({ requests }: ChainVisualizationProps) => {
  const [chainData, setChainData] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const fgRef = useRef<any>();

  // Fetch real chain data from Supabase for all requests
  useEffect(() => {
    const fetchAllChainData = async () => {
      if (!requests.length) return;

      setLoading(true);
      try {
        const chainPromises = requests.map(async (request) => {
          const { data, error } = await supabase
            .from('chains')
            .select('*')
            .eq('request_id', request.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            console.error('Error fetching chain data:', error);
            return null;
          }
          return data ? { ...data, request } : null;
        });

        const chainResults = await Promise.all(chainPromises);
        const validChains = chainResults.filter(Boolean) as (Chain & { request: ConnectionRequest })[];
        setChainData(validChains);

        // Generate graph data
        generateGraphData(validChains);
      } catch (error) {
        console.error('Error fetching chain data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllChainData();
  }, [requests]);

  const generateGraphData = (chains: (Chain & { request: ConnectionRequest })[]) => {
    const nodes: any[] = [];
    const links: any[] = [];
    const nodeMap = new Map();

    chains.forEach((chain, chainIndex) => {
      const participants = chain.participants || [];

      // Add target node if not completed
      const targetNodeId = `target-${chain.request.id}`;
      if (chain.request.status !== 'completed') {
        const targetNode = {
          id: targetNodeId,
          name: chain.request.target,
          type: 'target',
          val: 15,
          color: '#8b5cf6',
          chainId: chain.id,
          requestId: chain.request.id,
          isTarget: true
        };
        nodes.push(targetNode);
        nodeMap.set(targetNodeId, targetNode);
      }

      // Add participant nodes and links
      participants.forEach((participant, index) => {
        const nodeId = `${participant.userid}-${chain.id}`;

        if (!nodeMap.has(nodeId)) {
          const node = {
            id: nodeId,
            name: `${participant.firstName} ${participant.lastName}`,
            type: participant.role,
            val: participant.role === 'creator' ? 20 : 10,
            color: getRoleColor(participant.role),
            chainId: chain.id,
            requestId: chain.request.id,
            participant,
            isTarget: false
          };
          nodes.push(node);
          nodeMap.set(nodeId, node);
        }

        // Link to next participant or target
        if (index < participants.length - 1) {
          const nextNodeId = `${participants[index + 1].userid}-${chain.id}`;
          links.push({
            source: nodeId,
            target: nextNodeId,
            value: 2,
            chainId: chain.id
          });
        } else if (chain.request.status !== 'completed') {
          // Link last participant to target
          links.push({
            source: nodeId,
            target: targetNodeId,
            value: 2,
            chainId: chain.id
          });
        }
      });
    });

    setGraphData({ nodes, links });
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'creator': return '#3b82f6';
      case 'forwarder': return '#10b981';
      case 'target': return '#8b5cf6';
      case 'connector': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const handleNodeClick = useCallback((node: any) => {
    if (node.isTarget) {
      // Connect to this target
      connectToTarget(node.requestId, node.name);
    } else {
      // Show user details
      console.log('User clicked:', node.participant);
    }
  }, []);

  const connectToTarget = async (requestId: string, targetName: string) => {
    // This would typically open a modal or navigate to a connection page
    console.log('Connecting to target:', targetName, 'for request:', requestId);
    // Implement connection logic here
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
      {/* Chain Stats */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <Card className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Eye className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <div>
              <div className="text-lg md:text-2xl font-bold">0</div>
              <div className="text-xs text-muted-foreground">Clicks</div>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <div>
              <div className="text-lg md:text-2xl font-bold">0</div>
              <div className="text-xs text-muted-foreground">Shares</div>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Users className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <div>
              <div className="text-lg md:text-2xl font-bold">{graphData.nodes.filter(n => !n.isTarget).length}</div>
              <div className="text-xs text-muted-foreground">Participants</div>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <div>
              <div className="text-lg md:text-2xl font-bold">${requests.reduce((sum, r) => sum + r.reward, 0)}</div>
              <div className="text-xs text-muted-foreground">Rewards</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Physics-Enabled Graph */}
      <Card>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
              <h3 className="text-lg font-semibold">Connection Network</h3>
              <Badge variant="secondary" className="text-xs">
                <span className="hidden sm:inline">Interactive Graph - Click targets to connect</span>
                <span className="sm:hidden">Click targets to connect</span>
              </Badge>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading network...</p>
              </div>
            ) : (
              <div className="w-full h-[300px] md:h-[500px]">
                <ForceGraph2D
                  ref={fgRef}
                  graphData={graphData}
                  nodeAutoColorBy="type"
                  nodeCanvasObject={(node, ctx, globalScale) => {
                    const label = node.name;
                    const fontSize = 12/globalScale;
                    ctx.font = `${fontSize}px Sans-Serif`;
                    const textWidth = ctx.measureText(label).width;
                    const bckgDimensions = [textWidth, fontSize].map(n => n + fontSize * 0.2);

                    // Draw background
                    ctx.fillStyle = node.isTarget ? 'rgba(139, 92, 246, 0.8)' : 'rgba(255, 255, 255, 0.8)';
                    ctx.fillRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                    // Draw border
                    ctx.strokeStyle = node.color;
                    ctx.lineWidth = 1;
                    ctx.strokeRect(node.x - bckgDimensions[0] / 2, node.y - bckgDimensions[1] / 2, ...bckgDimensions);

                    // Draw text
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillStyle = node.isTarget ? 'white' : 'black';
                    ctx.fillText(label, node.x, node.y);

                    // Draw node circle
                    ctx.beginPath();
                    ctx.arc(node.x, node.y - bckgDimensions[1]/2 - 10, node.val/2, 0, 2 * Math.PI, false);
                    ctx.fillStyle = node.color;
                    ctx.fill();
                  }}
                  onNodeClick={handleNodeClick}
                  nodePointerAreaPaint={(node, color, ctx) => {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, node.val, 0, 2 * Math.PI, false);
                    ctx.fill();
                  }}
                  linkColor={() => '#94a3b8'}
                  linkWidth={2}
                  backgroundColor="transparent"
                />
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> Click on purple target nodes to connect with them directly!</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export { ChainVisualization };