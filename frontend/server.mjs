import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8080;

const distDir = path.join(__dirname, 'dist');
const indexHtml = path.join(distDir, 'index.html');

function setCacheHeaders(res, filePath) {
  const normalized = String(filePath || '').replace(/\\/g, '/');

  // Vite hashed assets are safe to cache forever
  if (normalized.includes('/assets/')) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return;
  }

  // Never cache the SPA shell; prevents "normal browser stuck on old build"
  if (normalized.endsWith('/index.html') || normalized.endsWith('index.html')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    return;
  }

  // Other static files: revalidate
  res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
}

app.use(
  express.static(distDir, {
    setHeaders: setCacheHeaders,
    extensions: ['html'],
  })
);

// SPA fallback: serve index.html for non-file GETs
app.get('*', (req, res) => {
  if (req.method !== 'GET') return res.sendStatus(405);

  // If it looks like a file request, let it 404 (helps debugging missing assets)
  if (req.path.includes('.') || req.path.startsWith('/assets/')) {
    return res.sendStatus(404);
  }

  setCacheHeaders(res, indexHtml);
  return res.sendFile(indexHtml);
});

app.listen(port, () => {
  console.log(`🌐 Frontend server listening on ${port}`);
});



