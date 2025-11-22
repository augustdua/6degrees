/**
 * Pre-warm Cloudinary Logo Cache
 * 
 * This script fetches all logo URLs from offers and requests,
 * then makes HEAD requests to Cloudinary to trigger transformation
 * and caching. Run this after deployment or when adding new logos.
 * 
 * Usage:
 *   npx tsx scripts/prewarm-cloudinary-logos.ts
 * 
 * Or add to package.json:
 *   "prewarm-logos": "tsx scripts/prewarm-cloudinary-logos.ts"
 */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const CLOUDINARY_CLOUD_NAME = 'dgz91z6co';
const CLOUDINARY_BASE_URL = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/fetch`;

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * Extract domain from logo URL
 */
function extractDomain(logoUrl: string): string | null {
  if (!logoUrl) return null;

  const clearbitMatch = logoUrl.match(/logo\.clearbit\.com\/([^?/]+)/);
  if (clearbitMatch) return clearbitMatch[1];

  const logoDevMatch = logoUrl.match(/logo\.dev\/([^?/]+)/);
  if (logoDevMatch) return logoDevMatch[1];

  try {
    const url = new URL(logoUrl);
    return url.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Build Cloudinary transformation URLs
 */
function getCloudinaryUrls(sourceUrl: string): string[] {
  if (!sourceUrl) return [];
  if (sourceUrl.includes('res.cloudinary.com')) return [];

  const domain = extractDomain(sourceUrl);
  if (!domain) return [];

  const baseLogoUrl = `https://img.logo.dev/${domain}?token=pk_dvr547hlTjGTLwg7G9xcbQ`;

  // Standard transformation
  const standardTransform = [
    'f_auto',
    'q_auto:best',
    'w_400',
    'c_pad',
    'b_auto:white',
    'r_20',
    'e_upscale',
  ].join(',');

  // Premium transformation
  const premiumTransform = [
    'f_auto',
    'q_auto:best',
    'w_600',
    'c_pad',
    'b_auto:white',
    'r_30',
    'e_upscale',
    'e_sharpen:100',
  ].join(',');

  return [
    `${CLOUDINARY_BASE_URL}/${standardTransform}/${encodeURIComponent(baseLogoUrl)}`,
    `${CLOUDINARY_BASE_URL}/${premiumTransform}/${encodeURIComponent(baseLogoUrl)}`
  ];
}

/**
 * Fetch and pre-warm a logo URL
 */
async function prewarmUrl(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    console.error(`Failed to prewarm: ${url}`, error);
    return false;
  }
}

/**
 * Main pre-warming logic
 */
async function main() {
  console.log('🔥 Starting Cloudinary logo pre-warming...\n');

  // Fetch all offer logos
  const { data: offers, error: offersError } = await supabase
    .from('offers')
    .select('target_logo_url')
    .eq('status', 'active')
    .not('target_logo_url', 'is', null);

  if (offersError) {
    console.error('Error fetching offers:', offersError);
    process.exit(1);
  }

  // Fetch all request logos
  const { data: requests, error: requestsError } = await supabase
    .from('chains')
    .select('target_organization_logo')
    .eq('status', 'active')
    .not('target_organization_logo', 'is', null);

  if (requestsError) {
    console.error('Error fetching requests:', requestsError);
    process.exit(1);
  }

  // Collect all unique logo URLs
  const offerLogos = (offers || [])
    .map((o: any) => o.target_logo_url)
    .filter(Boolean);

  const requestLogos = (requests || [])
    .map((r: any) => r.target_organization_logo)
    .filter(Boolean);

  const allLogos = [...new Set([...offerLogos, ...requestLogos])];

  console.log(`📊 Found ${allLogos.length} unique logos to pre-warm`);
  console.log(`   - ${offerLogos.length} from offers`);
  console.log(`   - ${requestLogos.length} from requests\n`);

  // Generate all Cloudinary URLs (standard + premium for each logo)
  const cloudinaryUrls: string[] = [];
  for (const logo of allLogos) {
    cloudinaryUrls.push(...getCloudinaryUrls(logo));
  }

  console.log(`🔗 Generated ${cloudinaryUrls.length} Cloudinary transformation URLs\n`);

  // Pre-warm in batches of 10 to avoid overwhelming the API
  const batchSize = 10;
  let successful = 0;
  let failed = 0;

  for (let i = 0; i < cloudinaryUrls.length; i += batchSize) {
    const batch = cloudinaryUrls.slice(i, i + batchSize);
    const results = await Promise.all(batch.map(prewarmUrl));
    
    successful += results.filter(Boolean).length;
    failed += results.filter(r => !r).length;

    const progress = Math.min(i + batchSize, cloudinaryUrls.length);
    console.log(`⏳ Progress: ${progress}/${cloudinaryUrls.length} (${successful} ✓, ${failed} ✗)`);
  }

  console.log('\n✅ Pre-warming complete!');
  console.log(`   - Successful: ${successful}`);
  console.log(`   - Failed: ${failed}`);
  console.log('\n💡 All logos should now load instantly for users.');
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

