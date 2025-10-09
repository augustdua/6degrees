import { Router, Request, Response } from 'express';
import { createCanvas, registerFont } from 'canvas';
import path from 'path';

const router = Router();
const OG_SERVICE_URL = process.env.OG_SERVICE_URL;

// Font registration with better error handling
let fontsRegistered = false;
try {
  const regularFontPath = path.join(__dirname, '../assets/fonts/Roboto-Regular.ttf');
  const boldFontPath = path.join(__dirname, '../assets/fonts/Roboto-Bold.ttf');

  registerFont(regularFontPath, {
    family: 'Roboto',
    weight: 'normal',
    style: 'normal'
  });
  registerFont(boldFontPath, {
    family: 'Roboto',
    weight: 'bold',
    style: 'normal'
  });
  fontsRegistered = true;
  console.log('✓ Fonts registered successfully for OG image generation');
  console.log('  - Regular font:', regularFontPath);
  console.log('  - Bold font:', boldFontPath);
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

// Generate Open Graph image for r/:linkId sharing
router.get('/r/:linkId', async (req: Request, res: Response): Promise<void> => {
  try {
    // If external OG service is configured, redirect there (preferred)
    if (OG_SERVICE_URL) {
      const creatorName = (req.query.creator as string) || 'Someone';
      const targetName = (req.query.target as string) || 'Someone Amazing';
      const url = `${OG_SERVICE_URL}?type=chain&creator=${encodeURIComponent(creatorName)}&target=${encodeURIComponent(targetName)}`;
      res.redirect(url);
      return;
    }
    // Create canvas (1200x630 is optimal for OG images)
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - solid dark like app
    ctx.fillStyle = '#0f172a'; // slate-900
    ctx.fillRect(0, 0, width, height);

    // Center content vertically
    const centerY = height / 2;

    // Logo section - circular badge with gradient (emerald to teal)
    const badgeSize = 100;
    const badgeX = width / 2;
    const badgeY = centerY - 80;
    const logoGradient = ctx.createLinearGradient(
      badgeX - badgeSize/2,
      badgeY - badgeSize/2,
      badgeX + badgeSize/2,
      badgeY + badgeSize/2
    );
    logoGradient.addColorStop(0, '#10b981'); // emerald-500
    logoGradient.addColorStop(1, '#14b8a6'); // teal-600
    ctx.fillStyle = logoGradient;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeSize/2, 0, Math.PI * 2);
    ctx.fill();

    // Badge text - use Roboto if available
    ctx.fillStyle = '#ffffff';
    ctx.font = fontsRegistered ? 'bold 40px Roboto, Arial' : 'bold 40px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('6D', badgeX, badgeY);

    // Brand name below badge
    ctx.fillStyle = '#ffffff';
    ctx.font = fontsRegistered ? 'bold 64px Roboto, Arial' : 'bold 64px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('6Degree', badgeX, centerY + 20);

    // Tagline
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.font = fontsRegistered ? 'bold 42px Roboto, Arial' : 'bold 42px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Join Chain and Earn Rewards', badgeX, centerY + 90);

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

// Generate OG image for connector game
router.get('/connector', async (req: Request, res: Response): Promise<void> => {
  try {
    // If external OG service is configured, redirect there (preferred)
    if (OG_SERVICE_URL) {
      const targetJob = (req.query.target as string) || 'Your Dream Job';
      const url = `${OG_SERVICE_URL}?type=connector&target=${encodeURIComponent(targetJob)}`;
      res.redirect(url);
      return;
    }
    const { target } = req.query;
    const targetJob = target as string || 'Your Dream Job';

    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#0f172a');
    gradient.addColorStop(1, '#1e293b');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Decorative elements
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(150, 150, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1050, 550, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Set text alignment for all text
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Logo
    ctx.fillStyle = '#ffffff';
    ctx.font = fontsRegistered ? 'bold 72px Roboto, Arial' : 'bold 72px Arial';
    ctx.fillText('6Degree', 80, 120);

    // Game title
    ctx.fillStyle = '#3b82f6';
    ctx.font = fontsRegistered ? 'bold 56px Roboto, Arial' : 'bold 56px Arial';
    ctx.fillText('Connector Game', 80, 210);

    // Main message
    ctx.fillStyle = '#ffffff';
    ctx.font = fontsRegistered ? '48px Roboto, Arial' : '48px Arial';
    ctx.fillText('Help connect to:', 80, 310);

    // Target job
    ctx.fillStyle = '#10b981';
    ctx.font = fontsRegistered ? 'bold 56px Roboto, Arial' : 'bold 56px Arial';
    const maxWidth = width - 160;
    let jobText = targetJob;
    const metrics = ctx.measureText(jobText);
    if (metrics.width > maxWidth) {
      while (ctx.measureText(jobText + '...').width > maxWidth && jobText.length > 0) {
        jobText = jobText.slice(0, -1);
      }
      jobText += '...';
    }
    ctx.fillText(jobText, 80, 390);

    // Call to action
    ctx.fillStyle = '#ffffff';
    ctx.font = fontsRegistered ? '36px Roboto, Arial' : '36px Arial';
    ctx.fillText('Play the networking path game!', 80, 490);

    // Convert canvas to buffer and send as PNG
    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=86400, immutable');
    res.set('Content-Length', buffer.length.toString());
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating connector OG image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

export default router;