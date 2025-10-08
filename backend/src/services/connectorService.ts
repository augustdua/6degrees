/**
 * Connector Game Service - TypeScript Implementation
 * Handles graph operations for the job connection game
 */

import Graph from 'graphology';
import { bidirectional } from 'graphology-shortest-path';
import * as fs from 'fs';
import * as path from 'path';

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
  private playableNodes: number[] = [];
  private isLoaded: boolean = false;

  constructor() {
    this.graph = new Graph({ type: 'undirected' });
    this.loadGraph();
  }

  private loadGraph(): void {
    try {
      const dataPath = path.join(__dirname, '../../data/job_graph.json');
      console.log(`Loading graph from: ${dataPath}`);

      const rawData = fs.readFileSync(dataPath, 'utf-8');
      const graphData: GraphData = JSON.parse(rawData);

      // Add all nodes (convert IDs to strings for graphology)
      graphData.nodes.forEach(node => {
        this.graph.addNode(node.id.toString(), {
          job_title: node.job_title,
          industry_name: node.industry_name,
          sector_name: node.sector_name,
          job_description: node.job_description || '',
          key_skills: node.key_skills || '',
          responsibilities: node.responsibilities || ''
        });
      });

      // Add all edges
      graphData.edges.forEach(edge => {
        const sourceStr = edge.source.toString();
        const targetStr = edge.target.toString();
        if (!this.graph.hasEdge(sourceStr, targetStr)) {
          this.graph.addEdge(sourceStr, targetStr);
        }
      });

      // Get main connected component (playable nodes)
      const components = this.getConnectedComponents();
      const mainComponent = components.reduce((largest, current) =>
        current.length > largest.length ? current : largest
      , []);

      this.playableNodes = mainComponent.sort((a, b) => a - b);
      this.isLoaded = true;

      console.log(`✓ Graph loaded: ${this.graph.order} nodes, ${this.graph.size} edges`);
      console.log(`✓ Playable nodes: ${this.playableNodes.length}`);
    } catch (error) {
      console.error('Error loading graph:', error);
      this.isLoaded = false;
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

  getAllJobs(): JobInfo[] {
    const jobs = this.playableNodes
      .map(nodeId => this.getJobInfo(nodeId))
      .filter((job): job is JobInfo => job !== null);

    // Sort alphabetically by title
    jobs.sort((a, b) => a.title.localeCompare(b.title));
    return jobs;
  }

  calculatePath(startId: number, targetId: number): { pathLength: number; path: JobInfo[] } | null {
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

  getChoices(currentNodeId: number, targetNodeId: number): {
    choices: JobInfo[];
    correct: number;
    reachedTarget: boolean;
  } | null {
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
        // Not enough wrong neighbors, use any playable nodes
        const allWrong = this.playableNodes.filter(
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

  validateChoice(currentNodeId: number, targetNodeId: number, chosenNodeId: number): {
    correct: boolean;
    reachedTarget: boolean;
    chosenNode: JobInfo | null;
  } | null {
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

  getGraphInfo(): { totalNodes: number; totalEdges: number; playableNodes: number } {
    return {
      totalNodes: this.graph.order,
      totalEdges: this.graph.size,
      playableNodes: this.playableNodes.length
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
