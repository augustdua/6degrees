import { Router, Request, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { connectorService } from '../services/connectorService';
import { supabase } from '../config/supabase';
import { v4 as uuidv4 } from 'uuid';

// Lazy-load jobManager to avoid OpenAI initialization at startup
let jobManager: typeof import('../services/jobManager') | null = null;
async function getJobManager() {
  if (!jobManager) {
    jobManager = await import('../services/jobManager');
  }
  return jobManager;
}

const router = Router();

// Job processing queue and progress tracking
interface JobProgress {
  progress: number;
  status: string;
  job?: {
    id: number;
    title: string;
    sector: string;
    industry: string;
  };
  error?: boolean;
}

const jobProcessingProgress: Map<string, JobProgress> = new Map();
const jobQueue: Array<{ jobId: string; jobTitle: string }> = [];
let isProcessing = false;

// Background job processor
async function processJobQueue() {
  if (isProcessing || jobQueue.length === 0) {
    return;
  }

  isProcessing = true;

  while (jobQueue.length > 0) {
    const job = jobQueue.shift();
    if (!job) continue;

    const { jobId, jobTitle } = job;

    try {
      console.log(`[Queue Worker] Processing job: ${jobTitle} (ID: ${jobId})`);

      jobProcessingProgress.set(jobId, { progress: 10, status: 'Generating initial job details...' });

      // Load jobManager
      const jm = await getJobManager();

      // Step 1: Generate initial job details (10% -> 20%)
      const initialJobDetails = await jm.generateJobDetails(jobTitle, 'Unknown Industry', 'Unknown Sector');
      jobProcessingProgress.set(jobId, { progress: 20, status: 'Classifying with ML (embedding similarity)...' });

      // Step 2: Classify using embedding similarity (20% -> 40%)
      // Note: We pass the graph instance, but classification is simplified in TypeScript
      const { sector, industry, embedding } = await jm.classifyJobBySimilarity(
        jobTitle,
        initialJobDetails,
        (connectorService as any).graph
      );
      jobProcessingProgress.set(jobId, { progress: 40, status: 'Regenerating job details with industry context...' });

      // Step 3: Regenerate job details with proper industry context (40% -> 55%)
      const jobDetails = await jm.generateJobDetails(jobTitle, industry, sector);
      jobProcessingProgress.set(jobId, { progress: 55, status: 'Generating final embedding...' });

      // Step 4: Generate final embedding (55% -> 60%)
      // Already have embedding from classification
      jobProcessingProgress.set(jobId, { progress: 60, status: 'Saving job details...' });

      // Step 5: Persist to data stores (60% -> 70%)
      await jm.appendJobToDetails({ industry, sector, title: jobTitle, details: jobDetails });
      jobProcessingProgress.set(jobId, { progress: 70, status: 'Adding to graph...' });

      // Step 6: Add to graph (70% -> 90%)
      const result = await jm.addJobToGraph(
        jobTitle,
        sector,
        industry,
        jobDetails,
        embedding,
        (connectorService as any).graph
      );
      jobProcessingProgress.set(jobId, { progress: 90, status: 'Reloading graph...' });

      // Step 7: Graph is already updated in memory (90% -> 100%)
      jobProcessingProgress.set(jobId, {
        progress: 100,
        status: 'Complete!',
        job: {
          id: result.id,
          title: jobTitle,
          sector,
          industry
        }
      });

      console.log(`[Queue Worker] ✓ Job completed: ${jobTitle} (Node ID: ${result.id})`);
    } catch (error: any) {
      console.error(`[Queue Worker] ✗ Error processing ${jobTitle}:`, error);
      jobProcessingProgress.set(jobId, {
        progress: 0,
        status: `Error: ${error.message}`,
        error: true
      });
    }
  }

  isProcessing = false;
}

// Debug endpoint
router.get('/debug/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const graphInfo = await connectorService.getGraphInfo();
    const isLoaded = connectorService.isGraphLoaded();
    res.json({
      isLoaded,
      graphInfo,
      message: isLoaded ? 'Graph loaded successfully' : 'Graph not loaded'
    });
  } catch (error: any) {
    console.error('Error fetching debug status:', error);
    res.status(500).json({ error: 'Failed to fetch debug status', details: error.message });
  }
});

// Get all available jobs
router.get('/jobs/all', async (req: Request, res: Response): Promise<void> => {
  try {
    const jobs = await connectorService.getAllJobs();
    res.json({ jobs });
  } catch (error: any) {
    console.error('❌ Error fetching jobs:', {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    });
    res.status(500).json({
      error: 'Failed to load jobs from database',
      message: error?.message || 'Unknown error',
      code: 'JOBS_FETCH_ERROR'
    });
  }
});

