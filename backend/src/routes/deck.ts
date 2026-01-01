import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();

function findDeckFile(fileName: string): string | null {
  // Railway typically runs the service with CWD at `backend/`, but be defensive.
  const candidates = [
    path.join(process.cwd(), 'deck', fileName),
    path.join(process.cwd(), 'backend', 'deck', fileName),
    path.join(__dirname, '../../deck', fileName),
    path.join(__dirname, '../../../backend/deck', fileName),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/**
 * GET /api/deck/master
 * Serves the master pitch deck HTML.
 */
router.get('/master', (req: Request, res: Response) => {
  const filePath = findDeckFile('MASTER-DECK.html');
  if (!filePath) {
    res.status(404).json({ success: false, message: 'Deck not found' });
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  // Deck changes rarely; allow caching.
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(filePath);
});

/**
 * GET /api/deck/paynet-demo
 * Serves the PayNet demo video (mp4).
 */
function servePaynetDemo(req: Request, res: Response) {
  const filePath = findDeckFile('PayNetDemo.mp4');
  if (!filePath) {
    res.status(404).json({ success: false, message: 'Demo video not found' });
    return;
  }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(filePath);
}

router.get('/paynet-demo', servePaynetDemo);
// Back-compat: some clients expect a .mp4 suffix in the route.
router.get('/paynet-demo.mp4', servePaynetDemo);

export default router;





