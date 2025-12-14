import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTracker } from '@/hooks/useInteractionTracker';
import { useToast } from '@/hooks/use-toast';
import { markForumPostSeen } from '@/lib/forumSeen';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { PostReactions } from '@/components/forum/PostReactions';
import {
  ArrowLeft,
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Bookmark,
  BookmarkCheck,
  ExternalLink,
  Send,
  Loader2,
  Clock,
  User,
  ChevronUp,
  ChevronDown,
  TrendingUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  user?: {
    id: string;
    anonymous_name: string;
  };
  quick_reply_type?: string;
}

type CommentNode = Comment & { replies: CommentNode[] };

interface ForumPost {
  id: string;
  content: string;
  body?: string | null;
  media_urls: string[] | null;
  post_type: string;
  tags?: string[];
  day_number: number | null;
  milestone_title: string | null;
  created_at: string;
  upvotes?: number;
  downvotes?: number;
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
  comment_count?: number;
  user_vote?: 'up' | 'down' | null;
  // Prediction fields
  headline?: string;
  company?: string;
  resolution_date?: string;
  prediction_category?: string;
  initial_probability?: number;
  resolved_outcome?: boolean | null;
  // Pain point fields
  brand_name?: string;
  sentiment_score?: number;
  pain_points?: any[];
  sources?: string[];
  // Reddit fields
  reddit_post_id?: string;
  reddit_subreddit?: string;
}

const ForumPostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { track } = useTracker();
  const { toast } = useToast();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [userVote, setUserVote] = useState<'up' | 'down' | null>(null);
  const [upvotes, setUpvotes] = useState(0);
  const [downvotes, setDownvotes] = useState(0);
  const [saved, setSaved] = useState(false);
  const [voting, setVoting] = useState(false);
  const [relatedPosts, setRelatedPosts] = useState<ForumPost[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  // Fetch related posts
  const fetchRelatedPosts = useCallback(async () => {
    if (!postId) return;
    
    setLoadingRelated(true);
    try {
      const data = await apiGet(`/api/forum/posts/${postId}/related`);
      setRelatedPosts(data.posts || []);
    } catch (err) {
      console.error('Error fetching related posts:', err);
    } finally {
      setLoadingRelated(false);
    }
  }, [postId]);

  // Fetch post details
  const fetchPost = useCallback(async () => {
    if (!postId) return;
    
    setLoading(true);
    try {
      const data = await apiGet(`/api/forum/posts/${postId}`);
      setPost(data.post);
      setUpvotes(data.post.upvotes || 0);
      setDownvotes(data.post.downvotes || 0);
      setUserVote(data.post.user_vote || null);
      
      // Track view
      track({
        target_type: 'forum_post',
        target_id: postId,
        event_type: 'view',
        metadata: { source: 'detail_page' }
      });
    } catch (err: any) {
      console.error('Error fetching post:', err);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load post'
      });
    } finally {
      setLoading(false);
    }
  }, [postId, track, toast]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    
    setLoadingComments(true);
    try {
      const data = await apiGet(`/api/forum/posts/${postId}/comments`);
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
    } finally {
      setLoadingComments(false);
    }
  }, [postId]);

  const commentTree: CommentNode[] = React.useMemo(() => {
    const byId = new Map<string, CommentNode>();
    for (const c of comments) {
      byId.set(c.id, { ...c, replies: [] });
    }
    const roots: CommentNode[] = [];
    for (const c of byId.values()) {
      const parentId = c.parent_comment_id || null;
      if (parentId && byId.has(parentId)) {
        byId.get(parentId)!.replies.push(c);
      } else {
        roots.push(c);
      }
    }
    const sortTree = (nodes: CommentNode[]) => {
      nodes.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      nodes.forEach(n => sortTree(n.replies));
    };
    sortTree(roots);
    return roots;
  }, [comments]);

  // Check if post is saved
  const checkSaved = useCallback(async () => {
    if (!postId || !user) return;
    
    try {
      const data = await apiGet(`/api/forum/posts/${postId}/saved`);
      setSaved(data.saved);
    } catch (err) {
      console.error('Error checking saved status:', err);
    }
  }, [postId, user]);

  useEffect(() => {
    fetchPost();
    fetchComments();
    checkSaved();
    fetchRelatedPosts();
  }, [fetchPost, fetchComments, checkSaved, fetchRelatedPosts]);

  // Mark as seen as soon as we land on the detail page (improves "All" feed freshness).
  useEffect(() => {
    if (postId) markForumPostSeen(postId);
  }, [postId]);

  // Handle voting
  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user || !postId || voting) return;
    
    setVoting(true);
    try {
      if (userVote === voteType) {
        // Remove vote
        const data = await apiDelete(`/api/forum/posts/${postId}/vote`);
        setUserVote(null);
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
      } else {
        // Add/change vote
        const data = await apiPost(`/api/forum/posts/${postId}/vote`, { vote_type: voteType });
        setUserVote(voteType);
        setUpvotes(data.upvotes);
        setDownvotes(data.downvotes);
      }
      
      track({
        target_type: 'forum_post',
        target_id: postId,
        event_type: 'reaction',
        metadata: { vote_type: voteType }
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Vote failed',
        description: err.message || 'Could not submit vote'
      });
    } finally {
      setVoting(false);
    }
  };

  // Handle save/bookmark
  const handleSave = async () => {
    if (!user || !postId) return;
    
    try {
      await apiPost(`/api/forum/posts/${postId}/save`, {});
      setSaved(!saved);
      toast({
        title: saved ? 'Unsaved' : 'Saved',
        description: saved ? 'Removed from saved posts' : 'Added to saved posts'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to save post'
      });
    }
  };

  // Handle share
  const handleShare = async () => {
    const url = window.location.href;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: post?.content.substring(0, 100),
          url
        });
      } catch (err) {
        // User cancelled or error
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
      target_id: postId!,
      event_type: 'share',
      metadata: { method: navigator.share ? 'native' : 'clipboard' }
    });
  };

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!user || !postId || !newComment.trim() || submitting) return;
    
    setSubmitting(true);
    try {
      const data = await apiPost(`/api/forum/posts/${postId}/comments`, {
        content: newComment.trim()
      });
      
      setComments(prev => [data.comment, ...prev]);
      setNewComment('');
      
      track({
        target_type: 'forum_post',
        target_id: postId,
        event_type: 'comment',
        metadata: { comment_id: data.comment.id }
      });
      
      toast({
        title: 'Comment posted',
        description: 'Your comment has been added'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to post comment'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!user || !postId || !replyText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const data = await apiPost(`/api/forum/posts/${postId}/comments`, {
        content: replyText.trim(),
        parent_comment_id: parentId,
      });

      setComments(prev => [...prev, data.comment]);
      setReplyText('');
      setReplyToId(null);

      toast({
        title: 'Reply posted',
        description: 'Your reply has been added'
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Failed to post reply'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const renderThread = (nodes: CommentNode[], depth = 0) => {
    return nodes.map((comment) => (
      <div key={comment.id} className="flex gap-3" style={{ marginLeft: depth * 16 }}>
        <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs text-[#666] flex-shrink-0">
          {comment.user?.anonymous_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-[#888] font-medium">
              {comment.user?.anonymous_name || 'Anonymous'}
            </span>
            <span className="text-[#555]">•</span>
            <span className="text-[#555]">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.quick_reply_type && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 bg-[#CBAA5A]/10 border-[#CBAA5A]/30 text-[#CBAA5A]">
                Quick Reply
              </Badge>
            )}
          </div>
          <p className="text-sm text-[#ccc] mt-1 whitespace-pre-wrap">
            {comment.content}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <button
              className="text-xs text-[#888] hover:text-white transition-colors"
              onClick={() => {
                setReplyToId(replyToId === comment.id ? null : comment.id);
                setReplyText('');
              }}
            >
              Reply
            </button>
          </div>

          {replyToId === comment.id && user && (
            <div className="mt-3">
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply…"
                className="bg-[#111] border-[#333] text-white placeholder:text-[#666] focus-visible:ring-[#CBAA5A] min-h-[70px]"
              />
              <div className="flex justify-end mt-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyToId(null);
                    setReplyText('');
                  }}
                  className="border-[#333] bg-[#111] hover:bg-[#151515] text-white"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleSubmitReply(comment.id)}
                  disabled={!replyText.trim() || submitting}
                  className="bg-[#CBAA5A] hover:bg-[#D4B76A] text-black"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Reply'}
                </Button>
              </div>
            </div>
          )}

          {comment.replies.length > 0 && (
            <div className="mt-4 space-y-4">
              {renderThread(comment.replies, depth + 1)}
            </div>
          )}
        </div>
      </div>
    ));
  };

  const score = upvotes - downvotes;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CBAA5A]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
        <p className="text-[#666] text-lg">Post not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-reddit">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-[#222]">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 text-[#888] hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {post.community && (
              <>
                <span className="text-lg">{post.community.icon}</span>
                <Link 
                  to={`/feed?tab=forum&community=${post.community.slug}`}
                  className="text-sm text-[#888] hover:text-white transition-colors"
                >
                  {post.community.name}
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Main content area */}
          <div className="flex-1 min-w-0 flex gap-4">
          {/* Vote column */}
          <div className="flex flex-col items-center gap-1 pt-2">
            <button
              onClick={() => handleVote('up')}
              disabled={voting || !user}
              className={`p-1 rounded transition-colors ${
                userVote === 'up'
                  ? 'text-orange-500 bg-orange-500/10'
                  : 'text-[#666] hover:text-orange-400 hover:bg-[#1a1a1a]'
              }`}
            >
              <ArrowBigUp className="w-6 h-6" />
            </button>
            <span className={`font-medium text-sm ${
              score > 0 ? 'text-orange-400' : score < 0 ? 'text-blue-400' : 'text-[#888]'
            }`}>
              {score}
            </span>
            <button
              onClick={() => handleVote('down')}
              disabled={voting || !user}
              className={`p-1 rounded transition-colors ${
                userVote === 'down'
                  ? 'text-blue-500 bg-blue-500/10'
                  : 'text-[#666] hover:text-blue-400 hover:bg-[#1a1a1a]'
              }`}
            >
              <ArrowBigDown className="w-6 h-6" />
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Post header */}
            <div className="flex items-center gap-2 text-xs text-[#666] mb-3">
              <User className="w-3 h-3" />
              <span className="text-[#888]">{post.user?.anonymous_name || 'Anonymous'}</span>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span>•</span>
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 bg-[#1a1a1a] border-[#333] text-[#888]">
                      {tag}
                    </Badge>
                  ))}
                </>
              )}
            </div>

            {/* Post type badge */}
            {post.post_type !== 'regular' && (
              <Badge 
                className="mb-3 capitalize"
                style={{ 
                  backgroundColor: `${post.community?.color}20`,
                  color: post.community?.color,
                  borderColor: `${post.community?.color}40`
                }}
              >
                {post.post_type.replace('_', ' ')}
              </Badge>
            )}

            {/* Post content */}
            <h1 className="text-xl md:text-2xl font-bold text-white mb-4 leading-tight">
              {post.content}
            </h1>

            {/* Post body (markdown) */}
            {post.body && (
              <div className="prose prose-invert prose-sm max-w-none mb-6 text-[#ccc]">
                <ReactMarkdown>{post.body}</ReactMarkdown>
              </div>
            )}

            {/* Media */}
            {post.media_urls && post.media_urls.length > 0 && (
              <div className="grid gap-2 mb-6">
                {post.media_urls.map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`Media ${idx + 1}`}
                    className="rounded-lg max-h-[500px] object-contain bg-[#111]"
                  />
                ))}
              </div>
            )}

            {/* Reddit source */}
            {post.reddit_post_id && post.reddit_subreddit && (
              <a
                href={`https://reddit.com/r/${post.reddit_subreddit}/comments/${post.reddit_post_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-orange-400 hover:underline mb-4"
              >
                <ExternalLink className="w-4 h-4" />
                View on r/{post.reddit_subreddit}
              </a>
            )}

            {/* Actions bar */}
            <div className="flex items-center gap-4 py-3 border-t border-[#222]">
              <button
                className="flex items-center gap-2 text-sm text-[#888] hover:text-white transition-colors"
                onClick={() => document.getElementById('comment-input')?.focus()}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{comments.length} Comments</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm text-[#888] hover:text-white transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  saved ? 'text-[#CBAA5A]' : 'text-[#888] hover:text-white'
                }`}
              >
                {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            {/* Comment input */}
            <div className="mt-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs text-[#666]">
                  {user?.anonymous_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <Textarea
                    id="comment-input"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user ? "What are your thoughts?" : "Sign in to comment"}
                    disabled={!user}
                    className="bg-[#111] border-[#333] text-white placeholder:text-[#666] focus-visible:ring-[#CBAA5A] min-h-[80px]"
                  />
                  <div className="flex justify-end mt-2">
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!user || !newComment.trim() || submitting}
                      className="bg-[#CBAA5A] hover:bg-[#D4B76A] text-black"
                    >
                      {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Comment
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Comments section */}
            <div className="mt-8">
              <h2 className="text-lg font-semibold text-white mb-4">
                Comments ({comments.length})
              </h2>
              
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-[#666]">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No comments yet. Be the first to share your thoughts!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {renderThread(commentTree)}
                </div>
              )}
            </div>
          </div>
          </div>

          {/* Related Posts Sidebar - Desktop */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-20">
              <div className="bg-[#111] border border-[#222] rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[#CBAA5A]" />
                  <h3 className="text-sm font-semibold text-white">Related Posts</h3>
                </div>
                
                {loadingRelated ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-[#666]" />
                  </div>
                ) : relatedPosts.length === 0 ? (
                  <p className="text-xs text-[#666] text-center py-4">No related posts found</p>
                ) : (
                  <div className="space-y-2">
                    {relatedPosts.slice(0, 6).map((rp) => {
                      const rpScore = (rp.upvotes || 0) - (rp.downvotes || 0);
                      return (
                        <Link
                          key={rp.id}
                          to={`/forum/post/${rp.id}`}
                          className="group block p-3 bg-[#0a0a0a] rounded-lg border border-[#1a1a1a] hover:bg-[#101010] hover:border-[#2a2a2a] transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              {rp.community && <span className="text-sm">{rp.community.icon}</span>}
                              <span className="text-[10px] text-[#666] truncate">
                                {rp.community?.name || 'Post'}
                              </span>
                            </div>
                            <span className="text-[10px] text-[#555] flex-shrink-0">
                              {formatDistanceToNow(new Date(rp.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-[#e5e5e5] line-clamp-2 leading-relaxed group-hover:text-white transition-colors">
                            {rp.content}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-[10px] text-[#666]">
                            <span className="inline-flex items-center gap-1">
                              <ChevronUp className="w-3 h-3" /> {rpScore}
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <MessageSquare className="w-3 h-3" /> {rp.comment_count || 0}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
                
                {/* Back to Forum Link */}
                <Link
                  to="/feed?tab=forum"
                  className="block mt-4 pt-4 border-t border-[#222] text-center text-xs text-[#CBAA5A] hover:underline"
                >
                  ← Back to Forum
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Posts - Mobile */}
        <div className="lg:hidden mt-10">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#CBAA5A]" />
            <h3 className="text-sm font-semibold text-white">Related Posts</h3>
          </div>
          {loadingRelated ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#666]" />
            </div>
          ) : relatedPosts.length === 0 ? (
            <p className="text-xs text-[#666] py-2">No related posts found</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {relatedPosts.slice(0, 8).map((rp) => {
                const rpScore = (rp.upvotes || 0) - (rp.downvotes || 0);
                return (
                  <Link
                    key={rp.id}
                    to={`/forum/post/${rp.id}`}
                    className="flex-shrink-0 w-[75%] sm:w-[55%] p-4 bg-[#0a0a0a] rounded-xl border border-[#1a1a1a] hover:border-[#2a2a2a] transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {rp.community && <span className="text-base">{rp.community.icon}</span>}
                        <span className="text-[11px] text-[#888] truncate">{rp.community?.name || 'Post'}</span>
                      </div>
                      <span className="text-[10px] text-[#555] flex-shrink-0">
                        {formatDistanceToNow(new Date(rp.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-white line-clamp-3 leading-snug">{rp.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-[#888]">
                      <span className="inline-flex items-center gap-1">
                        <ChevronUp className="w-4 h-4" /> {rpScore}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageSquare className="w-4 h-4" /> {rp.comment_count || 0}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumPostDetail;
