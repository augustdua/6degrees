import { useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface UserAnalytics {
  totalProfileViews: number;
  totalLinkClicks: number;
  linkedinClicks: number;
  emailClicks: number;
  timesShared: number;
  sharesGenerated: number;
  connectionsMade: number;
  dailyStats: Array<{
    date: string;
    profile_views: number;
    total_clicks: number;
    linkedin_clicks: number;
    email_clicks: number;
    shares_made: number;
  }>;
}

export const useAnalytics = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track link click
  const trackLinkClick = useCallback(async (
    clickedUserId: string,
    linkType: 'linkedin_profile' | 'email' | 'profile_view' | 'connection_request' | 'external_link',
    linkUrl: string,
    sourcePage?: string,
    metadata?: Record<string, any>
  ) => {
    try {
      const { error } = await supabase.rpc('track_link_click', {
        p_clicked_user_id: clickedUserId,
        p_link_type: linkType,
        p_link_url: linkUrl,
        p_source_page: sourcePage,
        p_referrer: document.referrer || null,
        p_user_agent: navigator.userAgent,
        p_metadata: metadata || {}
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error tracking link click:', err);
      // Don't throw - tracking failures shouldn't break user experience
    }
  }, []);

  // Track share
  const trackShare = useCallback(async (
    sharedUserId: string,
    shareType: 'profile' | 'connection' | 'platform' | 'referral' | 'custom_link',
    shareMedium: 'linkedin' | 'twitter' | 'facebook' | 'email' | 'whatsapp' | 'copy_link' | 'other',
    shareUrl: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) {
      console.warn('User must be authenticated to track shares');
      return;
    }

    try {
      const { error } = await supabase.rpc('track_link_share', {
        p_shared_user_id: sharedUserId,
        p_share_type: shareType,
        p_share_medium: shareMedium,
        p_share_url: shareUrl,
        p_metadata: metadata || {}
      });

      if (error) throw error;
    } catch (err) {
      console.error('Error tracking share:', err);
    }
  }, [user]);

  // Get user analytics
  const fetchAnalytics = useCallback(async (daysBack: number = 30): Promise<UserAnalytics | null> => {
    if (!user) return null;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_user_analytics', {
        p_days_back: daysBack
      });

      if (error) throw error;

      const result = data?.[0];
      if (!result) return null;

      return {
        totalProfileViews: result.total_profile_views || 0,
        totalLinkClicks: result.total_link_clicks || 0,
        linkedinClicks: result.linkedin_clicks || 0,
        emailClicks: result.email_clicks || 0,
        timesShared: result.times_shared || 0,
        sharesGenerated: result.shares_generated || 0,
        connectionsMade: result.connections_made || 0,
        dailyStats: result.daily_stats || []
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      setError(errorMessage);
      console.error('Error fetching analytics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Track profile view (when someone visits a user's profile)
  const trackProfileView = useCallback(async (viewedUserId: string) => {
    await trackLinkClick(
      viewedUserId,
      'profile_view',
      window.location.href,
      'profile_page'
    );
  }, [trackLinkClick]);

  // Create tracked link (wrapper for external links with tracking)
  const createTrackedLink = useCallback((
    targetUserId: string,
    originalUrl: string,
    linkType: 'linkedin_profile' | 'email' | 'external_link',
    sourcePage?: string
  ) => {
    return {
      url: originalUrl,
      onClick: () => trackLinkClick(targetUserId, linkType, originalUrl, sourcePage),
      onContextMenu: () => trackLinkClick(targetUserId, linkType, originalUrl, sourcePage) // Right-click tracking
    };
  }, [trackLinkClick]);

  return {
    loading,
    error,
    trackLinkClick,
    trackShare,
    fetchAnalytics,
    trackProfileView,
    createTrackedLink
  };
};