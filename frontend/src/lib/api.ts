import { getSupabase } from './supabaseClient';

// Production-safe logging - only log in development
const isDev = import.meta.env.DEV;
const log = (...args: any[]) => isDev && console.log(...args);
const warn = (...args: any[]) => isDev && console.warn(...args);

// Request cache for GET requests - prevents duplicate fetches
interface CacheEntry {
  data: any;
  timestamp: number;
  promise?: Promise<any>;
}
const requestCache = new Map<string, CacheEntry>();
const CACHE_TTL = 30000; // 30 seconds cache
const inFlightRequests = new Map<string, Promise<any>>();

// Clean expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of requestCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL) {
      requestCache.delete(key);
    }
  }
}, 60000);

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

// Prevent concurrent getSession calls
let getSessionPromise: Promise<string> | null = null;

// Get current auth token - uses cache first, fallback to Supabase if needed
async function getAuthToken(): Promise<string> {
  // First check cached token
  if (cachedAuthToken && tokenExpiresAt > Date.now()) {
    // #region agent log
    // Disabled: local debug ingest causes Chrome "local network request blocked" warnings in production.
    // #endregion agent log
    return cachedAuthToken;
  }

  // If there's already a getSession in progress, wait for it
  if (getSessionPromise) {
    // #region agent log
    // Disabled: local debug ingest causes Chrome "local network request blocked" warnings in production.
    // #endregion agent log
    return getSessionPromise;
  }

  // If no cached token or expired, check if we can get from Supabase
  getSessionPromise = (async () => {
    try {
      const supabase = getSupabase();

      // Single attempt with timeout - don't retry here as auth system handles that
      const sessionResult = await withTimeout(
        supabase.auth.getSession(),
        3000, // 3 second timeout
        'Fallback getSession call'
      );

      const token = sessionResult.data?.session?.access_token ?? '';
      // #region agent log
      // Disabled: local debug ingest causes Chrome "local network request blocked" warnings in production.
      // #endregion agent log

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
    } finally {
      getSessionPromise = null;
    }
  })();

  return getSessionPromise;
}

