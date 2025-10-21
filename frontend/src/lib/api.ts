import { getSupabase } from './supabaseClient';

// Global auth token cache - updated by auth system
let cachedAuthToken: string = '';
let tokenExpiresAt: number = 0;

// Function to be called by auth system to update cached token
export const updateCachedAuthToken = (token: string, expiresAt?: number) => {
  cachedAuthToken = token;
  tokenExpiresAt = expiresAt || (Date.now() + 3600000); // Default 1 hour
};

// Function to clear cached token on sign out
export const clearCachedAuthToken = () => {
  cachedAuthToken = '';
  tokenExpiresAt = 0;
};

// API configuration for different environments
const getApiBaseUrl = () => {
  // In production, use the custom backend URL
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_BACKEND_URL || 'https://6degreesbackend-production.up.railway.app';
  }

  // In development, use the proxy (relative URLs)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Timeout wrapper for Supabase auth calls
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Get current auth token - uses cache first, fallback to Supabase if needed
async function getAuthToken(): Promise<string> {
  // First check cached token
  if (cachedAuthToken && tokenExpiresAt > Date.now()) {
    return cachedAuthToken;
  }

  // If no cached token or expired, check if we can get from Supabase
  try {
    const supabase = getSupabase();

    // Single attempt with timeout - don't retry here as auth system handles that
    const sessionResult = await withTimeout(
      supabase.auth.getSession(),
      2000, // 2 second timeout - shorter since this is fallback
      'Fallback getSession call'
    );

    const token = sessionResult.data?.session?.access_token ?? '';

    if (token) {
      // Update cache for future requests
      const expiresAt = sessionResult.data?.session?.expires_at;
      updateCachedAuthToken(token, expiresAt ? expiresAt * 1000 : undefined);
      return token;
    } else {
      return '';
    }
  } catch (error: any) {
    // If it's a refresh token error, clear the session
    if (error.message?.includes('refresh') || error.message?.includes('Refresh Token')) {
      console.error('Session expired - please log in again');
      const supabase = getSupabase();
      await supabase.auth.signOut().catch(console.error);
      clearCachedAuthToken();

      // Redirect to login if not already there
      if (!window.location.pathname.includes('/auth')) {
        window.location.href = '/auth?returnUrl=' + encodeURIComponent(window.location.pathname);
      }
    }

    return '';
  }
}

// Helper function to make authenticated API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  console.log(`🌐 API Call initiated: ${options.method || 'GET'} ${endpoint}`);
  console.log('Full URL:', url);
  console.log('Options:', options);

  // Get auth token with retry logic
  const token = await getAuthToken();
  console.log('Auth token retrieved:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN');

  // Build headers - avoid Content-Type for GET requests to minimize CORS preflight
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Only add Content-Type for non-GET requests
  const method = options.method || 'GET';
  if (method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  console.log('Request headers:', Object.fromEntries(headers.entries()));

  const defaultOptions: RequestInit = {
    ...options,
    method,
    mode: 'cors',
    credentials: 'omit', // Use 'omit' since we're using Bearer tokens, avoids credentialed CORS
    cache: 'no-store',
    headers,
  };

  // Dynamic timeout based on endpoint - avatar training needs longer
  const isAvatarTraining = endpoint.includes('/avatar/train') || endpoint.includes('/avatar/generate');
  const timeout = isAvatarTraining ? 180000 : 30000; // 3 minutes for avatar, 30s for others

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`⏰ Request timeout: ${method} ${endpoint} → Request timeout after ${timeout/1000} seconds`);
    controller.abort();
  }, timeout);

  let response: Response | null = null;

  try {
    console.log(`⬆️ Sending fetch request to ${url}...`);
    response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal,
    });

    console.log(`⬇️ Response received - Status: ${response.status} ${response.statusText}`);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    clearTimeout(timeoutId);

    const text = await response.text().catch(() => '');
    console.log('Raw response text:', text.substring(0, 500));

    if (!response.ok) {
      const errorMsg = `${method} ${endpoint} → ${response.status} ${text || response.statusText}`;
      console.error('❌ API error:', errorMsg);
      throw new Error(errorMsg);
    }

    const result = text ? JSON.parse(text) : null;
    console.log('✅ Parsed JSON result:', result);
    console.log('Result type:', typeof result);
    console.log('Result structure:', {
      hasSuccess: 'success' in (result || {}),
      hasTokens: 'tokens' in (result || {}),
      hasRoomUrl: 'roomUrl' in (result || {}),
      hasError: 'error' in (result || {})
    });
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    console.error('🔥 EXCEPTION in apiCall:');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Response object exists?', !!response);

    // If we received a response (even an error response), it's not a CORS/network issue
    if (response) {
      throw error;
    }

    // Only label as CORS/network issue if fetch itself failed (no response received)
    if (error.name === 'AbortError') {
      const timeoutMsg = `${method} ${endpoint} → Request timeout after ${timeout/1000} seconds`;
      console.error('⏰ Timeout:', timeoutMsg);
      throw new Error(timeoutMsg);
    }

    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      const corsMsg = `${method} ${endpoint} → Network error (possible CORS or connection issue)`;
      console.error('🚫 Network error:', corsMsg);
      throw new Error(corsMsg);
    }

    console.error('❌ API error:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
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

// PUT request helper
export const apiPut = async (endpoint: string, body?: any, options?: RequestInit) => {
  return apiCall(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
};

// DELETE request helper
export const apiDelete = async (endpoint: string, options?: RequestInit) => {
  return apiCall(endpoint, {
    method: 'DELETE',
    ...options,
  });
};

// Specific API endpoints
export const API_ENDPOINTS = {
  // Feed
  FEED_DATA: '/api/feed/data',
  FEED_STATS: '/api/feed/stats',

  // Bids
  BIDS: '/api/bids',
  BIDS_BY_ID: (id: string) => `/api/bids/${id}`,
  BIDS_LIKE: (id: string) => `/api/bids/${id}/like`,
  BIDS_CONTACT: (id: string) => `/api/bids/${id}/contact`,

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

  // Consultation
  CONSULTATION_START: '/api/consultation/start',
} as const;
