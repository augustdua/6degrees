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
    // Use frontend URL for all share links
    // This ensures backward compatibility with existing links in the database
    return 'https://6degree.app';
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
