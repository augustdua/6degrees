import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3-force';
import { select } from 'd3-selection';
import { drag } from 'd3-drag';
import { zoom, zoomIdentity, zoomTransform } from 'd3-zoom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Network, RefreshCw, AlertCircle, CheckCircle2, Sparkles, ChevronRight, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const API_BASE = '/api/connector';

interface PathStep {
  step: number;
  profession: string;
  explanation: string;
}

interface ConnectionPathVisualizationProps {
  requestId: string;
  isCreator: boolean;
  initialCreatorJob?: any | null;
  initialTargetJob?: any | null;
}

export function ConnectionPathVisualization({
  requestId,
  isCreator,
}: ConnectionPathVisualizationProps) {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [myJob, setMyJob] = useState('');
  const [myJobDescription, setMyJobDescription] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [targetJobDescription, setTargetJobDescription] = useState('');
  const [path, setPath] = useState<PathStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });

  const MAX_WORDS = 30;
  const myJobWordCount = myJobDescription.trim().split(/\s+/).filter(w => w).length;
  const targetJobWordCount = targetJobDescription.trim().split(/\s+/).filter(w => w).length;

  const findPath = async () => {
    if (!myJob.trim() || !targetJob.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both your job and target job.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiPost(`${API_BASE}/find-path`, {
        myJob: myJob.trim(),
        myJobDescription: myJobDescription.trim() || undefined,
        targetJob: targetJob.trim(),
        targetJobDescription: targetJobDescription.trim() || undefined
      });

      setPath(response.path);
    } catch (error: any) {
      console.error('Error finding path:', error);
      setError('Failed to find connection path');
      toast({
        title: "Error",
        description: error?.message || "Could not find the connection path. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Generate graph data from path
  useEffect(() => {
    if (!path || path.length === 0) {
      setGraphData({ nodes: [], links: [] });
      return;
    }

    const nodes: any[] = [];
    const links: any[] = [];

    path.forEach((step, index) => {
      const isStart = index === 0;
      const isEnd = index === path.length - 1;

      nodes.push({
        id: `node-${index}`,
        name: step.profession,
        explanation: step.explanation,
        step: step.step,
        radius: isStart || isEnd ? 20 : 16,
        color: isStart ? '#3B82F6' : isEnd ? '#EF4444' : '#10B981', // blue, red, green
        isStart,
        isEnd
      });

      // Create link to previous node
      if (index > 0) {
        links.push({
          source: `node-${index - 1}`,
          target: `node-${index}`
        });
      }
    });

    setGraphData({ nodes, links });
  }, [path]);

  // Recenter function
  const recenterGraph = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    const startNode = graphData.nodes.find((n: any) => n.isStart) || graphData.nodes[0];

    if (!startNode) {
      svg.transition()
        .duration(600)
        .call(zoomRef.current.transform, zoomIdentity.translate(0, 0).scale(1));
      return;
    }

    if ((startNode.x === 0 && startNode.y === 0) || startNode.x == null || startNode.y == null) {
      setTimeout(() => recenterGraph(), 100);
      return;
    }

    const current = zoomTransform(svgRef.current as any);
    const scale = current.k || 1;
    const tx = width / 2 - startNode.x * scale;
    const ty = height / 2 - startNode.y * scale;

    const target = zoomIdentity.translate(tx, ty).scale(scale);
    svg.transition()
      .duration(600)
      .call(zoomRef.current.transform, target);
  }, [graphData]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;

    try {
      if (!isFullscreen) {
        if (containerRef.current.requestFullscreen) {
          await containerRef.current.requestFullscreen();
        }
        setIsFullscreen(true);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      } else {
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
        setIsFullscreen(false);
        setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
      }
    } catch (error) {
      console.error('Error toggling fullscreen:', error);
    }
  }, [isFullscreen]);

  // D3 Force Simulation
  useEffect(() => {
    if (!graphData.nodes.length || !svgRef.current) return;

    const svg = select(svgRef.current);
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;

    svg.selectAll("*").remove();

    const container = svg.append("g");

    const zoomBehavior = zoom()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        container.attr("transform", event.transform);
      });

    svg.call(zoomBehavior as any);
    zoomRef.current = zoomBehavior;

    const simulation = d3.forceSimulation(graphData.nodes)
      .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

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

    // Links
    const link = container.append("g")
      .selectAll("line")
      .data(graphData.links)
      .join("line")
      .attr("stroke", "#9CA3AF")
      .attr("stroke-width", 3)
      .attr("stroke-opacity", 0.6);

    // Nodes
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
        }) as any
      );

    // Glow circle
    node.append("circle")
      .attr("r", (d: any) => d.radius + 8)
      .attr("fill", (d: any) => d.color)
      .attr("opacity", 0.2)
      .attr("filter", "blur(8px)");

    // Main circle
    node.append("circle")
      .attr("r", (d: any) => d.radius)
      .attr("fill", (d: any) => d.color)
      .attr("stroke", (d: any) => d.color)
      .attr("stroke-width", 3)
      .style("cursor", "pointer");

    // Step number
    node.append("text")
      .text((d: any) => d.step)
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .attr("font-size", (d: any) => d.isStart || d.isEnd ? "18px" : "14px")
      .attr("fill", "#FFFFFF")
      .attr("font-weight", "bold")
      .style("pointer-events", "none");

    // Job name label
    node.append("text")
      .text((d: any) => d.name.length > 20 ? d.name.substring(0, 18) + '...' : d.name)
      .attr("x", 0)
      .attr("y", (d: any) => d.radius + 20)
      .attr("text-anchor", "middle")
      .attr("font-size", "12px")
      .attr("fill", "#FFFFFF")
      .attr("font-weight", (d: any) => d.isStart || d.isEnd ? "600" : "400")
      .style("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    simulation.on("end", () => {
      setTimeout(() => recenterGraph(), 300);
    });

    const autoRecenterTimeout = setTimeout(() => recenterGraph(), 1000);

    return () => {
      simulation.stop();
      window.removeEventListener('resize', handleResize);
      clearTimeout(autoRecenterTimeout);
    };
  }, [graphData, recenterGraph]);

  // Don't render if not creator
  if (!isCreator) return null;

  return (
    <Card className="mb-8" ref={containerRef}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          Connection Path Visualization
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-2">
          Visualize the career networking path from your role to your target
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Input Form */}
        {path.length === 0 && (
          <div className="space-y-6">
            {/* My Job Section */}
            <div className="space-y-3 p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <Label className="text-lg font-semibold">Your Job</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="my-job" className="text-sm">Job Title *</Label>
                <Textarea
                  id="my-job"
                  placeholder="e.g., Mathematician"
                  value={myJob}
                  onChange={(e) => setMyJob(e.target.value)}
                  className="min-h-[60px] resize-none bg-background"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="my-job-desc" className="text-sm">
                  What you do <span className="text-muted-foreground">(optional, 1-2 lines)</span>
                </Label>
                <Textarea
                  id="my-job-desc"
                  placeholder="e.g., Build optimization models for complex systems and analyze algorithmic efficiency"
                  value={myJobDescription}
                  onChange={(e) => {
                    const words = e.target.value.trim().split(/\s+/).filter(w => w);
                    if (words.length <= MAX_WORDS) {
                      setMyJobDescription(e.target.value);
                    }
                  }}
                  className="min-h-[80px] resize-none bg-background"
                />
                <div className="flex justify-end text-xs text-muted-foreground">
                  <span className={myJobWordCount > MAX_WORDS ? 'text-destructive' : ''}>
                    {myJobWordCount}/{MAX_WORDS} words
                  </span>
                </div>
              </div>
            </div>

            {/* Arrow Separator */}
            <div className="flex justify-center">
              <div className="p-3 bg-muted rounded-full">
                <ChevronRight className="w-6 h-6 text-primary" />
              </div>
            </div>

            {/* Target Job Section */}
            <div className="space-y-3 p-4 bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-xl border border-green-500/20">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-green-600" />
                <Label className="text-lg font-semibold">Person You Want to Connect With</Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-job" className="text-sm">Their Job Title *</Label>
                <Textarea
                  id="target-job"
                  placeholder="e.g., Hotel Owner"
                  value={targetJob}
                  onChange={(e) => setTargetJob(e.target.value)}
                  className="min-h-[60px] resize-none bg-background"
                  maxLength={100}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-job-desc" className="text-sm">
                  What they do <span className="text-muted-foreground">(optional, 1-2 lines)</span>
                </Label>
                <Textarea
                  id="target-job-desc"
                  placeholder="e.g., Manage hotel operations, oversee procurement, and work with suppliers"
                  value={targetJobDescription}
                  onChange={(e) => {
                    const words = e.target.value.trim().split(/\s+/).filter(w => w);
                    if (words.length <= MAX_WORDS) {
                      setTargetJobDescription(e.target.value);
                    }
                  }}
                  className="min-h-[80px] resize-none bg-background"
                />
                <div className="flex justify-end text-xs text-muted-foreground">
                  <span className={targetJobWordCount > MAX_WORDS ? 'text-destructive' : ''}>
                    {targetJobWordCount}/{MAX_WORDS} words
                  </span>
                </div>
              </div>
            </div>

            {/* Find Path Button */}
            <Button
              onClick={findPath}
              size="lg"
              className="w-full h-14 text-lg font-semibold"
              disabled={isLoading || !myJob.trim() || !targetJob.trim()}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                  Finding Your Path...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Find Connection Path
                </>
              )}
            </Button>

            {/* Info Footer */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground text-center">
              💡 Our AI will analyze the professional relationships and find the optimal networking path
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
            <span className="text-sm text-muted-foreground">Finding connection path...</span>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span className="text-sm text-destructive">{error}</span>
          </div>
        )}

        {/* Graph Visualization */}
        {!isLoading && !error && path.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            {/* Path Info */}
            <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">Path Found</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {path.length} {path.length === 1 ? 'step' : 'steps'}
                </Badge>
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
                    {isFullscreen ? 'Exit' : 'Fullscreen'}
                  </span>
                </Button>
              </div>
            </div>

            {/* Interactive Graph */}
            <div className={`w-full border rounded-lg ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-[400px] md:h-[500px]'}`} style={{ backgroundColor: '#000000' }}>
              <svg
                ref={svgRef}
                className="w-full h-full"
              />
            </div>

            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> Drag nodes to rearrange, scroll to zoom, and use Recenter button to reset view</p>
            </div>

            {/* Try Another Path Button */}
            <Button
              onClick={() => {
                setPath([]);
                setMyJob('');
                setMyJobDescription('');
                setTargetJob('');
                setTargetJobDescription('');
                setError(null);
              }}
              variant="outline"
              size="lg"
              className="w-full"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Another Path
            </Button>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
