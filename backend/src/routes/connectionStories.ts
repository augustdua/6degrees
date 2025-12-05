import { Router } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth';
import {
  getConnectionStories,
  createConnectionStory,
  updateConnectionStory,
  deleteConnectionStory,
  reorderConnectionStories,
  uploadConnectionStoryPhoto
} from '../controllers/connectionStoriesController';

const router = Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, WebP, and HEIC are allowed.'));
    }
  }
});

// Upload photo for connection story
router.post('/upload', authenticate, upload.single('photo'), uploadConnectionStoryPhoto);

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


