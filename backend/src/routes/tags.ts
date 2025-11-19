import express from 'express';
import { getAllTags, getPopularTags } from '../services/taggingService';
import { optionalAuth } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/tags
 * Get all available tags
 * Public endpoint (works for both guests and authenticated users)
 */
router.get('/', optionalAuth, async (req, res) => {
  try {
    console.log('📋 GET /api/tags - Fetching all tags');
    
    const tags = await getAllTags();
    
    console.log(`✅ Successfully retrieved ${tags.length} tags`);
    
    res.status(200).json(tags);
  } catch (error: any) {
    console.error('❌ Error fetching tags:', error);
    
    res.status(500).json({
      error: 'Failed to fetch tags',
      message: error.message || 'An error occurred while fetching tags'
    });
  }
});

/**
 * GET /api/tags/popular
 * Get most frequently used tags
 * Public endpoint
 */
router.get('/popular', optionalAuth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    
    console.log(`📋 GET /api/tags/popular - Fetching top ${limit} popular tags`);
    
    const popularTags = await getPopularTags(limit);
    
    console.log(`✅ Successfully retrieved ${popularTags.length} popular tags`);
    
    res.status(200).json(popularTags);
  } catch (error: any) {
    console.error('❌ Error fetching popular tags:', error);
    
    res.status(500).json({
      error: 'Failed to fetch popular tags',
      message: error.message || 'An error occurred while fetching popular tags'
    });
  }
});

export default router;

