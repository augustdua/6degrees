import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { apiPost, apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTracker } from '@/hooks/useInteractionTracker';
import {
  FileText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Send,
  ExternalLink,
  BookOpen,
  Clock,
  List,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';
import { PostReactions } from './PostReactions';

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
  const { user } = useAuth();
  const { track } = useTracker();
  const { toast } = useToast();

  // Modal state for full-screen reading
  const [showModal, setShowModal] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

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

  // Track time spent when expanding
  useEffect(() => {
    if (expanded) {
      viewStartTime.current = Date.now();
    } else if (viewStartTime.current) {
      const duration_ms = Date.now() - viewStartTime.current;
      if (duration_ms > 5000) { // Only track if > 5 seconds
        track({
          target_type: 'forum_post',
          target_id: post.id,
          event_type: 'time_spent',
          duration_ms,
          metadata: { post_type: 'research_report' }
        });
      }
    }
  }, [expanded, post.id, track]);

  const loadComments = async () => {
    if (comments.length > 0) return;
    setLoadingComments(true);
    try {
      const data = await apiGet(`/api/forum/posts/${post.id}/comments`);
      setComments(data.comments || []);
    } catch (err) {
      console.error('Failed to load comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const toggleComments = () => {
    const newState = !showComments;
    setShowComments(newState);
    if (newState) {
      loadComments();
    }
  };

  const submitComment = async () => {
    if (!newComment.trim() || !user) return;
    setSubmittingComment(true);
    try {
      const data = await apiPost(`/api/forum/posts/${post.id}/comments`, {
        content: newComment.trim(),
      });
      setComments([...comments, data.comment]);
      setNewComment('');
      track({
        target_type: 'forum_post',
        target_id: post.id,
        event_type: 'comment',
        metadata: { post_type: 'research_report' }
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to post comment',
        description: err.message || 'Please try again.',
      });
    } finally {
      setSubmittingComment(false);
    }
  };

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
    navigate(`/forum/post/${post.id}`);
  };

  const handleReadFullReport = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowModal(true);
    track({
      target_type: 'forum_post',
      target_id: post.id,
      event_type: 'click',
      metadata: { action: 'open_full_report' }
    });
  };

  return (
    <>
      <div
        ref={cardRef}
        onClick={handleCardClick}
        className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#333] transition-all cursor-pointer"
      >
        {/* Header */}
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
              <h3 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/forum/post/${post.id}`);
                }}
                className="text-white font-gilroy text-lg sm:text-xl font-bold leading-tight line-clamp-2 cursor-pointer hover:text-[#CBAA5A] transition-colors"
              >
                {title}
              </h3>
            </div>
          </div>

          {/* Preview / TL;DR */}
          <p className="text-[#999] text-sm leading-relaxed mb-4 line-clamp-3">
            {post.content}
          </p>

          {/* Table of Contents Preview (if available) */}
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

          {/* Read Full Report Button */}
          {post.body && (
            <Button
              variant="outline"
              className="w-full border-blue-500/30 text-blue-400 hover:text-blue-300 hover:border-blue-500/50 hover:bg-blue-500/5"
              onClick={handleReadFullReport}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Read Full Report
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          )}
        </div>

        {/* Footer with Reactions */}
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#1a1a1a] pt-3" onClick={(e) => e.stopPropagation()}>
          {/* Meta Info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs text-[#666]">
              <span className="text-[#888]">{post.user?.anonymous_name || 'Research Team'}</span>
              <span>•</span>
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            </div>
          </div>
          
          {/* Post Reactions */}
          <PostReactions
            postId={post.id}
            upvotes={post.upvotes || 0}
            downvotes={post.downvotes || 0}
            userVote={post.user_vote}
            commentCount={post.comment_count || 0}
            compact
            className="justify-start"
          />
        </div>
      </div>

      {/* Full Report Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col bg-[#0a0a0a] border-[#222] p-0">
          <DialogHeader className="px-6 py-4 border-b border-[#222] flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30 mb-1">
                    📊 Market Research
                  </Badge>
                  <DialogTitle className="text-white font-gilroy text-lg">{title}</DialogTitle>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#666]">
                <Clock className="w-3 h-3" />
                <span>{readTime} min read</span>
              </div>
            </div>
          </DialogHeader>

          <div className="flex flex-1 overflow-hidden">
            {/* Table of Contents Sidebar (desktop) */}
            {tableOfContents.length > 2 && (
              <div className="hidden md:block w-56 border-r border-[#222] p-4 overflow-y-auto">
                <div className="sticky top-0">
                  <h4 className="text-xs uppercase tracking-wider text-[#666] mb-3 flex items-center gap-2">
                    <List className="w-3 h-3" />
                    Contents
                  </h4>
                  <nav className="space-y-1">
                    {tableOfContents.map((item, idx) => (
                      <a
                        key={idx}
                        href={`#${item.id}`}
                        className={`block text-sm transition-colors hover:text-white ${
                          item.level === 1 ? 'text-[#888] font-medium' :
                          item.level === 2 ? 'text-[#666] pl-3' :
                          'text-[#555] pl-6 text-xs'
                        }`}
                      >
                        {item.text}
                      </a>
                    ))}
                  </nav>
                </div>
              </div>
            )}

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <article className="prose prose-invert prose-lg max-w-none
                prose-headings:font-gilroy prose-headings:text-white prose-headings:scroll-mt-6
                prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-[#222]
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-[#CBAA5A]
                prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-[#888]
                prose-p:text-[#ccc] prose-p:leading-relaxed prose-p:text-base
                prose-li:text-[#ccc] prose-li:text-base
                prose-strong:text-white prose-strong:font-semibold
                prose-a:text-[#CBAA5A] prose-a:no-underline hover:prose-a:underline
                prose-blockquote:border-l-4 prose-blockquote:border-l-[#CBAA5A] prose-blockquote:bg-[#111] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-blockquote:italic
                prose-code:text-[#CBAA5A] prose-code:bg-[#111] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm
                prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#222] prose-pre:rounded-lg
                prose-hr:border-[#222]
                prose-table:border-collapse
                prose-th:bg-[#111] prose-th:border prose-th:border-[#222] prose-th:px-4 prose-th:py-2 prose-th:text-white
                prose-td:border prose-td:border-[#222] prose-td:px-4 prose-td:py-2
              ">
                <ReactMarkdown
                  components={{
                    h1: ({ children, ...props }) => (
                      <h1 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h1>
                    ),
                    h2: ({ children, ...props }) => (
                      <h2 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h2>
                    ),
                    h3: ({ children, ...props }) => (
                      <h3 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h3>
                    ),
                  }}
                >
                  {post.body || ''}
                </ReactMarkdown>
              </article>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[#222] flex-shrink-0">
            <PostReactions
              postId={post.id}
              upvotes={post.upvotes || 0}
              downvotes={post.downvotes || 0}
              userVote={post.user_vote}
              commentCount={post.comment_count || 0}
              onCommentClick={() => {
                setShowModal(false);
                navigate(`/forum/post/${post.id}`);
              }}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

