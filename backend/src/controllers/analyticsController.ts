import { Response } from 'express';
import { AuthenticatedRequest } from '../types';
import { supabase } from '../config/supabase';

export const getRequestAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Get user's requests with basic stats
    const { data: requests, error: requestsError } = await supabase
      .from('connection_requests')
      .select(`
        id,
        target,
        reward,
        status,
        created_at,
        expires_at,
        shareable_link
      `)
      .eq('creator_id', userId)
      .order('created_at', { ascending: false });

    if (requestsError) {
      throw requestsError;
    }

    // Get click analytics for each request
    const requestAnalytics = await Promise.all(
      requests.map(async (request) => {
        // Get click data
        const { data: clicks, error: clicksError } = await supabase
          .from('link_clicks')
          .select('*')
          .eq('request_id', request.id);

        // Get chain data
        const { data: chains, error: chainsError } = await supabase
          .from('chains')
          .select(`
            id,
            participants,
            status,
            total_reward,
            created_at,
            completed_at
          `)
          .eq('request_id', request.id);

        const chainData = chains?.[0];
        const clickCount = clicks?.length || 0;
        const participantCount = chainData?.participants?.length || 0;

        return {
          ...request,
          analytics: {
            clicks: clickCount,
            participants: participantCount,
            chain_status: chainData?.status || 'pending',
            chain_length: participantCount,
            created_at: chainData?.created_at,
            completed_at: chainData?.completed_at,
          }
        };
      })
    );

    // Calculate aggregate stats
    const totalRequests = requests.length;
    const activeRequests = requests.filter(r =>
      r.status === 'active' && new Date(r.expires_at) > new Date()
    ).length;
    const completedRequests = requests.filter(r => r.status === 'completed').length;
    const expiredRequests = requests.filter(r =>
      r.status === 'expired' || new Date(r.expires_at) <= new Date()
    ).length;

    const totalClicks = requestAnalytics.reduce((sum, r) => sum + r.analytics.clicks, 0);
    const totalParticipants = requestAnalytics.reduce((sum, r) => sum + r.analytics.participants, 0);
    const totalRewardsPaid = requests
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.reward, 0);

    const stats = {
      totalRequests,
      activeRequests,
      completedRequests,
      expiredRequests,
      totalClicks,
      totalParticipants,
      totalRewardsPaid,
      averageChainLength: totalRequests > 0 ? totalParticipants / totalRequests : 0,
      conversionRate: totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0,
    };

    return res.json({
      success: true,
      data: {
        stats,
        requests: requestAnalytics,
      }
    });

  } catch (error) {
    console.error('Error fetching request analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics data'
    });
  }
};

export const getClickAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify request ownership
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .select('id, creator_id')
      .eq('id', requestId)
      .eq('creator_id', userId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or access denied'
      });
    }

    // Get detailed click analytics (combined per request)
    const { data: clicks, error: clicksError } = await supabase
      .from('link_clicks')
      .select(`
        id,
        clicked_at,
        ip_address,
        user_agent,
        referrer,
        country,
        city
      `)
      .eq('request_id', requestId)
      .order('clicked_at', { ascending: false });

    if (clicksError) {
      throw clicksError;
    }

    // Process click data for charts
    const clicksByDay: Record<string, number> = {};
    const clicksByCountry: Record<string, number> = {};
    const clicksByHour = new Array(24).fill(0);

    clicks?.forEach(click => {
      const clickDate = new Date(click.clicked_at);
      const dayKey = clickDate.toISOString().split('T')[0];
      const hourKey = clickDate.getHours();
      const countryKey = click.country || 'Unknown';

      clicksByDay[dayKey] = (clicksByDay[dayKey] || 0) + 1;
      clicksByCountry[countryKey] = (clicksByCountry[countryKey] || 0) + 1;
      clicksByHour[hourKey]++;
    });

    // Format data for charts
    const dailyClicks = Object.entries(clicksByDay).map(([date, count]) => ({
      date,
      clicks: count
    })).sort((a, b) => a.date.localeCompare(b.date));

    const countryClicks = Object.entries(clicksByCountry).map(([country, count]) => ({
      country,
      clicks: count
    })).sort((a, b) => (b.clicks as number) - (a.clicks as number));

    const hourlyClicks = clicksByHour.map((count, hour) => ({
      hour: `${hour}:00`,
      clicks: count
    }));

    return res.json({
      success: true,
      data: {
        totalClicks: clicks?.length || 0,
        uniqueVisitors: new Set(clicks?.map(c => c.ip_address)).size,
        clicks: clicks || [],
        charts: {
          dailyClicks,
          countryClicks,
          hourlyClicks
        }
      }
    });

  } catch (error) {
    console.error('Error fetching click analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch click analytics'
    });
  }
};

export const getChainAnalytics = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { requestId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Verify request ownership
    const { data: request, error: requestError } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('id', requestId)
      .eq('creator_id', userId)
      .single();

    if (requestError || !request) {
      return res.status(404).json({
        success: false,
        message: 'Request not found or access denied'
      });
    }

    // Get chain data
    const { data: chain, error: chainError } = await supabase
      .from('chains')
      .select('*')
      .eq('request_id', requestId)
      .single();

    if (chainError && chainError.code !== 'PGRST116') {
      throw chainError;
    }

    // Get detailed participant information
    let participants: any[] = [];
    if (chain?.participants) {
      const userIds = chain.participants.map((p: any) => p.userId).filter(Boolean);

      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, first_name, last_name, email, avatar_url')
          .in('id', userIds);

        if (!usersError && users) {
          participants = chain.participants.map((participant: any) => {
            const user = users.find(u => u.id === participant.userId);
            return {
              ...participant,
              user: user || null
            };
          });
        }
      }
    }

    // Calculate chain metrics
    const chainLength = participants.length;
    const rewardPerParticipant = chainLength > 0 ? request.reward / chainLength : 0;
    const completionRate = request.status === 'completed' ? 100 :
      chainLength > 0 ? (chainLength / (chainLength + 1)) * 100 : 0;

    return res.json({
      success: true,
      data: {
        request,
        chain: chain || null,
        participants,
        metrics: {
          chainLength,
          rewardPerParticipant,
          completionRate,
          totalReward: request.reward,
          status: chain?.status || 'pending'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching chain analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch chain analytics'
    });
  }
};