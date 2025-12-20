import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow, format } from 'date-fns';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTracker } from '@/hooks/useInteractionTracker';
import { useToast } from '@/hooks/use-toast';
import { getRecentForumPosts, markForumPostSeen } from '@/lib/forumSeen';
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
  TrendingUp,
  LayoutGrid,
  Newspaper,
  FileText,
  AlertTriangle,
  Users
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link as RouterLink } from 'react-router-dom';
import { ReportReader } from '@/components/forum/ReportReader';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  parent_comment_id?: string | null;
  external_source?: string | null;
  external_id?: string | null;
  external_url?: string | null;
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
  external_source?: string | null;
  external_id?: string | null;
  external_url?: string | null;
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
  // News fields
  news_url?: string | null;
  news_source?: string | null;
  news_published_at?: string | null;
  news_image_url?: string | null;
}

function getCommunityIcon(slug: string) {
  switch (slug) {
    case 'all':
    case 'general':
      return LayoutGrid;
    case 'news':
      return Newspaper;
    case 'predictions':
      return TrendingUp;
    case 'market-research':
      return FileText;
    case 'market-gaps':
      return AlertTriangle;
    default:
      return Users;
  }
}

function normalizeReadableMarkdown(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';

  // If author already provided markdown structure, don't mess with it.
  const hasHeadings = /^#{1,6}\s+/m.test(s);
  const hasLists = /^\s*([-*]|\d+\.)\s+/m.test(s);
  const hasCode = /```/.test(s);
  const hasBlankLines = /\n\s*\n/.test(s);
  if (hasHeadings || hasLists || hasCode || hasBlankLines) return s;

  // Plain text with single newlines -> treat each line as a paragraph.
  if (/\n/.test(s)) {
    return s
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .join('\n\n');
  }

  // One-liner plain text -> keep.
  return s;
}

function stripInlineMarkdown(input: string): string {
  const s = (input || '').trim();
  if (!s) return '';
  return s
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_~`]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function toParagraphs(input: string): string[] {
  const s = normalizeReadableMarkdown(input);
  if (!s) return [];
  return s
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

type RequestMeta = {
  target_name?: string;
  target_title?: string;
  target_company?: string;
  linkedin_url?: string;
  image_url?: string | null;
  summary?: string;
};

function decodeHtmlEntities(input: string): string {
  let s = String(input || '');
  for (let i = 0; i < 3; i++) {
    const before = s;
    s = s.replace(/&amp;/gi, '&');
    s = s.replace(/&quot;/gi, '"');
    s = s.replace(/&#39;/gi, "'");
    s = s.replace(/&lt;/gi, '<');
    s = s.replace(/&gt;/gi, '>');
    s = s.replace(/&nbsp;/gi, ' ');
    if (s === before) break;
  }
  return s;
}

function extractRequestMeta(body: string | null | undefined): RequestMeta | null {
  const s = String(body || '');
  if (!s) return null;
  const m = s.match(/<!--\s*request_meta\s+([\s\S]*?)\s*-->/i);
  if (!m?.[1]) return null;
  try {
    return JSON.parse(m[1]) as RequestMeta;
  } catch {
    return null;
  }
}

function stripRequestMeta(body: string | null | undefined): string {
  const s = String(body || '');
  if (!s) return '';
  return s.replace(/<!--\s*request_meta[\s\S]*?-->\s*/i, '').trim();
}

function initialsFromName(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() || '').join('') || '?';
}

const ForumPostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { track } = useTracker();
  const { toast } = useToast();

  const [post, setPost] = useState<ForumPost | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentFilter, setCommentFilter] = useState<'all' | 'community' | 'reddit' | 'ai'>('all');
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
  const [sidebarCommunities, setSidebarCommunities] = useState<{ id: string; name: string; slug: string }[]>([]);
  const [requestImgFailed, setRequestImgFailed] = useState(false);

  useEffect(() => {
    const run = async () => {
      try {
        const data = await apiGet('/api/forum/communities/active');
        setSidebarCommunities((data?.communities || []).map((c: any) => ({ id: c.id, name: c.name, slug: c.slug })));
      } catch {
        setSidebarCommunities([]);
      }
    };
    run();
  }, []);

  const recent = getRecentForumPosts().filter((p) => p.id !== postId);

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
      try {
        markForumPostSeen(postId, {
          title: (data?.post?.content || '').slice(0, 140),
          communitySlug: data?.post?.community?.slug
        });
      } catch {
        // ignore localStorage failures
      }
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

  // If user lands on the discussion page for a report, redirect to reader-mode.
  // Product requirement: a single click from feed should land in the full report view.
  useEffect(() => {
    if (!postId || !post) return;
    const pt = String(post.post_type || '').toLowerCase();
    if (pt === 'research_report') {
      navigate(`/forum/research/${postId}`, { replace: true });
      return;
    }
    if (pt === 'market-gap') {
      navigate(`/forum/market-gaps/${postId}`, { replace: true });
      return;
    }
  }, [postId, post, navigate]);

  // Fetch comments
  const fetchComments = useCallback(async () => {
    if (!postId) return;
    
    setLoadingComments(true);
    try {
      const data = await apiGet(`/api/forum/posts/${postId}/comments`);
      setComments(data.comments || []);
    } catch (err) {
      console.error('Error fetching comments:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to load comments',
        description: 'Please try again.',
      });
    } finally {
      setLoadingComments(false);
    }
  }, [postId, toast]);

  const commentMeta = React.useMemo(() => {
    const isReddit = (c: Comment) => (c.external_source || '').toLowerCase() === 'reddit';
    const isQuickReply = (c: Comment) => Boolean(c.quick_reply_type);
    const isAi = (c: Comment) => {
      // Best-effort: label system/bot comments as AI if they exist.
      const name = (c.user?.anonymous_name || '').toLowerCase();
      return name.includes('ai') || name.includes('bot') || name.includes('analysis');
    };

    const counts = {
      all: comments.length,
      community: comments.filter((c) => !isReddit(c)).length,
      reddit: comments.filter(isReddit).length,
      ai: comments.filter(isAi).length,
      quickReply: comments.filter(isQuickReply).length,
    };

    return { isReddit, isQuickReply, isAi, counts };
  }, [comments]);

  const visibleComments = React.useMemo(() => {
    const { isReddit, isAi } = commentMeta;
    if (commentFilter === 'reddit') return comments.filter(isReddit);
    if (commentFilter === 'ai') return comments.filter(isAi);
    if (commentFilter === 'community') return comments.filter((c) => !isReddit(c));
    return comments;
  }, [comments, commentFilter, commentMeta]);

  const commentTree: CommentNode[] = React.useMemo(() => {
    const byId = new Map<string, CommentNode>();
    for (const c of visibleComments) {
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
  }, [visibleComments]);

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

  const relatedSentinelRef = React.useRef<HTMLDivElement | null>(null);
  const relatedFetchedRef = React.useRef(false);

  useEffect(() => {
    // #region agent log
    // Disabled: local debug ingest causes Chrome "local network request blocked" warnings in production.
    // #endregion agent log
    fetchPost();
  }, [fetchPost]);

  // Comments: fetch automatically, but defer until after first paint / idle so navigation feels instant.
  useEffect(() => {
    const w = window as any;
    if (typeof w.requestIdleCallback === 'function') {
      const id = w.requestIdleCallback(() => fetchComments(), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const t = window.setTimeout(() => fetchComments(), 250);
    return () => window.clearTimeout(t);
  }, [fetchComments]);

  // Lazy-load related posts (also a separate request)
  useEffect(() => {
    if (!relatedSentinelRef.current) return;
    const el = relatedSentinelRef.current;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !relatedFetchedRef.current) {
          relatedFetchedRef.current = true;
          fetchRelatedPosts();
        }
      },
      { root: null, threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [fetchRelatedPosts]);

  // Saved status isn't required to render the page; fetch after paint.
  useEffect(() => {
    const t = window.setTimeout(() => {
      checkSaved();
    }, 800);
    return () => window.clearTimeout(t);
  }, [checkSaved]);

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
        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground flex-shrink-0">
          {comment.user?.anonymous_name?.charAt(0).toUpperCase() || '?'}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted-foreground font-medium">
              {comment.user?.anonymous_name || 'Anonymous'}
            </span>
            <span className="text-muted-foreground/80">•</span>
            <span className="text-muted-foreground/80">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {comment.quick_reply_type && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 bg-[#CBAA5A]/10 border-[#CBAA5A]/30 text-[#CBAA5A]">
                Quick Reply
              </Badge>
            )}
          </div>
          <p className="text-sm text-foreground/90 mt-1 whitespace-pre-wrap">
            {comment.content}
          </p>

          <div className="mt-2 flex items-center gap-3">
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
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
                className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#CBAA5A] min-h-[70px]"
              />
              <div className="flex justify-end mt-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setReplyToId(null);
                    setReplyText('');
                  }}
                  className="border-border bg-card hover:bg-muted text-foreground"
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
  const isRequest = post?.post_type === 'request' || post?.community?.slug === 'requests';
  const requestMeta = React.useMemo(() => extractRequestMeta(post?.body), [post?.body]);
  const requestTargetName = decodeHtmlEntities(requestMeta?.target_name || '');
  const requestTargetTitle = decodeHtmlEntities(requestMeta?.target_title || '');
  const requestTargetCompany = decodeHtmlEntities(requestMeta?.target_company || '');
  const requestSummary = decodeHtmlEntities(requestMeta?.summary || '');
  const requestLinkedIn = String(requestMeta?.linkedin_url || post?.external_url || '').trim();
  const requestImage = String(requestMeta?.image_url || '').trim();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#CBAA5A]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-lg">Post not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Go back
        </Button>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background text-foreground font-reddit">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="max-w-6xl mx-auto h-14 flex items-center gap-3 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-9 w-9 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            {post.community && (
              <>
                <Link 
                  to={`/feed?tab=forum&community=${post.community.slug}`}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
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
          {/* Left Sidebar - Communities & Recently Viewed */}
          <aside className="hidden xl:block w-56 flex-shrink-0">
            <div className="sticky top-20 space-y-3">
              <div className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Communities</h3>
                </div>
                <div className="py-1">
                  <Link
                    to="/feed?tab=forum&community=all"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  >
                    {(() => {
                      const Icon = getCommunityIcon('all');
                      return <Icon className="w-4 h-4" />;
                    })()}
                    <span>All</span>
                  </Link>
                  {sidebarCommunities.map((c) => (
                    <Link
                      key={c.id}
                      to={`/feed?tab=forum&community=${c.slug}`}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        post.community?.slug === c.slug
                          ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      {(() => {
                        const Icon = getCommunityIcon(c.slug);
                        return <Icon className="w-4 h-4" />;
                      })()}
                      <span className="truncate">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {recent.length > 0 && (
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-border">
                    <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Recently viewed</h3>
                  </div>
                  <div className="py-1 max-h-[280px] overflow-auto">
                    {recent.slice(0, 10).map((p) => (
                      <Link
                        key={p.id}
                        to={`/forum/post/${p.id}`}
                        className="block px-3 py-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        title={p.title}
                      >
                        <span className="line-clamp-2">{p.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

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
                  : 'text-muted-foreground hover:text-orange-400 hover:bg-muted'
              }`}
            >
              <ArrowBigUp className="w-6 h-6" />
            </button>
            <span className={`font-medium text-sm ${
              score > 0 ? 'text-orange-400' : score < 0 ? 'text-blue-400' : 'text-muted-foreground'
            }`}>
              {score}
            </span>
            <button
              onClick={() => handleVote('down')}
              disabled={voting || !user}
              className={`p-1 rounded transition-colors ${
                userVote === 'down'
                  ? 'text-blue-500 bg-blue-500/10'
                  : 'text-muted-foreground hover:text-blue-400 hover:bg-muted'
              }`}
            >
              <ArrowBigDown className="w-6 h-6" />
            </button>
          </div>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Post header */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <User className="w-3 h-3" />
              <span className="text-muted-foreground">{post.user?.anonymous_name || 'Anonymous'}</span>
              <span>•</span>
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              {post.tags && post.tags.length > 0 && (
                <>
                  <span>•</span>
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0 bg-muted border-border text-muted-foreground">
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
            <h1 className="text-xl md:text-2xl font-bold text-foreground mb-4 leading-tight">
              {stripInlineMarkdown(post.content)}
            </h1>

            {/* Report quick actions (keeps comments reachable) */}
            {(post.post_type === 'research_report' || post.post_type === 'market-gap' || post.post_type === 'pain_point') && (
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <RouterLink
                  to={
                    post.post_type === 'research_report'
                      ? `/forum/research/${post.id}`
                      : `/forum/market-gaps/${post.id}`
                  }
                  className="inline-flex"
                >
                  <Button
                    variant="outline"
                    className="h-9 border-border bg-card hover:bg-muted text-foreground"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Read full report
                    <ExternalLink className="w-3 h-3 ml-2" />
                  </Button>
                </RouterLink>
                {!post.body && (
                  <div className="text-xs text-muted-foreground">
                    (This post doesn’t have a report body yet — upload/attach the markdown to enable reader mode.)
                  </div>
                )}
              </div>
            )}

            {/* News metadata */}
            {post.post_type === 'news' && (
              <div className="mb-5 p-4 bg-card border border-border rounded-lg">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[11px] text-muted-foreground">
                      {post.news_source ? <span className="font-medium text-[#CBAA5A]">{post.news_source}</span> : null}
                      {post.news_published_at ? (
                        <>
                          {post.news_source ? <span className="text-muted-foreground/80"> • </span> : null}
                          <span>{format(new Date(post.news_published_at), 'MMM d, yyyy')}</span>
                        </>
                      ) : null}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      We show a cleaned in-app version from the RSS feed. Tap “Read original” for the full article.
                    </div>
                  </div>
                  {post.news_url && (
                    <a
                      href={post.news_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border hover:border-border/80 text-[#CBAA5A] text-xs font-bold flex-shrink-0"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Read original
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Post body (markdown) */}
            {post.body && (
              <div className="mb-6">
                {/* Request target preview (hide request_meta from the rendered markdown) */}
                {isRequest && (requestTargetName || requestLinkedIn) ? (
                  <div className="mb-4 p-4 bg-card border border-border rounded-lg">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
                      Target
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground font-semibold truncate">
                          {requestTargetName || 'LinkedIn profile'}
                        </div>
                        {(requestTargetTitle || requestTargetCompany) ? (
                          <div className="text-xs text-muted-foreground truncate">
                            {[requestTargetTitle, requestTargetCompany].filter(Boolean).join(' • ')}
                          </div>
                        ) : null}
                        {requestSummary ? (
                          <p className="text-sm text-muted-foreground mt-2 leading-relaxed line-clamp-3">
                            {requestSummary}
                          </p>
                        ) : null}
                        {requestLinkedIn ? (
                          <a
                            href={requestLinkedIn}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#CBAA5A] hover:underline"
                          >
                            <ExternalLink className="w-4 h-4" />
                            LinkedIn
                          </a>
                        ) : null}
                      </div>

                      <div className="w-32 h-36 sm:w-36 sm:h-40 rounded overflow-hidden flex-shrink-0 border border-border bg-background">
                        {requestImage && !requestImgFailed ? (
                          <img
                            src={requestImage}
                            alt=""
                            className="w-full h-full object-cover object-top contrast-[1.2] brightness-[0.85]"
                            style={{ filter: 'grayscale(1)' }}
                            loading="lazy"
                            decoding="async"
                            onError={() => setRequestImgFailed(true)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl text-muted-foreground">
                            {initialsFromName(requestTargetName || 'Target')}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {post.post_type === 'news' ? (
                  (() => {
                    const cleaned = post.body.replace(/\n*\[Read original\]\([^)]+\)\s*$/i, '').trim();
                    const paragraphs = toParagraphs(cleaned);
                    const tldr = paragraphs[0] ? paragraphs[0].slice(0, 260) : '';
                    return (
                      <div className="space-y-4">
                        {tldr && (
                          <div className="p-4 bg-card border border-border rounded-lg">
                            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">TL;DR</div>
                            <p className="text-sm text-foreground/90 leading-relaxed">{tldr}{paragraphs[0].length > 260 ? '…' : ''}</p>
                          </div>
                        )}

                        <div className="p-4 md:p-5 bg-card border border-border rounded-lg">
                          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Article</div>
                          <div className="space-y-4">
                            {paragraphs.map((p, idx) => (
                              <p key={idx} className="text-[15px] text-foreground/90 leading-7">
                                {p}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div
                    className={
                      (post.post_type === 'research_report' || post.post_type === 'market-gap' || post.post_type === 'pain_point')
                        ? 'max-h-[55vh] overflow-y-auto pr-3 rounded-lg border border-border bg-card p-4 md:p-5'
                        : ''
                    }
                  >
                  <article
                    className={`prose max-w-none dark:prose-invert
                    prose-headings:font-sans prose-headings:text-foreground prose-headings:scroll-mt-24
                    prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-border
                    prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-[#CBAA5A]
                    prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-foreground/80
                    prose-p:text-foreground prose-p:leading-relaxed
                    prose-li:text-foreground
                    prose-strong:text-foreground
                    prose-a:text-[#CBAA5A] prose-a:no-underline hover:prose-a:underline
                    prose-blockquote:border-l-4 prose-blockquote:border-l-[#CBAA5A] prose-blockquote:bg-muted prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
                    prose-code:text-[#CBAA5A] prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-lg
                    prose-hr:border-border
                    prose-th:bg-muted prose-th:border prose-th:border-border prose-td:border prose-td:border-border`}
                  >
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {normalizeReadableMarkdown(isRequest ? stripRequestMeta(post.body) : post.body)}
                    </ReactMarkdown>
                  </article>
                  </div>
                )}
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
                    className={`rounded-lg bg-card w-full ${
                      post.post_type === 'news' ? 'max-h-[360px] object-cover' : 'max-h-[500px] object-contain'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Reddit source */}
            {((post.reddit_post_id && post.reddit_subreddit) || (post.external_source === 'reddit' && post.external_url)) && (
              <a
                href={
                  post.reddit_post_id && post.reddit_subreddit
                    ? `https://reddit.com/r/${post.reddit_subreddit}/comments/${post.reddit_post_id}`
                    : (post.external_url as string)
                }
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-orange-400 hover:underline mb-4"
              >
                <ExternalLink className="w-4 h-4" />
                {post.reddit_subreddit ? `View on r/${post.reddit_subreddit}` : 'View on Reddit'}
              </a>
            )}

            {/* Actions bar */}
            <div className="flex items-center gap-4 py-3 border-t border-border">
              <button
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => document.getElementById('comment-input')?.focus()}
              >
                <MessageSquare className="w-4 h-4" />
                <span>{comments.length} Comments</span>
              </button>
              
              <button
                onClick={handleShare}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share</span>
              </button>
              
              <button
                onClick={handleSave}
                className={`flex items-center gap-2 text-sm transition-colors ${
                  saved ? 'text-[#CBAA5A]' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                <span>{saved ? 'Saved' : 'Save'}</span>
              </button>
            </div>

            {/* Comment input */}
            <div className="mt-6">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  {user?.anonymous_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <Textarea
                    id="comment-input"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={user ? "What are your thoughts?" : "Sign in to comment"}
                    disabled={!user}
                    className="bg-background border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-[#CBAA5A] min-h-[80px]"
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
              <h2 className="text-lg font-semibold text-foreground mb-4">
                Comments ({comments.length})
              </h2>
              
              {loadingComments ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#CBAA5A]" />
                </div>
              ) : comments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
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
              <div className="bg-card border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="w-4 h-4 text-[#CBAA5A]" />
                  <h3 className="text-sm font-semibold text-foreground">Related Posts</h3>
                </div>
                
                {loadingRelated ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : relatedPosts.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">No related posts found</p>
                ) : (
                  <div className="space-y-2">
                    {relatedPosts.slice(0, 6).map((rp) => {
                      const rpScore = (rp.upvotes || 0) - (rp.downvotes || 0);
                      return (
                        <Link
                          key={rp.id}
                          to={`/forum/post/${rp.id}`}
                          className="group block p-3 bg-background rounded-lg border border-border hover:bg-muted/50 hover:border-border/80 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] text-muted-foreground truncate">
                                {rp.community?.name || 'Post'}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground/80 flex-shrink-0">
                              {formatDistanceToNow(new Date(rp.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-foreground line-clamp-2 leading-relaxed group-hover:underline transition-colors">
                            {rp.content}
                          </p>
                          <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
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
                  className="block mt-4 pt-4 border-t border-border text-center text-xs text-[#CBAA5A] hover:underline"
                >
                  ← Back to Forum
                </Link>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Posts - Mobile */}
        <div className="lg:hidden mt-10">
          <div ref={relatedSentinelRef} />
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[#CBAA5A]" />
            <h3 className="text-sm font-semibold text-foreground">Related Posts</h3>
          </div>
          {loadingRelated ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : relatedPosts.length === 0 ? (
            <p className="text-xs text-muted-foreground py-2">No related posts found</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {relatedPosts.slice(0, 8).map((rp) => {
                const rpScore = (rp.upvotes || 0) - (rp.downvotes || 0);
                return (
                  <Link
                    key={rp.id}
                    to={`/forum/post/${rp.id}`}
                    className="flex-shrink-0 w-[75%] sm:w-[55%] p-4 bg-card rounded-xl border border-border hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[11px] text-muted-foreground truncate">{rp.community?.name || 'Post'}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground/80 flex-shrink-0">
                        {formatDistanceToNow(new Date(rp.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground line-clamp-3 leading-snug">{rp.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
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
