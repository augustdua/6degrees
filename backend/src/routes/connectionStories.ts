import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getConnectionStories,
  createConnectionStory,
  updateConnectionStory,
  deleteConnectionStory,
  reorderConnectionStories
} from '../controllers/connectionStoriesController';

const router = Router();

// Get stories for a user (public if viewing another user)
router.get('/:userId?', authenticate, getConnectionStories);

// Create a new story (requires auth)
router.post('/', authenticate, createConnectionStory);

// Update a story
router.put('/:storyId', authenticate, updateConnectionStory);

// Delete a story
router.delete('/:storyId', authenticate, deleteConnectionStory);

// Reorder stories
router.put('/reorder', authenticate, reorderConnectionStories);

export default router;

