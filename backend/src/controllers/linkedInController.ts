import { Request, Response } from 'express';

export const linkedInTokenExchange = async (req: Request, res: Response) => {
  try {
    const { code, redirect_uri } = req.body;

    if (!code || !redirect_uri) {
      return res.status(400).json({
        error: 'Missing required parameters: code and redirect_uri'
      });
    }

    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      console.error('LinkedIn credentials not configured');
      return res.status(500).json({
        error: 'LinkedIn integration not properly configured'
      });
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
      return res.status(400).json({
        error: 'Failed to exchange authorization code',
        details: errorData
      });
    }

    const tokenData = await tokenResponse.json();

    // Return the token data to the frontend
    res.json({
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      refresh_token: tokenData.refresh_token,
      scope: tokenData.scope,
    });

  } catch (error) {
    console.error('LinkedIn token exchange error:', error);
    res.status(500).json({
      error: 'Internal server error during LinkedIn token exchange'
    });
  }
};