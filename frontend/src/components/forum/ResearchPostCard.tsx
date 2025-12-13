import { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import ReactMarkdown from 'react-markdown';

interface ResearchPost {
  id: string;
  content: string; // TL;DR / preview
  body?: string | null; // Full markdown report
  created_at: string;
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
  const { user } = useAuth();
  const { track } = useTracker();
  const { toast } = useToast();

  // Expansion state
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

  // Reactions
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || {});
  const [userReactions, setUserReactions] = useState<string[]>([]);

  const ALLOWED_REACTIONS = ['❤️', '🔥', '🚀', '💯', '🙌', '🤝', '💸', '👀'];

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

  const handleReaction = async (emoji: string) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Please sign in to react to posts.',
      });
      return;
    }

    try {
      const data = await apiPost('/api/forum/reactions', {
        target_type: 'post',
        target_id: post.id,
        emoji,
      });

      setReactionCounts(data.reaction_counts || {});
      setUserReactions(data.user_reactions || []);

      track({
        target_type: 'forum_post',
        target_id: post.id,
        event_type: 'reaction',
        metadata: { emoji, post_type: 'research_report' }
      });
    } catch (err) {
      console.error('Failed to toggle reaction:', err);
    }
  };

  // Extract title from body if available
  const extractTitle = () => {
    if (!post.body) return post.content.slice(0, 100);
    const titleMatch = post.body.match(/^#\s+(.+?)$/m);
    if (titleMatch) return titleMatch[1];
    return post.content.slice(0, 100);
  };

  const title = extractTitle();

  // Estimate read time
  const wordCount = post.body ? post.body.split(/\s+/).length : 0;
  const readTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div
      ref={cardRef}
      className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#333] transition-all"
    >
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center shrink-0">
            <FileText className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                📊 Case Study
              </Badge>
              <span className="text-[#666] text-[10px] flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {readTime} min read
              </span>
            </div>
            <h3 className="text-white font-gilroy text-base sm:text-lg font-semibold leading-tight line-clamp-2">
              {title}
            </h3>
          </div>
        </div>

        {/* Preview / TL;DR */}
        <div className="text-[#aaa] text-sm mb-4 line-clamp-3">
          {post.content}
        </div>

        {/* Expand Button */}
        {post.body && (
          <Button
            variant="outline"
            className="w-full border-[#333] text-[#888] hover:text-white hover:border-[#444]"
            onClick={() => setExpanded(!expanded)}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {expanded ? 'Collapse' : 'Read Full Report'}
            {expanded ? <ChevronUp className="w-4 h-4 ml-2" /> : <ChevronDown className="w-4 h-4 ml-2" />}
          </Button>
        )}
      </div>

      {/* Expanded Content */}
      {expanded && post.body && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5">
          <div className="bg-[#0a0a0a] rounded-lg p-4 sm:p-6 border border-[#222] max-h-[70vh] overflow-y-auto">
            <article className="prose prose-invert prose-sm max-w-none
              prose-headings:font-gilroy prose-headings:text-white
              prose-h1:text-xl prose-h1:mb-4
              prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3 prose-h2:text-[#CBAA5A]
              prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2
              prose-p:text-[#ccc] prose-p:leading-relaxed
              prose-li:text-[#ccc]
              prose-strong:text-white
              prose-a:text-[#CBAA5A] prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-[#CBAA5A] prose-blockquote:bg-[#111] prose-blockquote:py-1 prose-blockquote:px-4
              prose-code:text-[#CBAA5A] prose-code:bg-[#111] prose-code:px-1 prose-code:rounded
              prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#222]
            ">
              <ReactMarkdown>{post.body}</ReactMarkdown>
            </article>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#222] pt-3">
        {/* Reactions */}
        <div className="flex flex-wrap gap-1 mb-3">
          {ALLOWED_REACTIONS.map((emoji) => {
            const count = reactionCounts[emoji] || 0;
            const isActive = userReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => handleReaction(emoji)}
                className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 transition-all ${
                  isActive
                    ? 'bg-[#CBAA5A]/20 border border-[#CBAA5A]/50'
                    : 'bg-[#1a1a1a] border border-[#222] hover:border-[#333]'
                }`}
              >
                <span>{emoji}</span>
                {count > 0 && <span className="text-[#888]">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* Meta Info */}
        <div className="flex items-center justify-between text-xs text-[#666]">
          <div className="flex items-center gap-3">
            <span>
              {post.user?.anonymous_name || 'Research Team'}
            </span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
          <button
            onClick={toggleComments}
            className="flex items-center gap-1 hover:text-white transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.comment_count || comments.length || 0}</span>
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="mt-3 pt-3 border-t border-[#222] space-y-3">
            {loadingComments ? (
              <p className="text-[#666] text-sm">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-[#666] text-sm">No comments yet. Share your thoughts!</p>
            ) : (
              comments.map((comment) => (
                <div key={comment.id} className="bg-[#0a0a0a] rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[#CBAA5A] text-xs font-gilroy">
                      {comment.user?.anonymous_name || 'Anonymous'}
                    </span>
                    <span className="text-[#666] text-[10px]">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-white text-sm">{comment.content}</p>
                </div>
              ))
            )}

            {/* Comment Input */}
            {user && (
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts on this research..."
                  className="flex-1 bg-[#0a0a0a] border-[#222] text-white text-sm min-h-[60px] resize-none"
                />
                <Button
                  onClick={submitComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="bg-[#CBAA5A] text-black hover:bg-[#CBAA5A]/80 self-end"
                  size="sm"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

