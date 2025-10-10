import express from 'express';
import { auth } from '../middleware/auth';
import { AuthenticatedRequest } from '../types';
import { createClient } from '@supabase/supabase-js';

const router = express.Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Debug endpoint to check environment
router.get('/env-check', (req, res) => {
  res.json({
    timestamp: new Date().toISOString(),
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      SUPABASE_JWT_SECRET: !!process.env.SUPABASE_JWT_SECRET,
      PORT: process.env.PORT,
      FRONTEND_URL: process.env.FRONTEND_URL,
      PRODUCTION_FRONTEND_URL: process.env.PRODUCTION_FRONTEND_URL
    },
    message: 'Environment check complete'
  });
});

// Debug endpoint to test authentication
router.get('/whoami', auth, (req: AuthenticatedRequest, res) => {
  res.json({
    success: true,
    user: req.user ? {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    } : null
  });
});

// Debug endpoint to check thumbnail for a request
router.get('/thumbnail/:requestId', async (req, res): Promise<void> => {
  try {
    const { requestId } = req.params;

    const { data: request, error } = await supabase
      .from('connection_requests')
      .select('id, target, video_url, video_thumbnail_url, creator:user_id (first_name, last_name)')
      .eq('id', requestId)
      .single();

    if (error || !request) {
      res.status(404).json({
        success: false,
        error: 'Request not found',
        requestId
      });
      return;
    }

    const thumbnailUrl = request.video_thumbnail_url;
    const isVideoFile = thumbnailUrl && /\.(mp4|webm|mov|avi|mkv)$/i.test(thumbnailUrl);
    const hasValidThumbnail = thumbnailUrl && !isVideoFile;

    const creator = request.creator as any;
    const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Unknown';

    const isProd = process.env.NODE_ENV === 'production';
    const backendUrl = isProd
      ? (process.env.PRODUCTION_BACKEND_URL || 'https://6degreesbackend-production.up.railway.app')
      : (process.env.BACKEND_URL || 'http://localhost:3001');

    const fallbackOgUrl = `${backendUrl}/api/og-image/video?target=${encodeURIComponent(request.target)}&creator=${encodeURIComponent(creatorName)}&v=1`;

    res.json({
      success: true,
      requestId,
      target: request.target,
      creator: creatorName,
      videoUrl: request.video_url,
      thumbnailUrl: request.video_thumbnail_url,
      analysis: {
        hasThumbnailUrl: !!thumbnailUrl,
        isVideoFile,
        hasValidThumbnail,
        willUseThumbnail: hasValidThumbnail,
        ogImageUrl: hasValidThumbnail ? thumbnailUrl : fallbackOgUrl,
        issue: !thumbnailUrl 
          ? '❌ No thumbnail URL in database' 
          : isVideoFile 
            ? '❌ Thumbnail URL is a video file, not an image' 
            : '✅ Valid image thumbnail'
      }
    });
  } catch (error: any) {
    console.error('Error in thumbnail debug:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;