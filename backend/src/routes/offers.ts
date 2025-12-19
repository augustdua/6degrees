import express from 'express';
import { authenticate, requireMember } from '../middleware/auth';
import {
  createOffer,
  getOffers,
  getOfferById,
  getMyOffers,
  updateOffer,
  deleteOffer,
  likeOffer,
  bidOnOffer,
  getOfferBids,
  acceptOfferBid,
  getMyIntros,
  approveOffer,
  rejectOffer,
  requestIntroCall,
  approveIntroCallRequest,
  rejectIntroCallRequest,
  regenerateUseCases,
  updateOfferTags
} from '../controllers/offerController';
import {
  createBid,
  approveBid,
  rejectBid,
  getMyBids
} from '../controllers/bidController';

const router = express.Router();

// Public routes
router.get('/', getOffers);

// Protected routes (require authentication)
router.use(authenticate);

// Read routes - all authenticated users
router.get('/my/offers', getMyOffers);
router.get('/my/intros', getMyIntros);
router.get('/:id', getOfferById);
router.get('/:id/bids', getOfferBids);
router.get('/bids/my', getMyBids);

// Write routes - members only
router.post('/', requireMember, createOffer);
router.put('/:id', requireMember, updateOffer);
router.patch('/:id/tags', requireMember, updateOfferTags);
router.delete('/:id', requireMember, deleteOffer);
router.post('/:id/like', requireMember, likeOffer);
router.post('/:id/bid', requireMember, bidOnOffer);
router.post('/:offerId/bids/:bidId/accept', requireMember, acceptOfferBid);
router.post('/:id/approve', requireMember, approveOffer);
router.post('/:id/reject', requireMember, rejectOffer);

// Intro call routes - members only
router.post('/:id/request-call', requireMember, requestIntroCall);
router.post('/messages/:messageId/approve-call', requireMember, approveIntroCallRequest);
router.post('/messages/:messageId/reject-call', requireMember, rejectIntroCallRequest);

// Use cases regeneration - members only
router.post('/:id/regenerate-use-cases', requireMember, regenerateUseCases);

// Bid routes (new bidding system) - members only for write
router.post('/:offerId/bids', requireMember, createBid);
router.post('/bids/:bidId/approve', requireMember, approveBid);
router.post('/bids/:bidId/reject', requireMember, rejectBid);

export default router;

