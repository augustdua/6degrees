import { supabase } from '../config/supabase';
import { fetchOpenGraph } from '@/utils/openGraph';

type DemoRequest = {
  id: string;
  targetName: string;
  targetTitle: string;
  targetCompany: string;
  linkedinUrl: string;
  imageUrl?: string;
  summary: string;
  why: string;
};

function cleanSummary(s: string | undefined, maxLen = 220): string {
  const raw = String(s || '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  return raw.length > maxLen ? raw.slice(0, maxLen).trimEnd() + '…' : raw;
}

function parseLinkedInTitle(title: string | undefined): { name: string; headline: string; company: string } {
  const t = String(title || '').replace(/\s+/g, ' ').trim();
  if (!t) return { name: 'LinkedIn Profile', headline: '', company: '' };
  const noSuffix = t.replace(/\s*\|\s*LinkedIn\s*$/i, '').trim();
  const parts = noSuffix.split(' - ');
  if (parts.length >= 2) {
    const name = parts[0].trim();
    const headline = parts.slice(1).join(' - ').trim();
    const atIdx = headline.toLowerCase().lastIndexOf(' at ');
    const company = atIdx >= 0 ? headline.slice(atIdx + 4).trim() : '';
    return { name, headline, company };
  }
  return { name: noSuffix, headline: '', company: '' };
}

async function getSystemUserId(): Promise<string> {
  const fromEnv = process.env.FORUM_SYSTEM_USER_ID;
  if (fromEnv) return fromEnv;

  const { data, error } = await supabase
    .from('users')
    .select('id')
    .order('created_at', { ascending: true })
    .limit(1)
    .single();

  if (error || !data?.id) {
    throw new Error('Could not determine a system user id. Set FORUM_SYSTEM_USER_ID in env.');
  }
  return data.id;
}

async function ensureCommunity(slug: string, name: string, description: string, icon: string, color: string): Promise<string> {
  const { data: existing, error: findErr } = await supabase
    .from('forum_communities')
    .select('id')
    .eq('slug', slug)
    .limit(1)
    .maybeSingle();

  if (!findErr && existing?.id) return existing.id;

  const { data: inserted, error: insertErr } = await supabase
    .from('forum_communities')
    .insert({ slug, name, description, icon, color })
    .select('id')
    .single();

  if (insertErr || !inserted?.id) {
    throw new Error(`Failed to create community '${slug}': ${String((insertErr as any)?.message || insertErr)}`);
  }
  return inserted.id;
}

function buildBody(req: DemoRequest): string {
  const meta = {
    target_name: req.targetName,
    target_title: req.targetTitle,
    target_company: req.targetCompany,
    linkedin_url: req.linkedinUrl,
    image_url: req.imageUrl || null,
    summary: req.summary,
  };

  // Keep metadata machine-readable but also readable as markdown.
  return [
    `<!--request_meta ${JSON.stringify(meta)} -->`,
    ``,
    `**Target**: ${req.targetName} — ${req.targetTitle} @ ${req.targetCompany}`,
    ``,
    `**LinkedIn**: ${req.linkedinUrl}`,
    ``,
    `**Profile summary**: ${req.summary}`,
    ``,
    `**Why I need the intro**: ${req.why}`,
    ``,
    `**What I’m looking for**: 15-min warm intro / coffee chat`,
  ].join('\n');
}

async function clearExistingDemoRequests() {
  // Best-effort cleanup to keep reruns idempotent.
  await supabase
    .from('forum_posts')
    .delete()
    .contains('tags', ['demo-request']);
}

async function main() {
  const userId = await getSystemUserId();
  const communityId = await ensureCommunity(
    'requests',
    'Requests',
    'Warm intro requests — ask the community for intros to specific people/companies.',
    '🤝',
    '#8B5CF6'
  );

  const demo: DemoRequest[] = [
    {
      id: 'req_1',
      targetName: 'Reid Hoffman',
      targetTitle: '',
      targetCompany: '',
      linkedinUrl: 'https://www.linkedin.com/in/reidhoffman/',
      imageUrl: '',
      summary: '',
      why: 'We’re building an AI product and want feedback + distribution learnings from scaled platforms.',
    },
    {
      id: 'req_2',
      targetName: 'Satya Nadella',
      targetTitle: '',
      targetCompany: '',
      linkedinUrl: 'https://www.linkedin.com/in/satyanadella/',
      imageUrl: '',
      summary: '',
      why: 'We want a warm intro for product feedback on enterprise AI workflows and distribution partnerships.',
    },
    {
      id: 'req_3',
      targetName: 'Guido van Rossum',
      targetTitle: '',
      targetCompany: '',
      linkedinUrl: 'https://www.linkedin.com/in/guido-van-rossum-4a0756/',
      imageUrl: '',
      summary: '',
      why: 'We’d love a warm intro to discuss engineering mentorship + feedback on developer UX.',
    },
  ];

  await clearExistingDemoRequests();

  const now = Date.now();
  const rows: any[] = [];

  for (let idx = 0; idx < demo.length; idx++) {
    const base = demo[idx];
    const og = await fetchOpenGraph(base.linkedinUrl, { timeoutMs: 9000, maxBytes: 2_000_000 });
    const parsed = parseLinkedInTitle(og.title);

    const enriched: DemoRequest = {
      ...base,
      targetName: parsed.name || base.targetName,
      targetTitle: parsed.headline || base.targetTitle,
      targetCompany: parsed.company || base.targetCompany,
      imageUrl: og.image || base.imageUrl,
      summary: cleanSummary(og.description) || base.summary,
    };

    rows.push({
      community_id: communityId,
      user_id: userId,
      post_type: 'request',
      content: `Warm intro request: ${enriched.targetName}`,
      body: buildBody(enriched),
      tags: ['demo-request', 'request', 'network'],
      external_url: enriched.linkedinUrl,
      created_at: new Date(now - idx * 60_000).toISOString(),
      updated_at: new Date().toISOString(),
      is_deleted: false,
    });
  }

  const { error } = await supabase.from('forum_posts').insert(rows as any);
  if (error) {
    throw new Error(`Failed inserting demo request posts: ${String((error as any)?.message || error)}`);
  }

  console.log(`Seeded ${rows.length} demo request posts into community 'requests'.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


