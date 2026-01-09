type ApifyRunStatus = 'READY' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'TIMED-OUT' | 'ABORTED';

type ApifyRun = {
  id: string;
  status: ApifyRunStatus;
  defaultDatasetId?: string | null;
};

function apifyHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeJsonParse<T>(input: string | undefined | null): T | null {
  if (!input) return null;
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}

function getApifyConfig(): {
  token: string;
  actorId?: string;
  taskId?: string;
  baseInput?: Record<string, any>;
} {
  const token = String(process.env.APIFY_TOKEN || '').trim();
  const actorId = String(process.env.APIFY_LINKEDIN_ACTOR_ID || '').trim();
  const taskId = String(process.env.APIFY_LINKEDIN_TASK_ID || '').trim();

  if (!token) {
    throw new Error('APIFY_TOKEN is not configured');
  }
  if (!!actorId === !!taskId) {
    throw new Error('Configure exactly one of APIFY_LINKEDIN_ACTOR_ID or APIFY_LINKEDIN_TASK_ID');
  }

  const baseInput = safeJsonParse<Record<string, any>>(process.env.APIFY_LINKEDIN_INPUT_JSON) || undefined;

  return {
    token,
    actorId: actorId || undefined,
    taskId: taskId || undefined,
    baseInput,
  };
}

async function apifyPostRun(opts: {
  token: string;
  actorId?: string;
  taskId?: string;
  input: Record<string, any>;
}): Promise<ApifyRun> {
  const url = opts.actorId
    ? `https://api.apify.com/v2/acts/${opts.actorId}/runs`
    : `https://api.apify.com/v2/actor-tasks/${opts.taskId}/runs`;

  const resp = await fetch(url, {
    method: 'POST',
    headers: apifyHeaders(opts.token),
    body: JSON.stringify(opts.input),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(`Apify run start failed (${resp.status}): ${JSON.stringify(json)}`);
  }

  const run = (json as any)?.data as ApifyRun | undefined;
  if (!run?.id) {
    throw new Error('Apify did not return a run id');
  }
  return run;
}

async function apifyGetRun(token: string, runId: string): Promise<ApifyRun> {
  const url = `https://api.apify.com/v2/actor-runs/${encodeURIComponent(runId)}`;
  const resp = await fetch(url, { headers: apifyHeaders(token) });
  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(`Apify run fetch failed (${resp.status}): ${JSON.stringify(json)}`);
  }
  const run = (json as any)?.data as ApifyRun | undefined;
  if (!run?.id) throw new Error('Apify run fetch returned invalid payload');
  return run;
}

async function apifyDatasetItems(token: string, datasetId: string): Promise<any[]> {
  const all: any[] = [];
  let offset = 0;
  const limit = 200;
  while (true) {
    const url = new URL(`https://api.apify.com/v2/datasets/${encodeURIComponent(datasetId)}/items`);
    url.searchParams.set('format', 'json');
    url.searchParams.set('clean', 'true');
    url.searchParams.set('offset', String(offset));
    url.searchParams.set('limit', String(limit));

    const resp = await fetch(url.toString(), { headers: apifyHeaders(token) });
    const items = await resp.json().catch(() => null);
    if (!resp.ok) {
      throw new Error(`Apify dataset fetch failed (${resp.status}): ${JSON.stringify(items)}`);
    }
    if (!Array.isArray(items) || items.length === 0) break;
    all.push(...items);
    offset += items.length;
    if (items.length < limit) break;
  }
  return all;
}

export async function scrapeLinkedInProfilesViaApify(profileUrls: string[], opts?: { timeoutMs?: number }): Promise<any[]> {
  const { token, actorId, taskId, baseInput } = getApifyConfig();
  const timeoutMs = Math.max(30_000, Math.min(Number(opts?.timeoutMs || 180_000), 30 * 60_000));

  const input = {
    ...(baseInput || {}),
    profileUrls,
  };

  const run = await apifyPostRun({ token, actorId, taskId, input });

  const startedAt = Date.now();
  while (true) {
    const current = await apifyGetRun(token, run.id);
    if (current.status === 'SUCCEEDED') {
      const datasetId = current.defaultDatasetId;
      if (!datasetId) return [];
      return await apifyDatasetItems(token, datasetId);
    }
    if (current.status === 'FAILED' || current.status === 'ABORTED' || current.status === 'TIMED-OUT') {
      throw new Error(`Apify run ended with status=${current.status}`);
    }
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Apify run timed out after ${timeoutMs}ms`);
    }
    await sleep(4000);
  }
}


