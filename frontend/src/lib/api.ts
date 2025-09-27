import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

// API configuration for different environments
const getApiBaseUrl = () => {
  // In production, use the Railway backend URL
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_BACKEND_URL || 'https://6degreesbackend-production.up.railway.app';
  }

  // In development, use the proxy (relative URLs)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Get current Supabase access token
async function getAccessToken() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// Helper function to make authenticated API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = await getAccessToken();

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: 'omit',
    ...options,
  };

  const response = await fetch(url, defaultOptions);

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${options.method || 'GET'} ${endpoint} → ${response.status} ${response.statusText} ${body}`);
  }

  return response.json();
};

// GET request helper
export const apiGet = async (endpoint: string, options?: RequestInit) => {
  return apiCall(endpoint, { method: 'GET', ...options });
};

// POST request helper
export const apiPost = async (endpoint: string, body?: any, options?: RequestInit) => {
  return apiCall(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
};

// Specific API endpoints
export const API_ENDPOINTS = {
  // Feed
  FEED_DATA: '/api/feed/data',
  FEED_STATS: '/api/feed/stats',
  
  // Credits
  CREDITS_BALANCE: '/api/credits/balance',
  CREDITS_TRANSACTIONS: '/api/credits/transactions',
  CREDITS_AWARD: '/api/credits/award',
  CREDITS_SPEND: '/api/credits/spend',
  CREDITS_JOIN_CHAIN: '/api/credits/join-chain',
  CREDITS_UNLOCK_CHAIN: '/api/credits/unlock-chain',
  CREDITS_LIKE: '/api/credits/like',
  
  // LinkedIn
  LINKEDIN_TOKEN: '/api/linkedin/token',
  
  // Errors
  ERRORS: '/api/errors',
} as const;
