import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowBigUp, ExternalLink } from 'lucide-react';
import { apiGet } from '@/lib/api';

type RequestMeta = {
  target_name?: string;
  target_title?: string;
  target_company?: string;
  linkedin_url?: string;
  image_url?: string | null;
  summary?: string;
};

type ForumPost = {
  id: string;
  content: string;
  body?: string | null;
  created_at: string;
  tags?: string[];
  post_type: string;
  user?: { anonymous_name: string } | null;
  community?: { name: string; slug: string } | null;
  upvotes?: number;
  external_url?: string | null;
};

function parseRequestMeta(body: string | null | undefined): RequestMeta | null {
  if (!body) return null;
  const m = body.match(/<!--\s*request_meta\s+([\s\S]*?)\s*-->/i);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]) as RequestMeta;
  } catch {
    return null;
  }
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

function decodeHtmlEntities(input: string): string {
  // LinkedIn OG fields sometimes include HTML entities (and can be double-encoded).
  let s = String(input || '');
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s.replace(/&amp;/gi, '&');
    s = s.replace(/&quot;/gi, '"');
    s = s.replace(/&#39;/gi, "'");
    s = s.replace(/&lt;/gi, '<');
    s = s.replace(/&gt;/gi, '>');
    s = s.replace(/&nbsp;/gi, ' ');
    if (s === before) break;
  }
  return s;
}

export function RequestPostCard(props: { post: ForumPost; isSeen?: boolean }) {
  const { post, isSeen = false } = props;
  const navigate = useNavigate();

  const cardRef = React.useRef<HTMLElement | null>(null);
  const [resolvedBody, setResolvedBody] = React.useState<string | null | undefined>(post.body);
  const fetchedRef = React.useRef(false);

  // In the "All" feed we intentionally don't fetch `body` for every post.
  // For request cards we lazily fetch the post detail once (only when visible) so the image/name/summary show up.
  React.useEffect(() => {
    if (resolvedBody) return;
    if (post.post_type !== 'request' && post.community?.slug !== 'requests') return;
    if (fetchedRef.current) return;
    if (!cardRef.current) return;

    const el = cardRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        if (fetchedRef.current) return;
        fetchedRef.current = true;
        apiGet(`/api/forum/posts/${post.id}`)
          .then((data) => {
            const body = (data as any)?.post?.body ?? null;
            setResolvedBody(body);
          })
          .catch(() => {
            // silent fail; show fallback UI
          })
          .finally(() => obs.disconnect());
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [post.id, post.post_type, post.community?.slug, resolvedBody]);

  const meta = React.useMemo(() => parseRequestMeta(resolvedBody), [resolvedBody]);
  const targetName = meta?.target_name || 'Target';
  const targetTitle = meta?.target_title || '';
  const targetCompany = meta?.target_company || '';
  const linkedinUrl = meta?.linkedin_url || String(post.external_url || '');
  const summary = decodeHtmlEntities(meta?.summary || '');
  const imageUrl = meta?.image_url || '';
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <article
      ref={cardRef as any}
      onClick={() => navigate(`/forum/post/${post.id}`)}
      className={[
        'font-reddit bg-card hover:bg-accent border border-border rounded-sm overflow-hidden transition-colors duration-150 cursor-pointer min-h-[220px] sm:min-h-[240px]',
        isSeen ? 'opacity-60 hover:opacity-100' : '',
      ].join(' ')}
    >
      <div className="flex">
        {/* Vote column (visual only; matches forum styling) */}
        <div className="flex flex-col items-center py-2 px-2 bg-muted w-10 flex-shrink-0">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Upvote"
          >
            <ArrowBigUp className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold my-0.5 text-muted-foreground">{post.upvotes ?? '•'}</span>
          <div className="w-5 h-5" />
        </div>

        <div className="flex-1 py-3 px-3">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs mb-2 flex-wrap text-muted-foreground">
            <span className="font-medium text-foreground">{post.community?.name || 'Requests'}</span>
            <span>•</span>
            <span>Posted by {post.user?.anonymous_name || '6Degrees'}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>

          {/* Tags */}
          {Array.isArray(post.tags) && post.tags.length > 0 ? (
            <div className="flex flex-wrap gap-2 mb-2">
              {post.tags.slice(0, 4).map((t) => (
                <span
                  key={t}
                  className="px-2 py-1 rounded bg-muted text-muted-foreground text-[11px] border border-border"
                >
                  {t}
                </span>
              ))}
            </div>
          ) : null}

          {/* Content (match News/Sponsored layout: text left, image right) */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground text-base font-medium leading-snug mb-1 line-clamp-2 hover:opacity-90">
                {post.content}
              </h3>

              <div className="text-sm text-foreground font-semibold truncate">{targetName}</div>
              {(targetTitle || targetCompany) ? (
                <div className="text-xs text-muted-foreground truncate">
                  {[targetTitle, targetCompany].filter(Boolean).join(' • ')}
                </div>
              ) : null}

              {summary ? (
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mt-1">
                  {summary}
                </p>
              ) : null}

              {linkedinUrl ? (
                <Link
                  to={linkedinUrl}
                  onClick={(e) => e.stopPropagation()}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  LinkedIn
                </Link>
              ) : null}
            </div>

            <div className="w-32 h-36 sm:w-36 sm:h-40 rounded overflow-hidden flex-shrink-0 border border-border bg-background">
              {imageUrl && !imgFailed ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover object-top contrast-[1.2] brightness-[0.85]"
                  loading="lazy"
                  decoding="async"
                  style={{ filter: 'grayscale(1)' }}
                  onError={(e) => {
                    setImgFailed(true);
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
                  {initialsFromName(decodeHtmlEntities(targetName))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}


