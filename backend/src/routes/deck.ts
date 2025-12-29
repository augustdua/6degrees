import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

function findMasterDeckPath(): string | null {
  const candidates = [
    // If server is started from repo root
    path.resolve(process.cwd(), 'pitch-deck-kalaari', 'MASTER-DECK.html'),
    // If server is started from /backend
    path.resolve(process.cwd(), '..', 'pitch-deck-kalaari', 'MASTER-DECK.html'),
    // If server is started from /backend/dist
    path.resolve(process.cwd(), '..', '..', 'pitch-deck-kalaari', 'MASTER-DECK.html'),
    // Fallback relative to this file (compiled to dist/routes/deck.js)
    path.resolve(__dirname, '..', '..', '..', 'pitch-deck-kalaari', 'MASTER-DECK.html'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function findPayNetDemoPath(): string | null {
  const candidates = [
    // If server is started from repo root
    path.resolve(process.cwd(), 'PayNetDemo.mp4'),
    // If server is started from /backend
    path.resolve(process.cwd(), '..', 'PayNetDemo.mp4'),
    // If server is started from /backend/dist
    path.resolve(process.cwd(), '..', '..', 'PayNetDemo.mp4'),
    // Fallback relative to this file (compiled to dist/routes/deck.js)
    path.resolve(__dirname, '..', '..', '..', 'PayNetDemo.mp4'),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

router.get('/master', async (req, res) => {
  const expected = String(process.env.DECK_PASSWORD || '').trim();
  if (!expected) {
    return res.status(503).json({ error: 'Deck password not configured' });
  }

  const provided =
    String(req.header('x-deck-password') || '').trim() ||
    String(req.query.password || '').trim();

  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid deck password' });
  }

  const deckPath = findMasterDeckPath();
  if (!deckPath) {
    return res.status(404).json({ error: 'MASTER-DECK.html not found on server' });
  }

  try {
    const html = await fs.promises.readFile(deckPath, 'utf-8');
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(html);
  } catch (e: any) {
    return res.status(500).json({ error: 'Failed to read deck file' });
  }
});

// Serve the demo video (HTML <video> cannot send custom headers; query param is used instead)
router.get('/paynet-demo.mp4', async (req, res) => {
  const expected = String(process.env.DECK_PASSWORD || '').trim();
  if (!expected) {
    return res.status(503).json({ error: 'Deck password not configured' });
  }

  const provided = String(req.query.password || '').trim();
  if (!provided || provided !== expected) {
    return res.status(401).json({ error: 'Invalid deck password' });
  }

  const videoPath = findPayNetDemoPath();
  if (!videoPath) {
    return res.status(404).json({ error: 'PayNetDemo.mp4 not found on server' });
  }

  const stat = await fs.promises.stat(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Support range requests for smooth playback/seek
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match) {
      return res.status(416).send('Invalid range');
    }

    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;
    const clampedEnd = Math.min(end, fileSize - 1);
    const chunkSize = clampedEnd - start + 1;

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${clampedEnd}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4',
      'Cache-Control': 'no-store',
    });

    const stream = fs.createReadStream(videoPath, { start, end: clampedEnd });
    stream.pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Length': fileSize,
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(videoPath).pipe(res);
});

export default router;


