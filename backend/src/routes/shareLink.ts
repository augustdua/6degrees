import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Helper function to serve OG page
function serveOGPage(res: Response, linkId: string, creatorName: string, targetName: string, videoUrl?: string, videoThumbnail?: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const backendUrl = isProd
    ? (process.env.PRODUCTION_BACKEND_URL || 'https://share.6degree.app')
    : (process.env.BACKEND_URL || 'http://localhost:3001');
  const frontendUrl = isProd
    ? (process.env.PRODUCTION_FRONTEND_URL || 'https://6degree.app')
    : (process.env.FRONTEND_URL || 'http://localhost:5173');

  // Use external OG service if configured, otherwise fall back to backend
  const ogServiceUrl = process.env.OG_SERVICE_URL;
  const ogImageUrl = videoThumbnail || ogServiceUrl || `${backendUrl}/api/og-image/r/${linkId}`;
  const pageUrl = `${frontendUrl}/r/${linkId}`;

  const title = `${creatorName} wants to connect with ${targetName}`;
  const description = `Help ${creatorName} reach ${targetName} and earn rewards! Join this networking chain on 6Degree.`;

  // Build video meta tags if video exists (Instagram-style)
  let videoMetaTags = '';
  if (videoUrl) {
    videoMetaTags = `
  <!-- Video Tags (Instagram-style) -->
  <meta property="og:type" content="video.other">
  <meta property="og:video" content="${videoUrl}">
  <meta property="og:video:secure_url" content="${videoUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="720">
  <meta property="og:video:height" content="1280">

  <!-- Twitter Player Card for Video -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:player" content="${pageUrl}">
  <meta name="twitter:player:width" content="720">
  <meta name="twitter:player:height" content="1280">
  <meta name="twitter:player:stream" content="${videoUrl}">
  <meta name="twitter:player:stream:content_type" content="video/mp4">`;
  }

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>${title} - 6Degree</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${videoUrl ? 'video.other' : 'website'}">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:secure_url" content="${ogImageUrl}">
  <meta property="og:image:width" content="${videoUrl ? '720' : '1200'}">
  <meta property="og:image:height" content="${videoUrl ? '1280' : '630'}">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:site_name" content="6Degree">
  <meta property="og:image:alt" content="${title}">
  ${videoMetaTags}

  <!-- Twitter -->
  <meta name="twitter:card" content="${videoUrl ? 'player' : 'summary_large_image'}">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${ogImageUrl}">

  <!-- Redirect to frontend app -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
  <script>
    window.location.href = '${pageUrl}';
  </script>
</head>
<body>
  <p>Redirecting to 6Degree...</p>
  <p>If you are not redirected automatically, <a href="${pageUrl}">click here</a>.</p>
</body>
</html>
  `;

  res.set('Content-Type', 'text/html');
  res.send(html);
}

// Serve HTML with OG tags for share links
router.get('/r/:linkId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { linkId } = req.params;

    // Try to find in connection_requests first (original creator links)
    const { data: request, error } = await supabase
      .from('connection_requests')
      .select('id, target, message, reward, video_url, video_thumbnail_url, creator:user_id (first_name, last_name)')
      .eq('link_id', linkId)
      .single();

    // If not found in connection_requests, try to find in chains (participant links)
    if (error || !request) {
      // Get all chains and search for the linkId in participants
      const { data: allChains, error: chainError } = await supabase
        .from('chains')
        .select('participants, request_id');

      if (allChains && allChains.length > 0) {
        // Search through all chains to find the one with this linkId
        for (const chain of allChains) {
          const participants = chain.participants as any[];
          const hasLink = participants.some((p: any) =>
            p.shareableLink?.includes(`/r/${linkId}`)
          );

          if (hasLink) {
            // Found the chain, now get the request details
            const { data: requestData, error: reqError } = await supabase
              .from('connection_requests')
              .select('id, target, message, reward, video_url, video_thumbnail_url, creator:user_id (first_name, last_name)')
              .eq('id', chain.request_id)
              .single();

            if (requestData) {
              const creator = requestData.creator as any;
              const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Someone';
              const targetName = requestData.target || 'Someone Amazing';

              return serveOGPage(res, linkId, creatorName, targetName, requestData.video_url, requestData.video_thumbnail_url);
            }
          }
        }
      }

      // If still not found, redirect to frontend with 404 handling
      const frontendUrl = process.env.PRODUCTION_FRONTEND_URL || 'https://6degree.app';
      res.redirect(`${frontendUrl}/r/${linkId}`);
      return;
    }

    // Found in connection_requests, serve OG page
    const creator = request.creator as any;
    const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Someone';
    const targetName = request.target || 'Someone Amazing';

    serveOGPage(res, linkId, creatorName, targetName, request.video_url, request.video_thumbnail_url);
  } catch (error: any) {
    console.error('Error serving share link:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/r/${req.params.linkId}`);
  }
});

