import { Router } from 'express';
import { getUpcomingConnectionBirthdays, getUserConnections, searchConnections } from '../controllers/connectionsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate); // All connection routes require authentication

// @route   GET /api/connections/search
// @desc    Search connections by name
// @access  Private
router.get('/search', searchConnections);

// @route   GET /api/connections
// @desc    Get all connections for the authenticated user
// @access  Private
router.get('/', getUserConnections);

// @route   GET /api/connections/birthdays/upcoming
// @desc    Get upcoming birthdays for connected users
// @access  Private
router.get('/birthdays/upcoming', getUpcomingConnectionBirthdays);

export default router;
















