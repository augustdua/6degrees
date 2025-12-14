import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useTracker } from '@/hooks/useInteractionTracker';
// (no API calls needed in this lightweight card; full content loads in detail pages)
import {
  FileText,
  BookOpen,
  Clock,
  List,
  ExternalLink
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

  // Extract table of contents from markdown
  const tableOfContents = useMemo(() => {
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
    if (titleMatch) return titleMatch[1];
    return post.content.slice(0, 100);
  }, [post.body, post.content]);

  // Estimate read time
  const wordCount = post.body ? post.body.split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="button"]')) {
      return;
    }
    // Per product expectation: clicking any forum post should open a dedicated post page.
    navigate(`/forum/post/${post.id}`);
  };

  const handleReadFullReport = (e: React.MouseEvent) => {
    e.stopPropagation();
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
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 font-medium">
                📊 Market Research
              </Badge>
              <span className="text-[#555] text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readTime} min read
              </span>
            </div>
            <Link
              to={`/forum/post/${post.id}`}
              onClick={(e) => e.stopPropagation()}
              className="block text-white font-gilroy text-lg sm:text-xl font-bold leading-tight line-clamp-2 hover:text-[#CBAA5A] transition-colors"
            >
              {title}
            </Link>
          </div>
        </div>

        <p className="text-[#999] text-sm leading-relaxed mb-4 line-clamp-3">
          {post.content}
        </p>

        {tableOfContents.length > 3 && (
          <div className="bg-[#0a0a0a] rounded-lg p-3 mb-4 border border-[#1a1a1a]">
            <div className="flex items-center gap-2 text-xs text-[#666] mb-2">
              <List className="w-3 h-3" />
              <span>Contents</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {tableOfContents.slice(0, 4).map((item, idx) => (
                <span key={idx} className="text-xs text-[#888] bg-[#111] px-2 py-0.5 rounded">
                  {item.text.substring(0, 25)}{item.text.length > 25 ? '...' : ''}
                </span>
              ))}
              {tableOfContents.length > 4 && (
                <span className="text-xs text-[#666]">+{tableOfContents.length - 4} more</span>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <div className="text-xs text-[#666]">
            <span className="text-[#888]">{post.user?.anonymous_name || 'Research Team'}</span>
            <span className="mx-2">•</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>

          {post.body && (
            <Button
              variant="outline"
              className="border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-500/50 hover:bg-blue-500/5"
              onClick={handleReadFullReport}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Read
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

