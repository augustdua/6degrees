import axios from 'axios';

const WORKOS_API_KEY = process.env.WORKOS_API_KEY as string | undefined;
const WORKOS_CLIENT_ID = process.env.WORKOS_CLIENT_ID as string | undefined;
const WORKOS_REDIRECT_URI = process.env.WORKOS_REDIRECT_URI as string | undefined;

const WORKOS_BASE_URL = 'https://api.workos.com';

export interface CreateSsoLinkParams {
  state: string; // our opaque state tying to broker_verifications.workos_state
  domainHint?: string; // optional company domain to nudge IdP selection
}

export function getWorkosAuthorizeUrl(params: CreateSsoLinkParams): string {
  if (!WORKOS_CLIENT_ID || !WORKOS_REDIRECT_URI) {
    throw new Error('WORKOS_CLIENT_ID/WORKOS_REDIRECT_URI not configured');
  }
  const url = new URL('https://api.workos.com/sso/authorize');
  url.searchParams.set('client_id', WORKOS_CLIENT_ID);
  url.searchParams.set('redirect_uri', WORKOS_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', params.state);
  if (params.domainHint) {
    url.searchParams.set('domain_hint', params.domainHint);
  }
  // Request OpenID profile+email scopes
  url.searchParams.set('provider', 'oidc');
  url.searchParams.set('scope', 'openid profile email');
  return url.toString();
}

export interface WorkosTokenResponse {
  access_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export async function exchangeCodeForToken(code: string): Promise<WorkosTokenResponse> {
  if (!WORKOS_API_KEY || !WORKOS_CLIENT_ID || !WORKOS_REDIRECT_URI) {
    throw new Error('WORKOS credentials not configured');
  }
  const body = new URLSearchParams();
  body.set('grant_type', 'authorization_code');
  body.set('code', code);
  body.set('client_id', WORKOS_CLIENT_ID);
  body.set('redirect_uri', WORKOS_REDIRECT_URI);

  const resp = await axios.post(`${WORKOS_BASE_URL}/sso/token`, body, {
    headers: {
      Authorization: `Bearer ${WORKOS_API_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  });
  return resp.data as WorkosTokenResponse;
}

export interface WorkosUserProfile {
  email: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  organization_id?: string;
  organization_name?: string;
  title?: string;
  domain?: string;
}

export async function getUserProfile(accessToken: string): Promise<WorkosUserProfile> {
  const resp = await axios.get(`${WORKOS_BASE_URL}/user`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = resp.data || {};
  // Normalize common fields
  const email: string = data.email || data.profile?.email || '';
  const first_name: string | undefined = data.first_name || data.profile?.first_name;
  const last_name: string | undefined = data.last_name || data.profile?.last_name;
  const name: string | undefined = data.name || data.profile?.name;
  const title: string | undefined = data.title || data.profile?.title || data.profile?.job_title;
  const organization_id: string | undefined = data.organization_id || data.profile?.organization_id;
  const organization_name: string | undefined = data.organization_name || data.profile?.organization_name;
  const domain: string | undefined = email.includes('@') ? email.split('@')[1] : undefined;
  return { email, first_name, last_name, name, title, organization_id, organization_name, domain };
}












