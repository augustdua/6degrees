import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Helper function to serve OG page
function serveOGPage(res: Response, linkId: string, creatorName: string, targetName: string): void {
  const isProd = process.env.NODE_ENV === 'production';
  const backendUrl = isProd
    ? (process.env.PRODUCTION_BACKEND_URL || 'https://6degreesbackend-production.up.railway.app')
    : (process.env.BACKEND_URL || 'http://localhost:3001');
  const frontendUrl = isProd
    ? (process.env.PRODUCTION_FRONTEND_URL || 'https://6degree.app')
    : (process.env.FRONTEND_URL || 'http://localhost:5173');
  const ogImageUrl = `${backendUrl}/api/og-image/r/${linkId}?v=7`;
  const pageUrl = `${frontendUrl}/r/${linkId}`;

  const title = `${creatorName} wants to connect with ${targetName}`;
  const description = `Help ${creatorName} reach ${targetName} and earn rewards! Join this networking chain on 6Degree.`;

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
  <meta property="og:type" content="website">
  <meta property="og:url" content="${pageUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${ogImageUrl}">
  <meta property="og:image:secure_url" content="${ogImageUrl}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:type" content="image/jpeg">
  <meta property="og:site_name" content="6Degree">
  <meta property="og:image:alt" content="${title}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
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
      .select('id, target, message, reward, creator:user_id (first_name, last_name)')
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
              .select('id, target, message, reward, creator:user_id (first_name, last_name)')
              .eq('id', chain.request_id)
              .single();

            if (requestData) {
              const creator = requestData.creator as any;
              const creatorName = creator ? `${creator.first_name} ${creator.last_name}` : 'Someone';
              const targetName = requestData.target || 'Someone Amazing';

              return serveOGPage(res, linkId, creatorName, targetName);
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

    serveOGPage(res, linkId, creatorName, targetName);
  } catch (error: any) {
    console.error('Error serving share link:', error);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}/r/${req.params.linkId}`);
  }
});

export default router;