// Helper function to make authenticated API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;

  log(`🌐 API Call: ${options.method || 'GET'} ${endpoint}`);

  // Get auth token with retry logic
  const token = await getAuthToken();

  // Build headers - avoid Content-Type for GET requests to minimize CORS preflight
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  // #region agent log
  // Disabled: local debug ingest causes Chrome "local network request blocked" warnings in production.
  // #endregion agent log

  // Only add Content-Type for non-GET requests
  const method = options.method || 'GET';
  if (method !== 'GET' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const defaultOptions: RequestInit = {
    ...options,
    method,
    mode: 'cors',
    credentials: 'omit',
    cache: 'no-store',
    headers,
  };

  // Dynamic timeout based on endpoint - avatar training needs longer
  const isAvatarTraining = endpoint.includes('/avatar/train') || endpoint.includes('/avatar/generate');
  const timeout = isAvatarTraining ? 180000 : 30000;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    warn(`Request timeout: ${method} ${endpoint}`);
    controller.abort();
  }, timeout);

  let response: Response | null = null;

  try {
    response = await fetch(url, {
      ...defaultOptions,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const text = await response.text().catch(() => '');
    // #region agent log
    // Disabled: local debug ingest causes Chrome "local network request blocked" warnings in production.
    // #endregion agent log

    if (!response.ok) {
      const errorMsg = `${method} ${endpoint} → ${response.status} ${text || response.statusText}`;
      throw new Error(errorMsg);
    }

    const result = text ? JSON.parse(text) : null;
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // If we received a response (even an error response), it's not a CORS/network issue
    if (response) {
      throw error;
    }

    // Only label as CORS/network issue if fetch itself failed (no response received)
    if (error.name === 'AbortError') {
      const timeoutMsg = `${method} ${endpoint} → Request timeout after ${timeout/1000} seconds`;
      throw new Error(timeoutMsg);
    }

    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
      const corsMsg = `${method} ${endpoint} → Network error (possible CORS or connection issue)`;
      throw new Error(corsMsg);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
};

// GET request helper with caching and deduplication
export const apiGet = async (endpoint: string, options?: RequestInit & { skipCache?: boolean }) => {
  const cacheKey = endpoint;
  
  // Skip cache for explicit requests
  if (!options?.skipCache) {
    // Check if we have a valid cached response
    const cached = requestCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      log(`📦 Cache hit: ${endpoint}`);
      return cached.data;
    }
    
    // Check if there's already an in-flight request for this endpoint
    const inFlight = inFlightRequests.get(cacheKey);
    if (inFlight) {
      log(`⏳ Dedup: ${endpoint}`);
      return inFlight;
    }
  }
  
  // Make the actual request
  const requestPromise = apiCall(endpoint, { method: 'GET', ...options })
    .then(data => {
      // Cache successful responses
      requestCache.set(cacheKey, { data, timestamp: Date.now() });
      inFlightRequests.delete(cacheKey);
      return data;
    })
    .catch(err => {
      inFlightRequests.delete(cacheKey);
      throw err;
    });
  
  inFlightRequests.set(cacheKey, requestPromise);
  return requestPromise;
};

// Invalidate cache for specific endpoint or pattern
export const invalidateCache = (pattern?: string) => {
  if (!pattern) {
    requestCache.clear();
  } else {
    for (const key of requestCache.keys()) {
      if (key.includes(pattern)) {
        requestCache.delete(key);
      }
    }
  }
};

// POST request helper - invalidates related cache
export const apiPost = async (endpoint: string, body?: any, options?: RequestInit) => {
  const result = await apiCall(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
  // Invalidate cache for the resource type
  const resourceType = endpoint.split('/')[2]; // e.g., /api/offers/... -> offers
  if (resourceType) invalidateCache(resourceType);
  return result;
};

// PUT request helper - invalidates related cache
export const apiPut = async (endpoint: string, body?: any, options?: RequestInit) => {
  const result = await apiCall(endpoint, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
    ...options,
  });
  const resourceType = endpoint.split('/')[2];
  if (resourceType) invalidateCache(resourceType);
  return result;
};

// DELETE request helper - invalidates related cache
export const apiDelete = async (endpoint: string, options?: RequestInit) => {
  const result = await apiCall(endpoint, {
    method: 'DELETE',
    ...options,
  });
  const resourceType = endpoint.split('/')[2];
  if (resourceType) invalidateCache(resourceType);
  return result;
};

// Upload file helper - for multipart/form-data uploads
export const apiUpload = async (endpoint: string, formData: FormData): Promise<any> => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  log(`📤 API Upload: POST ${endpoint}`);
  
  // Get auth token with timeout protection
  const token = await getAuthToken();
  
  if (!token) {
    throw new Error('Not authenticated. Please log in again.');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    warn(`Upload timeout: ${endpoint}`);
    controller.abort();
  }, 60000); // 60 second timeout for uploads

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
        // Don't set Content-Type - browser will set it with boundary for FormData
      },
      body: formData,
      signal: controller.signal,
      mode: 'cors',
      credentials: 'omit'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Invalidate cache for the resource type
    const resourceType = endpoint.split('/')[2];
    if (resourceType) invalidateCache(resourceType);
    
    return data;
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Upload timed out. Please try again.');
    }
    throw error;
  }
};

// Specific API endpoints
export const API_ENDPOINTS = {
  // Feed
  FEED_DATA: '/api/feed/data',
  FEED_STATS: '/api/feed/stats',

  // Daily standup unlock
  DAILY_STANDUP_STATUS: '/api/daily-standup/status',
  DAILY_STANDUP_SUBMIT: '/api/daily-standup/submit',
  DAILY_STANDUP_HISTORY: '/api/daily-standup/history',

  // News
  NEWS: '/api/news',

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

  // Users & People Discovery
  USERS_DISCOVER: '/api/users/discover',
  USERS_COUNT: '/api/users/count',
  PROFILE: '/api/profile',

  // Requests & Chains
  REQUESTS: '/api/requests',
  REQUESTS_MY_CHAINS: '/api/requests/my-chains',
  SEND_CONNECTION_REQUEST: '/api/connections/send-request',
  CONNECTION_REQUESTS: '/api/connections/requests',

  // Connections
  CONNECTIONS: '/api/connections',

  // Messages
  MESSAGES_CONVERSATIONS: '/api/messages/conversations',
  MESSAGES_CONVERSATION: '/api/messages/conversation',
  MESSAGES_SEND: '/api/messages/send',
  MESSAGES_MARK_READ: '/api/messages/mark-read',

  // Notifications
  NOTIFICATION_COUNTS: '/api/notifications/counts',

  // Invites
  INVITES_NOTIFICATIONS: '/api/invites/notifications',

  // Offers
  OFFERS: '/api/offers',
} as const;
