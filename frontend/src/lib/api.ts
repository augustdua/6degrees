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

// Timeout wrapper for Supabase auth calls
async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, operation: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs)
    )
  ]);
}

// Get current Supabase access token with retry logic for auth rehydration
async function getAuthToken(): Promise<string> {
  const supabase = getSupabase();
  console.log('🔐 api.ts: Starting getAuthToken()');

  try {
    // Try to get session with timeout, retry a few times if empty (auth rehydration timing)
    let sessionData: any = null;

    for (let i = 0; i < 3; i++) {
      try {
        console.log(`🔄 api.ts: Getting session, attempt ${i + 1}/3`);
        const sessionResult = await withTimeout(
          supabase.auth.getSession(),
          3000, // 3 second timeout per attempt
          `getSession attempt ${i + 1}`
        );
        sessionData = sessionResult.data;

        if (sessionData?.session?.access_token) {
          console.log(`🔐 api.ts: Token found on attempt ${i + 1}`);
          break;
        } else {
          console.log(`🔄 api.ts: No token on attempt ${i + 1}, retrying...`);
          if (i < 2) await new Promise(r => setTimeout(r, 150));
        }
      } catch (error: any) {
        console.warn(`⚠️ api.ts: getSession attempt ${i + 1} failed:`, error.message);
        if (i === 2) break; // Don't retry on last attempt
        await new Promise(r => setTimeout(r, 150));
      }
    }

    const token = sessionData?.session?.access_token ?? '';
    console.log(`🔐 api.ts: Final token result: ${token ? 'found' : 'not found'}`);
    return token;
  } catch (error: any) {
    console.error('❌ api.ts: getAuthToken failed:', error.message);
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

  try {
    console.log('🚀 api.ts: Starting fetch request...');
    console.log('🚀 api.ts: Request URL:', url);
    console.log('🚀 api.ts: Request method:', method);

    const response = await fetch(url, {
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

    if (error.name === 'AbortError') {
      const timeoutMsg = `${method} ${endpoint} → Request timeout after 15 seconds (likely CORS preflight stall)`;
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
