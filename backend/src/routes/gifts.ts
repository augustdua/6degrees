import { Router, Response } from 'express';
import { authenticate } from '../middleware/auth';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';

const router = Router();

// All gifts endpoints require auth (to keep catalog private to logged-in users for now).
router.use(authenticate);

/**
 * GET /api/gifts/products
 * Query:
 * - q: search query (matches title)
 * - limit: default 24, max 100
 * - offset: default 0, max 5000
 */
router.get('/products', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const q = typeof req.query?.q === 'string' ? req.query.q.trim() : '';
    const limitRaw = typeof req.query?.limit === 'string' ? Number(req.query.limit) : 24;
    const offsetRaw = typeof req.query?.offset === 'string' ? Number(req.query.offset) : 0;

    const limit = Math.min(Math.max(Number.isFinite(limitRaw) ? limitRaw : 24, 1), 100);
    const offset = Math.min(Math.max(Number.isFinite(offsetRaw) ? offsetRaw : 0, 0), 5000);

    let query = supabase
      .from('gifting_products')
      .select(
        'shopify_product_id, handle, title, vendor, tags, price_min, price_max, compare_at_price_min, compare_at_price_max, currency, primary_image_url',
      )
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (q) {
      query = query.ilike('title', `%${q}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    res.json({
      ok: true,
      q,
      limit,
      offset,
      products: data || [],
    });
  } catch (error: any) {
    console.error('Error in GET /api/gifts/products:', error);
    res.status(500).json({ ok: false, error: error?.message || 'Internal server error' });
  }
});

export default router;


