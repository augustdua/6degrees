import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  getCommunities,
  getCommunityBySlug,
  getPosts,
  getPostById,
  createPost,
  deletePost,
  createComment,
  getComments,
  createQuickReply,
  deleteComment,
  toggleReaction,
  getPostReactions,
  getMyProjects,
  createProject,
  getProjectTimeline,
  trackInteractionBatch,
  generatePoll,
  voteOnPoll
} from '../controllers/forumController';

const router = Router();

// Public routes (still need auth for user context)
router.use(authenticate);

// Communities
router.get('/communities', getCommunities);
router.get('/communities/:slug', getCommunityBySlug);

// Posts
router.get('/posts', getPosts);
router.get('/posts/:id', getPostById);
router.post('/posts', createPost);
router.delete('/posts/:id', deletePost);

// Comments
router.get('/posts/:id/comments', getComments);
router.post('/posts/:id/comments', createComment);
router.delete('/comments/:id', deleteComment);

// Quick Replies
router.post('/posts/:postId/quick-reply', createQuickReply);

// Reactions
router.post('/reactions', toggleReaction);
router.get('/posts/:id/reactions', getPostReactions);

// Projects (Build in Public)
router.get('/projects/mine', getMyProjects);
router.post('/projects', createProject);
router.get('/projects/:id/timeline', getProjectTimeline);

// Polls
router.post('/polls/generate', generatePoll);
router.post('/polls/:pollId/vote', voteOnPoll);

// Interaction Tracking
router.post('/track-batch', trackInteractionBatch);

export default router;

