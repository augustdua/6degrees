import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowBigUp, ExternalLink } from 'lucide-react';

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

export function RequestPostCard(props: { post: ForumPost; isSeen?: boolean }) {
  const { post, isSeen = false } = props;
  const navigate = useNavigate();

  const meta = React.useMemo(() => parseRequestMeta(post.body), [post.body]);
  const targetName = meta?.target_name || 'Target';
  const targetTitle = meta?.target_title || '';
  const targetCompany = meta?.target_company || '';
  const linkedinUrl = meta?.linkedin_url || '';
  const summary = meta?.summary || '';
  const imageUrl = meta?.image_url || '';

  return (
    <article
      onClick={() => navigate(`/forum/post/${post.id}`)}
      className={[
        'bg-card border border-border rounded-sm overflow-hidden transition-colors duration-150 cursor-pointer',
        'hover:bg-accent',
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

          {/* Title */}
          <h3 className="text-foreground text-lg font-semibold leading-snug mb-2">
            {post.content}
          </h3>

          {/* Target block */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full overflow-hidden border border-border bg-background flex-shrink-0">
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  {initialsFromName(targetName)}
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-sm text-foreground font-medium truncate">{targetName}</div>
              {(targetTitle || targetCompany) ? (
                <div className="text-xs text-muted-foreground truncate">
                  {[targetTitle, targetCompany].filter(Boolean).join(' • ')}
                </div>
              ) : null}
              {summary ? (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {summary}
                </p>
              ) : null}
            </div>

            {linkedinUrl ? (
              <Link
                to={linkedinUrl}
                onClick={(e) => e.stopPropagation()}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
              >
                <ExternalLink className="w-3 h-3" />
                LinkedIn
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}


