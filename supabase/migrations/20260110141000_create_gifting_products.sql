-- Create gifting catalog tables (imported from ZaurqGifting dataset)

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.gifting_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shopify_product_id bigint UNIQUE NOT NULL,
  handle text UNIQUE NOT NULL,
  title text NOT NULL,
  body_html text,
  vendor text,
  product_type text,
  tags text[] DEFAULT '{}'::text[],
  published_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  currency text DEFAULT 'INR',
  price_min numeric,
  price_max numeric,
  compare_at_price_min numeric,
  compare_at_price_max numeric,
  primary_image_url text,
  images jsonb,
  variants jsonb,
  is_active boolean DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_gifting_products_title ON public.gifting_products(title);
CREATE INDEX IF NOT EXISTS idx_gifting_products_handle ON public.gifting_products(handle);
CREATE INDEX IF NOT EXISTS idx_gifting_products_is_active ON public.gifting_products(is_active);
CREATE INDEX IF NOT EXISTS idx_gifting_products_price_min ON public.gifting_products(price_min);

COMMENT ON TABLE public.gifting_products IS 'Imported gifting catalog (e.g. from Shopify export) used to power the Gifts page.';


