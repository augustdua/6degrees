import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectionRequest, Chain } from '@/hooks/useRequests';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import UserProfileModal from '@/components/UserProfileModal';
import * as d3 from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import {
  Users,
  Target,
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
import { apiGet } from '@/lib/api';

// Module-level cache for organization data to avoid re-fetching
const orgDataCache = new Map<string, string | null>();

interface ChainVisualizationProps {
  requests: ConnectionRequest[];
  totalClicks?: number; // combined clicks for the request
  totalShares?: number; // combined shares for the request (future)
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
  organizationLogo?: string; // Organization logo URL
}

const ChainVisualization = ({ requests, totalClicks = 0, totalShares = 0 }: ChainVisualizationProps) => {
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

  const generateGraphData = async (chains: (Chain & { request: ConnectionRequest })[]) => {
    const nodes: any[] = [];
    const links: any[] = [];
    const nodeMap = new Map();

    // Fetch organization data for all participants (deduped)
    const participantIds = Array.from(new Set(
      chains.flatMap(chain => (chain.participants || []).map(p => p.userid))
    ));

    const orgDataMap = new Map<string, string | null>();

    // Only fetch for participants we haven't cached yet
    const uncachedIds = participantIds.filter(id => !orgDataCache.has(id));

    if (uncachedIds.length > 0) {
      try {
        // Fetch all in parallel - no rate limiting on this endpoint now
        await Promise.all(uncachedIds.map(async (userId) => {
          try {
            const data = await apiGet(`/api/organizations/user/${userId}`);
            console.log(`📊 Org data for user ${userId}:`, data);
            // Only show current work organization logos (not education)
            const currentWorkOrg = data.organizations?.find((o: any) =>
              o.is_current && (o.organization_type === 'work' || !o.organization_type)
            );
            const logoUrl = currentWorkOrg?.organization?.logo_url || null;
            console.log(`📊 Logo URL for user ${userId}:`, logoUrl);
            orgDataCache.set(userId, logoUrl);
          } catch (e) {
            console.warn(`Failed to fetch org data for user ${userId}:`, e);
            orgDataCache.set(userId, null);
          }
        }));
      } catch (error) {
        console.warn('Could not fetch organization data:', error);
      }
    }

    // Use cached data for all participants
    participantIds.forEach(id => {
      const cachedLogo = orgDataCache.get(id);
      console.log(`📊 Setting orgDataMap for user ${id}: ${cachedLogo}`);
      orgDataMap.set(id, cachedLogo || null);
    });

    chains.forEach((chain, chainIndex) => {
      const participants = chain.participants || [];
      const request = chain.request;

      // Add participant nodes (real people in the chain)
      participants.forEach((participant, index) => {
        const nodeId = `${participant.userid}-${chain.id}`;

        if (!nodeMap.has(nodeId)) {
          const orgLogo = orgDataMap.get(participant.userid);
          const node = {
            id: nodeId,
            name: `${participant.firstName} ${participant.lastName}`,
            type: participant.role,
            radius: participant.role === 'creator' ? 20 : participant.role === 'target' ? 18 : 12,
            color: getRoleColor(participant.role),
            chainId: chain.id,
            requestId: chain.request.id,
            participant: {
              ...participant,
              organizationLogo: orgLogo
            },
            organizationLogo: orgLogo,
            isTarget: participant.role === 'target',
            x: 0,
            y: 0
          };
          console.log(`📊 Created node for ${participant.firstName} ${participant.lastName} (${participant.userid}):`, {
            hasOrgLogo: !!orgLogo,
            orgLogo
          });
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

  // Recenter function: center camera on the creator node at current zoom level
  const recenterGraph = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const creatorNode = graphData.nodes.find((n: any) => n.type === 'creator') || graphData.nodes[0];

    // Check if we have a creator node and if simulation has positioned it (not at initial 0,0)
    if (!creatorNode) {
      // No creator node found, just reset to center
      svg.transition()
        .duration(600)
        .call(zoomRef.current.transform, zoomIdentity.translate(0, 0).scale(1));
      return;
    }

    // If node is still at initial position (0,0) or undefined, wait a bit and try again
    if ((creatorNode.x === 0 && creatorNode.y === 0) || creatorNode.x == null || creatorNode.y == null) {
      setTimeout(() => recenterGraph(), 100);
      return;
    }

    const current = zoomTransform(svgRef.current as any);
    const scale = current.k || 1;
    const tx = width / 2 - creatorNode.x * scale;
    const ty = height / 2 - creatorNode.y * scale;

    const target = zoomIdentity.translate(tx, ty).scale(scale);
    svg.transition()
      .duration(600)
      .call(zoomRef.current.transform, target);
  }, [graphData]);

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

  // D3 Force Simulation
  useEffect(() => {
    if (!graphData.nodes.length || !svgRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll("*").remove();

    // Create container for all graph elements (so zoom applies to everything)
    const container = svg.append("g");

    // Create zoom behavior
    const zoomBehavior = zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    // Apply zoom to svg
    svg.call(zoomBehavior);
    zoomRef.current = zoomBehavior;

    // Define logo patterns for nodes with organization logos
    const defs = svg.append("defs");
    const logoPatternData = (graphData.nodes as any[]).filter((n: any) => !!n.organizationLogo);
    console.log(`📊 Nodes with organization logos:`, logoPatternData.map((n: any) => ({
      id: n.id,
      name: n.name,
      logo: n.organizationLogo
    })));
    const patterns = defs
      .selectAll('pattern')
      .data(logoPatternData, (d: any) => d.id)
      .join('pattern')
      .attr('id', (d: any) => `logo-${d.id}`)
      .attr('patternUnits', 'objectBoundingBox')
      .attr('patternContentUnits', 'objectBoundingBox')
      .attr('width', 1)
      .attr('height', 1);

    patterns
      .selectAll('image')
      .data((d: any) => [d])
      .join('image')
      .attr('href', (d: any) => d.organizationLogo)
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 1)
      .attr('height', 1)
      .attr('preserveAspectRatio', 'xMidYMid slice');

    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2));

    // Handle window resize to update simulation center
    const handleResize = () => {
      if (!svgRef.current) return;

      const newWidth = svgRef.current.clientWidth;
      const newHeight = svgRef.current.clientHeight;

      simulation
        .force("center", d3.forceCenter(newWidth / 2, newHeight / 2))
        .alpha(0.3)
        .restart();
    };

    window.addEventListener('resize', handleResize);

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

    // Main circle for each node
    // Base circle with solid color (white if logo present, else role color)
    node.append("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => d.organizationLogo ? '#ffffff' : d.color)
      .attr("stroke", "#374151")
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .on("click", (event, d: any) => {
        handleUserClick(d);
      });

    // Logo overlay circle (slightly smaller than base to preserve the border)
    const nodesWithLogos = node.filter((d: any) => d.organizationLogo);
    console.log(`📊 Rendering logo circles for ${nodesWithLogos.size()} nodes`);
    nodesWithLogos
      .append("circle")
      .attr("r", (d: any) => Math.max(0, d.radius - 2))
      .attr("fill", (d: any) => {
        console.log(`📊 Applying logo pattern for node ${d.name}: url(#logo-${d.id})`);
        return `url(#logo-${d.id})`;
      })
      .attr("stroke", "none")
      .style("pointer-events", "none");

    // Name label
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

    // Auto-recenter on creator node after simulation settles
    simulation.on("end", () => {
      setTimeout(() => {
        recenterGraph();
      }, 300);
    });

    // Also auto-recenter after a short delay when graph data loads/refreshes
    const autoRecenterTimeout = setTimeout(() => {
      recenterGraph();
    }, 1000);

    return () => {
      simulation.stop();
      window.removeEventListener('resize', handleResize);
      clearTimeout(autoRecenterTimeout);
    };
  }, [graphData, recenterGraph]);

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
          bio: `Target: ${node.targetDescription} | Reward: ${convertAndFormatINR(node.reward)} | Status: Looking for connection`,
          participant: null, // No participant data for disconnected targets
        };

        setSelectedUser(profileData);
        setIsProfileModalOpen(true);
        return;
      }

      // Fetch user data including LinkedIn URL and privacy setting from the users table for connected participants
      const { data: userData, error } = await supabase
        .from('users')
        .select('linkedin_url, bio, avatar_url, is_profile_public')
        .eq('id', node.participant?.userid)
        .single() as { data: any; error: any };

      if (error) {
        console.warn('Error fetching user LinkedIn profile:', error);
      }

      // Fetch user's organizations
      let userOrganizations = [];
      try {
        const orgData = await apiGet(`/api/organizations/user/${node.participant?.userid}`);
        userOrganizations = orgData.organizations || [];
      } catch (orgError) {
        console.warn('Error fetching user organizations:', orgError);
      }

      // Check if profile is public (defaults to true for backwards compatibility)
      const isProfilePublic = userData?.is_profile_public ?? true;

      // Show participant profile (all nodes are now participants)
      const profileData = {
        id: node.participant?.userid,
        name: isProfilePublic ? `${node.participant?.firstName} ${node.participant?.lastName}` : 'Private User',
        email: isProfilePublic ? node.participant?.email : null,
        role: node.participant?.role,
        joinedAt: node.participant?.joinedAt,
        isTarget: node.participant?.role === 'target',
        linkedinUrl: userData?.linkedin_url || node.participant?.linkedinUrl,
        avatar: userData?.avatar_url || node.participant?.avatar,
        bio: userData?.bio || (node.participant?.role === 'target' ?
          `Successfully reached target in connection chain` :
          `Chain participant with role: ${node.participant?.role}`),
        participant: node.participant,
        organizations: userOrganizations,
        isProfilePublic,
      };

      console.log('Profile data being set:', profileData);
      console.log('LinkedIn URL found:', profileData.linkedinUrl);

      setSelectedUser(profileData);
      setIsProfileModalOpen(true);
    } catch (error) {
      console.error('Error handling user click:', error);
      // Fallback to showing basic profile without LinkedIn (respecting privacy)
      setSelectedUser({
        id: node.participant?.userid,
        name: 'Private User', // Default to private if we can't fetch data
        email: null,
        role: node.participant?.role,
        joinedAt: node.participant?.joinedAt,
        isTarget: node.participant?.role === 'target',
        bio: node.participant?.role === 'target' ?
          `Successfully reached target in connection chain` :
          `Chain participant with role: ${node.participant?.role}`,
        participant: node.participant,
        isProfilePublic: false, // Assume private on error
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
              <div className="text-lg md:text-2xl font-bold">{totalClicks}</div>
              <div className="text-xs text-muted-foreground">Clicks</div>
            </div>
          </div>
        </Card>

        <Card className="p-3 md:p-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
            <div>
              <div className="text-lg md:text-2xl font-bold">{totalShares}</div>
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
              <div className={`w-full border rounded-lg bg-card ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-[300px] md:h-[500px]'}`}>
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
          participant={selectedUser.participant}
        />
      )}
    </div>
  );
};

export { ChainVisualization };