// Get detailed job information by ID
router.get('/jobs/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = parseInt(req.params.id);
    if (isNaN(jobId)) {
      res.status(400).json({ error: 'Invalid job ID' });
      return;
    }

    const jobDetails = await connectorService.getJobDetails(jobId);
    if (!jobDetails) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(jobDetails);
  } catch (error: any) {
    console.error('❌ Error fetching job details:', error);
    res.status(500).json({
      error: 'Failed to fetch job details',
      message: error?.message || 'Unknown error'
    });
  }
});

// Calculate optimal path between two jobs
router.post('/level/calculate-path', async (req: Request, res: Response): Promise<void> => {
  try {
    const { startId, targetId } = req.body;

    if (startId === undefined || targetId === undefined) {
      res.status(400).json({ error: 'Missing node IDs' });
      return;
    }

    const result = await connectorService.calculatePath(
      parseInt(startId),
      parseInt(targetId)
    );

    if (!result) {
      res.status(400).json({ error: 'No path exists between these jobs' });
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error calculating path:', error);
    res.status(500).json({ error: 'Failed to calculate path' });
  }
});

// Get choices for current node
router.post('/level/choices', async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentNodeId, targetNodeId } = req.body;

    if (currentNodeId === undefined || targetNodeId === undefined) {
      res.status(400).json({ error: 'Missing node IDs' });
      return;
    }

    const result = await connectorService.getChoices(
      parseInt(currentNodeId),
      parseInt(targetNodeId)
    );

    if (!result) {
      res.status(400).json({ error: 'Failed to generate choices' });
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error generating choices:', error);
    res.status(500).json({ error: 'Failed to generate choices' });
  }
});

// Validate choice
router.post('/level/validate', async (req: Request, res: Response): Promise<void> => {
  try {
    const { currentNodeId, targetNodeId, chosenNodeId } = req.body;

    if (currentNodeId === undefined || targetNodeId === undefined || chosenNodeId === undefined) {
      res.status(400).json({ error: 'Missing node IDs' });
      return;
    }

    const result = await connectorService.validateChoice(
      parseInt(currentNodeId),
      parseInt(targetNodeId),
      parseInt(chosenNodeId)
    );

    if (!result) {
      res.status(400).json({ error: 'Failed to validate choice' });
      return;
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error validating choice:', error);
    res.status(500).json({ error: 'Failed to validate choice' });
  }
});

// Get graph info
router.get('/graph/info', async (req: Request, res: Response) => {
  try {
    const info = await connectorService.getGraphInfo();
    res.json(info);
  } catch (error: any) {
    console.error('Error fetching graph info:', error);
    res.status(500).json({ error: 'Failed to fetch graph info' });
  }
});

// Get saved connection path for a request
router.get('/path/:requestId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;

    // Verify user has access to this request
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .select('id, creator_id')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Only creator can view the path
    if (request.creator_id !== (req as any).user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Get the saved path
    const { data: pathData, error: pathError } = await supabase
      .from('request_connection_paths')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (pathError) {
      if (pathError.code === 'PGRST116') {
        // No path exists yet
        res.json({ exists: false, path: null });
        return;
      }
      throw pathError;
    }

    // Also get the job details for creator and target
    const { data: creatorJob } = await supabase
      .from('connector_jobs')
      .select('id, job_title, industry_name, sector_name')
      .eq('id', pathData.creator_job_id)
      .single();

    const { data: targetJob } = await supabase
      .from('connector_jobs')
      .select('id, job_title, industry_name, sector_name')
      .eq('id', pathData.target_job_id)
      .single();

    res.json({
      exists: true,
      path: pathData.path_data,
      pathLength: pathData.path_length,
      creatorJob: creatorJob ? {
        id: creatorJob.id,
        title: creatorJob.job_title,
        industry: creatorJob.industry_name,
        sector: creatorJob.sector_name
      } : null,
      targetJob: targetJob ? {
        id: targetJob.id,
        title: targetJob.job_title,
        industry: targetJob.industry_name,
        sector: targetJob.sector_name
      } : null
    });
  } catch (error: any) {
    console.error('Error fetching connection path:', error);
    res.status(500).json({ error: 'Failed to fetch connection path' });
  }
});

// Save connection path for a request
router.post('/path/:requestId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { requestId } = req.params;
    const { creatorJobId, targetJobId, pathData, pathLength } = req.body;

    if (!pathData || pathLength === undefined) {
      res.status(400).json({ error: 'Missing required fields: pathData and pathLength are required' });
      return;
    }

    // Verify user has access to this request
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .select('id, creator_id')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }

    // Only creator can save the path
    if (request.creator_id !== (req as any).user.id) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Update the connection_requests table with job IDs (if provided)
    if (creatorJobId || targetJobId) {
      const updateData: any = {};
      if (creatorJobId) updateData.creator_job_id = creatorJobId;
      if (targetJobId) updateData.target_job_id = targetJobId;

      const { error: updateError } = await supabase
        .from('connection_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) {
        console.error('Error updating request with job IDs:', updateError);
        // Don't throw - continue saving path even if job ID update fails
      }
    }

    // Upsert the path data
    const { data, error } = await supabase
      .from('request_connection_paths')
      .upsert({
        request_id: requestId,
        creator_job_id: creatorJobId || null,
        target_job_id: targetJobId || null,
        path_data: pathData,
        path_length: pathLength,
        calculated_at: new Date().toISOString()
      }, {
        onConflict: 'request_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving connection path:', error);
      throw error;
    }

    res.json({
      success: true,
      message: 'Connection path saved successfully',
      data
    });
  } catch (error: any) {
    console.error('Error saving connection path:', error);
    res.status(500).json({ error: 'Failed to save connection path' });
  }
});

