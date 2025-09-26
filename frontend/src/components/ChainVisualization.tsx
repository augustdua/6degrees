import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionRequest, Chain } from '@/hooks/useRequests';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UserProfileModal from '@/components/UserProfileModal';
import * as d3 from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom, zoomIdentity } from 'd3-zoom';
import {
  Users,
  Target,
  DollarSign,
  Eye,
  Share2,
  RotateCcw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

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
  linkedinUrl?: string;
  shareableLink?: string;
  parentUserId?: string; // The user whose link was clicked to join
}

const ChainVisualization = ({ requests }: ChainVisualizationProps) => {
  const { user } = useAuth();
  const [chainData, setChainData] = useState<Chain[]>([]);
  const [loading, setLoading] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);

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
      const request = chain.request;

      // Add participant nodes (real people in the chain)
      participants.forEach((participant, index) => {
        const nodeId = `${participant.userid}-${chain.id}`;

        if (!nodeMap.has(nodeId)) {
          const node = {
            id: nodeId,
            name: `${participant.firstName} ${participant.lastName}`,
            type: participant.role,
            radius: participant.role === 'creator' ? 20 : participant.role === 'target' ? 18 : 12,
            color: getRoleColor(participant.role),
            chainId: chain.id,
            requestId: chain.request.id,
            participant,
            isTarget: participant.role === 'target',
            x: 0,
            y: 0
          };
          nodes.push(node);
          nodeMap.set(nodeId, node);
        }

        // Create link to parent participant (if exists)
        if (participant.parentUserId) {
          const parentNodeId = `${participant.parentUserId}-${chain.id}`;
          // Only create link if parent node exists in this chain
          if (participants.some(p => p.userid === participant.parentUserId)) {
            links.push({
              source: parentNodeId, // Parent is the source
              target: nodeId,       // Current participant is the target
              chainId: chain.id
            });
          }
        }
      });

      // Add disconnected target node if request is not completed and no target participant exists
      const hasTargetParticipant = participants.some(p => p.role === 'target');
      if (request.status !== 'completed' && !hasTargetParticipant) {
        const targetNodeId = `target-${chain.id}`;
        if (!nodeMap.has(targetNodeId)) {
          const targetNode = {
            id: targetNodeId,
            name: request.target, // Use the target description from the request
            type: 'disconnected-target',
            radius: 18,
            color: '#ef4444', // Red color for disconnected targets
            chainId: chain.id,
            requestId: chain.request.id,
            isTarget: true,
            isDisconnected: true,
            x: 0,
            y: 0,
            targetDescription: request.target,
            reward: request.reward
          };
          nodes.push(targetNode);
          nodeMap.set(targetNodeId, targetNode);
        }
      }
    });

    setGraphData({ nodes, links });
  };

  // Recenter function
  const recenterGraph = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    // Reset zoom and pan to center
    svg.transition()
      .duration(750)
      .call(zoomRef.current.transform, zoomIdentity.translate(0, 0).scale(1));
  }, []);

  // D3 Force Simulation
  useEffect(() => {
    if (!graphData.nodes.length || !svgRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll("*").remove();

    // Create zoom behavior
    const zoomBehavior = zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    // Apply zoom to svg
    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    // Create container for all graph elements (so zoom applies to everything)
    const container = svg.append("g");

    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = container.append("g")
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke", "#64748b")
      .attr("stroke-width", 2)
      .attr("stroke-opacity", 0.6);

    const node = container.append("g")
      .selectAll("g")
      .data(graphData.nodes)
      .join("g")
      .call(drag()
        .on("start", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on("drag", (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on("end", (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    node.append("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => d.color)
      .attr("stroke", "#374151")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        handleUserClick(d);
      });

    node.append("text")
      .text((d: any) => d.name)
      .attr("x", 0)
      .attr("y", (d: any) => d.radius + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#e5e7eb")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [graphData]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'creator': return '#3b82f6';
      case 'forwarder': return '#10b981';
      case 'target': return '#8b5cf6';
      case 'connector': return '#f59e0b';
      case 'disconnected-target': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleUserClick = async (node: any) => {
    try {
      // Handle disconnected target nodes differently
      if (node.isDisconnected) {
        const profileData = {
          id: node.id,
          name: node.name,
          role: 'disconnected-target',
          isTarget: true,
          isDisconnected: true,
          targetDescription: node.targetDescription,
          reward: node.reward,
          bio: `Target: ${node.targetDescription} | Reward: $${node.reward} | Status: Looking for connection`,
        };

        setSelectedUser(profileData);
        setIsProfileModalOpen(true);
        return;
      }

      // Fetch user data including LinkedIn URL from the users table for connected participants
      const { data: userData, error } = await supabase
        .from('users')
        .select('linkedin_url, bio, avatar_url')
        .eq('id', node.participant?.userid)
        .single();

      if (error) {
        console.warn('Error fetching user LinkedIn profile:', error);
      }

      // Show participant profile (all nodes are now participants)
      const profileData = {
        id: node.participant?.userid,
        name: `${node.participant?.firstName} ${node.participant?.lastName}`,
        email: node.participant?.email,
        role: node.participant?.role,
        joinedAt: node.participant?.joinedAt,
        isTarget: node.participant?.role === 'target',
        linkedinUrl: userData?.linkedin_url || node.participant?.linkedinUrl,
        avatar: userData?.avatar_url || node.participant?.avatar,
        bio: userData?.bio || (node.participant?.role === 'target' ?
          `Successfully reached target in connection chain` :
          `Chain participant with role: ${node.participant?.role}`),
      };

      console.log('Profile data being set:', profileData);
      console.log('LinkedIn URL found:', profileData.linkedinUrl);

      setSelectedUser(profileData);
      setIsProfileModalOpen(true);
    } catch (error) {
      console.error('Error handling user click:', error);
      // Fallback to showing basic profile without LinkedIn
      setSelectedUser({
        id: node.participant?.userid,
        name: `${node.participant?.firstName} ${node.participant?.lastName}`,
        email: node.participant?.email,
        role: node.participant?.role,
        joinedAt: node.participant?.joinedAt,
        isTarget: node.participant?.role === 'target',
        bio: node.participant?.role === 'target' ?
          `Successfully reached target in connection chain` :
          `Chain participant with role: ${node.participant?.role}`,
      });
      setIsProfileModalOpen(true);
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
              <div className="text-lg md:text-2xl font-bold">{graphData.nodes.length}</div>
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
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={recenterGraph}
                  className="flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  <span className="hidden sm:inline">Recenter</span>
                </Button>
                <Badge variant="secondary" className="text-xs">
                  <span className="hidden sm:inline">Interactive Graph - Click targets to connect</span>
                  <span className="sm:hidden">Click targets to connect</span>
                </Badge>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading network...</p>
              </div>
            ) : (
              <div className="w-full h-[300px] md:h-[500px] border rounded-lg bg-card">
                <svg
                  ref={svgRef}
                  className="w-full h-full"
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> This shows real chain participants only. Click nodes to view profiles, drag to move them, and use mouse wheel to zoom. Use the Recenter button if you lose the graph!</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* User Profile Modal */}
      {selectedUser && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => {
            setIsProfileModalOpen(false);
            setSelectedUser(null);
          }}
          user={selectedUser}
          currentUserId={user?.id || ''}
        />
      )}
    </div>
  );
};

export { ChainVisualization };