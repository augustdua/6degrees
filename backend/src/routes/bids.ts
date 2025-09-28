import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createBid,
  getBids,
  getBidById,
  updateBid,
  deleteBid,
  likeBid,
  contactBidCreator
} from '../controllers/bidController';

const router = express.Router();

// Public routes
router.get('/', getBids);
router.get('/:id', getBidById);

// Protected routes (require authentication)
router.use(authenticate);
router.post('/', createBid);
router.put('/:id', updateBid);
router.delete('/:id', deleteBid);
router.post('/:id/like', likeBid);
router.post('/:id/contact', contactBidCreator);

export default router;