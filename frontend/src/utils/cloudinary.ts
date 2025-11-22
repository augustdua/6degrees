/**
 * Cloudinary Logo Transformation Utilities
 * 
 * Transforms raw logo URLs (from Clearbit, logo.dev, etc.) into Cloudinary-upscaled,
 * polished versions with AI enhancement, rounded corners, and glossy effects.
 * 
 * First request: ~300ms-1.2s (fetches, processes, caches)
 * Subsequent requests: ~10-50ms (served from CDN)
 */

const CLOUDINARY_CLOUD_NAME = 'daouj4hjz';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch`;

/**
 * Extracts domain from various logo URL formats
 * Supports: logo.dev (preferred), Clearbit (legacy), direct URLs
 */
function extractDomain(logoUrl: string): string | null {
  if (!logoUrl) return null;

  // Match logo.dev (primary source): https://img.logo.dev/stripe.com?token=...
  const logoDevMatch = logoUrl.match(/(?:img\.)?logo\.dev\/([^?/]+)/);
  if (logoDevMatch) return logoDevMatch[1];

  // Match Clearbit (legacy): https://logo.clearbit.com/stripe.com
  const clearbitMatch = logoUrl.match(/logo\.clearbit\.com\/([^?/]+)/);
  if (clearbitMatch) return clearbitMatch[1];

  // For other URLs, try to extract hostname
  try {
    const url = new URL(logoUrl);
    return url.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Build Cloudinary transformation URL for a logo
 * 
 * Transformations applied:
 * - AI upscale (e_upscale) for crisp high-res logos
 * - Rounded corners (r_20)
 * - Padding (pad) with transparent background
 * - Auto format (f_auto) for optimal delivery
 * - Quality optimization (q_auto:best)
 * - Width constraint (w_400) for consistent sizing
 * 
 * @param sourceUrl - Original logo URL (Clearbit, logo.dev, or direct)
 * @param size - Target width in pixels (default: 400)
 * @returns Cloudinary-transformed URL or original if extraction fails
 */
export function getCloudinaryLogoUrl(sourceUrl: string | null | undefined, size: number = 400): string {
  if (!sourceUrl) return '';

  // If already a Cloudinary URL, return as-is
  if (sourceUrl.includes('res.cloudinary.com')) {
    return sourceUrl;
  }

  // Extract domain and rebuild as logo.dev URL (more reliable than Clearbit)
  const domain = extractDomain(sourceUrl);
  if (!domain) return sourceUrl; // Fallback to original if can't parse

  // Construct base logo URL (using logo.dev as source)
  const baseLogoUrl = `https://img.logo.dev/${domain}?token=pk_dvr547hlTjGTLwg7G9xcbQ`;

  // Build Cloudinary transformation URL
  // Transformations are applied left-to-right in the URL path
  const transformations = [
    'f_auto',           // Auto format (WebP, AVIF when supported)
    'q_auto:best',      // Best quality optimization
    `w_${size}`,        // Target width
    'c_pad',            // Pad to maintain aspect ratio
    'b_auto:white',     // White background for transparency
    'r_20',             // Rounded corners (20px radius)
    'e_upscale',        // AI upscale for crisp rendering
  ].join(',');

  return `${CLOUDINARY_BASE_URL}/${transformations}/${encodeURIComponent(baseLogoUrl)}`;
}

/**
 * Get a glossy, premium logo variant
 * Adds extra shine and larger size for hero sections
 */
export function getCloudinaryLogoUrlPremium(sourceUrl: string | null | undefined): string {
  if (!sourceUrl) return '';
  
  if (sourceUrl.includes('res.cloudinary.com')) {
    return sourceUrl;
  }

  const domain = extractDomain(sourceUrl);
  if (!domain) return sourceUrl;

  const baseLogoUrl = `https://img.logo.dev/${domain}?token=pk_dvr547hlTjGTLwg7G9xcbQ`;

  const transformations = [
    'f_auto',
    'q_auto:best',
    'w_600',            // Larger for hero sections
    'c_pad',
    'b_auto:white',
    'r_30',             // More rounded
    'e_upscale',
    'e_sharpen:100',    // Extra sharpness
  ].join(',');

  return `${CLOUDINARY_BASE_URL}/${transformations}/${encodeURIComponent(baseLogoUrl)}`;
}

/**
 * Batch pre-warm Cloudinary cache for a list of logos
 * Call this in deployment scripts to ensure instant loads for users
 * 
 * @param logoUrls - Array of raw logo URLs to pre-warm
 */
export async function prewarmCloudinaryLogos(logoUrls: string[]): Promise<void> {
  const uniqueUrls = [...new Set(logoUrls.filter(Boolean))];
  
  console.log(`Pre-warming ${uniqueUrls.length} logo transformations...`);
  
  const promises = uniqueUrls.map(async (url) => {
    const cloudinaryUrl = getCloudinaryLogoUrl(url);
    try {
      // Simple fetch triggers Cloudinary to process and cache
      await fetch(cloudinaryUrl, { method: 'HEAD' });
      console.log(`✓ Warmed: ${url}`);
    } catch (error) {
      console.warn(`✗ Failed to warm: ${url}`, error);
    }
  });

  await Promise.all(promises);
  console.log('Pre-warming complete!');
}

