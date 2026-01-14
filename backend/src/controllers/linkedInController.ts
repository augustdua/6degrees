import { Request, Response } from 'express';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import { scrapeLinkedInProfilesViaApify } from '../services/apifyLinkedInService';

interface LinkedInTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

export const linkedInTokenExchange = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      res.status(400).json({
        error: 'Missing required parameters: code and redirect_uri'
      });
      return;
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('LinkedIn credentials not configured');
      res.status(500).json({
        error: 'LinkedIn integration not properly configured'
      });
      return;
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('LinkedIn token exchange failed:', errorData);
      res.status(400).json({
        error: 'Failed to exchange authorization code',
        details: errorData
      });
      return;
    }

    const tokenData = await tokenResponse.json() as LinkedInTokenResponse;

    // Return the token data to the frontend
    res.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    });
    return;

  } catch (error) {
    console.error('LinkedIn token exchange error:', error);
    res.status(500).json({
      error: 'Internal server error during LinkedIn token exchange'
    });
    return;
  }
};

function normalizeLinkedInUrl(input: string): string | null {
  const raw = String(input || '').trim();
  if (!raw) return null;

  const withProto = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
  try {
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./i, '').toLowerCase();
    if (!host.endsWith('linkedin.com')) return null;
    if (!url.pathname.toLowerCase().includes('/in/')) return null;
    // strip tracking params
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function pickProfileFromApifyItem(item: any) {
  const firstName = typeof item?.firstName === 'string' ? item.firstName.trim() : '';
  const lastName = typeof item?.lastName === 'string' ? item.lastName.trim() : '';
  const fullName = typeof item?.fullName === 'string' ? item.fullName.trim() : `${firstName} ${lastName}`.trim();

  const headline = typeof item?.headline === 'string' ? item.headline.trim() : null;
  const about = typeof item?.about === 'string' ? item.about.trim() : null;
  const location = typeof item?.addressWithCountry === 'string' ? item.addressWithCountry.trim() : null;

  const profilePic =
    (typeof item?.profilePicHighQuality === 'string' && item.profilePicHighQuality) ||
    (typeof item?.profilePic === 'string' && item.profilePic) ||
    null;

  const backgroundPic = typeof item?.backgroundPic === 'string' ? item.backgroundPic : null;

  const linkedinUrl =
    (typeof item?.linkedinPublicUrl === 'string' && item.linkedinPublicUrl) ||
    (typeof item?.linkedinUrl === 'string' && item.linkedinUrl) ||
    null;

  const jobTitle = typeof item?.jobTitle === 'string' ? item.jobTitle : null;
  const companyName = typeof item?.companyName === 'string' ? item.companyName : null;
  const followers = Number.isFinite(Number(item?.followers)) ? Number(item.followers) : null;
  const connections = Number.isFinite(Number(item?.connections)) ? Number(item.connections) : null;

  const experiences = Array.isArray(item?.experiences)
    ? item.experiences.slice(0, 12).map((e: any) => ({
        companyName: typeof e?.companyName === 'string' ? e.companyName : null,
        title: typeof e?.title === 'string' ? e.title : null,
        jobStartedOn: typeof e?.jobStartedOn === 'string' ? e.jobStartedOn : null,
        jobEndedOn: typeof e?.jobEndedOn === 'string' ? e.jobEndedOn : null,
        jobLocation: typeof e?.jobLocation === 'string' ? e.jobLocation : null,
        employmentType: typeof e?.employmentType === 'string' ? e.employmentType : null,
        logo: typeof e?.logo === 'string' ? e.logo : null,
      }))
    : [];

  return {
    firstName: firstName || null,
    lastName: lastName || null,
    fullName: fullName || null,
    headline,
    about,
    location,
    linkedinUrl,
    profilePic,
    backgroundPic,
    jobTitle,
    companyName,
    followers,
    connections,
    experiences,
  };
}

export const scrapeLinkedInProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const linkedinUrl = normalizeLinkedInUrl(req.body?.linkedinUrl);
    const force = Boolean(req.body?.force);

    if (!linkedinUrl) {
      res.status(400).json({ error: 'Valid linkedinUrl is required (must be a linkedin.com/in/... URL)' });
      return;
    }

    const items = await scrapeLinkedInProfilesViaApify([linkedinUrl], { timeoutMs: 5 * 60_000 });
    const item = Array.isArray(items) && items.length > 0 ? items[0] : null;
    if (!item) {
      res.status(404).json({ error: 'No profile data returned from scraper' });
      return;
    }

    const scraped = pickProfileFromApifyItem(item);

    const { data: existing, error: existingErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, bio, linkedin_url, profile_picture_url, metadata')
      .eq('id', userId)
      .single();

    if (existingErr || !existing) {
      res.status(500).json({ error: 'Could not load existing user' });
      return;
    }

    const update: Record<string, any> = {
      linkedin_url: linkedinUrl,
      updated_at: new Date().toISOString(),
    };

    if (force || !existing.first_name) {
      if (scraped.firstName) update.first_name = scraped.firstName;
    }
    if (force || !existing.last_name) {
      if (scraped.lastName) update.last_name = scraped.lastName;
    }
    if (force || !existing.bio) {
      // Prefer "about" as bio; fall back to headline.
      const nextBio = (scraped.about || scraped.headline || '').trim();
      if (nextBio) update.bio = nextBio;
    }
    // CrossLunch behavior: after sync, the user's DP should come from the LinkedIn profile pic URL
    // we store in DB (same as seed profiles).
    if (scraped.profilePic) {
      update.profile_picture_url = scraped.profilePic;
    }

    const existingMetadata = (existing as any)?.metadata && typeof (existing as any).metadata === 'object' ? (existing as any).metadata : {};
    update.metadata = {
      ...existingMetadata,
      linkedin: {
        ...(existingMetadata as any)?.linkedin,
        lastScrapedAt: new Date().toISOString(),
        source: 'apify',
        profile: scraped,
      },
    };

    const { data: updated, error: updateErr } = await supabase.from('users').update(update).eq('id', userId).select().single();
    if (updateErr) {
      console.error('LinkedIn scrape profile update failed:', updateErr);
      res.status(500).json({ error: 'Failed to update user from LinkedIn scrape' });
      return;
    }

    // Best-effort: also update Supabase Auth user_metadata so the avatar persists across sessions
    // even before DB hydration runs on the client.
    try {
      const metaUpdates: Record<string, any> = {
        linkedin_url: linkedinUrl,
      };
      if (update.first_name) metaUpdates.first_name = update.first_name;
      if (update.last_name) metaUpdates.last_name = update.last_name;
      if (scraped.profilePic) metaUpdates.avatar_url = scraped.profilePic;

      await supabase.auth.admin.updateUserById(userId, {
        user_metadata: metaUpdates,
      });
    } catch (e) {
      // do not fail the scrape if auth metadata update fails
    }

    res.json({
      ok: true,
      scraped: scraped,
      user: updated,
    });
    return;
  } catch (e: any) {
    console.error('scrapeLinkedInProfile error:', e);
    res.status(500).json({ error: e?.message || 'Internal server error' });
    return;
  }
};