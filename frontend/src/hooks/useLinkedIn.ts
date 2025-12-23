import { useState, useCallback } from 'react';
import { linkedInService } from '@/lib/linkedin';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface LinkedInProfile {
  id: string;
  firstName: string;
  lastName: string;
  headline?: string;
  profilePicture?: string;
  email: string;
  profileUrl?: string;
}

export const useLinkedIn = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();

  const connectLinkedIn = useCallback(() => {
    if (!linkedInService.isConfigured()) {
      setError('LinkedIn integration is not configured');
      toast({
        title: "Configuration Error",
        description: "LinkedIn integration is not properly configured.",
        variant: "destructive",
      });
      return;
    }

    try {
      const authUrl = linkedInService.getAuthorizationUrl();
      window.location.href = authUrl;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect LinkedIn';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleLinkedInCallback = useCallback(async (code: string, state: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLoading(true);
    setError(null);

    try {
      // Exchange code for access token
      const tokenResponse = await linkedInService.exchangeCodeForToken(code, state);

      // Get profile data
      const [profile, email] = await Promise.all([
        linkedInService.getProfile(tokenResponse.access_token),
        linkedInService.getEmailAddress(tokenResponse.access_token),
      ]);

      // Extract profile picture URL
      const profilePictureUrl = linkedInService.getProfilePictureUrl(profile);

      // Calculate token expiration
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + tokenResponse.expires_in);

      // Update user profile in database
      const { error: updateError } = await supabase
        .from('users')
        .update({
          linkedin_id: profile.id,
          linkedin_headline: profile.localizedHeadline,
          linkedin_profile_picture: profilePictureUrl,
          linkedin_connected_at: new Date().toISOString(),
          linkedin_access_token: tokenResponse.access_token,
          linkedin_refresh_token: tokenResponse.refresh_token,
          linkedin_token_expires_at: expiresAt.toISOString(),
          // Update profile data if not already set
          first_name: user.firstName || profile.localizedFirstName,
          last_name: user.lastName || profile.localizedLastName,
          avatar_url: user.avatar || profilePictureUrl,
          linkedin_url: user.linkedinUrl || `https://linkedin.com/in/${profile.id}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Update local auth state
      await refreshProfile();

      toast({
        title: "LinkedIn Connected!",
        description: "Your LinkedIn profile has been successfully connected to Zaurq.",
      });

      return {
        id: profile.id,
        firstName: profile.localizedFirstName,
        lastName: profile.localizedLastName,
        headline: profile.localizedHeadline,
        profilePicture: profilePictureUrl,
        email,
        profileUrl: `https://linkedin.com/in/${profile.id}`,
      };

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect LinkedIn profile';
      setError(errorMessage);
      toast({
        title: "LinkedIn Connection Failed",
        description: errorMessage,
        variant: "destructive",
      });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [user, refreshProfile, toast]);

  const disconnectLinkedIn = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          linkedin_id: null,
          linkedin_headline: null,
          linkedin_profile_picture: null,
          linkedin_connected_at: null,
          linkedin_access_token: null,
          linkedin_refresh_token: null,
          linkedin_token_expires_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      // Update local auth state
      await refreshProfile();

      toast({
        title: "LinkedIn Disconnected",
        description: "Your LinkedIn profile has been disconnected from Zaurq.",
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disconnect LinkedIn';
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, refreshProfile, toast]);

  const isLinkedInConnected = useCallback(() => {
    return !!(user?.linkedinId);
  }, [user]);

  return {
    connectLinkedIn,
    disconnectLinkedIn,
    handleLinkedInCallback,
    isLinkedInConnected: isLinkedInConnected(),
    loading,
    error,
  };
};