import { Router } from 'express';
import { authenticate, requireMember } from '../middleware/auth';
import {
  getCommunities,
  getCommunityBySlug,
  getPosts,
  getPostById,
  getRelatedPosts,
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
  voteOnPoll,
  votePrediction,
  getPredictionVotes,
  deletePredictionVote,
  createSuggestion,
  getMySuggestions,
  getAllSuggestions,
  getRedditSyncStatus,
  votePost,
  removeVote,
  getTags,
  getActiveCommunities,
  savePost,
  getSavedPosts,
  isPostSaved,
  getPostVote,
  generatePainPointsReport,
  generateReportBlocksForPost,
  // importRedditPosts // Temporarily disabled - redditService not implemented
} from '../controllers/forumController';

const router = Router();

// Public routes (still need auth for user context)
router.use(authenticate);

// Communities
router.get('/communities', getCommunities);
router.get('/communities/active', getActiveCommunities);
router.get('/communities/:slug', getCommunityBySlug);

// Tags
router.get('/tags', getTags);

// Posts (read: all users, write: members only)
router.get('/posts', getPosts);
router.get('/posts/:id', getPostById);
router.get('/posts/:id/related', getRelatedPosts);
router.post('/posts', requireMember, createPost);
router.delete('/posts/:id', requireMember, deletePost);
router.post('/posts/:id/report-blocks/generate', generateReportBlocksForPost);

// Post Voting (Upvote/Downvote) - members only
router.post('/posts/:postId/vote', requireMember, votePost);
router.get('/posts/:postId/vote', getPostVote);
router.delete('/posts/:postId/vote', requireMember, removeVote);

// Saved Posts (Bookmarks) - members only
router.get('/posts/saved', getSavedPosts);
router.post('/posts/:postId/save', requireMember, savePost);
router.get('/posts/:postId/saved', isPostSaved);

// Comments - members only for write
router.get('/posts/:id/comments', getComments);
router.post('/posts/:id/comments', requireMember, createComment);
router.delete('/comments/:id', requireMember, deleteComment);

// Quick Replies - members only
router.post('/posts/:postId/quick-reply', requireMember, createQuickReply);

// Reactions - members only
router.post('/reactions', requireMember, toggleReaction);
router.get('/posts/:id/reactions', getPostReactions);

// Projects (Build in Public) - members only for write
router.get('/projects/mine', getMyProjects);
router.post('/projects', requireMember, createProject);
router.get('/projects/:id/timeline', getProjectTimeline);

// Polls - members only for voting
router.post('/polls/generate', generatePoll);
router.post('/polls/:pollId/vote', requireMember, voteOnPoll);

// Prediction Voting - members only
router.post('/predictions/:postId/vote', requireMember, votePrediction);
router.get('/predictions/:postId/votes', getPredictionVotes);
router.delete('/predictions/:postId/vote', requireMember, deletePredictionVote);

// Reddit sync status (debug)
router.get('/reddit/status', getRedditSyncStatus);

// Research Suggestions - members only for create
router.post('/suggestions', requireMember, createSuggestion);
router.get('/suggestions/mine', getMySuggestions);
router.get('/suggestions', getAllSuggestions);

// Interaction Tracking
router.post('/track-batch', trackInteractionBatch);

// Brand Pain Points Analysis (Admin only)
// Back-compat: pain-points was renamed to market-gaps
router.post('/pain-points/generate', generatePainPointsReport);
router.post('/market-gaps/generate', generatePainPointsReport);

// Reddit Content Import (Admin only)
// Temporarily disabled - redditService not implemented
// router.post('/reddit/import', importRedditPosts);

export default router;

