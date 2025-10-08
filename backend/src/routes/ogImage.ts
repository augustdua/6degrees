import { Router, Request, Response } from 'express';
import { createCanvas, registerFont } from 'canvas';

const router = Router();

// Generate Open Graph image for chain/connection sharing
router.get('/chain/:requestId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { target } = req.query;
    const targetName = target as string || 'Someone Amazing';

    // Create canvas (1200x630 is optimal for OG images)
    const width = 1200;
    const height = 630;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');

    // Background - gradient matching app theme
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1a1a2e'); // Dark blue
    gradient.addColorStop(1, '#16213e'); // Darker blue
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Add decorative circles (matching app design)
    ctx.globalAlpha = 0.1;
    ctx.fillStyle = '#3b82f6'; // Blue
    ctx.beginPath();
    ctx.arc(200, 150, 150, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1000, 500, 200, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Top section - Logo/Brand
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 72px Arial, sans-serif';
    ctx.fillText('6Degree', 80, 120);

    // Tagline
    ctx.fillStyle = '#94a3b8'; // Gray
    ctx.font = '32px Arial, sans-serif';
    ctx.fillText('Connect • Earn • Grow', 80, 170);

    // Main message
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 56px Arial, sans-serif';
    const message = 'Help My Friend Connect with';
    ctx.fillText(message, 80, 290);

    // Target name - highlighted
    ctx.fillStyle = '#3b82f6'; // Blue highlight
    ctx.font = 'bold 64px Arial, sans-serif';

    // Wrap target name if too long
    const maxWidth = width - 160;
    let targetText = targetName;
    const metrics = ctx.measureText(targetText);
    if (metrics.width > maxWidth) {
      // Truncate and add ellipsis
      while (ctx.measureText(targetText + '...').width > maxWidth && targetText.length > 0) {
        targetText = targetText.slice(0, -1);
      }
      targetText += '...';
    }

    ctx.fillText(targetText, 80, 380);

    // Call to action
    ctx.fillStyle = '#10b981'; // Green
    ctx.font = 'bold 48px Arial, sans-serif';
    ctx.fillText('and Get Credits! 🎁', 80, 470);

    // Bottom section - Visual indicator
    ctx.fillStyle = '#1e293b'; // Dark card background
    ctx.roundRect(80, 520, width - 160, 80, 16);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '28px Arial, sans-serif';
    ctx.fillText('👥  Tap to join the connection chain', 110, 570);

    // Convert canvas to buffer and send
    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
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

    const buffer = canvas.toBuffer('image/png');
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(buffer);
  } catch (error: any) {
    console.error('Error generating connector OG image:', error);
    res.status(500).json({ error: 'Failed to generate image' });
  }
});

export default router;
