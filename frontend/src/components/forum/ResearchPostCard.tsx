import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useTracker } from '@/hooks/useInteractionTracker';
import {
  FileText,
  Clock,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { stripInlineMarkdown } from './ReportReader';

interface ResearchPost {
  id: string;
  content: string; // TL;DR / preview
  body?: string | null; // Full markdown report
  created_at: string;
  upvotes?: number;
  downvotes?: number;
  user_vote?: 'up' | 'down' | null;
  user?: {
    id: string;
    anonymous_name: string;
  } | null;
  community?: {
    id: string;
    name: string;
    slug: string;
    icon: string;
    color: string;
  } | null;
  reaction_counts?: Record<string, number> | null;
  comment_count?: number;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user?: {
    id: string;
    anonymous_name: string;
  };
}

interface ResearchPostCardProps {
  post: ResearchPost;
  onDelete?: () => void;
}

export const ResearchPostCard = ({ post, onDelete }: ResearchPostCardProps) => {
  const navigate = useNavigate();
  const { track } = useTracker();

  // View tracking
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);
  const viewStartTime = useRef<number | null>(null);

  // Extract TOC headings (used only for lightweight preview chips)
  const tocHeadings = useMemo(() => {
    if (!post.body) return [];
    const headings: { level: number; text: string; id: string }[] = [];
    const lines = post.body.split('\n');
    lines.forEach(line => {
      const match = line.match(/^(#{1,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const text = match[2].replace(/\*\*/g, '').trim();
        const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        headings.push({ level, text, id });
      }
    });
    return headings;
  }, [post.body]);

  // View tracking
  useEffect(() => {
    if (!cardRef.current || hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            viewStartTime.current = Date.now();
            track({
              target_type: 'forum_post',
              target_id: post.id,
              event_type: 'view',
              metadata: { source: 'research_feed', post_type: 'research_report' }
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, track]);

  // Extract title from body if available
  const title = useMemo(() => {
    if (!post.body) return post.content.slice(0, 100);
    const titleMatch = post.body.match(/^#\s+(.+?)$/m);
    if (titleMatch) return stripInlineMarkdown(titleMatch[1]);
    return stripInlineMarkdown(post.content.slice(0, 100));
  }, [post.body, post.content]);

  const preview = useMemo(() => {
    return stripInlineMarkdown(post.content || '');
  }, [post.content]);

  // Estimate read time
  const wordCount = post.body ? post.body.split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const subtitle = useMemo(() => {
    const who = post.user?.anonymous_name || 'Research Team';
    const when = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });
    return { who, when };
  }, [post.created_at, post.user?.anonymous_name]);

  const tocPreview = useMemo(() => {
    // Keep it calm: show 2 sections max.
    const items = tocHeadings
      .filter((h) => h.level >= 1 && h.level <= 3)
      .map((h) => h.text.replace(/\*\*/g, '').trim())
      .filter(Boolean);
    const unique: string[] = [];
    for (const t of items) {
      if (unique.includes(t)) continue;
      unique.push(t);
      if (unique.length >= 2) break;
    }
    const remaining = Math.max(0, items.length - unique.length);
    return { chips: unique, remaining };
  }, [tocHeadings]);

  const handleCardClick = () => {
    // Navigate directly to the full report - no intermediate page
    navigate(`/forum/research/${post.id}`);
    track({
      target_type: 'forum_post',
      target_id: post.id,
      event_type: 'click',
      metadata: { action: 'open_full_report' }
    });
  };

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#333] transition-all cursor-pointer"
    >
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium">
                Market Research
              </Badge>
              <span className="text-[#666] text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readTime} min read
              </span>
            </div>
            <h3 className="text-white font-gilroy text-lg sm:text-xl font-bold leading-snug line-clamp-2">
              {title}
            </h3>
            <div className="mt-2 text-[11px] text-[#666]">
              <span className="text-[#888]">{subtitle.who}</span>
              <span className="mx-2">•</span>
              <span>{subtitle.when}</span>
            </div>
          </div>
        </div>

        <p className="text-[#b5b5b5] text-sm leading-6 mb-3 line-clamp-3">
          {preview}
        </p>

        {(tocPreview.chips.length > 0 || tocPreview.remaining > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {tocPreview.chips.map((t) => (
              <span
                key={t}
                className="text-[11px] text-[#9a9a9a] bg-[#0a0a0a] border border-[#1a1a1a] px-2 py-1 rounded-md"
              >
                {t.length > 28 ? `${t.slice(0, 28)}…` : t}
                </span>
              ))}
            {tocPreview.remaining > 0 && (
              <span className="text-[11px] text-[#666]">+{tocPreview.remaining} sections</span>
              )}
          </div>
        )}

{/* No button - clicking anywhere opens the report */}
      </div>
    </div>
  );
};

