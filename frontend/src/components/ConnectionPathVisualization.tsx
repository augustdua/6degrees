import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Network, RefreshCw, AlertCircle, CheckCircle2, Sparkles, ChevronRight, Maximize, Minimize, Save } from 'lucide-react';
import { apiPost, apiGet } from '@/lib/api';
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
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const [myJob, setMyJob] = useState('');
  const [myJobDescription, setMyJobDescription] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [targetJobDescription, setTargetJobDescription] = useState('');
  const [path, setPath] = useState<PathStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  const [isSaving, setIsSaving] = useState(false);
  const [savedPath, setSavedPath] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(false);

  const MAX_WORDS = 30;
  const myJobWordCount = myJobDescription.trim().split(/\s+/).filter(w => w).length;
  const targetJobWordCount = targetJobDescription.trim().split(/\s+/).filter(w => w).length;

  // Load saved path on mount
  useEffect(() => {
    const loadSavedPath = async () => {
      try {
        console.log('Loading saved path for request:', requestId);
        const response = await apiGet(`${API_BASE}/path/${requestId}`);
        console.log('Saved path response:', response);

        if (response.exists && response.path) {
          console.log('Path exists, setting state with', response.path.length, 'steps');
          setSavedPath(response);
          setPath(response.path);

          // Pre-fill job fields if we have the job info
          if (response.creatorJob) {
            setMyJob(response.creatorJob.title);
          }
          if (response.targetJob) {
            setTargetJob(response.targetJob.title);
          }
        } else {
          console.log('No saved path exists');
        }
      } catch (error: any) {
        console.error('Error loading saved path:', error);
        // Don't show error toast on mount, it's okay if no path exists
      }
    };

    if (isCreator) {
      loadSavedPath();
    }
  }, [requestId, isCreator]);

  // Save path to database
  const savePath = async (pathData: PathStep[]) => {
    if (!pathData || pathData.length === 0) return;

    setIsSaving(true);
    try {
      console.log('Saving path with', pathData.length, 'steps');

      // Save the path directly - no job matching needed
      const result = await apiPost(`${API_BASE}/path/${requestId}`, {
        pathData: pathData.map(step => ({
          step: step.step,
          profession: step.profession,
          explanation: step.explanation
        })),
        pathLength: pathData.length
      });

      // Update saved path state
      setSavedPath({
        exists: true,
        path: pathData,
        pathLength: pathData.length
      });

      console.log('Path saved successfully');
      toast({
        title: "Path Saved",
        description: "Your connection path has been saved successfully!",
      });
    } catch (error: any) {
      console.error('Error saving path:', error);
      toast({
        title: "Error",
        description: "Could not save the path, but you can still view it.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

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

      // Try to save the path to database
      if (response.path && response.path.length > 0) {
        await savePath(response.path);
      }
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

  // Generate graph data from path with animation parameters
  useEffect(() => {
    console.log('Path data received:', path);
    if (!path || path.length === 0) {
      console.log('No path data or empty path');
      setGraphData({ nodes: [], links: [] });
      return;
    }

    const nodes: any[] = [];
    const links: any[] = [];
    console.log('Generating graph with', path.length, 'nodes');

    // SVG viewBox dimensions
    const viewBoxWidth = 800;
    const viewBoxHeight = 500;
    const margin = 50; // Margin from edges

    // Circular base layout - ensure it fits within boundaries
    const numNodes = path.length;
    const maxAllowedRadius = Math.min(
      (viewBoxWidth - margin * 2) / 2,
      (viewBoxHeight - margin * 2) / 2
    );
    const baseRadius = Math.min(maxAllowedRadius - 30, 200 + numNodes * 15); // 30px buffer for orbit
    const centerX = viewBoxWidth / 2;
    const centerY = viewBoxHeight / 2;

    path.forEach((step, index) => {
      const isStart = index === 0;
      const isEnd = index === path.length - 1;

      // Base position on circle
      const angle = (index / numNodes) * Math.PI * 2 - Math.PI / 2;
      const baseX = centerX + baseRadius * Math.cos(angle);
      const baseY = centerY + baseRadius * Math.sin(angle);

      // Unique animation parameters (seeded by index for consistency)
      const seed = index + 1;
      const freqX = 0.0003 + (seed * 0.00007) % 0.0002; // Slow horizontal frequency
      const freqY = 0.00035 + (seed * 0.00009) % 0.0002; // Slow vertical frequency
      const phaseX = (seed * 1.7) % (Math.PI * 2);
      const phaseY = (seed * 2.3) % (Math.PI * 2);
      const orbitRadius = 15 + (seed % 10) * 2; // Small orbital radius

      nodes.push({
        id: `node-${index}`,
        name: step.profession,
        explanation: step.explanation,
        step: step.step,
        radius: isStart || isEnd ? 30 : 24, // Increased from 20/16 to 30/24
        color: isStart ? '#3B82F6' : isEnd ? '#EF4444' : '#10B981',
        isStart,
        isEnd,
        // Animation parameters
        baseX,
        baseY,
        freqX,
        freqY,
        phaseX,
        phaseY,
        orbitRadius,
        // Current position (will be updated in animation loop)
        x: baseX,
        y: baseY
      });
    });

    // Create a complete graph (clique) - connect every node to every other node
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        links.push({
          source: i,
          target: j
        });
      }
    }

    setGraphData({ nodes, links });
  }, [path]);


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

  // Smooth orbital animation effect with boundary constraints
  useEffect(() => {
    if (!graphData.nodes.length || !svgRef.current) {
      return;
    }

    console.log('Starting smooth orbital animation with', graphData.nodes.length, 'nodes');

    let startTime = Date.now();
    const speed = 1; // Animation speed multiplier

    // Boundary constraints (with padding for node radius and labels)
    const viewBoxWidth = 800;
    const viewBoxHeight = 500;
    const padding = 40; // Extra padding for node size and labels
    const minX = padding;
    const maxX = viewBoxWidth - padding;
    const minY = padding;
    const maxY = viewBoxHeight - padding;

    const animate = () => {
      if (isPaused) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const elapsed = Date.now() - startTime;

      // Update each node's position based on orbital motion with boundary clamping
      graphData.nodes.forEach(node => {
        const t = elapsed * speed;
        const newX = node.baseX + node.orbitRadius * Math.sin(t * node.freqX + node.phaseX);
        const newY = node.baseY + node.orbitRadius * Math.sin(t * node.freqY + node.phaseY);

        // Clamp positions to stay within boundaries
        node.x = Math.max(minX, Math.min(maxX, newX));
        node.y = Math.max(minY, Math.min(maxY, newY));
      });

      // Force re-render by updating state
      setGraphData(prevData => ({
        ...prevData,
        nodes: [...prevData.nodes],
        links: prevData.links
      }));

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [graphData.nodes.length, isPaused]);

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
                {savedPath && (
                  <Badge variant="secondary" className="ml-2">
                    <Save className="h-3 w-3 mr-1" />
                    Saved
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {path.length} {path.length === 1 ? 'step' : 'steps'}
                </Badge>
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
            <div
              className={`w-full border rounded-lg ${isFullscreen ? 'h-[calc(100vh-8rem)]' : 'h-[400px] md:h-[500px]'}`}
              style={{ backgroundColor: '#000000' }}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={() => setIsPaused(false)}
            >
              <svg
                ref={svgRef}
                className="w-full h-full"
                viewBox="0 0 800 500"
                preserveAspectRatio="xMidYMid meet"
              >
                {/* Edges (render all connections for clique) */}
                <g>
                  {graphData.links.map((link, i) => {
                    const source = graphData.nodes[link.source];
                    const target = graphData.nodes[link.target];
                    if (!source || !target) return null;

                    return (
                      <line
                        key={`link-${i}`}
                        x1={source.x}
                        y1={source.y}
                        x2={target.x}
                        y2={target.y}
                        stroke="#9CA3AF"
                        strokeWidth={2}
                        strokeOpacity={0.3}
                      />
                    );
                  })}
                </g>

                {/* Nodes */}
                <g>
                  {graphData.nodes.map((node, i) => (
                    <g key={`node-${i}`} transform={`translate(${node.x},${node.y})`}>
                      {/* Glow effect */}
                      <circle
                        r={node.radius + 6}
                        fill={node.color}
                        opacity={0.2}
                        filter="blur(4px)"
                      />

                      {/* Main circle */}
                      <circle
                        r={node.radius}
                        fill={node.color}
                        stroke={node.color}
                        strokeWidth={2}
                      />

                      {/* Step number */}
                      <text
                        textAnchor="middle"
                        dy="0.35em"
                        fontSize={node.isStart || node.isEnd ? "22px" : "18px"}
                        fill="#FFFFFF"
                        fontWeight="bold"
                        pointerEvents="none"
                      >
                        {node.step}
                      </text>

                      {/* Job name label */}
                      <text
                        x={0}
                        y={node.radius + 24}
                        textAnchor="middle"
                        fontSize="14px"
                        fill="#FFFFFF"
                        fontWeight={node.isStart || node.isEnd ? "600" : "400"}
                        pointerEvents="none"
                      >
                        {node.name.length > 20 ? node.name.substring(0, 18) + '...' : node.name}
                      </text>
                    </g>
                  ))}
                </g>
              </svg>
            </div>

            <div className="text-sm text-muted-foreground">
              <p>💡 <strong>Tip:</strong> Hover to pause animation</p>
            </div>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
