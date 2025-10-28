import express from 'express';
import { authenticate } from '../middleware/auth';
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
  rejectIntroCallRequest
} from '../controllers/offerController';

const router = express.Router();

// Public routes
router.get('/', getOffers);

// Protected routes (require authentication)
router.use(authenticate);
router.get('/my/offers', getMyOffers);
router.get('/my/intros', getMyIntros);
router.get('/:id', getOfferById);
router.post('/', createOffer);
router.put('/:id', updateOffer);
router.delete('/:id', deleteOffer);
router.post('/:id/like', likeOffer);
router.post('/:id/bid', bidOnOffer);
router.get('/:id/bids', getOfferBids);
router.post('/:offerId/bids/:bidId/accept', acceptOfferBid);
router.post('/:id/approve', approveOffer);
router.post('/:id/reject', rejectOffer);

// Intro call routes
router.post('/:id/request-call', requestIntroCall);
router.post('/messages/:messageId/approve-call', approveIntroCallRequest);
router.post('/messages/:messageId/reject-call', rejectIntroCallRequest);

export default router;

