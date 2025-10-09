/**
 * Utility functions for generating shareable links
 */

/**
 * Get the base URL for shareable links
 * Always use frontend URL for compatibility with existing links
 * For social media OG tags to work, need to configure domain routing
 */
export function getShareBaseUrl(): string {
  if (import.meta.env.PROD) {
    // In production, use backend domain so crawlers receive server-rendered OG tags
    // Prefer env override, fallback to Railway backend URL
    const fromEnv = import.meta.env.VITE_BACKEND_URL as string | undefined;
    return fromEnv || 'https://6degreesbackend-production.up.railway.app';
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
