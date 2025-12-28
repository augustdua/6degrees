# Cloudinary Logo Integration

This document explains how we use Cloudinary to transform and enhance organization logos across the platform.

## Overview

All organization logos (from offers, requests, and user profiles) are automatically enhanced through Cloudinary's AI-powered transformations. This provides:

- **AI Upscaling** - Low-res logos become crisp and sharp
- **Consistent Sizing** - All logos normalized to optimal dimensions
- **Rounded Corners** - Professional, polished appearance
- **Glossy Effects** - Premium shine and depth
- **Format Optimization** - Auto-WebP/AVIF for faster loading
- **CDN Caching** - Near-instant delivery after first load

## How It Works

### 1. Source Logo URLs

Logos come from various sources:
- **logo.dev** (primary): `https://img.logo.dev/stripe.com?token=pk_dvr547hlTjGTLwg7G9xcbQ`
- **Legacy logo URLs** (auto-normalized): older data is normalized to `logo.dev` before transformations run
- **Direct URLs**: any image URL from `organizations.logo_url`

**Note**: We use `logo.dev` for better logo quality and reliability. Any legacy logo URLs are normalized to `logo.dev` before transformation.

### 2. Cloudinary Transformation

The `getCloudinaryLogoUrl()` helper function:

```typescript
import { getCloudinaryLogoUrl, getCloudinaryLogoUrlPremium } from '@/utils/cloudinary';

// Standard logo (400px, rounded)
const standardLogo = getCloudinaryLogoUrl(offer.target_logo_url);

// Premium logo (600px, extra glossy, for hero sections)
const premiumLogo = getCloudinaryLogoUrlPremium(offer.target_logo_url);
```

### 3. Transformations Applied

**Standard Transformation:**
- Width: 400px
- Rounded corners: 20px radius
- AI upscale
- Auto format (WebP/AVIF)
- Quality: auto:best

**Premium Transformation:**
- Width: 600px
- Rounded corners: 30px radius
- AI upscale + extra sharpening
- Auto format
- Quality: auto:best

### 4. Performance

| Load Type | Time |
|-----------|------|
| **First request** (uncached) | 300ms - 1.2s |
| **Subsequent requests** (CDN cached) | 10-50ms |
| **With pre-warming** | Always instant |

## Pre-warming the Cache

To ensure all logos load instantly from day one:

### Development
```bash
cd scripts
npx tsx prewarm-cloudinary-logos.ts
```

### Production
Add to your deployment pipeline:

```yaml
# Example: GitHub Actions
- name: Pre-warm Cloudinary logos
  run: npm run prewarm-logos
  env:
    SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
    SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
```

### What It Does
1. Fetches all active offers and requests from Supabase
2. Extracts unique logo URLs
3. Makes HEAD requests to Cloudinary transformation URLs
4. Cloudinary processes and caches each transformation
5. Future user requests are served from CDN instantly

## Implementation

### Frontend Components

The following components use Cloudinary-enhanced logos:

1. **Feed.tsx** - Offers tab
   - Premium logos in hero section
   - Larger sizing (h-28 md:h-32)
   - Glossy overlay effects
   - Hover scale animation

2. **Feed.tsx** - Requests tab
   - Premium logos in glass cards
   - Consistent sizing with offers
   - Indigo gradient backgrounds

3. **OfferDetailsModal.tsx** (future)
   - Full-size premium logos
   - Enhanced viewing experience

### Fallback Handling

All implementations include automatic fallback:

```typescript
<img
  src={getCloudinaryLogoUrlPremium(offer.target_logo_url)}
  alt={offer.target_organization}
  loading="lazy"
  onError={(e) => {
    // Fallback to original URL if Cloudinary fails
    (e.target as HTMLImageElement).src = offer.target_logo_url || '';
  }}
/>
```

## Cloudinary Configuration

**Cloud Name:** `dgz91z6co`

**Transformation URL Pattern:**
```
https://res.cloudinary.com/dgz91z6co/image/fetch/
  f_auto,q_auto:best,w_600,c_pad,b_auto:white,r_30,e_upscale,e_sharpen:100/
  https%3A%2F%2Fimg.logo.dev%2Fstripe.com%3Ftoken%3D...
```

## Monitoring

### Check Transformation Success
1. Open browser DevTools → Network tab
2. Filter by "cloudinary"
3. Check response status (200 = cached, CF-Cache-Status header)

### Check Cache Hit Rate
- Cloudinary Dashboard → Media Library → Usage
- Look for "Transformations" and "Bandwidth"
- High bandwidth with low transformations = good cache hit rate

## Troubleshooting

### Logo Not Loading
1. Check original URL is valid
2. Verify domain extraction in `extractDomain()`
3. Check Cloudinary dashboard for error logs
4. Verify logo.dev token is valid

### Slow First Load
- Expected! First transformation takes 300ms-1.2s
- Run pre-warming script to fix
- Check Cloudinary has enough transformation quota

### Logos Look Blurry
- Original source may be too low-res
- Try different source (logo.dev often better than Clearbit)
- Increase upscale parameters if needed

## Future Enhancements

- [ ] Add logo color extraction for dynamic gradients
- [ ] Implement logo background removal for transparency
- [ ] Add dark mode logo variants
- [ ] Cache transformation URLs in database for faster lookups
- [ ] Add logo quality scoring and auto-replacement suggestions

## Cost Optimization

Cloudinary free tier includes:
- 25 GB storage
- 25 GB bandwidth
- 25,000 transformations/month

Current usage (estimated):
- ~500 unique logos
- 2 transformations each = 1,000 transformations
- Each logo ~50KB after optimization
- Total bandwidth: ~2.5GB/month (well within limits)

Pre-warming ensures we use transformations once and rely on CDN cache.

