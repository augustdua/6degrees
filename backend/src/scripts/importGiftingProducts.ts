import { supabase } from '../config/supabase';
import fs from 'fs/promises';
import path from 'path';

type ShopifyVariant = {
  id?: number;
  price?: string | number | null;
  compare_at_price?: string | number | null;
  available?: boolean;
};

type ShopifyImage = {
  src?: string | null;
  position?: number | null;
};

type ShopifyProduct = {
  id: number;
  title?: string | null;
  handle?: string | null;
  body_html?: string | null;
  vendor?: string | null;
  product_type?: string | null;
  tags?: string[] | null;
  published_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  images?: ShopifyImage[] | null;
  variants?: ShopifyVariant[] | null;
};

function toNum(x: unknown): number | null {
  if (x === null || x === undefined) return null;
  const n = typeof x === 'number' ? x : Number(String(x));
  return Number.isFinite(n) ? n : null;
}

function pickPrimaryImageUrl(images: ShopifyImage[] | null | undefined): string | null {
  const list = Array.isArray(images) ? images : [];
  const sorted = [...list].sort((a, b) => (Number(a?.position || 999) - Number(b?.position || 999)));
  const src = sorted.find((i) => i?.src)?.src;
  return src ? String(src) : null;
}

function computePriceStats(variants: ShopifyVariant[] | null | undefined): {
  price_min: number | null;
  price_max: number | null;
  compare_at_price_min: number | null;
  compare_at_price_max: number | null;
} {
  const v = Array.isArray(variants) ? variants : [];
  const prices = v.map((x) => toNum(x?.price)).filter((n): n is number => typeof n === 'number');
  const caps = v.map((x) => toNum(x?.compare_at_price)).filter((n): n is number => typeof n === 'number');

  return {
    price_min: prices.length ? Math.min(...prices) : null,
    price_max: prices.length ? Math.max(...prices) : null,
    compare_at_price_min: caps.length ? Math.min(...caps) : null,
    compare_at_price_max: caps.length ? Math.max(...caps) : null,
  };
}

async function main() {
  const jsonPath =
    process.env.GIFTING_PRODUCTS_JSON ||
    path.resolve(process.cwd(), '..', 'ZaurqGifting', 'data', 'products.json');

  const raw = await fs.readFile(jsonPath, 'utf8');
  // Some exports include a UTF-8 BOM which breaks JSON.parse in Node.
  const cleaned = raw.replace(/^\uFEFF/, '');
  const parsed = JSON.parse(cleaned);
  const products: ShopifyProduct[] = Array.isArray(parsed) ? parsed : [];

  if (products.length === 0) {
    console.log('No products found in:', jsonPath);
    return;
  }

  const rows = products
    .filter((p) => p && typeof p.id === 'number')
    .map((p) => {
      const handle = String(p.handle || '').trim();
      const title = String(p.title || '').trim();
      if (!handle || !title) return null;

      const { price_min, price_max, compare_at_price_min, compare_at_price_max } = computePriceStats(p.variants);
      const primary_image_url = pickPrimaryImageUrl(p.images);

      return {
        shopify_product_id: p.id,
        handle,
        title,
        body_html: p.body_html ?? null,
        vendor: p.vendor ?? null,
        product_type: p.product_type ?? null,
        tags: Array.isArray(p.tags) ? p.tags : [],
        published_at: p.published_at ?? null,
        created_at: p.created_at ?? null,
        updated_at: p.updated_at ?? null,
        currency: 'INR',
        price_min,
        price_max,
        compare_at_price_min,
        compare_at_price_max,
        primary_image_url,
        images: Array.isArray(p.images) ? p.images : [],
        variants: Array.isArray(p.variants) ? p.variants : [],
        is_active: true,
      };
    })
    .filter(Boolean) as any[];

  console.log(`Preparing to upsert ${rows.length} gifting products from ${jsonPath}`);

  const chunkSize = 200;
  let upserted = 0;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error } = await supabase.from('gifting_products').upsert(chunk, { onConflict: 'shopify_product_id' });
    if (error) throw error;
    upserted += chunk.length;
    console.log(`Upserted ${upserted}/${rows.length}`);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error('Import failed:', e?.message || e);
  process.exit(1);
});


