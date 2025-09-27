import { getSupabase } from './supabaseClient';

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
async function authHeader() {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Helper function to make authenticated API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const authHeaders = await authHeader();

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'omit',
    ...options,
  };

  const response = await fetch(url, defaultOptions);
  const text = await response.text().catch(() => '');

  if (!response.ok) {
    throw new Error(`${options.method || 'GET'} ${endpoint} → ${response.status} ${text || response.statusText}`);
  }

  return text ? JSON.parse(text) : null;
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
