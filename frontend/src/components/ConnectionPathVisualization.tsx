import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Network, RefreshCw, AlertCircle, CheckCircle2, Sparkles, ChevronRight } from 'lucide-react';
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
  const containerRef = useRef<HTMLDivElement>(null);

  const [myJob, setMyJob] = useState('');
  const [myJobDescription, setMyJobDescription] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [targetJobDescription, setTargetJobDescription] = useState('');
  const [path, setPath] = useState<PathStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // D3 Visualization
  useEffect(() => {
    if (!path || path.length === 0 || !svgRef.current || !containerRef.current) return;

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

      // Animate line appearing
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
    path.forEach((step, i) => {
      const nodeGroup = g.append("g")
        .attr("transform", `translate(${positions[i].x},${positions[i].y})`)
        .style("opacity", 0)
        .style("cursor", "pointer");

      // Animated appearance
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

      // Continuous pulse animation for all nodes
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

      // Step number in the center
      nodeGroup.append("text")
        .attr("text-anchor", "middle")
        .attr("dy", "0.35em")
        .attr("font-size", isEndpoint ? "18px" : "14px")
        .attr("fill", "#FFFFFF")
        .attr("font-weight", "bold")
        .text(step.step);

      // Job title label
      const labelGroup = nodeGroup.append("g")
        .attr("transform", `translate(0, ${isEndpoint ? 45 : 40})`);

      // Background for text (better readability)
      const titleText = step.profession.length > 20 ? step.profession.substring(0, 18) + '...' : step.profession;
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
  }, [path, requestId]);

  // Don't render if not creator
  if (!isCreator) return null;

  return (
    <Card className="mb-8">
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

        {/* Path Visualization */}
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
              <Badge variant="secondary">
                {path.length} {path.length === 1 ? 'step' : 'steps'}
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

            {/* Path Steps List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
              {path.map((step: PathStep, index: number) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className={`flex gap-4 p-4 rounded-xl border ${
                    index === 0
                      ? 'bg-primary/10 border-primary/30'
                      : index === path.length - 1
                      ? 'bg-green-500/10 border-green-500/30'
                      : 'bg-muted border-border'
                  }`}
                >
                  {/* Step Number */}
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      index === 0
                        ? 'bg-primary text-primary-foreground'
                        : index === path.length - 1
                        ? 'bg-green-600 text-white'
                        : 'bg-muted-foreground/20 text-foreground'
                    }`}>
                      {step.step}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg mb-1">{step.profession}</h3>
                    <p className="text-sm text-muted-foreground">{step.explanation}</p>
                  </div>

                  {/* Arrow */}
                  {index < path.length - 1 && (
                    <div className="flex-shrink-0 flex items-center">
                      <ChevronRight className="w-6 h-6 text-primary" />
                    </div>
                  )}
                </motion.div>
              ))}
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
