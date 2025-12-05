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
  ArrowBigUp,
  ArrowBigDown,
  Share2,
  Bookmark
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

export const ForumPostCard = ({ post, onDelete }: ForumPostCardProps) => {
  const { user } = useAuth();
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || {});
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [upvoted, setUpvoted] = useState(false);
  const [downvoted, setDownvoted] = useState(false);
  
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
  const hasVoted = pollData?.user_vote !== undefined;

  // Calculate vote score
  const voteScore = totalReactions + (upvoted ? 1 : 0) - (downvoted ? 1 : 0);

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

  const handleUpvote = async () => {
    if (upvoted) {
      setUpvoted(false);
    } else {
      setUpvoted(true);
      setDownvoted(false);
    }
    // Also trigger reaction API for tracking
    try {
      await apiPost('/api/forum/reactions', {
        target_type: 'post',
        target_id: post.id,
        emoji: '👍'
      });
    } catch (err) {
      console.error('Error toggling upvote:', err);
    }
  };

  const handleDownvote = async () => {
    if (downvoted) {
      setDownvoted(false);
    } else {
      setDownvoted(true);
      setUpvoted(false);
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
    <article className="font-reddit bg-[#0a0a0a] hover:bg-[#111] border border-[#1a1a1a] rounded-sm overflow-hidden transition-colors duration-150">
      <div className="flex min-w-0">
        {/* Reddit-style Vote Column */}
        <div className="flex flex-col items-center py-2 px-2 bg-[#080808] w-10 flex-shrink-0">
          <button 
            onClick={handleUpvote}
            className={`p-1 rounded hover:bg-[#1a1a1a] transition-colors ${upvoted ? 'text-[#CBAA5A]' : 'text-[#606060] hover:text-[#CBAA5A]'}`}
          >
            <ArrowBigUp className="w-5 h-5" fill={upvoted ? 'currentColor' : 'none'} />
          </button>
          <span className={`text-xs font-bold my-0.5 ${upvoted ? 'text-[#CBAA5A]' : downvoted ? 'text-[#606060]' : 'text-[#d0d0d0]'}`}>
            {voteScore > 0 ? voteScore : '•'}
          </span>
          <button 
            onClick={handleDownvote}
            className={`p-1 rounded hover:bg-[#1a1a1a] transition-colors ${downvoted ? 'text-[#606060]' : 'text-[#606060] hover:text-[#808080]'}`}
          >
            <ArrowBigDown className="w-5 h-5" fill={downvoted ? 'currentColor' : 'none'} />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 py-2 px-3 overflow-hidden">
          {/* Header - Reddit style */}
          <div className="flex items-center gap-2 text-xs mb-2">
            {/* Community icon only (no name as per request) */}
            <span className="text-base" title={post.community.name}>{post.community.icon}</span>
            <span className="text-[#606060]">•</span>
            <span className="text-[#606060]">Posted by</span>
            <span className="text-[#808080] hover:underline cursor-pointer">
              u/{post.user.anonymous_name || 'Anonymous'}
            </span>
            <span className="text-[#606060]">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </span>
            
            {isOwner && (
              <DropdownMenu>
                <DropdownMenuTrigger className="ml-auto p-1 rounded hover:bg-[#1a1a1a] transition-colors">
                  <MoreHorizontal className="w-4 h-4 text-[#606060]" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333]">
                  <DropdownMenuItem onClick={handleDelete} className="text-red-400 focus:text-red-400" disabled={deleting}>
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          {/* Day Badge */}
          {post.day_number && (
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-[#CBAA5A] text-black text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                Day {post.day_number}
              </span>
              {post.milestone_title && (
                <span className="text-[#CBAA5A] text-xs">🎯 {post.milestone_title}</span>
              )}
            </div>
          )}

          {/* Title */}
          <h3 className="text-[#e0e0e0] text-lg font-medium leading-snug mb-2 hover:text-white cursor-pointer">
            {post.content}
          </h3>
          
          {/* Project Link */}
          {post.project && (
            <a
              href={post.project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#CBAA5A] hover:text-[#D4B76A] transition-colors mb-2"
            >
              <span className="font-medium">{post.project.name}</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          {/* Content/Poll Toggle */}
          {hasBothContentAndPoll && (
            <div className="flex gap-1 mb-3">
              <button
                onClick={() => setActiveTab('content')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  activeTab === 'content'
                    ? 'bg-[#CBAA5A] text-black'
                    : 'bg-[#1a1a1a] text-[#606060] hover:text-[#909090] hover:bg-[#252525]'
                }`}
              >
                Content
              </button>
              <button
                onClick={() => setActiveTab('poll')}
                className={`px-3 py-1 text-xs font-medium rounded transition-all ${
                  activeTab === 'poll'
                    ? 'bg-[#CBAA5A] text-black'
                    : 'bg-[#1a1a1a] text-[#606060] hover:text-[#909090] hover:bg-[#252525]'
                }`}
              >
                Poll
              </button>
            </div>
          )}

          {/* Content Body */}
          {post.body && (activeTab === 'content' || !pollData) && (
            <p className="text-[#b8b8b8] text-sm leading-relaxed whitespace-pre-wrap mb-3">
              {post.body}
            </p>
          )}

          {/* Media */}
          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mb-3">
              <div className={`grid gap-2 ${
                post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
              }`}>
                {post.media_urls.slice(0, 4).map((url, i) => (
                  <div key={i} className="relative aspect-video overflow-hidden rounded border border-[#1a1a1a]">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Poll Section */}
          {pollData && (activeTab === 'poll' || !post.body) && (
            <div className="mb-3">
              <div className="bg-[#0a0a0a] rounded p-3 border border-[#1a1a1a]">
                <p className="text-[#e0e0e0] font-medium text-sm mb-3">{pollData.question}</p>
                
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
                        className={`w-full relative overflow-hidden rounded transition-all duration-200 ${
                          hasVoted 
                            ? 'cursor-default' 
                            : 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]'
                        } ${
                          isSelected 
                            ? 'ring-1 ring-[#CBAA5A]' 
                            : ''
                        }`}
                      >
                        {/* Background */}
                        <div className={`absolute inset-0 transition-all duration-500 ${
                          hasVoted ? 'bg-[#111]' : 'bg-[#1a1a1a] hover:bg-[#252525]'
                        }`} />
                        
                        {/* Progress bar */}
                        {hasVoted && (
                          <div 
                            className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out ${
                              isWinning ? 'bg-[#CBAA5A]/20' : 'bg-[#252525]'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        )}
                        
                        <div className="relative px-3 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full border flex items-center justify-center transition-all ${
                              isSelected 
                                ? 'border-[#CBAA5A] bg-[#CBAA5A]' 
                                : 'border-[#444]'
                            }`}>
                              {isSelected && <Check className="w-2 h-2 text-black" />}
                            </div>
                            <span className={`text-xs ${isSelected ? 'text-white font-medium' : 'text-[#aaa]'}`}>
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
                
                <p className="text-[10px] text-[#555] mt-2 uppercase tracking-wide">
                  {pollData.total_votes} vote{pollData.total_votes !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          )}

          {/* Reddit-style Action Bar */}
          <div className="flex items-center gap-1 -ml-1">
            <button 
              onClick={handleToggleComments}
              className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors text-[#606060] hover:text-[#808080] text-xs font-bold"
            >
              <MessageSquare className="w-4 h-4" />
              {commentCount} Comments
            </button>
            
            <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors text-[#606060] hover:text-[#808080] text-xs font-bold">
              <Share2 className="w-4 h-4" />
              Share
            </button>
            
            <button className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-[#1a1a1a] transition-colors text-[#606060] hover:text-[#808080] text-xs font-bold">
              <Bookmark className="w-4 h-4" />
              Save
            </button>
          </div>

          {/* Comments Section */}
          {showComments && (
            <div className="mt-3 pt-3 border-t border-[#1a1a1a]">
              {/* Comment input */}
              <div className="flex items-start gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#606060] text-xs font-bold">
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="What are your thoughts?"
                    className="w-full bg-[#1a1a1a] border border-[#333] rounded px-3 py-2 text-sm text-white placeholder-[#555] focus:outline-none focus:border-[#CBAA5A] transition-colors resize-none min-h-[80px]"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || submittingComment}
                      className="px-4 py-1.5 bg-[#CBAA5A] hover:bg-[#D4B76A] disabled:bg-[#333] disabled:text-[#555] text-black font-bold text-xs rounded-full transition-colors"
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Comments list */}
              {loadingComments ? (
                <div className="py-4 text-center text-[#555] text-sm">Loading comments...</div>
              ) : comments.length === 0 ? (
                <div className="py-4 text-center text-[#444] text-sm">No comments yet. Be the first!</div>
              ) : (
                <div className="space-y-3">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#606060] text-xs font-bold flex-shrink-0">
                        {comment.user?.anonymous_name?.charAt(0).toUpperCase() || 'A'}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-[#808080] font-medium">
                            {comment.user?.anonymous_name || 'Anonymous'}
                          </span>
                          <span className="text-[10px] text-[#555]">
                            {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                          </span>
                        </div>
                        <p className="text-sm text-[#c0c0c0] leading-relaxed">{comment.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  );
};
