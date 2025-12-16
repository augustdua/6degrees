import { useMemo, useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { useTracker } from '@/hooks/useInteractionTracker';
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
  BookOpen,
  Clock,
  ChevronDown,
  ChevronUp,
  Package,
  Truck,
  HeadphonesIcon,
  DollarSign,
  RotateCcw,
  MessageSquare,
  Quote
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { PostReactions } from './PostReactions';

interface PainPoint {
  category: string;
  count: number;
  quotes: string[];
}

interface BrandPainPointPost {
  id: string;
  content: string;
  body?: string | null;
  created_at: string;
  brand_name?: string;
  sentiment_score?: number;
  pain_points?: PainPoint[];
  sources?: string[];
  upvotes?: number;
  downvotes?: number;
  user_vote?: 'up' | 'down' | null;
  comment_count?: number;
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
}

interface BrandPainPointCardProps {
  post: BrandPainPointPost;
  onDelete?: () => void;
}

const categoryIcons: Record<string, any> = {
  delivery: Truck,
  quality: Package,
  support: HeadphonesIcon,
  pricing: DollarSign,
  returns: RotateCcw,
  other: AlertTriangle
};

const categoryColors: Record<string, string> = {
  delivery: '#F59E0B',
  quality: '#EF4444',
  support: '#3B82F6',
  pricing: '#10B981',
  returns: '#8B5CF6',
  other: '#6B7280'
};

export const BrandPainPointCard = ({ post, onDelete }: BrandPainPointCardProps) => {
  const navigate = useNavigate();
  const { track } = useTracker();

  const [expanded, setExpanded] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const title = useMemo(() => {
    if (post.body) {
      const h1 = post.body.match(/^#\s+(.+?)$/m);
      if (h1?.[1]) return h1[1].replace(/\*\*/g, '').trim();
      const h2 = post.body.match(/^##\s+(.+?)$/m);
      if (h2?.[1]) return h2[1].replace(/\*\*/g, '').trim();
    }
    return post.brand_name || post.content.slice(0, 120);
  }, [post.body, post.brand_name, post.content]);

  const readTime = useMemo(() => {
    const words = post.body ? post.body.split(/\s+/).filter(Boolean).length : 0;
    return Math.max(1, Math.ceil(words / 200));
  }, [post.body]);

  const tocPreview = useMemo(() => {
    if (!post.body) return { chips: [] as string[], remaining: 0 };
    const headings: string[] = [];
    const lines = post.body.split('\n');
    for (const line of lines) {
      const m = line.match(/^(#{1,3})\s+(.+)$/);
      if (!m) continue;
      const text = m[2].replace(/\*\*/g, '').trim();
      if (!text) continue;
      headings.push(text);
    }
    const unique: string[] = [];
    for (const h of headings) {
      if (unique.includes(h)) continue;
      unique.push(h);
      if (unique.length >= 2) break;
    }
    return { chips: unique, remaining: Math.max(0, headings.length - unique.length) };
  }, [post.body]);

  const preview = useMemo(() => {
    if (!post.body) return post.content;
    const lines = post.body.split('\n').map((l) => l.trim());
    for (const line of lines) {
      if (!line) continue;
      if (/^#{1,6}\s+/.test(line)) continue;
      if (/^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line)) continue;
      if (/^\|/.test(line)) continue;
      if (/^>/.test(line)) continue;
      if (/^```/.test(line)) continue;
      return line.replace(/\*\*/g, '').trim();
    }
    return post.content;
  }, [post.body, post.content]);

  // View tracking
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedView = useRef(false);

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
              metadata: { source: 'market_gaps_feed', brand: post.brand_name || null }
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [post.id, post.brand_name, track]);

  const handleCardClick = () => {
    // Reader-mode page for Market Gaps (discussion still available via /forum/post/:id).
    navigate(`/forum/market-gaps/${post.id}`);
  };

  // Parse pain points
  const painPoints: PainPoint[] = Array.isArray(post.pain_points) 
    ? post.pain_points 
    : typeof post.pain_points === 'object' && post.pain_points 
      ? Object.values(post.pain_points)
      : [];

  const totalMentions = painPoints.reduce((sum, p) => sum + p.count, 0);

  const sentiment = typeof post.sentiment_score === 'number' ? post.sentiment_score : null;
  const sentimentPercent = sentiment === null ? null : Math.round(sentiment * 100);
  const sentimentColor =
    sentiment === null ? 'text-[#666]' : sentiment >= 0.6 ? 'text-green-400' : sentiment >= 0.4 ? 'text-yellow-400' : 'text-red-400';
  const sentimentBgColor = sentiment === null ? 'bg-[#333]' : sentiment >= 0.6 ? 'bg-green-500' : sentiment >= 0.4 ? 'bg-yellow-500' : 'bg-red-500';
  const SentimentIcon = sentiment === null ? Minus : sentiment >= 0.6 ? TrendingUp : sentiment >= 0.4 ? Minus : TrendingDown;

  const isStructuredBrandAnalysis = Boolean(post.brand_name) || painPoints.length > 0 || sentiment !== null;

  const toggleCategory = (category: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  // Generic Market Gap report (category/space) - show a calm reader-style card.
  if (!isStructuredBrandAnalysis) {
    return (
      <div
        ref={cardRef}
        onClick={handleCardClick}
        className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#333] transition-all cursor-pointer"
      >
        <div className="p-4 sm:p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-pink-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-400 border-pink-500/30 font-medium">
                  Market Gaps
                </Badge>
                <span className="text-[#666] text-[10px] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {readTime} min read
                </span>
              </div>
              <h3 className="text-white font-gilroy text-lg sm:text-xl font-bold leading-snug line-clamp-2">
                {title}
              </h3>
              <div className="mt-2 text-[11px] text-[#666]">
                <span className="text-[#888]">{post.user?.anonymous_name || 'Research Team'}</span>
                <span className="mx-2">•</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          <p className="text-[#b5b5b5] text-sm leading-6 mb-3 line-clamp-3">
            {preview || post.content}
          </p>

          {(tocPreview.chips.length > 0 || tocPreview.remaining > 0) && (
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {tocPreview.chips.map((t) => (
                <span
                  key={t}
                  className="text-[11px] text-[#9a9a9a] bg-[#0a0a0a] border border-[#1a1a1a] px-2 py-1 rounded-md"
                >
                  {t.length > 28 ? `${t.slice(0, 28)}…` : t}
                </span>
              ))}
              {tocPreview.remaining > 0 && (
                <span className="text-[11px] text-[#666]">+{tocPreview.remaining} sections</span>
              )}
            </div>
          )}

          <div className="flex items-center justify-end">
            <Button
              variant="outline"
              className="border-pink-500/30 text-pink-400 hover:text-pink-300 hover:border-pink-500/50 hover:bg-pink-500/5"
              onClick={(e) => {
                e.stopPropagation();
                handleCardClick();
              }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Read
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </div>
        </div>

        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#1a1a1a] pt-3">
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
    );
  }

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      className="bg-[#111] border border-[#222] rounded-xl overflow-hidden hover:border-[#333] transition-all cursor-pointer"
    >
      {/* Header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            {/* Brand Logo/Icon */}
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-pink-400" />
            </div>
            <div>
              <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-400 border-pink-500/30 mb-1">
                Market Gaps
              </Badge>
              <h3 className="text-white font-gilroy text-lg sm:text-xl font-bold">
                {post.brand_name || 'Unknown Brand'}
              </h3>
            </div>
          </div>

          {/* Sentiment Score */}
          {sentimentPercent !== null && (
            <div className="text-right">
              <div className={`flex items-center gap-1 ${sentimentColor}`}>
                <SentimentIcon className="w-4 h-4" />
                <span className="text-lg font-bold">{sentimentPercent}%</span>
              </div>
              <p className="text-[10px] text-[#666] uppercase tracking-wider">Sentiment</p>
            </div>
          )}
        </div>

        {/* Sentiment Bar */}
        {(sentimentPercent !== null || totalMentions > 0) && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-[#666] mb-1">
              <span>Customer Sentiment</span>
              {totalMentions > 0 && <span>{totalMentions} mentions analyzed</span>}
            </div>
            {sentimentPercent !== null && (
              <div className="h-2 bg-[#222] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${sentimentBgColor} transition-all duration-500`}
                  style={{ width: `${sentimentPercent}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Pain Points Summary */}
        {painPoints.length > 0 && (
          <div className="space-y-2 mb-4">
            <h4 className="text-xs uppercase tracking-wider text-[#666] flex items-center gap-2">
              <AlertTriangle className="w-3 h-3" />
              Top Complaints
            </h4>
            
            {painPoints.slice(0, expanded ? undefined : 3).map((point, idx) => {
              const Icon = categoryIcons[point.category.toLowerCase()] || AlertTriangle;
              const color = categoryColors[point.category.toLowerCase()] || '#6B7280';
              const isExpanded = expandedCategory === point.category;
              
              return (
                <div key={idx} className="bg-[#0a0a0a] rounded-lg overflow-hidden">
                  <button
                    onClick={(e) => toggleCategory(point.category, e)}
                    className="w-full p-3 flex items-center justify-between hover:bg-[#111] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color }} />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-white font-medium capitalize">{point.category}</p>
                        <p className="text-xs text-[#666]">{point.count} mentions</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant="outline" 
                        className="text-[10px]"
                        style={{ 
                          backgroundColor: `${color}10`,
                          borderColor: `${color}40`,
                          color 
                        }}
                      >
                        {Math.round((point.count / totalMentions) * 100)}%
                      </Badge>
                      {point.quotes?.length > 0 && (
                        isExpanded ? <ChevronUp className="w-4 h-4 text-[#666]" /> : <ChevronDown className="w-4 h-4 text-[#666]" />
                      )}
                    </div>
                  </button>
                  
                  {/* Quotes */}
                  {isExpanded && point.quotes && point.quotes.length > 0 && (
                    <div className="px-3 pb-3 space-y-2">
                      {point.quotes.slice(0, 3).map((quote, qIdx) => (
                        <div key={qIdx} className="flex gap-2 text-xs">
                          <Quote className="w-3 h-3 text-[#666] shrink-0 mt-1" />
                          <p className="text-[#999] italic">"{quote}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            
            {painPoints.length > 3 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded(!expanded);
                }}
                className="w-full text-[#888] hover:text-white"
              >
                {expanded ? (
                  <>Show Less <ChevronUp className="w-4 h-4 ml-1" /></>
                ) : (
                  <>Show {painPoints.length - 3} More <ChevronDown className="w-4 h-4 ml-1" /></>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Source Links */}
        {post.sources && post.sources.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-[#666]">Sources:</span>
            {post.sources.slice(0, 3).map((url, idx) => (
              <a
                key={idx}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1 text-xs text-orange-400 hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                {(() => {
                  try {
                    return new URL(url).hostname.replace(/^www\./, '');
                  } catch {
                    return 'source';
                  }
                })()}
              </a>
            ))}
            {post.sources.length > 3 && (
              <span className="text-xs text-[#666]">+{post.sources.length - 3} more</span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#1a1a1a] pt-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs text-[#666]">
            <span className="text-[#888]">{post.user?.anonymous_name || 'Analysis Bot'}</span>
            <span>•</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          </div>
        </div>
        
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
  );
};

export default BrandPainPointCard;
