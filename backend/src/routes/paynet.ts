import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  // Listing Management
  createListing,
  getListings,
  getListingById,
  updateListing,
  deleteListing,
  pauseListing,
  unpauseListing,

  // Contact Management
  addContact,
  getListingContacts,
  updateContact,
  deleteContact,

  // Availability Management
  addAvailability,
  getAvailability,
  deleteAvailability,

  // Bid Management (Seller side)
  getListingBids,
  getBidDetails,
  acceptBid,
  rejectBid,

  // Verification
  requestVerification,
  getVerificationStatus,

  // Buyer Endpoints
  placeBid,
  payToEscrow,
  selectSlot,
  submitQuestions,

  // Call Management
  joinCall,
  getCallStatus,
  startCallRecording,
  stopCallRecording,
  startCallTranscription,
  stopCallTranscription,
  updateAgentConfig
} from '../controllers/paynetController';
import { startCallAgent, stopCallAgent } from '../controllers/pipecatController';

const router = express.Router();

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// Browse marketplace listings (buyer side)
router.get('/listings', getListings);
router.get('/listings/:id', getListingById);

// ============================================================================
// PROTECTED ROUTES (Require Authentication)
// ============================================================================
router.use(authenticate);

// ----------------------------------------------------------------------------
// LISTING MANAGEMENT (Seller)
// ----------------------------------------------------------------------------
router.post('/listings', createListing);
router.put('/listings/:id', updateListing);
router.delete('/listings/:id', deleteListing);
router.post('/listings/:id/pause', pauseListing);
router.post('/listings/:id/unpause', unpauseListing);

// ----------------------------------------------------------------------------
// CONTACT MANAGEMENT (Seller)
// ----------------------------------------------------------------------------
router.post('/listings/:id/contacts', addContact);
router.get('/listings/:id/contacts', getListingContacts);
router.put('/listings/:id/contacts/:contactId', updateContact);
router.delete('/listings/:id/contacts/:contactId', deleteContact);

// ----------------------------------------------------------------------------
// AVAILABILITY MANAGEMENT (Seller)
// ----------------------------------------------------------------------------
router.post('/listings/:id/availability', addAvailability);
router.get('/listings/:id/availability', getAvailability);
router.delete('/listings/:id/availability/:slotId', deleteAvailability);

// ----------------------------------------------------------------------------
// BID MANAGEMENT (Seller)
// ----------------------------------------------------------------------------
router.get('/listings/:id/bids', getListingBids);
router.get('/bids/:bidId', getBidDetails);
router.post('/bids/:bidId/accept', acceptBid);
router.post('/bids/:bidId/reject', rejectBid);

// ----------------------------------------------------------------------------
// VERIFICATION (Seller)
// ----------------------------------------------------------------------------
router.post('/listings/:id/verify', requestVerification);
router.get('/listings/:id/verification-status', getVerificationStatus);

// ----------------------------------------------------------------------------
// BUYER ENDPOINTS
// ----------------------------------------------------------------------------
router.post('/listings/:id/bid', placeBid);
router.post('/bids/:bidId/pay', payToEscrow);
router.post('/bids/:bidId/select-slot', selectSlot);
router.post('/bids/:bidId/questions', submitQuestions);

// ----------------------------------------------------------------------------
// CALL MANAGEMENT
// ----------------------------------------------------------------------------
router.post('/calls/:callId/join', joinCall);
router.get('/calls/:callId/status', getCallStatus);
router.post('/calls/:callId/recording/start', startCallRecording);
router.post('/calls/:callId/recording/stop', stopCallRecording);
router.post('/calls/:callId/transcription/start', startCallTranscription);
router.post('/calls/:callId/transcription/stop', stopCallTranscription);
router.put('/calls/:callId/agent/config', updateAgentConfig);
router.post('/calls/:callId/agent/start', startCallAgent);
router.post('/calls/:callId/agent/stop', stopCallAgent);

export default router;
