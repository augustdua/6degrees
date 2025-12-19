import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowBigUp, Newspaper } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { stripInlineMarkdown } from './ReportReader';

type NewsPost = {
  id: string;
  content: string;
  body?: string | null;
  created_at: string;
  news_url?: string | null;
  news_source?: string | null;
  news_published_at?: string | null;
  news_image_url?: string | null;
};

export function NewsPostCard(props: { post: NewsPost }) {
  const { post } = props;
  const navigate = useNavigate();

  const title = useMemo(() => stripInlineMarkdown(post.content || ''), [post.content]);
  const desc = useMemo(() => stripInlineMarkdown(String(post.body || '')), [post.body]);
  const when = useMemo(() => {
    const d = post.news_published_at || post.created_at;
    try {
      return formatDistanceToNow(new Date(d), { addSuffix: true });
    } catch {
      return '';
    }
  }, [post.news_published_at, post.created_at]);

  const host = useMemo(() => {
    const u = String(post.news_url || '').trim();
    if (!u) return String(post.news_source || 'News');
    try {
      return new URL(u).hostname.replace(/^www\./, '');
    } catch {
      return String(post.news_source || 'News');
    }
  }, [post.news_url, post.news_source]);

  const thumb = String(post.news_image_url || '').trim();

  return (
    <article
      onClick={() => navigate(`/forum/post/${post.id}`)}
      className="font-reddit bg-[#0a0a0a] hover:bg-[#111] border border-[#1a1a1a] rounded-sm overflow-hidden transition-colors duration-150 cursor-pointer min-h-[168px] sm:min-h-[176px]"
    >
      <div className="flex">
        {/* Vote column (visual only for now) */}
        <div className="flex flex-col items-center py-2 px-2 bg-[#080808] w-10 flex-shrink-0">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-[#1a1a1a] transition-colors text-[#606060] hover:text-[#CBAA5A]"
            aria-label="Upvote"
          >
            <ArrowBigUp className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold my-0.5 text-[#d0d0d0]">•</span>
          <div className="w-5 h-5" />
        </div>

        <div className="flex-1 py-3 px-3">
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="flex items-center gap-1 text-[#CBAA5A]">
              <Newspaper className="w-3 h-3" />
              <span className="font-bold">News</span>
            </span>
            <span className="text-[#606060]">•</span>
            <span className="text-[#808080]">{host}</span>
            {when ? (
              <>
                <span className="text-[#606060]">•</span>
                <span className="text-[#606060]">{when}</span>
              </>
            ) : null}
          </div>

          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-[#e0e0e0] text-base font-medium leading-snug mb-1 line-clamp-2 hover:text-white">
                {title}
              </h3>
              <p className="text-[#808080] text-sm leading-relaxed line-clamp-3 mb-2">{desc}</p>
              <span className="text-[10px] text-[#606060] uppercase tracking-wide">News</span>
            </div>

            {thumb ? (
              <div className="w-24 h-28 sm:w-28 sm:h-28 rounded overflow-hidden flex-shrink-0 border border-[#1a1a1a] bg-[#0b0b0b]">
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}


