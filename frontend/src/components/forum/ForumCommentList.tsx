import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Comment {
  id: string;
  content: string;
  quick_reply_type: string | null;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string;
  } | null;
}

interface ForumCommentListProps {
  postId: string;
  onCommentAdded?: () => void;
}

const QUICK_REPLY_EMOJI: Record<string, string> = {
  can_intro: '🤝',
  paid_intro: '💸',
  watching: '👀',
  ship_it: '🚀',
  dm_me: '💬'
};

export const ForumCommentList = ({ postId, onCommentAdded }: ForumCommentListProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      try {
        const data = await apiGet(`/api/forum/posts/${postId}`);
        setComments(data.post?.comments || []);
      } catch (err) {
        console.error('Error fetching comments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchComments();
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const data = await apiPost(`/api/forum/posts/${postId}/comments`, {
        content: newComment.trim()
      });
      setComments(prev => [...prev, data.comment]);
      setNewComment('');
      onCommentAdded?.();
    } catch (err) {
      console.error('Error creating comment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    try {
      await apiDelete(`/api/forum/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-4 h-4 animate-spin text-[#555]" />
      </div>
    );
  }

  return (
    <div className="p-3">
      {/* Scrollable Comments Container */}
      <div className="max-h-[200px] overflow-y-auto space-y-2 mb-3 scrollbar-thin scrollbar-thumb-[#333] scrollbar-track-transparent">
        {comments.filter(c => c.user?.id).map((comment) => {
          const isOwner = user?.id === comment.user?.id;
          const quickEmoji = comment.quick_reply_type ? QUICK_REPLY_EMOJI[comment.quick_reply_type] : null;

          return (
            <div key={comment.id} className="flex items-start gap-2 group">
              {/* Comment emoji indicator */}
              <span className="text-sm mt-0.5">💬</span>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span 
                    className="text-[#888] text-xs cursor-pointer hover:text-[#CBAA5A]"
                    onClick={() => navigate(`/profile/${comment.user!.id}`)}
                  >
                    {comment.user!.first_name}
                  </span>
                  <span className="text-[#444] text-[10px]">·</span>
                  <span className="text-[#444] text-[10px]">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                  {isOwner && (
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="opacity-0 group-hover:opacity-100 text-[#444] hover:text-red-500 transition-all ml-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <p className="text-[#ccc] text-sm font-gilroy leading-snug">
                  {quickEmoji && <span className="mr-1">{quickEmoji}</span>}
                  {comment.content}
                </p>
              </div>
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="text-[#444] text-xs text-center py-2">No comments yet</p>
        )}
      </div>

      {/* Minimal Comment Input */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-[#222] pt-3">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-transparent text-sm text-white placeholder:text-[#444] outline-none font-sans"
          disabled={submitting}
        />
        <button
          type="submit"
          disabled={!newComment.trim() || submitting}
          className="text-[#CBAA5A] text-xs font-medium disabled:text-[#333] disabled:cursor-not-allowed"
        >
          {submitting ? '...' : 'Post'}
        </button>
      </form>
    </div>
  );
};
