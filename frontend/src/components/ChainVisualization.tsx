import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionRequest, Chain } from '@/hooks/useRequests';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UserProfileModal from '@/components/UserProfileModal';
import { hierarchy, tree } from 'd3-hierarchy';
import { select } from 'd3-selection';
import { zoom, zoomIdentity } from 'd3-zoom';
import {
  Users,
  DollarSign,
  Eye,
  Share2,
  RotateCcw,
  Maximize,
  Minimize
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { convertAndFormatINR } from '@/lib/currency';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
        const rawChains = chainResults.filter(Boolean) as any[];

        const validChains: (Chain & { request: ConnectionRequest })[] = rawChains.map((c: any) => ({
          id: c.id,
          requestId: c.request_id,
          participants: Array.isArray(c.participants) ? c.participants : [],
          status: c.status,
          totalReward: c.total_reward,
          chainLength: Array.isArray(c.participants) ? c.participants.length : 0,
          completedAt: c.completed_at,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          request: c.request as ConnectionRequest,
        }));

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
    const treeRoots: any[] = [];

    chains.forEach((chain) => {
      const participants = chain.participants || [];
      const request = chain.request;

      // Build hierarchical structure for each chain
      const nodeMap = new Map();

      // Create nodes for all participants
      participants.forEach((participant) => {
        const node = {
          id: `${participant.userid}-${chain.id}`,
          name: `${participant.firstName} ${participant.lastName}`,
          type: participant.role,
          radius: participant.role === 'creator' ? 20 : participant.role === 'target' ? 18 : 12,
          color: getRoleColor(participant.role),
          chainId: chain.id,
          requestId: chain.request.id,
          participant,
          isTarget: participant.role === 'target',
          userid: participant.userid,
          parentUserId: participant.parentUserId,
          children: []
        };
        nodeMap.set(participant.userid, node);
      });

      // Build tree structure by connecting children to parents
      let rootNode = null;
      nodeMap.forEach((node) => {
        if (node.parentUserId && nodeMap.has(node.parentUserId)) {
          const parent = nodeMap.get(node.parentUserId);
          parent.children.push(node);
        } else {
          // This is the root node (creator)
          rootNode = node;
        }
      });

      // Add disconnected target if needed
      const hasTargetParticipant = participants.some(p => p.role === 'target');
      if (request.status !== 'completed' && !hasTargetParticipant && rootNode) {
        const targetNode = {
          id: `target-${chain.id}`,
          name: request.target,
          type: 'disconnected-target',
          radius: 18,
          color: '#ef4444',
          chainId: chain.id,
          requestId: chain.request.id,
          isTarget: true,
          isDisconnected: true,
          targetDescription: request.target,
          reward: request.reward,
          children: []
        };

        // Attach to the last node in the chain
        const lastParticipant = participants[participants.length - 1];
        if (lastParticipant && nodeMap.has(lastParticipant.userid)) {
          nodeMap.get(lastParticipant.userid).children.push(targetNode);
        }
      }

      if (rootNode) {
        treeRoots.push(rootNode);
      }
    });

    setGraphData({ nodes: treeRoots, links: [] });
  };

  // Recenter function: reset to default view
  const recenterGraph = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.transition()
      .duration(600)
      .call(zoomRef.current.transform, zoomIdentity.translate(width / 2, 50).scale(1));
  }, []);

  // Mobile detection utility
  const isMobile = useCallback(() => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (navigator.maxTouchPoints && navigator.maxTouchPoints > 2);
  }, []);

  // Check if fullscreen API is supported
  const isFullscreenSupported = useCallback(() => {
    return !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled ||
      (document as any).msFullscreenEnabled
    );
  }, []);

  // Fullscreen functionality with mobile fallback
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        // Try native fullscreen API first
        if (isFullscreenSupported() && !isMobile()) {
          try {
            if (containerRef.current.requestFullscreen) {
              await containerRef.current.requestFullscreen();
            } else if ((containerRef.current as any).webkitRequestFullscreen) {
              await (containerRef.current as any).webkitRequestFullscreen();
            } else if ((containerRef.current as any).mozRequestFullScreen) {
              await (containerRef.current as any).mozRequestFullScreen();
            } else if ((containerRef.current as any).msRequestFullscreen) {
              await (containerRef.current as any).msRequestFullscreen();
            }
            setIsFullscreen(true);
            return;
          } catch (nativeError) {
            console.warn('Native fullscreen failed, falling back to CSS fullscreen:', nativeError);
          }
        }

        // Fallback for mobile and unsupported browsers
        containerRef.current.classList.add('mobile-fullscreen');
        document.body.style.overflow = 'hidden';
        setIsFullscreen(true);

        // Trigger resize event for D3 to recalculate dimensions
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      } else {
        // Exit fullscreen
        if (document.fullscreenElement) {
          if (document.exitFullscreen) {
            await document.exitFullscreen();
          } else if ((document as any).webkitExitFullscreen) {
            await (document as any).webkitExitFullscreen();
          } else if ((document as any).mozCancelFullScreen) {
            await (document as any).mozCancelFullScreen();
          } else if ((document as any).msExitFullscreen) {
            await (document as any).msExitFullscreen();
          }
        } else {
          // Exit CSS fullscreen
          containerRef.current.classList.remove('mobile-fullscreen');
          document.body.style.overflow = '';
        }
        setIsFullscreen(false);

        // Trigger resize event for D3 to recalculate dimensions
        setTimeout(() => {
          window.dispatchEvent(new Event('resize'));
        }, 100);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
      // Ensure we clean up if something goes wrong
      if (containerRef.current) {
        containerRef.current.classList.remove('mobile-fullscreen');
        document.body.style.overflow = '';
      }
      setIsFullscreen(false);
    }
  }, [isFullscreen, isFullscreenSupported, isMobile]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNativeFullscreen = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      const isCSSFullscreen = containerRef.current?.classList.contains('mobile-fullscreen');

      setIsFullscreen(isNativeFullscreen || !!isCSSFullscreen);
    };

    // Listen for all fullscreen change events
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Trigger simulation restart when fullscreen changes
  useEffect(() => {
    if (svgRef.current) {
      // Small delay to ensure DOM has updated
      setTimeout(() => {
        const event = new Event('resize');
        window.dispatchEvent(event);
      }, 100);
    }
  }, [isFullscreen]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clean up mobile fullscreen state if component unmounts while in fullscreen
      if (containerRef.current?.classList.contains('mobile-fullscreen')) {
        containerRef.current.classList.remove('mobile-fullscreen');
        document.body.style.overflow = '';
      }
    };
  }, []);

  const handleUserClick = useCallback(async (node: any) => {
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
          bio: `Target: ${node.targetDescription} | Reward: ${convertAndFormatINR(node.reward)} | Status: Looking for connection`,
          participant: null,
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
        participant: node.participant,
      };

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
        participant: node.participant,
      });
      setIsProfileModalOpen(true);
    }
  }, []);

  // D3 Tree Layout
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
    svg.call(zoomBehavior as any);
    zoomRef.current = zoomBehavior;

    // Create container for all graph elements
    const container = svg.append("g")
      .attr("transform", `translate(${width / 2}, 50)`);

    // Process each tree (chain) separately
    let currentYOffset = 0;
    const treeSpacing = 200;

    graphData.nodes.forEach((rootData: any, index: number) => {
      // Create hierarchy from root data
      const root = hierarchy(rootData);

      // Create tree layout
      const treeLayout = tree()
        .size([width - 100, height - 100])
        .separation((a, b) => (a.parent === b.parent ? 1 : 1.5));

      // Generate tree layout
      treeLayout(root);

      // Offset each tree vertically
      root.descendants().forEach((d: any) => {
        d.y += currentYOffset;
      });

      // Draw links
      const links = container.append("g")
        .selectAll("path")
        .data(root.links())
        .join("path")
        .attr("d", (d: any) => {
          return `M${d.source.x},${d.source.y}
                  C${d.source.x},${(d.source.y + d.target.y) / 2}
                   ${d.target.x},${(d.source.y + d.target.y) / 2}
                   ${d.target.x},${d.target.y}`;
        })
        .attr("fill", "none")
        .attr("stroke", "#64748b")
        .attr("stroke-width", 2)
        .attr("stroke-opacity", 0.6);

      // Draw nodes
      const nodes = container.append("g")
        .selectAll("g")
        .data(root.descendants())
        .join("g")
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`)
        .style("cursor", "pointer")
        .on("click", (event, d: any) => {
          handleUserClick(d.data);
        });

      nodes.append("circle")
        .attr("r", (d: any) => d.data.radius)
        .attr("fill", (d: any) => d.data.color)
        .attr("stroke", "#374151")
        .attr("stroke-width", 2);

      nodes.append("text")
        .text((d: any) => d.data.name)
        .attr("x", 0)
        .attr("y", (d: any) => d.data.radius + 15)
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .attr("fill", "#e5e7eb")
        .style("pointer-events", "none");

      // Update offset for next tree
      const maxDepth = Math.max(...root.descendants().map((d: any) => d.depth));
      currentYOffset += (maxDepth + 1) * 100 + treeSpacing;
    });

    // Auto-recenter after a short delay
    const autoRecenterTimeout = setTimeout(() => {
      recenterGraph();
    }, 300);

    return () => {
      clearTimeout(autoRecenterTimeout);
    };
  }, [graphData, recenterGraph, handleUserClick]);

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
              <div className="text-lg md:text-2xl font-bold">
                {graphData.nodes.reduce((total: number, root: any) => {
                  const countNodes = (node: any): number => {
                    return 1 + (node.children || []).reduce((sum: number, child: any) => sum + countNodes(child), 0);
                  };
                  return total + countNodes(root);
                }, 0)}
              </div>
              <div className="text-xs text-muted-foreground">Participants</div>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <div>
              <div className="text-lg md:text-2xl font-bold">{convertAndFormatINR(requests.reduce((sum, r) => sum + r.reward, 0))}</div>
              <div className="text-xs text-muted-foreground">Rewards</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Physics-Enabled Graph */}
      <Card ref={containerRef} className={isFullscreen ? 'h-screen w-screen' : ''}>
        <CardContent className="p-4 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-col space-y-2 md:flex-row md:items-center md:justify-between md:space-y-0">
              <h3 className="text-lg font-semibold">Connection Tree</h3>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="flex items-center gap-1"
                >
                  {isFullscreen ? (
                    <Minimize className="h-3 w-3" />
                  ) : (
                    <Maximize className="h-3 w-3" />
                  )}
                  <span className="hidden sm:inline">
                    {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                  </span>
                </Button>
                <Badge variant="secondary" className="text-xs">
                  <span className="hidden sm:inline">Tree View - Click nodes to view profiles</span>
                  <span className="sm:hidden">Click to view profiles</span>
                </Badge>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-sm text-muted-foreground">Loading network...</p>
              </div>
            ) : (
              <div className={`w-full border rounded-lg bg-card ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-[300px] md:h-[500px]'}`}>
                <svg
                  ref={svgRef}
                  className="w-full h-full"
                  style={{ backgroundColor: 'transparent' }}
                />
              </div>
            )}

            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> This shows your connection chains as trees. The creator is at the top, and branches grow downward to the target. Click nodes to view profiles, and use mouse wheel to zoom. Use the Recenter button to reset the view!</p>
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
          participant={selectedUser.participant}
        />
      )}
    </div>
  );
};

export { ChainVisualization };