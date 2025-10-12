import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Network, ChevronRight, RefreshCw, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import { apiPost, apiGet } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

const API_BASE = '/api/connector';

interface Job {
  id: number;
  title: string;
  industry: string;
  sector: string;
}

interface PathData {
  path: Job[];
  pathLength: number;
}

interface ConnectionPathVisualizationProps {
  requestId: string;
  isCreator: boolean;
  initialCreatorJob?: Job | null;
  initialTargetJob?: Job | null;
}

export function ConnectionPathVisualization({
  requestId,
  isCreator,
  initialCreatorJob = null,
  initialTargetJob = null
}: ConnectionPathVisualizationProps) {
  const { toast } = useToast();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [creatorJob, setCreatorJob] = useState<Job | null>(initialCreatorJob);
  const [targetJob, setTargetJob] = useState<Job | null>(initialTargetJob);
  const [pathData, setPathData] = useState<PathData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Job selection modal states
  const [showJobSelector, setShowJobSelector] = useState(false);
  const [selectingFor, setSelectingFor] = useState<'creator' | 'target'>('creator');
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingJobs, setIsLoadingJobs] = useState(false);

  // Load saved path on mount
  useEffect(() => {
    if (requestId) {
      loadSavedPath();
    }
  }, [requestId]);

  // Fetch available jobs when modal opens
  useEffect(() => {
    if (showJobSelector && availableJobs.length === 0) {
      fetchAvailableJobs();
    }
  }, [showJobSelector]);

  const loadSavedPath = async () => {
    setIsLoading(true);
    try {
      const response = await apiGet(`${API_BASE}/path/${requestId}`);

      if (response.exists && response.creatorJob && response.targetJob) {
        // Set the jobs and path data from saved data
        setCreatorJob(response.creatorJob);
        setTargetJob(response.targetJob);
        setPathData({
          path: response.path,
          pathLength: response.pathLength
        });
        setError(null);
      }
    } catch (error) {
      console.error('Error loading saved path:', error);
      // Not a critical error - user can still create a new path
    } finally {
      setIsLoading(false);
    }
  };

  const fetchAvailableJobs = async () => {
    setIsLoadingJobs(true);
    try {
      const response = await apiGet(`${API_BASE}/jobs/all`);
      setAvailableJobs(response.jobs || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      toast({
        title: "Error",
        description: "Failed to load jobs. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingJobs(false);
    }
  };

  // Calculate path when both jobs are selected (but not if we already have path data from DB)
  useEffect(() => {
    if (creatorJob && targetJob && !pathData) {
      calculatePath();
    }
  }, [creatorJob, targetJob]);

  const calculatePath = async () => {
    if (!creatorJob || !targetJob) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiPost(`${API_BASE}/level/calculate-path`, {
        startId: creatorJob.id,
        targetId: targetJob.id
      });

      setPathData(response);

      // Save the path to database
      await savePath(creatorJob.id, targetJob.id, response.path, response.pathLength);
    } catch (error) {
      console.error('Error calculating path:', error);
      setError('Failed to calculate connection path');
      toast({
        title: "Error",
        description: "Could not calculate the connection path. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const savePath = async (creatorJobId: number, targetJobId: number, path: Job[], pathLength: number) => {
    try {
      await apiPost(`${API_BASE}/path/${requestId}`, {
        creatorJobId,
        targetJobId,
        pathData: path,
        pathLength
      });

      toast({
        title: "Path Saved",
        description: "Your connection path has been saved successfully.",
      });
    } catch (error) {
      console.error('Error saving path:', error);
      // Non-critical - user can still see the visualization
      toast({
        title: "Warning",
        description: "Path calculated but could not be saved. It will be lost on page refresh.",
        variant: "destructive"
      });
    }
  };

  const handleJobSelect = (job: Job) => {
    if (selectingFor === 'creator') {
      setCreatorJob(job);
    } else {
      setTargetJob(job);
    }
    setShowJobSelector(false);
    setSearchQuery('');
  };

  const openJobSelector = (type: 'creator' | 'target') => {
    setSelectingFor(type);
    setShowJobSelector(true);
  };

  // D3 Visualization
  useEffect(() => {
    if (!pathData || !svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = 280;

    // Clear previous content
    svg.selectAll("*").remove();

    const margin = { top: 40, right: 40, bottom: 40, left: 40 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const path = pathData.path;
    const nodeCount = path.length;

    // Calculate positions for nodes along a horizontal line
    const positions = path.map((_, i) => ({
      x: (innerWidth / (nodeCount - 1)) * i,
      y: innerHeight / 2
    }));

    // Add gradient definition for the path (neutral for black background)
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", `path-gradient-${requestId}`)
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%");

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", "#9CA3AF")
      .attr("stop-opacity", 0.6);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", "#D1D5DB")
      .attr("stop-opacity", 0.8);

    // Draw animated path lines
    for (let i = 0; i < positions.length - 1; i++) {
      const line = g.append("line")
        .attr("x1", positions[i].x)
        .attr("y1", positions[i].y)
        .attr("x2", positions[i].x)
        .attr("y2", positions[i].y)
        .attr("stroke", `url(#path-gradient-${requestId})`)
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round")
        .style("opacity", 0);

      // Animate line appearing (slower)
      line.transition()
        .delay(i * 800)
        .duration(800)
        .style("opacity", 1)
        .attr("x2", positions[i + 1].x)
        .attr("y2", positions[i + 1].y);

      // Add animated glow effect
      const glowLine = g.append("line")
        .attr("x1", positions[i].x)
        .attr("y1", positions[i].y)
        .attr("x2", positions[i].x)
        .attr("y2", positions[i].y)
        .attr("stroke", "#D1D5DB")
        .attr("stroke-width", 8)
        .attr("stroke-linecap", "round")
        .style("opacity", 0)
        .attr("filter", "blur(4px)");

      glowLine.transition()
        .delay(i * 800)
        .duration(800)
        .style("opacity", 0.3)
        .attr("x2", positions[i + 1].x)
        .attr("y2", positions[i + 1].y);
    }

    // Draw nodes
    path.forEach((job, i) => {
      const nodeGroup = g.append("g")
        .attr("transform", `translate(${positions[i].x},${positions[i].y})`)
        .style("opacity", 0)
        .style("cursor", "pointer");

      // Animated appearance (slower)
      nodeGroup.transition()
        .delay(i * 800)
        .duration(1000)
        .style("opacity", 1);

      // Node glow (background)
      const isStart = i === 0;
      const isEnd = i === path.length - 1;
      const isEndpoint = isStart || isEnd;

      // Determine node color
      const nodeColor = isStart ? "#3B82F6" : isEnd ? "#EF4444" : "#10B981"; // blue, red, green
      const glowColor = isStart ? "rgba(59, 130, 246, 0.4)" : isEnd ? "rgba(239, 68, 68, 0.4)" : "rgba(16, 185, 129, 0.4)";

      nodeGroup.append("circle")
        .attr("r", isEndpoint ? 28 : 22)
        .attr("fill", nodeColor)
        .attr("opacity", 0.2)
        .attr("filter", "blur(8px)");

      // Main node circle
      nodeGroup.append("circle")
        .attr("r", isEndpoint ? 20 : 16)
        .attr("fill", nodeColor)
        .attr("stroke", nodeColor)
        .attr("stroke-width", 3)
        .style("filter", `drop-shadow(0px 4px 12px ${glowColor})`);

      // Continuous pulse animation for all nodes (slower, gentler)
      nodeGroup.select("circle:nth-child(2)")
        .transition()
        .delay(i * 800 + 1200)
        .duration(3000)
        .ease(d3.easeSinInOut)
        .attr("r", isEndpoint ? 22 : 18)
        .transition()
        .duration(3000)
        .ease(d3.easeSinInOut)
        .attr("r", isEndpoint ? 20 : 16)
        .on("end", function repeat() {
          d3.select(this)
            .transition()
            .duration(3000)
            .ease(d3.easeSinInOut)
            .attr("r", isEndpoint ? 22 : 18)
            .transition()
            .duration(3000)
            .ease(d3.easeSinInOut)
            .attr("r", isEndpoint ? 20 : 16)
            .on("end", repeat);
        });

      // Icon or number in the center
      if (isEndpoint) {
        // Start and end nodes get icons (using text as placeholder)
        nodeGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("font-size", "18px")
          .attr("fill", "#FFFFFF")
          .attr("font-weight", "bold")
          .text(i === 0 ? "S" : "T");
      } else {
        // Middle nodes get numbers
        nodeGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "0.35em")
          .attr("font-size", "14px")
          .attr("fill", "#FFFFFF")
          .attr("font-weight", "600")
          .text(i);
      }

      // Job title label
      const labelGroup = nodeGroup.append("g")
        .attr("transform", `translate(0, ${isEndpoint ? 45 : 40})`);

      // Background for text (better readability)
      const titleText = job.title.length > 20 ? job.title.substring(0, 18) + '...' : job.title;
      const textWidth = titleText.length * 6;

      labelGroup.append("rect")
        .attr("x", -textWidth / 2 - 6)
        .attr("y", -12)
        .attr("width", textWidth + 12)
        .attr("height", 24)
        .attr("rx", 6)
        .attr("fill", "hsl(215, 25%, 8%)")
        .attr("opacity", 0.9);

      labelGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", "12px")
        .attr("fill", "hsl(0, 0%, 98%)")
        .attr("font-weight", isEndpoint ? "600" : "400")
        .text(titleText);

      // Industry label (smaller, below title)
      if (job.industry) {
        const industryText = job.industry.length > 25 ? job.industry.substring(0, 23) + '...' : job.industry;
        labelGroup.append("text")
          .attr("text-anchor", "middle")
          .attr("dy", "18")
          .attr("font-size", "10px")
          .attr("fill", "hsl(215, 15%, 70%)")
          .text(industryText);
      }

      // Tooltip on hover
      nodeGroup
        .on("mouseenter", function() {
          d3.select(this).select("circle:nth-child(2)")
            .transition()
            .duration(200)
            .attr("r", isEndpoint ? 24 : 19)
            .attr("stroke-width", 4);
        })
        .on("mouseleave", function() {
          d3.select(this).select("circle:nth-child(2)")
            .transition()
            .duration(200)
            .attr("r", isEndpoint ? 20 : 16)
            .attr("stroke-width", 3);
        });
    });

    // Cleanup function
    return () => {
      svg.selectAll("*").remove();
    };
  }, [pathData, requestId]);

  const filteredJobs = availableJobs.filter((job) => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;
    return (
      job.title.toLowerCase().includes(query) ||
      job.industry.toLowerCase().includes(query) ||
      job.sector.toLowerCase().includes(query)
    );
  });

  // Don't render if not creator
  if (!isCreator) return null;

  return (
    <>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Network className="h-5 w-5 text-primary" />
            Connection Path Visualization
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Visualize the career networking path from your role to your target using our connector algorithm
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Job Selection Section */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Your Job Role</label>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => openJobSelector('creator')}
              >
                {creatorJob ? (
                  <div className="text-left">
                    <div className="font-semibold">{creatorJob.title}</div>
                    <div className="text-xs text-muted-foreground">{creatorJob.industry}</div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Select your job role</div>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Target Job Role</label>
              <Button
                variant="outline"
                className="w-full justify-start h-auto py-4"
                onClick={() => openJobSelector('target')}
              >
                {targetJob ? (
                  <div className="text-left">
                    <div className="font-semibold">{targetJob.title}</div>
                    <div className="text-xs text-muted-foreground">{targetJob.industry}</div>
                  </div>
                ) : (
                  <div className="text-muted-foreground">Select target job role</div>
                )}
              </Button>
            </div>
          </div>

          {/* Path Visualization */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-6 w-6 animate-spin text-primary mr-2" />
              <span className="text-sm text-muted-foreground">Calculating connection path...</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          {!isLoading && !error && pathData && (
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
                <Badge variant="secondary">
                  {pathData.pathLength} {pathData.pathLength === 1 ? 'connection' : 'connections'}
                </Badge>
              </div>

              {/* SVG Visualization */}
              <div
                ref={containerRef}
                className="w-full border border-primary/20 rounded-lg overflow-hidden"
                style={{ backgroundColor: '#000000' }}
              >
                <svg
                  ref={svgRef}
                  className="w-full"
                  style={{ height: '280px' }}
                />
              </div>

              {/* Path Description */}
              <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Info className="h-4 w-4 text-primary" />
                  How to interpret this path:
                </div>
                <ul className="text-xs text-muted-foreground space-y-1 ml-6">
                  <li>• <strong>S</strong> marks your starting role</li>
                  <li>• <strong>T</strong> marks your target role</li>
                  <li>• Numbers show intermediate career connections</li>
                  <li>• The path shows the shortest networking route</li>
                  <li>• Each connection represents a realistic career transition</li>
                </ul>
              </div>
            </motion.div>
          )}

          {!creatorJob && !targetJob && !isLoading && !error && (
            <div className="text-center py-12 space-y-4">
              <Network className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <div className="space-y-2">
                <h4 className="font-medium">Get Started</h4>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Select your current job role and your target role to visualize the connection path
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Job Selection Modal */}
      <Dialog open={showJobSelector} onOpenChange={setShowJobSelector}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Select {selectingFor === 'creator' ? 'Your Job Role' : 'Target Job Role'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Search by job title, industry, or sector..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full"
            />

            {isLoadingJobs ? (
              <div className="text-center py-12">
                <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Loading jobs...</p>
              </div>
            ) : (
              <div className="max-h-[400px] overflow-y-auto space-y-2 pr-2">
                {filteredJobs.slice(0, 50).map((job) => (
                  <Button
                    key={job.id}
                    variant="outline"
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => handleJobSelect(job)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-xl">💼</div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold truncate">{job.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {job.industry} • {job.sector}
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    </div>
                  </Button>
                ))}

                {filteredJobs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No jobs found. Try a different search.
                  </p>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