// Serve HTML with OG tags for video share links
router.get('/video-share', async (req: Request, res: Response): Promise<void> => {
  try {
    const requestId = req.query.requestId as string;
    const refLinkId = req.query.ref as string;

    if (!requestId) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/video-share`);
      return;
    }

    // Fetch request details
    const { data: request, error } = await supabase
      .from('connection_requests')
      .select('id, target, message, video_url, creator:users!creator_id (first_name, last_name)')
      .eq('id', requestId)
      .single();

    if (error || !request) {
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/video-share?requestId=${requestId}`);
      return;
    }

    const creator = request.creator as any;
    const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Someone';
    const targetName = request.target || 'Someone Amazing';
    const videoUrl = request.video_url;

    const isProd = process.env.NODE_ENV === 'production';
    const frontendUrl = isProd
      ? (process.env.PRODUCTION_FRONTEND_URL || 'https://6degree.app')
      : (process.env.FRONTEND_URL || 'http://localhost:5173');

    const pageUrl = refLinkId
      ? `${frontendUrl}/video-share?requestId=${requestId}&ref=${refLinkId}`
      : `${frontendUrl}/video-share?requestId=${requestId}`;

    const title = `${creatorName} wants to connect with ${targetName}`;
    const description = `Watch this video and help ${creatorName} reach ${targetName}. Join the chain on 6Degree!`;

    // Generate video thumbnail URL (first frame of video)
    // For now, use a placeholder - you can add video thumbnail generation later
    const thumbnailUrl = videoUrl
      ? `${videoUrl}#t=0.5` // Video thumbnail at 0.5 seconds
      : `${frontendUrl}/og-default.png`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <!-- Primary Meta Tags -->
  <title>${title} - 6Degree Video</title>
  <meta name="title" content="${title}">
  <meta name="description" content="${description}">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="video.other">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${thumbnailUrl}">
  <meta property="og:image:secure_url" content="${thumbnailUrl}">
  <meta property="og:image:width" content="720">
  <meta property="og:image:height" content="1280">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:site_name" content="6Degree">

  <!-- Video Tags (Instagram/TikTok style) -->
  <meta property="og:video" content="${videoUrl}">
  <meta property="og:video:secure_url" content="${videoUrl}">
  <meta property="og:video:type" content="video/mp4">
  <meta property="og:video:width" content="720">
  <meta property="og:video:height" content="1280">

  <!-- Twitter -->
  <meta name="twitter:card" content="player">
  <meta name="twitter:url" content="${pageUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${thumbnailUrl}">
  <meta name="twitter:player" content="${pageUrl}">
  <meta name="twitter:player:width" content="720">
  <meta name="twitter:player:height" content="1280">
  <meta name="twitter:player:stream" content="${videoUrl}">
  <meta name="twitter:player:stream:content_type" content="video/mp4">

  <!-- WhatsApp -->
  <meta property="og:video:url" content="${videoUrl}">
  <meta property="og:video:secure_url" content="${videoUrl}">

  <!-- Redirect to frontend app -->
  <meta http-equiv="refresh" content="0;url=${pageUrl}">
  <script>
    window.location.href = '${pageUrl}';
  </script>
</head>
<body>
  <p>Loading video...</p>
  <p>If you are not redirected automatically, <a href="${pageUrl}">click here</a>.</p>
</body>
</html>
    `;

    res.set('Content-Type', 'text/html');
    res.send(html);
  } catch (error: any) {
    console.error('Error serving video share:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const requestId = req.query.requestId as string;
    res.redirect(`${frontendUrl}/video-share?requestId=${requestId || ''}`);
  }
});

export default router;
