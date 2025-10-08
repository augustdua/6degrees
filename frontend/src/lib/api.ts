import { getSupabase } from './supabaseClient';

// Global auth token cache - updated by auth system
let cachedAuthToken: string = '';
let tokenExpiresAt: number = 0;

// Function to be called by auth system to update cached token
export const updateCachedAuthToken = (token: string, expiresAt?: number) => {
  cachedAuthToken = token;
  tokenExpiresAt = expiresAt || (Date.now() + 3600000); // Default 1 hour
  console.log('🔐 api.ts: Auth token cache updated', { hasToken: !!token, expiresAt: new Date(tokenExpiresAt) });
};

// Function to clear cached token on sign out
export const clearCachedAuthToken = () => {
  cachedAuthToken = '';
  tokenExpiresAt = 0;
  console.log('🔐 api.ts: Auth token cache cleared');
};

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
  console.log('🔐 api.ts: Starting getAuthToken()');

  // First check cached token
  if (cachedAuthToken && tokenExpiresAt > Date.now()) {
    console.log('🔐 api.ts: Using cached auth token');
    return cachedAuthToken;
  }

  // If no cached token or expired, check if we can get from Supabase
  console.log('🔐 api.ts: No cached token, checking Supabase session');

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
      console.log('🔐 api.ts: Got token from Supabase fallback');
      // Update cache for future requests
      const expiresAt = sessionResult.data?.session?.expires_at;
      updateCachedAuthToken(token, expiresAt ? expiresAt * 1000 : undefined);
      return token;
    } else {
      console.log('🔐 api.ts: No token available from Supabase');
      return '';
    }
  } catch (error: any) {
    console.warn('⚠️ api.ts: Fallback getSession failed:', error.message);

    // If it's a refresh token error, clear the session
    if (error.message?.includes('refresh') || error.message?.includes('Refresh Token')) {
      console.error('🔴 api.ts: Refresh token error detected - clearing session');
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
  console.log('🌐 api.ts: Making request to:', url);

  // Get auth token with retry logic
  const token = await getAuthToken();

  // Build headers - avoid Content-Type for GET requests to minimize CORS preflight
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
    console.log('🔐 api.ts: Added Authorization header');
  } else {
    console.warn('⚠️ api.ts: No auth token available');
  }

  // Only add Content-Type for non-GET requests
  const method = options.method || 'GET';
  if (method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const defaultOptions: RequestInit = {
    ...options,
    method,
    mode: 'cors',
    credentials: 'omit', // Use 'omit' since we're using Bearer tokens, avoids credentialed CORS
    cache: 'no-store',
    headers,
  };

  console.log('⚙️ api.ts: Request options:', {
    method: defaultOptions.method,
    credentials: defaultOptions.credentials,
    headers: Object.fromEntries(headers.entries())
  });

  // Add timeout handling - increased to 15s to handle CORS preflight delays
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn('⏰ api.ts: Request timeout after 15 seconds');
    controller.abort();
  }, 15000); // 15 second timeout

  let response: Response | null = null;

  try {
    console.log('🚀 api.ts: Starting fetch request...');
    console.log('🚀 api.ts: Request URL:', url);
    console.log('🚀 api.ts: Request method:', method);

    response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log('📡 api.ts: Response received! Status:', response.status, response.statusText);

    const text = await response.text().catch(() => '');
    console.log('📄 api.ts: Response text length:', text.length);

    if (!response.ok) {
      const errorMsg = `${method} ${endpoint} → ${response.status} ${text || response.statusText}`;
      console.error('❌ api.ts: Request failed:', errorMsg);
      throw new Error(errorMsg);
    }

    const result = text ? JSON.parse(text) : null;
    console.log('✅ api.ts: Parsed result type:', typeof result, 'length:', Array.isArray(result) ? result.length : 'N/A');
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // If we received a response (even an error response), it's not a CORS/network issue
    if (response) {
      console.error('❌ api.ts: HTTP error:', error);
      throw error;
    }

    // Only label as CORS/network issue if fetch itself failed (no response received)
    if (error.name === 'AbortError') {
      const timeoutMsg = `${method} ${endpoint} → Request timeout after 15 seconds`;
      console.error('⏰ api.ts: Request timeout:', timeoutMsg);
      throw new Error(timeoutMsg);
    }

    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      const corsMsg = `${method} ${endpoint} → Network error (possible CORS or connection issue)`;
      console.error('🚫 api.ts: CORS/Network error:', corsMsg);
      throw new Error(corsMsg);
    }

    console.error('❌ api.ts: Network error:', error);
    throw error;
  } finally {
    clearTimeout(timeoutId);
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
} as const;
