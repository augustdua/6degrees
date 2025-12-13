import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTracker } from '@/hooks/useInteractionTracker';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';

interface PostReactionsProps {
  postId: string;
  upvotes: number;
  downvotes: number;
  userVote?: 'up' | 'down' | null;
  commentCount?: number;
  saved?: boolean;
  onVoteChange?: (upvotes: number, downvotes: number, userVote: 'up' | 'down' | null) => void;
  onSaveChange?: (saved: boolean) => void;
  onCommentClick?: () => void;
  showCommentCount?: boolean;
  compact?: boolean;
  className?: string;
}

export const PostReactions = ({
  postId,
  upvotes: initialUpvotes,
  downvotes: initialDownvotes,
  userVote: initialUserVote,
  commentCount = 0,
  saved: initialSaved = false,
  onVoteChange,
  onSaveChange,
  onCommentClick,
  showCommentCount = true,
  compact = false,
  className = ''
}: PostReactionsProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { track } = useTracker();
  const { toast } = useToast();

  const [upvotes, setUpvotes] = useState(initialUpvotes);
  const [downvotes, setDownvotes] = useState(initialDownvotes);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(initialUserVote || null);
  const [saved, setSaved] = useState(initialSaved);
  const [voting, setVoting] = useState(false);

  const score = upvotes - downvotes;

  const handleVote = useCallback(async (voteType: 'up' | 'down', e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Please sign in to vote'
      });
      return;
    }

    if (voting) return;
    
    setVoting(true);
    try {
      if (userVote === voteType) {
        // Remove vote
        const data = await apiDelete(`/api/forum/posts/${postId}/vote`);
        setUserVote(null);
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
        onVoteChange?.(data.upvotes, data.downvotes, null);
      } else {
        // Add/change vote
        const data = await apiPost(`/api/forum/posts/${postId}/vote`, { vote_type: voteType });
        setUserVote(voteType);
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
        onVoteChange?.(data.upvotes, data.downvotes, voteType);
      }
      
      track({
        target_type: 'forum_post',
        target_id: postId,
        event_type: 'reaction',
        metadata: { vote_type: voteType }
      });
    } catch (err: any) {
      console.error('Vote error:', err);
    } finally {
      setVoting(false);
    }
  }, [user, voting, userVote, postId, track, toast, onVoteChange]);

  const handleSave = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Sign in required',
        description: 'Please sign in to save posts'
      });
      return;
    }

    try {
      await apiPost(`/api/forum/posts/${postId}/save`, {});
      const newSaved = !saved;
      setSaved(newSaved);
      onSaveChange?.(newSaved);
      
      toast({
        title: newSaved ? 'Saved' : 'Unsaved',
        description: newSaved ? 'Added to saved posts' : 'Removed from saved posts'
      });
    } catch (err: any) {
      console.error('Save error:', err);
    }
  }, [user, saved, postId, toast, onSaveChange]);

  const handleShare = useCallback(async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const url = `${window.location.origin}/forum/post/${postId}`;
    
    if (navigator.share) {
      try {
        await navigator.share({ url });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(url);
      toast({
        title: 'Link copied',
        description: 'Post link copied to clipboard'
      });
    }
    
    track({
      target_type: 'forum_post',
      target_id: postId,
      event_type: 'share',
      metadata: { method: navigator.share ? 'native' : 'clipboard' }
    });
  }, [postId, track, toast]);

  const handleCommentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onCommentClick) {
      onCommentClick();
    } else {
      navigate(`/forum/post/${postId}`);
    }
  }, [postId, navigate, onCommentClick]);

  if (compact) {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        {/* Compact vote buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => handleVote('up', e)}
            disabled={voting}
            className={`p-0.5 rounded transition-colors ${
              userVote === 'up'
                ? 'text-orange-500'
                : 'text-[#666] hover:text-orange-400'
            }`}
          >
            <ArrowBigUp className="w-5 h-5" />
          </button>
          <span className={`text-xs font-medium min-w-[20px] text-center ${
            score > 0 ? 'text-orange-400' : score < 0 ? 'text-blue-400' : 'text-[#888]'
          }`}>
            {score}
          </span>
          <button
            onClick={(e) => handleVote('down', e)}
            disabled={voting}
            className={`p-0.5 rounded transition-colors ${
              userVote === 'down'
                ? 'text-blue-500'
                : 'text-[#666] hover:text-blue-400'
            }`}
          >
            <ArrowBigDown className="w-5 h-5" />
          </button>
        </div>

        {showCommentCount && (
          <button
            onClick={handleCommentClick}
            className="flex items-center gap-1 text-xs text-[#666] hover:text-white transition-colors"
          >
            <MessageSquare className="w-4 h-4" />
            <span>{commentCount}</span>
          </button>
        )}

        <button
          onClick={handleShare}
          className="p-1 text-[#666] hover:text-white transition-colors"
        >
          <Share2 className="w-4 h-4" />
        </button>

        <button
          onClick={handleSave}
          className={`p-1 transition-colors ${
            saved ? 'text-[#CBAA5A]' : 'text-[#666] hover:text-white'
          }`}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {/* Vote buttons */}
      <div className="flex items-center gap-1 bg-[#1a1a1a] rounded-full px-1">
        <button
          onClick={(e) => handleVote('up', e)}
          disabled={voting}
          className={`p-1.5 rounded-full transition-colors ${
            userVote === 'up'
              ? 'text-orange-500 bg-orange-500/10'
              : 'text-[#888] hover:text-orange-400 hover:bg-[#222]'
          }`}
        >
          <ArrowBigUp className="w-5 h-5" />
        </button>
        <span className={`text-sm font-medium min-w-[24px] text-center ${
          score > 0 ? 'text-orange-400' : score < 0 ? 'text-blue-400' : 'text-[#888]'
        }`}>
          {score}
        </span>
        <button
          onClick={(e) => handleVote('down', e)}
          disabled={voting}
          className={`p-1.5 rounded-full transition-colors ${
            userVote === 'down'
              ? 'text-blue-500 bg-blue-500/10'
              : 'text-[#888] hover:text-blue-400 hover:bg-[#222]'
          }`}
        >
          <ArrowBigDown className="w-5 h-5" />
        </button>
      </div>

      {/* Comments */}
      {showCommentCount && (
        <button
          onClick={handleCommentClick}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] text-sm text-[#888] hover:text-white hover:bg-[#222] transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          <span>{commentCount}</span>
        </button>
      )}

      {/* Share */}
      <button
        onClick={handleShare}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a1a1a] text-sm text-[#888] hover:text-white hover:bg-[#222] transition-colors"
      >
        <Share2 className="w-4 h-4" />
        <span>Share</span>
      </button>

      {/* Save/Bookmark */}
      <button
        onClick={handleSave}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm transition-colors ${
          saved 
            ? 'bg-[#CBAA5A]/10 text-[#CBAA5A] hover:bg-[#CBAA5A]/20' 
            : 'bg-[#1a1a1a] text-[#888] hover:text-white hover:bg-[#222]'
        }`}
      >
        {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        <span>{saved ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  );
};

export default PostReactions;
