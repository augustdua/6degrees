import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

interface ClickTrackingData {
  ip_address?: string;
  user_agent?: string;
  referrer?: string;
  country?: string;
  city?: string;
}

export const trackLinkClick = async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;
    const { country, city } = req.body;

    // Extract request info
    const ip_address = req.ip || req.connection.remoteAddress;
    const user_agent = req.get('User-Agent');
    const referrer = req.get('Referrer') || req.get('Referer');

    // Find the connection request by shareable link using suffix match (works across domains)
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .select('id, status, expires_at, creator_id, shareable_link')
      .like('shareable_link', `%/r/${linkId}`)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    // Check if request is still active
    const now = new Date();
    const expiresAt = new Date(request.expires_at);
    const isExpired = expiresAt < now;
    const isActive = request.status === 'active' && !isExpired;

    // Try to resolve referrer_user_id (who owns the exact linkId clicked)
    let referrerUserId: string | null = null;
    try {
      // If original creator link matches the clicked linkId, referrer is creator
      if (request.shareable_link?.endsWith(`/r/${linkId}`)) {
        referrerUserId = request.creator_id || null as any;
      } else {
        // Otherwise, search chain participants for a matching shareableLink suffix
        const { data: chainData } = await supabase
          .from('chains')
          .select('participants')
          .eq('request_id', request.id)
          .maybeSingle();

        const participants = Array.isArray(chainData?.participants) ? chainData?.participants : [];
        const owner = participants.find((p: any) => typeof p?.shareableLink === 'string' && p.shareableLink.endsWith(`/r/${linkId}`));
        if (owner && owner.userid) {
          referrerUserId = owner.userid;
        }
      }
    } catch (resolveErr) {
      // Non-fatal
      console.warn('Could not resolve referrer from linkId:', resolveErr);
    }

    // Track the click even if the request is inactive/expired for analytics
    const clickData: ClickTrackingData = {
      ip_address,
      user_agent,
      referrer,
      country: country || null,
      city: city || null,
    };

    const { error: clickError } = await supabase
      .from('link_clicks')
      .insert({
        request_id: request.id,
        clicked_at: now.toISOString(),
        // Satisfy NOT NULLs commonly present in link_clicks schema
        link_type: 'connection_request',
        link_url: request.shareable_link,
        source_page: referrer || null,
        referrer_user_id: referrerUserId,
        ...clickData
      });

    if (clickError) {
      console.error('Error tracking click:', clickError);
      // Don't return error to user, as tracking failure shouldn't break the flow
    }

    // Return request status and redirect info
    return res.json({
      success: true,
      data: {
        request_id: request.id,
        status: request.status,
        is_active: isActive,
        is_expired: isExpired,
        expires_at: request.expires_at,
        click_tracked: !clickError
      }
    });

  } catch (error) {
    console.error('Error in trackLinkClick:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process link click'
    });
  }
};

export const getLinkClickStats = async (req: Request, res: Response) => {
  try {
    const { linkId } = req.params;

    // Find the connection request by link ID via suffix match
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .select('id, creator_id, click_count, last_clicked_at')
      .like('shareable_link', `%/r/${linkId}`)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    // Get recent click statistics (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: recentClicks, error: clicksError } = await supabase
      .from('link_clicks')
      .select('clicked_at, country, ip_address')
      .eq('request_id', request.id)
      .gte('clicked_at', sevenDaysAgo.toISOString())
      .order('clicked_at', { ascending: false });

    if (clicksError) {
      throw clicksError;
    }

    // Process click data
    const clicksByDay: Record<string, number> = {};
    const clicksByCountry: Record<string, number> = {};

    recentClicks?.forEach(click => {
      const clickDate = new Date(click.clicked_at).toISOString().split('T')[0];
      const country = click.country || 'Unknown';

      clicksByDay[clickDate] = (clicksByDay[clickDate] || 0) + 1;
      clicksByCountry[country] = (clicksByCountry[country] || 0) + 1;
    });

    const dailyClicks = Object.entries(clicksByDay).map(([date, count]) => ({
      date,
      clicks: count
    }));

    const countryClicks = Object.entries(clicksByCountry)
      .map(([country, count]) => ({ country, clicks: count }))
      .sort((a, b) => b.clicks - a.clicks);

    return res.json({
      success: true,
      data: {
        total_clicks: request.click_count || 0,
        recent_clicks: recentClicks?.length || 0,
        last_clicked_at: request.last_clicked_at,
        daily_clicks: dailyClicks,
        country_distribution: countryClicks,
        unique_visitors: new Set(recentClicks?.map(c => c.ip_address)).size
      }
    });

  } catch (error) {
    console.error('Error fetching link stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch link statistics'
    });
  }
};

// Get combined share counts for a request by matching all known shareable links
export const getRequestShares = async (req: Request, res: Response) => {
  try {
    const { requestId } = req.params as { requestId: string };

    // Find the request and its chain participants to collect all shareable links
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .select('id, shareable_link')
      .eq('id', requestId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const links: string[] = [];
    if (typeof request.shareable_link === 'string') {
      links.push(request.shareable_link);
    }

    const { data: chain, error: chainError } = await supabase
      .from('chains')
      .select('participants')
      .eq('request_id', requestId)
      .maybeSingle();

    if (chainError) {
      console.warn('Shares: could not load chain; continuing without participants', chainError);
    }

    const participants = Array.isArray(chain?.participants) ? chain?.participants : [];
    for (const p of participants) {
      if (p && typeof p.shareableLink === 'string') {
        links.push(p.shareableLink);
      }
    }

    if (links.length === 0) {
      return res.json({ success: true, data: { total_shares: 0, by_medium: [] } });
    }

    // Fetch all share rows for these links and aggregate in code
    const { data: shareRows, error: sharesError } = await supabase
      .from('link_shares')
      .select('share_medium, share_url')
      .in('share_url', links);

    if (sharesError) {
      throw sharesError;
    }

    const total = shareRows?.length || 0;
    const byMediumMap = new Map<string, number>();
    (shareRows || []).forEach(row => {
      const key = row.share_medium || 'unknown';
      byMediumMap.set(key, (byMediumMap.get(key) || 0) + 1);
    });
    const by_medium = Array.from(byMediumMap.entries()).map(([medium, count]) => ({ medium, count }));

    return res.json({ success: true, data: { total_shares: total, by_medium } });
  } catch (error) {
    console.error('Error fetching shares:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch shares' });
  }
};