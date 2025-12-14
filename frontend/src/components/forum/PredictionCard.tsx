import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { apiPost, apiGet, apiDelete } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTracker } from '@/hooks/useInteractionTracker';
import {
  Calendar,
  ThumbsUp,
  ThumbsDown,
  ExternalLink,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Send,
  ArrowBigUp,
  ArrowBigDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { PostReactions } from './PostReactions';

interface PredictionPost {
  id: string;
  content: string; // The question
  body?: string | null; // Extended context
  headline?: string | null;
  company?: string | null;
  resolution_date?: string | null;
  resolution_source?: string | null;
  prediction_category?: string | null;
  initial_probability?: number | null;
  resolved_outcome?: boolean | null;
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

interface PredictionCardProps {
  post: PredictionPost;
  onDelete?: () => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  funding: 'bg-green-500/20 text-green-400 border-green-500/30',
  expansion: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  regulatory: 'bg-red-500/20 text-red-400 border-red-500/30',
  competition: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  leadership: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ipo: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  acquisition: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  other: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
};

export const PredictionCard = ({ post, onDelete }: PredictionCardProps) => {
  const { user } = useAuth();
  const { track } = useTracker();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('[role="button"]') || target.closest('textarea')) {
      return;
    }
    navigate(`/forum/post/${post.id}`);
  };

  // Vote state
  const [yesCount, setYesCount] = useState(0);
  const [noCount, setNoCount] = useState(0);
  const [userVote, setUserVote] = useState<boolean | null>(null);
  const [voting, setVoting] = useState(false);
  const [votesLoaded, setVotesLoaded] = useState(false);

  // Forum-style up/down vote rail (same as other cards)
  const [upvotes, setUpvotes] = useState(post.upvotes || 0);
  const [downvotes, setDownvotes] = useState(post.downvotes || 0);
  const [postVote, setPostVote] = useState<'up' | 'down' | null>(post.user_vote || null);

  // Comments
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submittingComment, setSubmittingComment] = useState(false);

  // View tracking
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

  // View tracking
  useEffect(() => {
    if (!cardRef.current || hasTrackedView.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            track({
              target_type: 'forum_post',
              target_id: post.id,
              event_type: 'view',
              metadata: { source: 'predictions_feed', post_type: 'prediction' }
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, track]);

  const fetchVotes = async () => {
    if (votesLoaded) return;
    try {
      const data = await apiGet(`/api/forum/predictions/${post.id}/votes`);
      setYesCount(data.yes_count || 0);
      setNoCount(data.no_count || 0);
      setUserVote(data.user_vote);
      setVotesLoaded(true);
    } catch (err) {
      console.error('Failed to fetch prediction votes:', err);
    }
  };

  const handleVote = async (vote: boolean) => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Please sign in to vote on predictions.',
      });
      return;
    }

    // Lazy-load current vote counts only when user interacts (prevents request storms in feed)
    await fetchVotes();

    // If clicking the same vote, remove it
    if (userVote === vote) {
      setVoting(true);
      try {
        const data = await apiDelete(`/api/forum/predictions/${post.id}/vote`);
        setYesCount(data.yes_count || 0);
        setNoCount(data.no_count || 0);
        setUserVote(null);
        track({
          target_type: 'forum_post',
          target_id: post.id,
          event_type: 'reaction',
          metadata: { action: 'remove_vote', vote_type: vote ? 'yes' : 'no' }
        });
      } catch (err) {
        console.error('Failed to remove vote:', err);
      } finally {
        setVoting(false);
      }
      return;
    }

    setVoting(true);
    try {
      const data = await apiPost(`/api/forum/predictions/${post.id}/vote`, { vote });
      setYesCount(data.yes_count || 0);
      setNoCount(data.no_count || 0);
      setUserVote(vote);
      track({
        target_type: 'forum_post',
        target_id: post.id,
        event_type: 'reaction',
        metadata: { action: 'vote', vote_type: vote ? 'yes' : 'no' }
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Failed to vote',
        description: err.message || 'Please try again.',
      });
    } finally {
      setVoting(false);
    }
  };

  const loadComments = async () => {
    if (comments.length > 0) return; // Already loaded
    setLoadingComments(true);
    try {
      // Lazy-load votes as well when user opens the discussion drawer
      await fetchVotes();
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
        metadata: { post_type: 'prediction' }
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

  // Calculate probability from votes
  const totalVotes = yesCount + noCount;
  const yesProbability = totalVotes > 0 ? Math.round((yesCount / totalVotes) * 100) : (post.initial_probability ? Math.round(post.initial_probability * 100) : 50);
  const noProbability = 100 - yesProbability;

  // Resolution status
  const isResolved = post.resolved_outcome !== null && post.resolved_outcome !== undefined;
  const resolvedYes = post.resolved_outcome === true;

  // Days until resolution
  const daysUntilResolution = post.resolution_date
    ? Math.ceil((new Date(post.resolution_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const categoryClass = CATEGORY_COLORS[post.prediction_category || 'other'] || CATEGORY_COLORS.other;

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className="font-reddit bg-[#0a0a0a] hover:bg-[#111] border border-[#1a1a1a] rounded-sm overflow-hidden transition-colors duration-150 cursor-pointer"
    >
      <div className="flex min-w-0">
        {/* Left vote rail */}
        <div className="flex flex-col items-center py-2 px-2 bg-[#080808] w-10 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!user) {
                navigate('/auth');
                return;
              }
              try {
                const data = await apiPost(`/api/forum/posts/${post.id}/vote`, { vote_type: 'up' });
                // Backend returns final counts; if not present, fall back to local delta.
                if (typeof data?.upvotes === 'number' && typeof data?.downvotes === 'number') {
                  setUpvotes(data.upvotes);
                  setDownvotes(data.downvotes);
                } else {
                  if (postVote === 'up') {
                    setUpvotes((v) => Math.max(0, v - 1));
                    setPostVote(null);
                  } else {
                    setUpvotes((v) => v + (postVote === 'down' ? 2 : 1));
                    if (postVote === 'down') setDownvotes((v) => Math.max(0, v - 1));
                    setPostVote('up');
                  }
                }
                setPostVote((prev) => (prev === 'up' ? null : 'up'));
              } catch (err) {
                console.error('Vote error:', err);
              }
            }}
            className={`p-1 rounded hover:bg-[#1a1a1a] transition-colors ${
              postVote === 'up' ? 'text-[#CBAA5A]' : 'text-[#606060] hover:text-[#CBAA5A]'
            }`}
          >
            <ArrowBigUp className="w-5 h-5" fill={postVote === 'up' ? 'currentColor' : 'none'} />
          </button>
          <span className={`text-xs font-bold my-0.5 ${
            postVote === 'up' ? 'text-[#CBAA5A]' : postVote === 'down' ? 'text-[#606060]' : 'text-[#d0d0d0]'
          }`}>
            {upvotes - downvotes > 0 ? upvotes - downvotes : '•'}
          </span>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!user) {
                navigate('/auth');
                return;
              }
              try {
                const data = await apiPost(`/api/forum/posts/${post.id}/vote`, { vote_type: 'down' });
                if (typeof data?.upvotes === 'number' && typeof data?.downvotes === 'number') {
                  setUpvotes(data.upvotes);
                  setDownvotes(data.downvotes);
                } else {
                  if (postVote === 'down') {
                    setDownvotes((v) => Math.max(0, v - 1));
                    setPostVote(null);
                  } else {
                    setDownvotes((v) => v + (postVote === 'up' ? 2 : 1));
                    if (postVote === 'up') setUpvotes((v) => Math.max(0, v - 1));
                    setPostVote('down');
                  }
                }
                setPostVote((prev) => (prev === 'down' ? null : 'down'));
              } catch (err) {
                console.error('Vote error:', err);
              }
            }}
            className={`p-1 rounded hover:bg-[#1a1a1a] transition-colors ${
              postVote === 'down' ? 'text-[#606060]' : 'text-[#606060] hover:text-[#808080]'
            }`}
          >
            <ArrowBigDown className="w-5 h-5" fill={postVote === 'down' ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0 py-2 px-3 overflow-hidden">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {post.prediction_category && (
                <Badge variant="outline" className={`text-[10px] uppercase ${categoryClass}`}>
                  {post.prediction_category}
                </Badge>
              )}
              {post.company && (
                <span className="text-[#888] text-xs font-gilroy">{post.company}</span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-[#666] shrink-0">
              <Clock className="w-3 h-3" />
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </div>
          </div>

      {/* Resolution Status Banner */}
      {isResolved && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg mb-3 ${
          resolvedYes ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
        }`}>
          {resolvedYes ? (
            <CheckCircle2 className="w-4 h-4 text-green-400" />
          ) : (
            <XCircle className="w-4 h-4 text-red-400" />
          )}
          <span className={`text-sm font-gilroy ${resolvedYes ? 'text-green-400' : 'text-red-400'}`}>
            Resolved: {resolvedYes ? 'YES' : 'NO'}
          </span>
        </div>
      )}

      {/* Question - use a Link for reliable navigation */}
      <Link
        to={`/forum/post/${post.id}`}
        onClick={(e) => e.stopPropagation()}
        className="block text-white font-gilroy text-base sm:text-lg font-semibold mb-3 leading-tight cursor-pointer hover:text-[#CBAA5A] transition-colors"
      >
        {post.content}
      </Link>

      {/* Headline context */}
      {post.headline && (
        <p className="text-[#888] text-sm mb-3 line-clamp-2">
          {post.headline}
        </p>
      )}

      {/* Probability Meter */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-green-400 font-gilroy font-semibold">{yesProbability}% YES</span>
          <span className="text-red-400 font-gilroy font-semibold">{noProbability}% NO</span>
        </div>
        <div className="h-2 bg-[#222] rounded-full overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all duration-500"
            style={{ width: `${yesProbability}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-red-400 to-red-500 transition-all duration-500"
            style={{ width: `${noProbability}%` }}
          />
        </div>
        <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-[#666]">
          <TrendingUp className="w-3 h-3" />
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Vote Buttons */}
      {!isResolved && (
        <div className="flex gap-2 mb-4" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="outline"
            className={`flex-1 ${
              userVote === true
                ? 'bg-green-500/20 border-green-500 text-green-400 hover:bg-green-500/30'
                : 'border-[#333] text-[#888] hover:border-green-500/50 hover:text-green-400'
            }`}
            onClick={() => handleVote(true)}
            disabled={voting}
          >
            <ThumbsUp className="w-4 h-4 mr-2" />
            YES ({yesCount})
          </Button>
          <Button
            variant="outline"
            className={`flex-1 ${
              userVote === false
                ? 'bg-red-500/20 border-red-500 text-red-400 hover:bg-red-500/30'
                : 'border-[#333] text-[#888] hover:border-red-500/50 hover:text-red-400'
            }`}
            onClick={() => handleVote(false)}
            disabled={voting}
          >
            <ThumbsDown className="w-4 h-4 mr-2" />
            NO ({noCount})
          </Button>
        </div>
      )}

      {/* Resolution Info */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-[#666] border-t border-[#222] pt-3">
        {post.resolution_date && (
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>Resolves: {format(new Date(post.resolution_date), 'MMM d, yyyy')}</span>
            {daysUntilResolution !== null && daysUntilResolution > 0 && (
              <span className="text-[#CBAA5A]">({daysUntilResolution}d)</span>
            )}
          </div>
        )}
        {post.resolution_source && (
          <div className="flex items-center gap-1">
            <ExternalLink className="w-3 h-3" />
            <span className="truncate max-w-[150px]">{post.resolution_source}</span>
          </div>
        )}
      </div>

      {/* Reactions Footer */}
      <div className="mt-3 pt-3 border-t border-[#222]" onClick={(e) => e.stopPropagation()}>
        <PostReactions
          postId={post.id}
          upvotes={upvotes}
          downvotes={downvotes}
          userVote={postVote}
          hideVotes={true}
          commentCount={post.comment_count || 0}
          onCommentClick={() => navigate(`/forum/post/${post.id}`)}
          compact={true}
        />
      </div>

      {/* Comments Section - Only show inline if expanded */}
      {showComments && (
        <div className="mt-3 pt-3 border-t border-[#222]" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={toggleComments}
            className="flex items-center gap-2 text-sm text-[#888] hover:text-white transition-colors mb-3"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{post.comment_count || comments.length || 0} comments</span>
            <ChevronUp className="w-4 h-4" />
          </button>
          <div className="mt-3 space-y-3">
            {loadingComments ? (
              <p className="text-[#666] text-sm">Loading comments...</p>
            ) : comments.length === 0 ? (
              <p className="text-[#666] text-sm">No comments yet. Be the first!</p>
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
                  placeholder="Add your thoughts..."
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
        </div>
      )}
        </div>
      </div>
  );
};

