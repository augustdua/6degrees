/**
 * Connector Game Service - TypeScript Implementation
 * Handles graph operations for the job connection game
 */

import Graph from 'graphology';
import { bidirectional } from 'graphology-shortest-path';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../config/supabase';

interface JobNode {
  id: number;
  job_title: string;
  industry_name: string;
  sector_name: string;
  job_description?: string;
  key_skills?: string;
  responsibilities?: string;
}

// Note: Graphology uses string keys internally
type NodeKey = string;

interface GraphData {
  nodes: JobNode[];
  edges: { source: number; target: number }[];
}

interface JobInfo {
  id: number;
  title: string;
  industry: string;
  sector: string;
}

class ConnectorService {
  private graph: Graph;
  private allNodes: number[] = [];
  private isLoaded: boolean = false;
  private loadingPromise: Promise<void> | null = null;

  constructor() {
    this.graph = new Graph({ type: 'undirected' });
    // Don't load immediately - wait for first request
  }

  private async ensureGraphLoaded(): Promise<void> {
    if (this.isLoaded) return;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.loadGraph();
    await this.loadingPromise;
  }

  private async loadGraph(): Promise<void> {
    try {
      console.log('Loading graph from database (connector_jobs, connector_graph_edges)...');
      console.log('Supabase URL:', process.env.SUPABASE_URL);
      console.log('Supabase key present:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

      // Fetch nodes (remove default 1000 row limit)
      const { data: jobs, error: jobsError } = await supabase
        .from('connector_jobs')
        .select('id, job_title, industry_name, sector_name')
        .order('id', { ascending: true })
        .limit(10000);

      console.log('Jobs query result:', { jobCount: jobs?.length, hasError: !!jobsError });

      if (jobsError) {
        console.error('❌ Supabase jobs query error:', jobsError);
        throw jobsError;
      }

      // Add nodes
      (jobs || []).forEach(node => {
        this.graph.addNode(node.id.toString(), {
          job_title: node.job_title,
          industry_name: node.industry_name,
          sector_name: node.sector_name,
          job_description: '',
          key_skills: '',
          responsibilities: ''
        });
      });

      // Build a fast lookup of valid node IDs to guard against orphaned edges
      const validNodeIds = new Set((jobs || []).map(n => n.id.toString()));

      // Fetch edges (remove default 1000 row limit)
      const { data: edges, error: edgesError } = await supabase
        .from('connector_graph_edges')
        .select('source_job_id, target_job_id')
        .limit(100000);

      if (edgesError) {
        throw edgesError;
      }

      // Add edges (skip any that reference missing nodes)
      (edges || []).forEach(edge => {
        const sourceStr = edge.source_job_id.toString();
        const targetStr = edge.target_job_id.toString();

        if (!validNodeIds.has(sourceStr) || !validNodeIds.has(targetStr)) {
          console.warn('Skipping edge with missing node(s)', {
            source: sourceStr,
            target: targetStr
          });
          return;
        }

        if (!this.graph.hasEdge(sourceStr, targetStr)) {
          this.graph.addEdge(sourceStr, targetStr);
        }
      });

      // Store all nodes for quick access
      const allNodes: number[] = [];
      this.graph.forEachNode(n => allNodes.push(parseInt(n)));
      this.allNodes = allNodes.sort((a, b) => a - b);
      this.isLoaded = true;

      console.log(`✓ Graph loaded: ${this.graph.order} nodes, ${this.graph.size} edges`);
      console.log(`✓ Total nodes available: ${this.allNodes.length}`);
    } catch (error: any) {
      console.error('❌ CRITICAL ERROR loading graph:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      });
      this.isLoaded = false;
      throw error; // Re-throw to surface the error
    }
  }

  private getConnectedComponents(): number[][] {
    const visited = new Set<NodeKey>();
    const components: number[][] = [];

    this.graph.forEachNode(node => {
      if (!visited.has(node)) {
        const component: number[] = [];
        const queue: NodeKey[] = [node];
        visited.add(node);

        while (queue.length > 0) {
          const current = queue.shift()!;
          component.push(parseInt(current));

          this.graph.forEachNeighbor(current, neighbor => {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          });
        }

        components.push(component);
      }
    });

    return components;
  }

  getJobInfo(nodeId: number): JobInfo | null {
    const nodeKey = nodeId.toString();
    if (!this.graph.hasNode(nodeKey)) {
      return null;
    }

    const attrs = this.graph.getNodeAttributes(nodeKey);
    return {
      id: nodeId,
      title: attrs.job_title || 'Unknown',
      industry: attrs.industry_name || 'Unknown',
      sector: attrs.sector_name || 'Unknown'
    };
  }

  async getAllJobs(): Promise<JobInfo[]> {
    await this.ensureGraphLoaded();
    const jobs = this.allNodes
      .map(nodeId => this.getJobInfo(nodeId))
      .filter((job): job is JobInfo => job !== null);

    // Sort alphabetically by title
    jobs.sort((a, b) => a.title.localeCompare(b.title));
    return jobs;
  }

  async calculatePath(startId: number, targetId: number): Promise<{ pathLength: number; path: JobInfo[] } | null> {
    await this.ensureGraphLoaded();
    const startKey = startId.toString();
    const targetKey = targetId.toString();

    if (!this.graph.hasNode(startKey) || !this.graph.hasNode(targetKey)) {
      return null;
    }

    try {
      const path = bidirectional(this.graph, startKey, targetKey);

      if (!path) {
        return null;
      }

      return {
        pathLength: path.length - 1,
        path: path.map(nodeKey => this.getJobInfo(parseInt(nodeKey))!).filter(job => job !== null)
      };
    } catch (error) {
      console.error('Error calculating path:', error);
      return null;
    }
  }

  async getChoices(currentNodeId: number, targetNodeId: number): Promise<{
    choices: JobInfo[];
    correct: number;
    reachedTarget: boolean;
  } | null> {
    await this.ensureGraphLoaded();
    if (currentNodeId === targetNodeId) {
      return {
        choices: [],
        correct: 0,
        reachedTarget: true
      };
    }

    const currentKey = currentNodeId.toString();
    const targetKey = targetNodeId.toString();

    try {
      const shortestPath = bidirectional(this.graph, currentKey, targetKey);

      if (!shortestPath || shortestPath.length === 1) {
        return {
          choices: [],
          correct: 0,
          reachedTarget: true
        };
      }

      const correctChoiceKey = shortestPath[1]; // Next node on optimal path
      const correctChoice = parseInt(correctChoiceKey);

      // Get all neighbors
      const neighbors = this.graph.neighbors(currentKey);

      // Remove correct choice from neighbors
      const wrongNeighbors = neighbors.filter(n => n !== correctChoiceKey).map(n => parseInt(n));

      // Pick 2 random wrong choices
      let wrongChoices: number[];
      if (wrongNeighbors.length >= 2) {
        wrongChoices = this.getRandomItems(wrongNeighbors, 2);
      } else {
        // Not enough wrong neighbors, use any nodes
        const allWrong = this.allNodes.filter(
          n => n !== currentNodeId && n !== correctChoice
        );
        wrongChoices = this.getRandomItems(allWrong, Math.min(2, allWrong.length));
      }

      // Combine and shuffle
      const allChoices = [correctChoice, ...wrongChoices];
      this.shuffleArray(allChoices);

      return {
        choices: allChoices.map(id => this.getJobInfo(id)!).filter(job => job !== null),
        correct: correctChoice,
        reachedTarget: false
      };
    } catch (error) {
      console.error('Error generating choices:', error);
      return null;
    }
  }

  async validateChoice(currentNodeId: number, targetNodeId: number, chosenNodeId: number): Promise<{
    correct: boolean;
    reachedTarget: boolean;
    chosenNode: JobInfo | null;
  } | null> {
    await this.ensureGraphLoaded();
    const currentKey = currentNodeId.toString();
    const targetKey = targetNodeId.toString();
    const chosenKey = chosenNodeId.toString();

    try {
      const shortestPath = bidirectional(this.graph, currentKey, targetKey);

      if (!shortestPath) {
        return null;
      }

      if (shortestPath.length === 1) {
        return {
          correct: true,
          reachedTarget: true,
          chosenNode: this.getJobInfo(chosenNodeId)
        };
      }

      const correctNextKey = shortestPath[1];
      const isCorrect = chosenKey === correctNextKey;
      const reachedTarget = chosenNodeId === targetNodeId;

      return {
        correct: isCorrect,
        reachedTarget,
        chosenNode: this.getJobInfo(chosenNodeId)
      };
    } catch (error) {
      console.error('Error validating choice:', error);
      return null;
    }
  }

  async getGraphInfo(): Promise<{ totalNodes: number; totalEdges: number }> {
    await this.ensureGraphLoaded();
    return {
      totalNodes: this.graph.order,
      totalEdges: this.graph.size
    };
  }

  isGraphLoaded(): boolean {
    return this.isLoaded;
  }

  private getRandomItems<T>(array: T[], count: number): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
  }

  private shuffleArray<T>(array: T[]): void {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }
}

// Singleton instance
export const connectorService = new ConnectorService();
