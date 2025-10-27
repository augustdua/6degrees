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
  rejectOffer
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

export default router;