// Find LLM-based networking path
router.post('/find-path', async (req: Request, res: Response): Promise<void> => {
  try {
    const { myJob, myJobDescription, targetJob, targetJobDescription } = req.body;

    if (!myJob || !targetJob) {
      res.status(400).json({ error: 'Both myJob and targetJob are required' });
      return;
    }

    // Import OpenAI directly
    const OpenAI = (await import('openai')).default;
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    // Build the prompt for OpenAI
    const prompt = `Build a realistic chain of professions connecting ${myJob} to ${targetJob}.

Starting Profession: ${myJob}
${myJobDescription ? `What they do: ${myJobDescription}` : ''}

Target Profession: ${targetJob}
${targetJobDescription ? `What they do: ${targetJobDescription}` : ''}

Guidelines:

Each profession in the chain must have a direct, recurring working relationship (daily / weekly) with the previous one.

Avoid vague or managerial titles such as Analyst, Consultant, Manager, or Specialist unless tied to a concrete function (e.g., Hotel Procurement Officer ✓ / Procurement Manager ✗).

Use a bottom-up, operational logic — trace who actually interacts through tasks, supplies, clients, or services.

Stop the chain as soon as a credible interaction with the target profession exists; do not force a fixed number of steps.

In each step, clearly explain why and how the two professions interact (context of collaboration, transaction, or workflow).

Present the result as a table:

| Step | Profession | Interaction Explanation |
|------|-------------|--------------------------|
| 1 | ${myJob} | [Explanation] |
| 2 | [Next Profession] | [Explanation] |
| … | … | … |
| N | ${targetJob} | [Explanation] |

Ensure the entire chain is both socially plausible (these people could actually meet) and economically grounded (their work overlaps or depends on each other).

Keep the tone factual, concise, and industry-specific.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a professional networking expert who finds realistic connection paths between careers based on direct, recurring working relationships. Always respond with a markdown table in the exact format requested.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      res.status(500).json({ error: 'Failed to generate path' });
      return;
    }

    // Parse the markdown table response
    let path;
    try {
      // Extract table rows (skip header and separator)
      const lines = content.split('\n').filter(line => line.trim().startsWith('|'));

      // Skip the header row (| Step | Profession | ...) and separator row (|------|...)
      const dataRows = lines.slice(2);

      path = dataRows.map(row => {
        // Split by | and clean up
        const cells = row.split('|').map(cell => cell.trim()).filter(cell => cell);

        if (cells.length >= 3) {
          return {
            step: parseInt(cells[0]) || 0,
            profession: cells[1],
            explanation: cells[2]
          };
        }
        return null;
      }).filter(item => item !== null);

      if (path.length === 0) {
        throw new Error('No valid path found in table');
      }
    } catch (parseError) {
      console.error('Failed to parse LLM table response:', content);
      res.status(500).json({ error: 'Failed to parse path response' });
      return;
    }

    res.json({ path });
  } catch (error: any) {
    console.error('Error finding path:', error);
    res.status(500).json({ error: error?.message || 'Failed to find path' });
  }
});

// Job management endpoints (with OpenAI integration)
router.post('/jobs/add', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobTitle } = req.body;

    if (!jobTitle || !jobTitle.trim()) {
      res.status(400).json({ error: 'Job title is required' });
      return;
    }

    const trimmedTitle = jobTitle.trim();

    // Check if job already exists
    const allJobs = await connectorService.getAllJobs();
    const existingJob = allJobs.find(
      j => j.title.toLowerCase() === trimmedTitle.toLowerCase()
    );

    if (existingJob) {
      res.json({
        message: 'Job already exists',
        job: existingJob
      });
      return;
    }

    // Generate unique job ID for tracking
    const jobId = uuidv4();

    // Add to queue
    const queuePosition = jobQueue.length;
    jobQueue.push({ jobId, jobTitle: trimmedTitle });

    console.log(`[API] Job '${trimmedTitle}' added to queue (position: ${queuePosition + 1})`);

    // Start processing if not already running
    processJobQueue().catch(err => console.error('Queue processing error:', err));

    res.json({
      jobId,
      message: 'Job added to processing queue',
      queuePosition: queuePosition + 1
    });
  } catch (error: any) {
    console.error('Error adding job:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }
});

router.get('/jobs/status/:jobId', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { jobId } = req.params;

    const progress = jobProcessingProgress.get(jobId);

    if (!progress) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    res.json(progress);
  } catch (error: any) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});

export default router;
