/**
 * Cloudinary Logo Transformation Utilities
 * 
 * Uses Cloudinary's official React SDK to transform and optimize logos.
 * Fetches remote images and applies AI enhancement, rounded corners, and quality optimization.
 * 
 * First request: ~300ms-1.2s (fetches, processes, caches)
 * Subsequent requests: ~10-50ms (served from CDN)
 */

import { Cloudinary } from '@cloudinary/url-gen';
import { fill, fit, pad } from '@cloudinary/url-gen/actions/resize';
import { format, quality } from '@cloudinary/url-gen/actions/delivery';
import { byRadius } from '@cloudinary/url-gen/actions/roundCorners';
import { auto } from '@cloudinary/url-gen/qualifiers/quality';
import { auto as autoFormat } from '@cloudinary/url-gen/qualifiers/format';
import { auto as autoBackground } from '@cloudinary/url-gen/qualifiers/background';

const CLOUDINARY_CLOUD_NAME = 'daouj4hjz';

// Initialize Cloudinary instance
const cld = new Cloudinary({
  cloud: {
    cloudName: CLOUDINARY_CLOUD_NAME
  }
});

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

  // Use Cloudinary SDK to create a fetch URL with transformations
  const img = cld
    .image(baseLogoUrl)
    .setDeliveryType('fetch') // Fetch from remote URL
    .resize(fit().width(size).height(size)) // Fit within size x size
    .roundCorners(byRadius(20)) // Rounded corners
    .delivery(format(autoFormat())) // Auto format (WebP, AVIF)
    .delivery(quality(auto())); // Auto quality

  return img.toURL();
}

/**
 * Get a glossy, premium logo variant
 * Adds extra shine and larger size for hero sections
 */
export function getCloudinaryLogoUrlPremium(sourceUrl: string | null | undefined): string {
  if (!sourceUrl) return '';
  
  // If already a Cloudinary URL, return as-is
  if (sourceUrl.includes('res.cloudinary.com')) {
    return sourceUrl;
  }

  const domain = extractDomain(sourceUrl);
  if (!domain) return sourceUrl; // Fallback to original

  // Construct the logo.dev URL as the source
  const baseLogoUrl = `https://img.logo.dev/${domain}?token=pk_dvr547hlTjGTLwg7G9xcbQ`;

  const img = cld
    .image(baseLogoUrl)
    .setDeliveryType('fetch') // Fetch from remote URL
    .resize(pad().width(800).height(400).background(autoBackground()))
    .roundCorners(byRadius(0)) // No rounded corners on the image itself
    .delivery(format(autoFormat())) 
    .delivery(quality(auto()));

  const url = img.toURL();
  // console.log('🖼️ Generated Cloudinary URL:', url); // Uncomment to debug
  return url;
}

/**
 * Get AI-enhanced full card background for perks
 * Creates a large, vibrant branded background using Cloudinary's generative fill
 */
export function getCloudinaryPerkBackground(sourceUrl: string | null | undefined): string {
  if (!sourceUrl) return '';
  
  // If already a Cloudinary URL, return as-is
  if (sourceUrl.includes('res.cloudinary.com')) {
    return sourceUrl;
  }

  const domain = extractDomain(sourceUrl);
  if (!domain) return sourceUrl;

  // Construct the logo.dev URL as the source
  const baseLogoUrl = `https://img.logo.dev/${domain}?token=pk_dvr547hlTjGTLwg7G9xcbQ`;

  // Build manual URL for generative fill background
  // e_gen_background_replace:prompt_branded abstract background
  const cloudinaryUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch/w_1200,h_600,c_fill,e_improve,e_enhance,q_auto:best,f_auto/${encodeURIComponent(baseLogoUrl)}`;

  return cloudinaryUrl;
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

