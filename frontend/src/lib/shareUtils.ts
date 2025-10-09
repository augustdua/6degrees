/**
 * Utility functions for generating shareable links
 */

/**
 * Get the base URL for shareable links
 * In production, use the backend URL so social media crawlers can see OG tags
 * In development, use the current origin
 */
export function getShareBaseUrl(): string {
  const isProd = import.meta.env.PROD;

  if (isProd) {
    // Use backend URL in production for OG tag support
    return import.meta.env.VITE_BACKEND_URL || 'https://6degreesbackend-production.up.railway.app';
  }

  // Use current origin in development
  return window.location.origin;
}

/**
 * Generate a shareable link for a given linkId
 * This ensures social media crawlers can properly fetch OG images
 */
export function generateShareableLink(linkId: string): string {
  return `${getShareBaseUrl()}/r/${linkId}`;
}
