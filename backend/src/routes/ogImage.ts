import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

const router = Router();
const OG_SERVICE_URL = process.env.OG_SERVICE_URL;
const USE_EXTERNAL_OG_SERVICE =
  process.env.USE_EXTERNAL_OG_SERVICE === '1' ||
  String(process.env.USE_EXTERNAL_OG_SERVICE || '').toLowerCase() === 'true';

type CanvasModule = typeof import('canvas');
let canvasModule: CanvasModule | null = null;
let canvasLoadError: unknown = null;
try {
  // `canvas` is an optional dependency (native build). If it fails to install on Railway,
  // we still want the API to boot; OG routes will fall back to redirect / 503.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  canvasModule = require('canvas') as CanvasModule;
} catch (err) {
  canvasLoadError = err;
  console.warn('ℹ️ Optional dependency `canvas` not available; OG image generation disabled unless using external OG service.');
}

// Font registration with better error handling
let fontsRegistered = false;
try {
  if (!canvasModule?.registerFont) {
    throw new Error('Canvas module not loaded');
  }
  /**
   * In production we run compiled JS from `dist/`, but `tsc` does not copy assets.
   * So `__dirname/../assets/...` may not exist.
   *
   * We intentionally resolve fonts from the repo working directory first (`src/assets/...`),
   * which exists in typical Railway builds, and fall back to `dist/assets/...` if present.
   */
  const candidateFontDirs = [
    path.join(process.cwd(), 'src', 'assets', 'fonts'),
    path.join(process.cwd(), 'dist', 'assets', 'fonts'),
    path.join(__dirname, '../assets/fonts'),
  ];

  const fontDir = candidateFontDirs.find((d) => fs.existsSync(d));
  const regularFontPath = fontDir ? path.join(fontDir, 'Roboto-Regular.ttf') : '';
  const boldFontPath = fontDir ? path.join(fontDir, 'Roboto-Bold.ttf') : '';

  if (regularFontPath && boldFontPath && fs.existsSync(regularFontPath) && fs.existsSync(boldFontPath)) {
    canvasModule.registerFont(regularFontPath, {
      family: 'Roboto',
      weight: 'normal',
      style: 'normal'
    });
    canvasModule.registerFont(boldFontPath, {
      family: 'Roboto',
      weight: 'bold',
      style: 'normal'
    });
    fontsRegistered = true;
    console.log('✓ Fonts registered successfully for OG image generation');
    console.log('  - Regular font:', regularFontPath);
    console.log('  - Bold font:', boldFontPath);
  } else {
    console.log('ℹ️ Skipping font registration: Roboto assets not found, using system fonts');
    console.log('  - Tried:', candidateFontDirs);
  }
} catch (error) {
  console.error('⚠️ Failed to register fonts:', error);
  console.error('  Font paths may be incorrect. OG images will use system fonts.');
}

// Helper to get font family - use Roboto if available, fallback to Arial
const getFontFamily = (weight: 'normal' | 'bold' = 'normal'): string => {
  if (fontsRegistered) {
    return weight === 'bold' ? 'bold 64px Roboto' : '64px Roboto';
  }
  return weight === 'bold' ? 'bold 64px Arial, sans-serif' : '64px Arial, sans-serif';
};

function canvasUnavailableFallback(req: Request, res: Response, context: Record<string, string | undefined> = {}) {
  // Prefer redirecting to an external OG service if configured
  if (USE_EXTERNAL_OG_SERVICE && OG_SERVICE_URL) {
    try {
      const u = new URL(OG_SERVICE_URL);
      for (const [k, v] of Object.entries(context)) {
        if (typeof v === 'string' && v.length) u.searchParams.set(k, v);
      }
      res.redirect(u.toString());
      return;
    } catch {
      // fall through
    }
  }

  res.status(503).json({
    error: 'OG image generation is unavailable on this deployment.',
    hint: 'Set USE_EXTERNAL_OG_SERVICE=true and OG_SERVICE_URL, or ensure optional dependency `canvas` can install in the build image.',
    details: canvasLoadError ? String(canvasLoadError) : undefined,
  });
}

