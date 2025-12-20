import { supabase } from '../config/supabase';

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
      id: 'req_gh_1',
      targetName: 'Engineering Leader (GitHub)',
      targetTitle: 'Director / VP Engineering',
      targetCompany: 'GitHub',
      linkedinUrl: 'https://www.linkedin.com/company/github/',
      // From public OG tests; good enough to validate UI.
      imageUrl:
        'https://media.licdn.com/dms/image/v2/C560BAQFmuLSyL1nlPA/company-logo_200_200/company-logo_200_200/0/1678231359043/github_logo?e=2147483647&v=beta&t=2RO1zjla4T-YiOqKS50e4sc9n8RAgnUqGqu0mcZp5fU',
      summary: 'AI-powered developer platform. We want to discuss distribution partnerships for developer tools.',
      why: 'We’re building a devtool and want feedback + potential partnership channels.',
    },
    {
      id: 'req_stripe_1',
      targetName: 'Partnerships (Stripe)',
      targetTitle: 'Partnerships / BD Lead',
      targetCompany: 'Stripe',
      linkedinUrl: 'https://www.linkedin.com/company/stripe/',
      imageUrl:
        'https://media.licdn.com/dms/image/v2/D560BAQE2ZfJyfn-VCg/company-logo_200_200/B56ZlyKwpUKIAI-/0/1758557047806/stripe_logo?e=2147483647&v=beta&t=En4Hm6NDGbDTYCoOQ0Ko5Ne2gylx0WRb0yL2GlOeXBQ',
      summary: 'Payments + billing infrastructure. We’re exploring a joint GTM for India-first SaaS.',
      why: 'Need a warm intro to validate a co-marketing / embedded payments idea.',
    },
    {
      id: 'req_nasa_1',
      targetName: 'Innovation / Partnerships (NASA)',
      targetTitle: 'Partnerships / Innovation Program',
      targetCompany: 'NASA',
      linkedinUrl: 'https://www.linkedin.com/company/nasa/',
      imageUrl:
        'https://media.licdn.com/dms/image/v2/C4D0BAQGRBHWCcaAqGg/company-logo_200_200/company-logo_200_200/0/1630507197379/nasa_logo?e=2147483647&v=beta&t=ie21MrZfryqBGnpiqx3lblpWFpcLLjKyiX8XWC_CXpI',
      summary: 'Space research + programs. We want to understand public datasets / partnerships.',
      why: 'Looking for the right person to guide us on publicly-available resources and partnership routes.',
    },
  ];

  await clearExistingDemoRequests();

  const now = Date.now();
  const rows = demo.map((r, idx) => ({
    community_id: communityId,
    user_id: userId,
    post_type: 'request',
    content: `Warm intro request: ${r.targetName}`,
    body: buildBody(r),
    tags: ['demo-request', 'request', 'network'],
    // Reuse external_url to store the primary target link for now.
    external_url: r.linkedinUrl,
    // Stagger created_at slightly for ordering.
    created_at: new Date(now - idx * 60_000).toISOString(),
    updated_at: new Date().toISOString(),
    is_deleted: false,
  }));

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


