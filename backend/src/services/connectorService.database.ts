/**
 * Connector Game Service - Database Version
 * Uses PostgreSQL instead of JSON files for scalability
 */

import { supabase } from '../config/supabase';

interface JobInfo {
  id: number;
  title: string;
  industry: string;
  sector: string;
}

interface PathResult {
  pathLength: number;
  path: JobInfo[];
}

interface ChoicesResult {
  choices: JobInfo[];
  correct: number;
  reachedTarget: boolean;
}

interface ValidateResult {
  correct: boolean;
  reachedTarget: boolean;
  chosenNode: JobInfo | null;
}

class ConnectorServiceDB {
  // BFS pathfinding using database
  async calculatePath(startId: number, targetId: number): Promise<PathResult | null> {
    try {
      // Check if both jobs exist
      const { data: jobs, error } = await supabase
        .from('connector_jobs')
        .select('id, job_title, industry_name, sector_name')
        .in('id', [startId, targetId]);

      if (error || !jobs || jobs.length !== 2) {
        return null;
      }

      // BFS to find shortest path
      const queue: Array<{ id: number; path: number[] }> = [{ id: startId, path: [startId] }];
      const visited = new Set<number>([startId]);

      while (queue.length > 0) {
        const { id: current, path } = queue.shift()!;

        if (current === targetId) {
          // Found target! Build path with job info
          const { data: pathJobs } = await supabase
            .from('connector_jobs')
            .select('id, job_title, industry_name, sector_name')
            .in('id', path);

          if (!pathJobs) return null;

          // Sort jobs in path order
          const jobMap = new Map(pathJobs.map(j => [j.id, j]));
          const orderedPath = path.map(id => {
            const job = jobMap.get(id)!;
            return {
              id: job.id,
              title: job.job_title,
              industry: job.industry_name,
              sector: job.sector_name
            };
          });

          return {
            pathLength: path.length - 1,
            path: orderedPath
          };
        }

        // Get neighbors from database
        const { data: edges } = await supabase
          .from('connector_graph_edges')
          .select('source_job_id, target_job_id')
          .or(`source_job_id.eq.${current},target_job_id.eq.${current}`);

        if (edges) {
          for (const edge of edges) {
            const neighbor = edge.source_job_id === current ? edge.target_job_id : edge.source_job_id;

            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push({ id: neighbor, path: [...path, neighbor] });
            }
          }
        }
      }

      // No path found
      return null;
    } catch (error) {
      console.error('Error calculating path:', error);
      return null;
    }
  }

  async getAllJobs(): Promise<JobInfo[]> {
    try {
      const { data, error } = await supabase
        .from('connector_jobs')
        .select('id, job_title, industry_name, sector_name')
        .order('job_title', { ascending: true });

      if (error) throw error;

      return (data || []).map(job => ({
        id: job.id,
        title: job.job_title,
        industry: job.industry_name,
        sector: job.sector_name
      }));
    } catch (error) {
      console.error('Error fetching jobs:', error);
      return [];
    }
  }

  async getJobInfo(nodeId: number): Promise<JobInfo | null> {
    try {
      const { data, error } = await supabase
        .from('connector_jobs')
        .select('id, job_title, industry_name, sector_name')
        .eq('id', nodeId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        title: data.job_title,
        industry: data.industry_name,
        sector: data.sector_name
      };
    } catch (error) {
      return null;
    }
  }

  async getChoices(currentNodeId: number, targetNodeId: number): Promise<ChoicesResult | null> {
    try {
      if (currentNodeId === targetNodeId) {
        return {
          choices: [],
          correct: 0,
          reachedTarget: true
        };
      }

      // Calculate shortest path to get correct next step
      const pathResult = await this.calculatePath(currentNodeId, targetNodeId);

      if (!pathResult || pathResult.path.length === 1) {
        return {
          choices: [],
          correct: 0,
          reachedTarget: true
        };
      }

      const correctChoice = pathResult.path[1].id;

      // Get all neighbors
      const { data: edges } = await supabase
        .from('connector_graph_edges')
        .select('source_job_id, target_job_id')
        .or(`source_job_id.eq.${currentNodeId},target_job_id.eq.${currentNodeId}`);

      if (!edges) return null;

      const neighbors = edges.map(edge =>
        edge.source_job_id === currentNodeId ? edge.target_job_id : edge.source_job_id
      );

      // Get wrong neighbors (not the correct choice)
      const wrongNeighbors = neighbors.filter(n => n !== correctChoice);

      // Pick 2 random wrong choices
      let wrongChoices: number[];
      if (wrongNeighbors.length >= 2) {
        // Shuffle and pick 2
        const shuffled = wrongNeighbors.sort(() => Math.random() - 0.5);
        wrongChoices = shuffled.slice(0, 2);
      } else {
        // Not enough wrong neighbors, get random playable jobs
        const { data: randomJobs } = await supabase
          .from('connector_jobs')
          .select('id')
          .not('id', 'in', `(${currentNodeId},${correctChoice})`)
          .limit(2);

        wrongChoices = (randomJobs || []).map(j => j.id);
      }

      // Combine and shuffle all choices
      const allChoiceIds = [correctChoice, ...wrongChoices];
      allChoiceIds.sort(() => Math.random() - 0.5);

      // Get job info for all choices
      const { data: choiceJobs } = await supabase
        .from('connector_jobs')
        .select('id, job_title, industry_name, sector_name')
        .in('id', allChoiceIds);

      if (!choiceJobs) return null;

      const choices = choiceJobs.map(job => ({
        id: job.id,
        title: job.job_title,
        industry: job.industry_name,
        sector: job.sector_name
      }));

      return {
        choices,
        correct: correctChoice,
        reachedTarget: false
      };
    } catch (error) {
      console.error('Error generating choices:', error);
      return null;
    }
  }

  async validateChoice(currentNodeId: number, targetNodeId: number, chosenNodeId: number): Promise<ValidateResult | null> {
    try {
      const pathResult = await this.calculatePath(currentNodeId, targetNodeId);

      if (!pathResult) {
        return null;
      }

      if (pathResult.path.length === 1) {
        return {
          correct: true,
          reachedTarget: true,
          chosenNode: await this.getJobInfo(chosenNodeId)
        };
      }

      const correctNext = pathResult.path[1].id;
      const isCorrect = chosenNodeId === correctNext;
      const reachedTarget = chosenNodeId === targetNodeId;

      return {
        correct: isCorrect,
        reachedTarget,
        chosenNode: await this.getJobInfo(chosenNodeId)
      };
    } catch (error) {
      console.error('Error validating choice:', error);
      return null;
    }
  }

  async getGraphInfo(): Promise<{ totalNodes: number; totalEdges: number }> {
    try {
      const [{ count: totalNodes }, { count: totalEdges }] = await Promise.all([
        supabase.from('connector_jobs').select('*', { count: 'exact', head: true }),
        supabase.from('connector_graph_edges').select('*', { count: 'exact', head: true })
      ]);

      return {
        totalNodes: totalNodes || 0,
        totalEdges: totalEdges || 0
      };
    } catch (error) {
      console.error('Error fetching graph info:', error);
      return { totalNodes: 0, totalEdges: 0 };
    }
  }

  async addJobToGraph(
    jobTitle: string,
    sector: string,
    industry: string,
    jobDetails: { job_description: string; key_skills: string; responsibilities: string }
  ): Promise<{ id: number; title: string } | null> {
    try {
      // Insert new job
      const { data: newJob, error: insertError } = await supabase
        .from('connector_jobs')
        .insert({
          job_title: jobTitle,
          industry_name: industry,
          sector_name: sector,
          job_description: jobDetails.job_description,
          key_skills: jobDetails.key_skills,
          responsibilities: jobDetails.responsibilities,
          is_custom: true
        })
        .select()
        .single();

      if (insertError || !newJob) {
        console.error('Error inserting job:', insertError);
        return null;
      }

      // Connect to 12 random existing jobs (simplified - in production use embedding similarity)
      const { data: randomJobs } = await supabase
        .from('connector_jobs')
        .select('id')
        .neq('id', newJob.id)
        .limit(12);

      if (randomJobs && randomJobs.length > 0) {
        const edges = randomJobs.map(job => ({
          source_job_id: newJob.id,
          target_job_id: job.id,
          weight: 1.0
        }));

        await supabase.from('connector_graph_edges').insert(edges);
      }

      return {
        id: newJob.id,
        title: newJob.job_title
      };
    } catch (error) {
      console.error('Error adding job to graph:', error);
      return null;
    }
  }
}

// Singleton instance
export const connectorServiceDB = new ConnectorServiceDB();
