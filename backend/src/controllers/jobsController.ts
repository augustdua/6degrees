import { Response } from 'express';
import crypto from 'crypto';
import { supabase } from '../config/supabase';
import { AuthenticatedRequest } from '../types';
import { generateMarketResearchReport } from '../services/marketResearchService';
import { generateMarketGapsReport } from '../services/marketGapsService';

function slugKey(input: string): string {
  const s = (input || '').trim().toLowerCase();
  const compact = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (compact && compact.length >= 6) return compact.slice(0, 64);
  return crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
}

function requireCronSecret(req: AuthenticatedRequest): string | null {
  const expected = (process.env.CRON_SECRET || '').trim();
  if (!expected) return null;
  const provided = String(req.header('x-cron-secret') || req.query?.cron_secret || '').trim();
  if (!provided || provided !== expected) return null;
  return expected;
}

async function getCommunityIdBySlug(slug: string): Promise<string | null> {
  const { data } = await supabase.from('forum_communities').select('id').eq('slug', slug).single();
  return data?.id || null;
}

async function postExistsByTag(communityId: string, tag: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('id')
    .eq('community_id', communityId)
    .contains('tags', [tag])
    .eq('is_deleted', false)
    .limit(1);
  if (error) return false;
  return Array.isArray(data) && data.length > 0;
}

export const runDailyMarketResearch = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireCronSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const communityId = await getCommunityIdBySlug('market-research');
    if (!communityId) {
      res.status(500).json({ error: 'market-research community not found' });
      return;
    }

    const systemUserId = (process.env.SYSTEM_USER_ID || '').trim();
    if (!systemUserId) {
      res.status(500).json({ error: 'SYSTEM_USER_ID missing' });
      return;
    }

    const { data: topics, error } = await supabase
      .from('market_research_topics')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false })
      .limit(50);

    if (error || !Array.isArray(topics) || topics.length === 0) {
      res.status(200).json({ ok: true, skipped: true, reason: 'no_active_topics' });
      return;
    }

    // Pick oldest last_generated_at first (nulls first).
    const sorted = [...topics].sort((a: any, b: any) => {
      const at = a.last_generated_at ? new Date(a.last_generated_at).getTime() : -1;
      const bt = b.last_generated_at ? new Date(b.last_generated_at).getTime() : -1;
      return at - bt;
    });

    for (const row of sorted.slice(0, 10)) {
      const topic = String(row.topic || '').trim();
      if (!topic) continue;
      const topicKey = String(row.topic_key || '').trim() || slugKey(topic);
      const tag = `mr:${topicKey}`;

      const exists = await postExistsByTag(communityId, tag);
      if (exists) {
        continue;
      }

      const out = await generateMarketResearchReport({ topic, debug: true });

      const { data: post, error: postErr } = await supabase
        .from('forum_posts')
        .insert({
          community_id: communityId,
          user_id: systemUserId,
          content: out.preview,
          body: out.markdown,
          post_type: 'research_report',
          tags: [tag, 'auto'],
        })
        .select('id')
        .single();

      if (postErr) {
        res.status(500).json({ error: 'failed_to_publish', details: String(postErr.message || postErr) });
        return;
      }

      await supabase
        .from('market_research_topics')
        .update({ topic_key: topicKey, last_generated_at: new Date().toISOString() })
        .eq('id', row.id);

      res.status(200).json({ ok: true, topic, topic_key: topicKey, post_id: post.id, run: out.artifacts?.run_id });
      return;
    }

    res.status(200).json({ ok: true, skipped: true, reason: 'all_recent_or_existing' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};

export const runDailyMarketGaps = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!requireCronSecret(req)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const communityId = await getCommunityIdBySlug('market-gaps');
    if (!communityId) {
      res.status(500).json({ error: 'market-gaps community not found' });
      return;
    }

    const systemUserId = (process.env.SYSTEM_USER_ID || '').trim();
    if (!systemUserId) {
      res.status(500).json({ error: 'SYSTEM_USER_ID missing' });
      return;
    }

    const { data: cats, error } = await supabase
      .from('market_gap_categories')
      .select('*')
      .eq('active', true)
      .order('priority', { ascending: false })
      .limit(50);

    if (error || !Array.isArray(cats) || cats.length === 0) {
      res.status(200).json({ ok: true, skipped: true, reason: 'no_active_categories' });
      return;
    }

    const sorted = [...cats].sort((a: any, b: any) => {
      const at = a.last_generated_at ? new Date(a.last_generated_at).getTime() : -1;
      const bt = b.last_generated_at ? new Date(b.last_generated_at).getTime() : -1;
      return at - bt;
    });

    for (const row of sorted.slice(0, 10)) {
      const category = String(row.category || '').trim();
      if (!category) continue;
      const categoryKey = String(row.category_key || '').trim() || slugKey(category);
      const tag = `mg:${categoryKey}`;

      const exists = await postExistsByTag(communityId, tag);
      if (exists) continue;

      const brands: string[] = Array.isArray(row.brand_set) ? row.brand_set.map((x: any) => String(x || '').trim()).filter(Boolean) : [];
      if (brands.length === 0) continue;

      const out = await generateMarketGapsReport({
        category,
        brands,
        countryContext: row.country_context || 'India',
        timeHorizon: '12-24 months',
        debug: true,
      });

      const { data: post, error: postErr } = await supabase
        .from('forum_posts')
        .insert({
          community_id: communityId,
          user_id: systemUserId,
          content: out.preview,
          body: out.markdown,
          post_type: 'market-gap',
          tags: [tag, 'auto'],
        })
        .select('id')
        .single();

      if (postErr) {
        res.status(500).json({ error: 'failed_to_publish', details: String(postErr.message || postErr) });
        return;
      }

      await supabase
        .from('market_gap_categories')
        .update({ category_key: categoryKey, last_generated_at: new Date().toISOString() })
        .eq('id', row.id);

      res.status(200).json({ ok: true, category, category_key: categoryKey, post_id: post.id, run: out.artifacts?.run_id });
      return;
    }

    res.status(200).json({ ok: true, skipped: true, reason: 'all_recent_or_existing' });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || String(e) });
  }
};



