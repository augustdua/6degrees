import { Router, Request, Response } from 'express';
import { createCanvas, registerFont } from 'canvas';

const router = Router();

// Generate Open Graph image for r/:linkId sharing (matches /r/:linkId route)
router.get('/r/:linkId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { target } = req.query;
    const targetName = target as string || 'Someone Amazing';

    // Create canvas (1200x630 is optimal for OG images)
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - match app hero gradient: primary → accent → success
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'hsl(221, 83%, 53%)');   // primary
    gradient.addColorStop(0.5, 'hsl(32, 95%, 44%)');  // accent
    gradient.addColorStop(1, 'hsl(142, 76%, 36%)');   // success
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add decorative circles with glow effect
    ctx.shadowBlur = 60;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.3)';
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(150, 150, 180, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1050, 480, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    // White content card
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 10;
    const cardPadding = 60;
    const cardRadius = 24;
    ctx.beginPath();
    ctx.roundRect(cardPadding, cardPadding, width - cardPadding * 2, height - cardPadding * 2, cardRadius);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // Logo section - circular badge
    const badgeSize = 80;
    const badgeX = 120;
    const badgeY = 130;
    const logoGradient = ctx.createLinearGradient(badgeX - badgeSize/2, badgeY - badgeSize/2, badgeX + badgeSize/2, badgeY + badgeSize/2);
    logoGradient.addColorStop(0, 'hsl(221, 83%, 53%)');  // primary
    logoGradient.addColorStop(1, 'hsl(221, 83%, 68%)');  // primary-glow
    ctx.fillStyle = logoGradient;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, badgeSize/2, 0, Math.PI * 2);
    ctx.fill();

    // Badge text (avoid special degree symbol for compatibility)
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('6D', badgeX, badgeY);

    // Brand name next to badge
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText('6Degree', 190, 140);

    // Main message (simple ASCII to avoid glyph issues)
    ctx.fillStyle = '#475569';
    ctx.font = '36px Arial, sans-serif';
    ctx.fillText('Help make a warm intro to', 120, 260);

    // Target name - bold and prominent
    ctx.fillStyle = 'hsl(221, 83%, 53%)'; // primary
    ctx.font = 'bold 56px Arial, sans-serif';
    const maxWidth = width - 240;
    let targetText = targetName;
    let metrics = ctx.measureText(targetText);
    if (metrics.width > maxWidth) {
      while (ctx.measureText(targetText + '...').width > maxWidth && targetText.length > 0) {
        targetText = targetText.slice(0, -1);
      }
      targetText += '...';
    }
    ctx.fillText(targetText, 120, 340);

    // Reward section
    ctx.fillStyle = 'hsl(142, 76%, 36%)'; // success
    ctx.font = 'bold 42px Arial, sans-serif';
    ctx.fillText('Join the chain, earn rewards', 120, 430);

    // Bottom CTA bar
    const ctaBarY = height - 140;
    ctx.fillStyle = '#f1f5f9';
    ctx.beginPath();
    ctx.roundRect(120, ctaBarY, width - 240, 70, 12);
    ctx.fill();

    ctx.fillStyle = '#475569';
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('Tap to Join the Connection Chain', 150, ctaBarY + 45);

    // Convert canvas to buffer and send as JPEG (better WhatsApp compatibility)
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
    res.set('Content-Type', 'image/jpeg');
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

    // Logo
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.fillText('6Degree', 80, 120);

    // Game title
    ctx.fillStyle = '#3b82f6';
    ctx.font = 'bold 56px Arial, sans-serif';
    ctx.fillText('Connector Game', 80, 210);

    // Main message
    ctx.fillStyle = '#ffffff';
    ctx.font = '48px Arial, sans-serif';
    ctx.fillText('Help connect to:', 80, 310);

    // Target job
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 56px Arial, sans-serif';
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
    ctx.font = '36px Arial, sans-serif';
    ctx.fillText('🎮  Play the networking path game!', 80, 490);

    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.95 });
    res.set('Content-Type', 'image/jpeg');
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
