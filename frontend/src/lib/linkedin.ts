// LinkedIn OAuth integration service
interface LinkedInConfig {
  clientId: string;
  redirectUri: string;
  scope: string;
}

interface LinkedInProfile {
  id: string;
  localizedFirstName: string;
  localizedLastName: string;
  profilePicture?: {
    'displayImage~': {
      elements: Array<{
        identifiers: Array<{ identifier: string }>;
      }>;
    };
  };
  localizedHeadline?: string;
}

interface LinkedInEmailResponse {
  elements: Array<{
    'handle~': {
      emailAddress: string;
    };
  }>;
}

export class LinkedInService {
  private config: LinkedInConfig;

  constructor() {
    this.config = {
      clientId: import.meta.env.VITE_LINKEDIN_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/linkedin/callback`,
      scope: 'r_liteprofile r_emailaddress w_member_social',
    };

    if (!this.config.clientId && import.meta.env.DEV) {
      console.warn('LinkedIn Client ID not configured');
    }
  }

  /**
   * Generate LinkedIn OAuth authorization URL
   */
  getAuthorizationUrl(): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      state: this.generateState(),
    });

    return `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeCodeForToken(code: string, state: string): Promise<{
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  }> {
    if (!this.validateState(state)) {
      throw new Error('Invalid state parameter');
    }

  const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'https://api.crosslunch.com'}/api/linkedin/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: this.config.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to exchange code for token');
    }

    return response.json();
  }

  /**
   * Get LinkedIn profile data
   */
  async getProfile(accessToken: string): Promise<LinkedInProfile> {
    const response = await fetch('https://api.linkedin.com/v2/people/~', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LinkedIn profile');
    }

    return response.json();
  }

  /**
   * Get LinkedIn email address
   */
  async getEmailAddress(accessToken: string): Promise<string> {
    const response = await fetch('https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch LinkedIn email');
    }

    const data: LinkedInEmailResponse = await response.json();
    return data.elements[0]['handle~'].emailAddress;
  }

  /**
   * Get profile picture URL from LinkedIn response
   */
  getProfilePictureUrl(profile: LinkedInProfile): string | null {
    const profilePicture = profile.profilePicture?.['displayImage~'];
    if (profilePicture && profilePicture.elements.length > 0) {
      // Get the largest available image
      const element = profilePicture.elements[profilePicture.elements.length - 1];
      return element.identifiers[0]?.identifier || null;
    }
    return null;
  }

  /**
   * Generate and store state parameter for OAuth security
   */
  private generateState(): string {
    const state = Math.random().toString(36).substring(2, 15) +
                 Math.random().toString(36).substring(2, 15);
    localStorage.setItem('linkedin_oauth_state', state);
    return state;
  }

  /**
   * Validate state parameter
   */
  private validateState(state: string): boolean {
    const storedState = localStorage.getItem('linkedin_oauth_state');
    localStorage.removeItem('linkedin_oauth_state');
    return storedState === state;
  }

  /**
   * Check if LinkedIn is configured
   */
  isConfigured(): boolean {
    return !!this.config.clientId;
  }
}

export const linkedInService = new LinkedInService();