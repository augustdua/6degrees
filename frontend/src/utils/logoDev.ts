/**
 * Logo.dev URL helpers
 *
 * We fetch logos directly from logo.dev (no Cloudinary proxy).
 * Input can be:
 * - a domain: "stripe.com"
 * - a logo.dev URL: "https://img.logo.dev/stripe.com?token=..."
 * - a legacy logo URL (historically used in older data): "https://logo.clearbit.com/stripe.com"
 * - any website/image URL: "https://www.stripe.com"
 */
const DEFAULT_LOGO_DEV_TOKEN = 'pk_dvr547hlTjGTLwg7G9xcbQ';

function extractDomain(input: string): string | null {
  if (!input) return null;

  // logo.dev
  const logoDevMatch = input.match(/(?:img\.)?logo\.dev\/([^?/]+)/i);
  if (logoDevMatch?.[1]) return logoDevMatch[1];

  // legacy host (some older records may still use this host)
  const clearbitMatch = input.match(/logo\.clearbit\.com\/([^?/]+)/i);
  if (clearbitMatch?.[1]) return clearbitMatch[1];

  // domain-only (no scheme)
  if (!input.includes('://') && input.includes('.')) {
    return input.replace(/^www\./i, '').trim();
  }

  // generic URL -> hostname
  try {
    const url = new URL(input);
    return url.hostname.replace(/^www\./i, '');
  } catch {
    return null;
  }
}

export function getLogoDevUrl(input: string | null | undefined, token: string = DEFAULT_LOGO_DEV_TOKEN): string {
  if (!input) return '';
  const domain = extractDomain(input);
  if (!domain) return input; // best-effort fallback
  return `https://img.logo.dev/${domain}?token=${token}`;
}


