type OpenGraphResult = {
  url: string;
  finalUrl?: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
  fetchedAt: string;
  status?: number;
  contentType?: string;
  bytes?: number;
  error?: string;
};

function decodeHtmlEntities(input: string | undefined): string | undefined {
  if (!input) return undefined;
  // LinkedIn sometimes double-encodes entities (e.g. &amp;amp;). Decode until stable.
  let s = input;
  for (let i = 0; i < 3; i++) {
    const before = s;
    // Common named entities
    s = s.replace(/&amp;/gi, '&');
    s = s.replace(/&quot;/gi, '"');
    s = s.replace(/&#39;/gi, "'");
    s = s.replace(/&lt;/gi, '<');
    s = s.replace(/&gt;/gi, '>');
    s = s.replace(/&nbsp;/gi, ' ');
    // Numeric entities
    s = s.replace(/&#(\d+);/g, (_, n) => {
      const code = Number(n);
      if (!Number.isFinite(code)) return _;
      try {
        return String.fromCharCode(code);
      } catch {
        return _;
      }
    });
    if (s === before) break;
  }
  return s;
}

function absolutizeUrl(candidate: string | undefined, baseUrl: string): string | undefined {
  if (!candidate) return undefined;
  const raw = candidate.trim();
  if (!raw) return undefined;
  try {
    return new URL(raw, baseUrl).toString();
  } catch {
    return undefined;
  }
}

function extractMetaContent(html: string, key: string): string | undefined {
  // Supports:
  // <meta property="og:image" content="...">
  // <meta name="twitter:image" content="...">
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=[\"']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\"'][^>]*>`,
    'i'
  );
  const m = html.match(re);
  if (!m?.[0]) return undefined;
  const tag = m[0];
  const c1 = tag.match(/content=["']([^"']+)["']/i);
  if (c1?.[1]) return decodeHtmlEntities(c1[1].trim());
  return undefined;
}

function extractTitle(html: string): string | undefined {
  const og = extractMetaContent(html, 'og:title');
  if (og) return og;
  const tw = extractMetaContent(html, 'twitter:title');
  if (tw) return tw;
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!m?.[1]) return undefined;
  return decodeHtmlEntities(m[1].replace(/\s+/g, ' ').trim());
}

function extractDescription(html: string): string | undefined {
  const og = extractMetaContent(html, 'og:description');
  if (og) return og;
  const tw = extractMetaContent(html, 'twitter:description');
  if (tw) return tw;
  const m = html.match(/<meta[^>]+name=["']description["'][^>]*>/i);
  if (!m?.[0]) return undefined;
  const c = m[0].match(/content=["']([^"']+)["']/i);
  return c?.[1]?.trim();
}

function extractImage(html: string): string | undefined {
  // Prefer OG then Twitter card image.
  const og = extractMetaContent(html, 'og:image');
  if (og) return og;
  const ogSecure = extractMetaContent(html, 'og:image:secure_url');
  if (ogSecure) return ogSecure;
  const tw = extractMetaContent(html, 'twitter:image');
  if (tw) return tw;
  const twSrc = extractMetaContent(html, 'twitter:image:src');
  if (twSrc) return twSrc;
  return undefined;
}

function extractSiteName(html: string): string | undefined {
  const og = extractMetaContent(html, 'og:site_name');
  if (og) return og;
  return undefined;
}

export async function fetchOpenGraph(inputUrl: string, opts?: { timeoutMs?: number; maxBytes?: number }): Promise<OpenGraphResult> {
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const maxBytes = opts?.maxBytes ?? 2_000_000;

  const res: OpenGraphResult = {
    url: inputUrl,
    fetchedAt: new Date().toISOString(),
  };

  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    return { ...res, error: 'Invalid URL' };
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ...res, error: 'Only http/https URLs are supported' };
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        // A browser-ish UA improves OG responses for many sites.
        'user-agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
      },
    });

    res.status = resp.status;
    res.finalUrl = resp.url;
    res.contentType = resp.headers.get('content-type') || undefined;

    if (!resp.ok) {
      res.error = `HTTP ${resp.status}`;
      return res;
    }

    const ct = (res.contentType || '').toLowerCase();
    if (ct && !ct.includes('text/html') && !ct.includes('application/xhtml')) {
      res.error = `Unsupported content-type: ${res.contentType}`;
      return res;
    }

    // Enforce a max bytes limit.
    const reader = resp.body?.getReader();
    if (!reader) {
      res.error = 'No response body';
      return res;
    }

    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        total += value.byteLength;
        if (total > maxBytes) {
          res.error = `Response too large (> ${maxBytes} bytes)`;
          return res;
        }
        chunks.push(value);
      }
    }
    res.bytes = total;

    const html = new TextDecoder('utf-8').decode(concat(chunks, total));

    const base = res.finalUrl || url.toString();
    res.title = extractTitle(html);
    res.description = extractDescription(html);
    res.siteName = extractSiteName(html);
    res.image = absolutizeUrl(extractImage(html), base);

    return res;
  } catch (e: any) {
    res.error = e?.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : String(e?.message || e);
    return res;
  } finally {
    clearTimeout(t);
  }
}

function concat(chunks: Uint8Array[], total: number): Uint8Array {
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

export type { OpenGraphResult };


