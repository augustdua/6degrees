import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { ForumReactionBar } from './ForumReactionBar';
import { Loader2, Send, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Comment {
  id: string;
  content: string;
  quick_reply_type: string | null;
  quick_reply_text: string | null;
  created_at: string;
  user: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string;
    membership_tier: string;
  };
  reaction_counts: Record<string, number>;
  user_reactions: string[];
}

interface ForumCommentListProps {
  postId: string;
  onCommentAdded?: () => void;
}

const QUICK_REPLY_STYLES: Record<string, { bg: string; text: string; icon: string }> = {
  can_intro: { bg: '#8B5CF6', text: 'I can intro you', icon: '🤝' },
  paid_intro: { bg: '#10B981', text: 'Paid intro available', icon: '💸' },
  watching: { bg: '#6B7280', text: 'Watching this', icon: '👀' },
  ship_it: { bg: '#F59E0B', text: 'Ship it', icon: '🚀' },
  dm_me: { bg: '#3B82F6', text: 'DM me', icon: '💬' }
};

const MEMBERSHIP_BADGES: Record<string, { label: string; color: string }> = {
  'black_platinum': { label: 'Black Platinum', color: '#1a1a2e' },
  'platinum': { label: 'Platinum', color: '#8B5CF6' },
  'gold': { label: 'Gold', color: '#F59E0B' },
  'silver': { label: 'Silver', color: '#9CA3AF' },
  'free': { label: '', color: '' }
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
      setComments(prev => [...prev, {
        ...data.comment,
        reaction_counts: {},
        user_reactions: []
      }]);
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

  const handleReactionToggle = async (commentId: string, emoji: string) => {
    try {
      const response = await apiPost('/api/forum/reactions', {
        target_type: 'comment',
        target_id: commentId,
        emoji
      });

      setComments(prev => prev.map(c => {
        if (c.id !== commentId) return c;
        
        const newCounts = { ...c.reaction_counts };
        const newUserReactions = [...c.user_reactions];

        if (response.added) {
          newCounts[emoji] = (newCounts[emoji] || 0) + 1;
          newUserReactions.push(emoji);
        } else if (response.removed) {
          newCounts[emoji] = Math.max((newCounts[emoji] || 1) - 1, 0);
          const idx = newUserReactions.indexOf(emoji);
          if (idx > -1) newUserReactions.splice(idx, 1);
        }

        return { ...c, reaction_counts: newCounts, user_reactions: newUserReactions };
      }));
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Comment Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="bg-[#0a0a0a] border-[#333] text-white placeholder:text-[#666] resize-none min-h-[60px]"
          disabled={submitting}
        />
        <Button 
          type="submit" 
          disabled={!newComment.trim() || submitting}
          className="bg-[#CBAA5A] text-black hover:bg-[#A88B3D]"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </form>

      {/* Comments */}
      <div className="space-y-3">
        {comments.map((comment) => {
          const isOwner = user?.id === comment.user.id;
          const membershipBadge = MEMBERSHIP_BADGES[comment.user.membership_tier] || MEMBERSHIP_BADGES['free'];
          const quickReplyStyle = comment.quick_reply_type ? QUICK_REPLY_STYLES[comment.quick_reply_type] : null;

          return (
            <div 
              key={comment.id} 
              className={`p-3 rounded-lg ${
                quickReplyStyle ? 'border-l-4' : 'bg-[#0a0a0a]'
              }`}
              style={{
                borderLeftColor: quickReplyStyle?.bg,
                backgroundColor: quickReplyStyle ? quickReplyStyle.bg + '10' : undefined
              }}
            >
              <div className="flex items-start gap-3">
                <Avatar 
                  className="w-8 h-8 cursor-pointer"
                  onClick={() => navigate(`/profile/${comment.user.id}`)}
                >
                  <AvatarImage src={comment.user.profile_picture_url} />
                  <AvatarFallback className="bg-[#222] text-white text-xs">
                    {comment.user.first_name?.[0]}{comment.user.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span 
                      className="font-gilroy text-white text-sm cursor-pointer hover:text-[#CBAA5A]"
                      onClick={() => navigate(`/profile/${comment.user.id}`)}
                    >
                      {comment.user.first_name} {comment.user.last_name}
                    </span>
                    {membershipBadge.label && (
                      <span 
                        className="text-[8px] px-1 py-0.5 rounded font-gilroy tracking-wider"
                        style={{ backgroundColor: membershipBadge.color, color: '#fff' }}
                      >
                        {membershipBadge.label}
                      </span>
                    )}
                    {quickReplyStyle && (
                      <span 
                        className="text-xs px-2 py-0.5 rounded-full font-gilroy"
                        style={{ backgroundColor: quickReplyStyle.bg, color: '#fff' }}
                      >
                        {quickReplyStyle.icon} {quickReplyStyle.text}
                      </span>
                    )}
                    <span className="text-[#666] text-xs">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                    {isOwner && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-[#666] hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>

                  {!quickReplyStyle && (
                    <p className="text-[#ccc] text-sm mt-1">{comment.content}</p>
                  )}

                  {/* Comment Reactions */}
                  <div className="mt-2 scale-90 origin-left">
                    <ForumReactionBar
                      reactionCounts={comment.reaction_counts}
                      userReactions={comment.user_reactions}
                      onReactionToggle={(emoji) => handleReactionToggle(comment.id, emoji)}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {comments.length === 0 && (
          <p className="text-center text-[#666] text-sm py-4">
            No comments yet. Be the first!
          </p>
        )}
      </div>
    </div>
  );
};

