import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import axios from 'axios';

const router = Router();

// Python service URL
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';

// Helper function to proxy requests to Python service
async function proxyToPython(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any) {
  try {
    const response = await axios({
      method,
      url: `${PYTHON_SERVICE_URL}${endpoint}`,
      data,
      timeout: 10000
    });
    return response.data;
  } catch (error: any) {
    console.error(`Error proxying to Python service (${endpoint}):`, error.message);
    throw error;
  }
}

// Get all available jobs
router.get('/jobs/all', async (req, res) => {
  try {
    const data = await proxyToPython('/api/jobs/all', 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to fetch jobs'
    });
  }
});

// Calculate optimal path between two jobs
router.post('/level/calculate-path', async (req, res) => {
  try {
    const data = await proxyToPython('/api/level/calculate-path', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('Error calculating path:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to calculate path'
    });
  }
});

// Get choices for current node
router.post('/level/choices', async (req, res) => {
  try {
    const data = await proxyToPython('/api/level/choices', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('Error generating choices:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to generate choices'
    });
  }
});

// Validate choice
router.post('/level/validate', async (req, res) => {
  try {
    const data = await proxyToPython('/api/level/validate', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('Error validating choice:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to validate choice'
    });
  }
});

// Get graph info
router.get('/graph/info', async (req, res) => {
  try {
    const data = await proxyToPython('/api/graph/info', 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching graph info:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to fetch graph info'
    });
  }
});

// Job management endpoints (with OpenAI integration)
router.post('/jobs/add', requireAuth, async (req, res) => {
  try {
    const data = await proxyToPython('/api/jobs/add', 'POST', req.body);
    res.json(data);
  } catch (error: any) {
    console.error('Error adding job:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to add job'
    });
  }
});

router.get('/jobs/status/:jobId', requireAuth, async (req, res) => {
  try {
    const { jobId } = req.params;
    const data = await proxyToPython(`/api/jobs/status/${jobId}`, 'GET');
    res.json(data);
  } catch (error: any) {
    console.error('Error fetching job status:', error);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || 'Failed to fetch job status'
    });
  }
});

export default router;
