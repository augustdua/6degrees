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
  console.log('🌐 api.ts: Making request to:', url);

  const authHeaders = await authHeader();
  console.log('🔐 api.ts: Auth headers:', authHeaders);
  console.log('🔐 api.ts: Auth header keys:', Object.keys(authHeaders));
  console.log('🔐 api.ts: Auth header values:', Object.values(authHeaders));

  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders,
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  console.log('⚙️ api.ts: Request options:', defaultOptions);

  // Add timeout handling
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('⏰ api.ts: Request timeout after 10 seconds');
    controller.abort();
  }, 10000); // 10 second timeout

  try {
    console.log('🚀 api.ts: Starting fetch request...');
    console.log('🚀 api.ts: Request URL:', url);
    console.log('🚀 api.ts: Request method:', defaultOptions.method || 'GET');
    console.log('🚀 api.ts: Request headers:', defaultOptions.headers);
    
    const response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    console.log('📡 api.ts: Response received! Status:', response.status, response.statusText);

    const text = await response.text().catch(() => '');
    console.log('📄 api.ts: Response text length:', text.length);

    if (!response.ok) {
      const errorMsg = `${options.method || 'GET'} ${endpoint} → ${response.status} ${text || response.statusText}`;
      console.error('❌ api.ts: Request failed:', errorMsg);
      throw new Error(errorMsg);
    }

    const result = text ? JSON.parse(text) : null;
    console.log('✅ api.ts: Parsed result:', result);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    
    if (error.name === 'AbortError') {
      const timeoutMsg = `${options.method || 'GET'} ${endpoint} → Request timeout after 10 seconds`;
      console.error('⏰ api.ts: Request timeout:', timeoutMsg);
      throw new Error(timeoutMsg);
    }
    
    console.error('❌ api.ts: Network error:', error);
    throw error;
  }
};

// GET request helper
export const apiGet = async (endpoint: string, options?: RequestInit) => {
  console.log('🌐 api.ts: apiGet called with endpoint:', endpoint);
  try {
    const result = await apiCall(endpoint, { method: 'GET', ...options });
    console.log('✅ api.ts: apiGet successful for', endpoint);
    return result;
  } catch (error) {
    console.error('❌ api.ts: apiGet failed for', endpoint, error);
    throw error;
  }
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
