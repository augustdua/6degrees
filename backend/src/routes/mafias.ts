import express from 'express';
import { authenticate } from '../middleware/auth';
import {
  createMafia,
  getAllMafias,
  getMyMafias,
  getMafiaDetails,
  updateMafia,
  deactivateMafia,
  generateFoundingLink,
  joinAsFoundingMember,
  joinAsPaidMember,
  leaveMafia,
  getMafiaRevenueStats,
} from '../controllers/mafiasController';

const router = express.Router();

// Public routes
router.get('/', getAllMafias); // Explore all active mafias
router.get('/:id', getMafiaDetails); // Get mafia details (public for now)

// Protected routes (require authentication)
router.post('/', authenticate, createMafia); // Create new mafia
router.get('/my/memberships', authenticate, getMyMafias); // Get user's mafias
router.patch('/:id', authenticate, updateMafia); // Update mafia (admin only)
router.delete('/:id', authenticate, deactivateMafia); // Deactivate mafia (admin only)

// Membership routes
router.get('/:id/generate-founding-link', authenticate, generateFoundingLink); // Generate invite link (admin only)
router.post('/join-founding/:token', authenticate, joinAsFoundingMember); // Join as founding member via token
router.post('/:id/join-paid', authenticate, joinAsPaidMember); // Join as paid member
router.post('/:id/leave', authenticate, leaveMafia); // Leave mafia

// Revenue routes
router.get('/:id/revenue', authenticate, getMafiaRevenueStats); // Get revenue stats

export default router;

