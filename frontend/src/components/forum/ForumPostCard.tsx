import { useState, useEffect } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { apiPost, apiDelete, apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { 
  MoreHorizontal, 
  Trash2, 
  ExternalLink, 
  Check, 
  MessageSquare, 
  ChevronDown,
  ChevronUp,
  Send,
  ArrowBigUp
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Poll {
  id: string;
  question: string;
  options: string[];
  vote_counts: number[];
  total_votes: number;
  user_vote?: number;
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

interface ForumPost {
  id: string;
  content: string;
  body?: string | null;
  media_urls: string[] | null;
  post_type: string;
  day_number: number | null;
  milestone_title: string | null;
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
  project?: {
    id: string;
    name: string;
    url: string;
    logo_url: string;
  } | null;
  reaction_counts: Record<string, number> | null;
  poll?: Poll | null;
  comment_count?: number;
}

interface ForumPostCardProps {
  post: ForumPost;
  onDelete?: () => void;
}

const EMOJIS = ['❤️', '🔥', '🚀', '💯', '🙌', '🤝', '💸', '👀'];

export const ForumPostCard = ({ post, onDelete }: ForumPostCardProps) => {
  const { user } = useAuth();
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || {});
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  
  // Poll state
  const [pollData, setPollData] = useState<Poll | null>(post.poll || null);
  const [voting, setVoting] = useState(false);
  
  // Content/Poll toggle state - default to 'content' if body exists, else 'poll'
  const [activeTab, setActiveTab] = useState<'content' | 'poll'>(post.body ? 'content' : 'poll');
  const hasBothContentAndPoll = !!post.body && !!pollData;
  
  // Comments state
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);

  if (!post?.user || !post?.community) {
    return null;
  }

  const isOwner = user?.id === post.user.id;
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const topEmojis = EMOJIS.filter((e) => (reactionCounts[e] || 0) > 0).slice(0, 3);
  const hasVoted = pollData?.user_vote !== undefined;

  const loadComments = async () => {
    if (loadingComments) return;
    setLoadingComments(true);
    try {
      const response = await apiGet(`/api/forum/posts/${post.id}/comments`);
      setComments(response.comments || []);
    } catch (err) {
      console.error('Error loading comments:', err);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments && comments.length === 0) {
      loadComments();
    }
    setShowComments(!showComments);
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submittingComment) return;
    
    setSubmittingComment(true);
    try {
      const response = await apiPost(`/api/forum/posts/${post.id}/comments`, {
        content: newComment.trim()
      });
      
      if (response.comment) {
        setComments(prev => [response.comment, ...prev]);
        setCommentCount(prev => prev + 1);
        setNewComment('');
      }
    } catch (err) {
      console.error('Error submitting comment:', err);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleReactionToggle = async (emoji: string) => {
    try {
      const response = await apiPost('/api/forum/reactions', {
        target_type: 'post',
        target_id: post.id,
        emoji
      });

      if (response.added) {
        setReactionCounts(prev => ({ ...prev, [emoji]: (prev[emoji] || 0) + 1 }));
        setUserReactions(prev => [...prev, emoji]);
      } else if (response.removed) {
        setReactionCounts(prev => ({ ...prev, [emoji]: Math.max((prev[emoji] || 1) - 1, 0) }));
        setUserReactions(prev => prev.filter(e => e !== emoji));
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this post?')) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/forum/posts/${post.id}`);
      onDelete?.();
    } catch (err) {
      console.error('Error deleting post:', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleVote = async (optionIndex: number) => {
    if (!pollData || hasVoted || voting) return;
    
    setVoting(true);
    try {
      const response = await apiPost(`/api/forum/polls/${pollData.id}/vote`, {
        option_index: optionIndex
      });
      
      if (response.success) {
        setPollData({
          ...pollData,
          vote_counts: response.vote_counts,
          total_votes: response.total_votes,
          user_vote: response.user_vote
        });
      }
    } catch (err) {
      console.error('Error voting:', err);
    } finally {
      setVoting(false);
    }
  };

  const getPercentage = (count: number) => {
    if (!pollData || pollData.total_votes === 0) return 0;
    return Math.round((count / pollData.total_votes) * 100);
  };

  return (
    <article 
      className="relative bg-gradient-to-b from-[#0f0f0f] to-[#0a0a0a] rounded-2xl border border-[#1a1a1a] overflow-hidden transition-all duration-300 hover:border-[#252525] hover:shadow-2xl hover:shadow-black/50"
      style={{ fontFamily: "'Gilroy', sans-serif" }}
    >
      {/* Left accent bar */}
      <div 
        className="absolute left-0 top-0 bottom-0 w-1 opacity-60"
        style={{ backgroundColor: post.community.color }}
      />
      
      {/* Main content */}
      <div className="pl-5 pr-4">
        {/* Header */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <div className="flex items-center gap-3">
            <span 
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ 
                backgroundColor: `${post.community.color}15`,
                color: post.community.color 
              }}
            >
              {post.community.icon} {post.community.name}
            </span>
            <span className="text-[11px] text-[#505050]">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#404040]">
              {post.user.anonymous_name || 'Anonymous'}
            </span>
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity p-1 rounded hover:bg-[#1a1a1a]">
                  <MoreHorizontal className="w-4 h-4 text-[#505050]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#141414] border-[#252525]">
                  <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-400" disabled={deleting}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Day Badge */}
        {post.day_number && (
          <div className="flex items-center gap-2 pb-2">
            <span className="bg-[#CBAA5A] text-black text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">
              Day {post.day_number}
            </span>
            {post.milestone_title && (
              <span className="text-[#CBAA5A] text-xs">🎯 {post.milestone_title}</span>
            )}
          </div>
        )}

        {/* Title (always visible) */}
        <div className="py-2">
          <p className="text-[#f0f0f0] text-[15px] font-semibold leading-snug">
            {post.content}
          </p>
          
          {/* Project Link */}
          {post.project && (
            <a
              href={post.project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 text-sm text-[#CBAA5A] hover:text-[#D4B76A] transition-colors"
            >
              <span className="font-medium">{post.project.name}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* Content/Poll Toggle */}
        {hasBothContentAndPoll && (
          <div className="flex gap-1 pb-3">
            <button
              onClick={() => setActiveTab('content')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'content'
                  ? 'bg-[#CBAA5A] text-black'
                  : 'bg-[#141414] text-[#606060] hover:text-[#909090] hover:bg-[#1a1a1a]'
              }`}
            >
              Content
            </button>
            <button
              onClick={() => setActiveTab('poll')}
              className={`px-4 py-1.5 text-xs font-medium rounded-lg transition-all ${
                activeTab === 'poll'
                  ? 'bg-[#CBAA5A] text-black'
                  : 'bg-[#141414] text-[#606060] hover:text-[#909090] hover:bg-[#1a1a1a]'
              }`}
            >
              Poll
            </button>
          </div>
        )}

        {/* Content Body (shown when tab is content or no poll) */}
        {post.body && (activeTab === 'content' || !pollData) && (
          <div className="pb-3">
            <p className="text-[#b8b8b8] text-[14px] leading-[1.75] whitespace-pre-wrap">
              {post.body}
            </p>
          </div>
        )}

        {/* Media */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="pb-4">
            <div className={`grid gap-2 ${
              post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
            }`}>
              {post.media_urls.slice(0, 4).map((url, i) => (
                <div key={i} className="relative aspect-video overflow-hidden rounded-xl border border-[#1a1a1a]">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Poll Section (shown when tab is poll or no body) */}
        {pollData && (activeTab === 'poll' || !post.body) && (
          <div className="pb-4">
            <div className="bg-[#080808] rounded-xl p-4 border border-[#181818]">
              <p className="text-[#f0f0f0] font-semibold text-sm mb-4">{pollData.question}</p>
              
              <div className="space-y-2">
                {pollData.options.map((option, index) => {
                  const percentage = getPercentage(pollData.vote_counts[index] || 0);
                  const isSelected = pollData.user_vote === index;
                  const isWinning = hasVoted && percentage === Math.max(...pollData.vote_counts.map((_, i) => getPercentage(pollData.vote_counts[i] || 0)));
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleVote(index)}
                      disabled={hasVoted || voting}
                      className={`w-full relative overflow-hidden rounded-lg transition-all duration-200 ${
                        hasVoted 
                          ? 'cursor-default' 
                          : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                      } ${
                        isSelected 
                          ? 'ring-2 ring-[#CBAA5A] ring-offset-1 ring-offset-[#080808]' 
                          : ''
                      }`}
                    >
                      {/* Background */}
                      <div className={`absolute inset-0 transition-all duration-500 ${
                        hasVoted ? 'bg-[#111]' : 'bg-[#141414] hover:bg-[#181818]'
                      }`} />
                      
                      {/* Progress bar */}
                      {hasVoted && (
                        <div 
                          className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                            isWinning ? 'bg-[#CBAA5A]/20' : 'bg-[#1a1a1a]'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      )}
                      
                      <div className="relative px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all ${
                            isSelected 
                              ? 'border-[#CBAA5A] bg-[#CBAA5A]' 
                              : 'border-[#333]'
                          }`}>
                            {isSelected && <Check className="w-2.5 h-2.5 text-black" />}
                          </div>
                          <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-[#aaa]'}`}>
                            {option}
                          </span>
                        </div>
                        
                        {hasVoted && (
                          <span className={`text-xs font-bold ${isWinning ? 'text-[#CBAA5A]' : 'text-[#555]'}`}>
                            {percentage}%
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              
              <p className="text-[10px] text-[#454545] mt-3 uppercase tracking-wide">
                {pollData.total_votes} vote{pollData.total_votes !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center gap-1 py-3 border-t border-[#141414]">
          {/* Reactions */}
          <div className="flex items-center group/reactions relative">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors">
              {topEmojis.length > 0 ? (
                <span className="flex -space-x-0.5">
                  {topEmojis.map(e => <span key={e} className="text-sm">{e}</span>)}
                </span>
              ) : (
                <ArrowBigUp className="w-5 h-5 text-[#505050]" />
              )}
              {totalReactions > 0 && (
                <span className="text-xs font-medium text-[#606060]">{totalReactions}</span>
              )}
            </button>
            
            {/* Emoji picker */}
            <div className="absolute bottom-full left-0 pb-2 hidden group-hover/reactions:block z-20">
              <div className="flex bg-[#141414] rounded-xl px-1.5 py-1.5 gap-0.5 shadow-2xl border border-[#252525]">
                {EMOJIS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReactionToggle(emoji)}
                    className={`p-2 hover:bg-[#252525] rounded-lg transition-all hover:scale-110 ${
                      userReactions.includes(emoji) ? 'bg-[#252525]' : ''
                    }`}
                  >
                    <span className="text-base">{emoji}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Comments toggle */}
          <button 
            onClick={handleToggleComments}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-[#1a1a1a] transition-colors text-[#505050] hover:text-[#808080]"
          >
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-medium">{commentCount}</span>
            {showComments ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="pb-4 border-t border-[#141414]">
            {/* Comment input */}
            <div className="flex items-center gap-3 py-3">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment()}
                placeholder="Add a comment..."
                className="flex-1 bg-[#141414] border border-[#1f1f1f] rounded-lg px-4 py-2.5 text-sm text-white placeholder-[#454545] focus:outline-none focus:border-[#333] transition-colors"
              />
              <button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submittingComment}
                className="p-2.5 bg-[#CBAA5A] hover:bg-[#D4B76A] disabled:bg-[#252525] disabled:text-[#454545] rounded-lg transition-colors"
              >
                <Send className="w-4 h-4 text-black" />
              </button>
            </div>
            
            {/* Comments list */}
            {loadingComments ? (
              <div className="py-6 text-center text-[#454545] text-sm">Loading comments...</div>
            ) : comments.length === 0 ? (
              <div className="py-6 text-center text-[#353535] text-sm">No comments yet. Be the first!</div>
            ) : (
              <div className="space-y-1">
                {comments.map((comment) => (
                  <div key={comment.id} className="py-2.5 px-3 rounded-lg hover:bg-[#111] transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-[#606060] font-medium">
                        {comment.user?.anonymous_name || 'Anonymous'}
                      </span>
                      <span className="text-[10px] text-[#353535]">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#c0c0c0] leading-relaxed">{comment.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </article>
  );
};