// Generate Open Graph image for r/:linkId sharing
router.get('/r/:linkId', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!canvasModule?.createCanvas) {
      canvasUnavailableFallback(req, res, {
        linkId: String(req.params.linkId || ''),
        target: typeof req.query.target === 'string' ? req.query.target : undefined,
        creator: typeof req.query.creator === 'string' ? req.query.creator : undefined,
      });
      return;
    }
    // External OG service is optional. Default to internal generation so branding stays consistent.
    // Opt-in by setting USE_EXTERNAL_OG_SERVICE=true along with OG_SERVICE_URL.
    if (USE_EXTERNAL_OG_SERVICE && OG_SERVICE_URL) {
      try {
        const u = new URL(OG_SERVICE_URL);
        // Preserve basic context for external generator (best-effort).
        u.searchParams.set('linkId', String(req.params.linkId || ''));
        if (typeof req.query.target === 'string') u.searchParams.set('target', req.query.target);
        if (typeof req.query.creator === 'string') u.searchParams.set('creator', req.query.creator);
        res.redirect(u.toString());
        return;
      } catch {
        // Fall back to internal generator if OG_SERVICE_URL isn't a valid URL.
      }
    }
    // Create canvas (1200x630 is optimal for OG images)
    const width = 1200;
    const height = 630;
    const canvas = canvasModule.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Zaurq brand background gradient (dark -> deeper dark)
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(1, '#0b0b0e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Center content vertically
    const centerY = height / 2;

    // Logo section - circular badge with Zaurq gold accent
    const badgeSize = 120;
    const badgeX = width / 2;
    const badgeY = centerY - 80;
    const logoGradient = ctx.createLinearGradient(
      badgeX - badgeSize/2,
      badgeY - badgeSize/2,
      badgeX + badgeSize/2,
      badgeY + badgeSize/2
    );
    logoGradient.addColorStop(0, '#cbaa5a'); // Zaurq gold
    logoGradient.addColorStop(1, '#8f6b2b'); // deeper gold
    ctx.fillStyle = logoGradient;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeSize/2, 0, Math.PI * 2);
    ctx.fill();

    // Badge text (use dark ink for a premium black/gold look)
    ctx.fillStyle = '#0b0b0e';
    ctx.font = fontsRegistered ? 'bold 48px Roboto, Arial' : 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Z', badgeX, badgeY);

    // Brand name below badge
    ctx.fillStyle = '#ffffff';
    ctx.font = fontsRegistered ? 'bold 72px Roboto, Arial' : 'bold 72px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Zaurq', badgeX, centerY + 20);

    // Tagline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = fontsRegistered ? 'bold 42px Roboto, Arial' : 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Network your way to any connection', badgeX, centerY + 90);

    // Convert canvas to buffer and send as PNG (better quality than JPEG for text)
    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400, immutable'); // Cache for 24 hours
    res.set('Content-Length', buffer.length.toString());
    res.set('Access-Control-Allow-Origin', '*'); // Allow all origins for OG images
    res.set('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin embedding
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating OG image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});


// Generate OG image for video sharing
router.get('/video', async (req: Request, res: Response): Promise<void> => {
  try {
    if (!canvasModule?.createCanvas) {
      canvasUnavailableFallback(req, res, {
        target: typeof req.query.target === 'string' ? req.query.target : undefined,
        creator: typeof req.query.creator === 'string' ? req.query.creator : undefined,
      });
      return;
    }
    const { target, creator } = req.query;
    const targetName = (target as string) || 'Someone Amazing';
    const creatorName = (creator as string) || 'Someone';

    // Create canvas (1200x630 is standard for OG images - WhatsApp/Facebook compatible)
    // NOTE: This is the THUMBNAIL for link previews, not the video itself
    const width = 1200;
    const height = 630;
    const canvas = canvasModule.createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient (Zaurq brand colors) - diagonal for landscape
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#000000');
    gradient.addColorStop(0.5, '#0b0b0e');
    gradient.addColorStop(1, '#111827');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Semi-transparent overlay for better text readability
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.fillRect(0, 0, width, height);

    // Layout: Play button on left, text on right (like YouTube Shorts thumbnails)
    const centerY = height / 2;
    const playButtonX = 280;
    const textStartX = 580;

    // Play button circle background
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath();
    ctx.arc(playButtonX, centerY, 100, 0, Math.PI * 2);
    ctx.fill();

    // Play triangle (larger for landscape)
    ctx.fillStyle = '#cbaa5a';
    ctx.beginPath();
    ctx.moveTo(playButtonX - 25, centerY - 45);
    ctx.lineTo(playButtonX - 25, centerY + 45);
    ctx.lineTo(playButtonX + 50, centerY);
    ctx.closePath();
    ctx.fill();

    // Text content on the right side
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    // Creator name
    ctx.fillStyle = '#ffffff';
    ctx.font = fontsRegistered ? '36px Roboto, Arial' : '36px Arial';
    ctx.fillText(creatorName, textStartX, centerY - 120);

    // "wants to connect with" text
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = fontsRegistered ? '28px Roboto, Arial' : '28px Arial';
    ctx.fillText('wants to connect with', textStartX, centerY - 70);

    // Target name (large, bold) - wrap if needed
    ctx.fillStyle = '#ffffff';
    ctx.font = fontsRegistered ? 'bold 52px Roboto, Arial' : 'bold 52px Arial';
    const maxTextWidth = width - textStartX - 40;
    const words = targetName.split(' ');
    let line = '';
    let y = centerY - 10;
    const lineHeight = 60;

    for (let i = 0; i < words.length; i++) {
      const testLine = line + words[i] + ' ';
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxTextWidth && i > 0) {
        ctx.fillText(line, textStartX, y);
        line = words[i] + ' ';
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, textStartX, y);

    // Call to action
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = fontsRegistered ? 'bold 32px Roboto, Arial' : 'bold 32px Arial';
    ctx.fillText('Watch video and join the chain', textStartX, centerY + 90);

    // Zaurq branding (bottom right)
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.font = fontsRegistered ? 'bold 32px Roboto, Arial' : 'bold 32px Arial';
    ctx.fillText('Zaurq', width - 40, height - 40);

    // Convert to PNG
    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating video OG image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

export default router;