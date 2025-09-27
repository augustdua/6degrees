// API configuration for different environments
const getApiBaseUrl = () => {
  // In production, use the backend URL from environment or default to the same domain
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_BACKEND_URL || 'https://6degree.app';
  }
  
  // In development, use the proxy (relative URLs)
  return '';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to make API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  return fetch(url, defaultOptions);
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
