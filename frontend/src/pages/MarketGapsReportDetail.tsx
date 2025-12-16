import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { apiGet } from '@/lib/api';
import { getRecentForumPosts } from '@/lib/forumSeen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Clock, ExternalLink, Target, LayoutGrid, Newspaper, TrendingUp, FileText, Users } from 'lucide-react';
import { ReportReader, stripInlineMarkdown } from '@/components/forum/ReportReader';

interface GapPost {
  id: string;
  content: string;
  body?: string | null;
  created_at: string;
  user?: { id: string; anonymous_name: string } | null;
  community?: { id: string; name: string; slug: string; icon: string; color: string } | null;
  brand_name?: string | null;
  sentiment_score?: number | null;
  pain_points?: any;
  sources?: string[] | null;
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
      return Target;
    default:
      return Users;
  }
}

// normalizeReadableMarkdown moved to shared ReportReader

export default function MarketGapsReportDetail() {
  const { postId } = useParams();
  const [post, setPost] = useState<GapPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarCommunities, setSidebarCommunities] = useState<{ id: string; name: string; slug: string }[]>([]);

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

  useEffect(() => {
    const run = async () => {
      if (!postId) return;
      setLoading(true);
      try {
        const data = await apiGet(`/api/forum/posts/${postId}`);
        setPost(data?.post || null);
      } catch {
        setPost(null);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [postId]);

  const title = useMemo(() => {
    if (!post) return '';
    if (!post.body) return post.content.slice(0, 100);
    const m = post.body.match(/^#\s+(.+?)$/m);
    return stripInlineMarkdown(m ? m[1] : post.content.slice(0, 100));
  }, [post]);

  const readTime = useMemo(() => {
    const words = post?.body ? post.body.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(words / 200));
  }, [post?.body]);

  if (loading) {
    return <div className="max-w-5xl mx-auto px-4 py-10 text-[#888]">Loading report…</div>;
  }

  if (!post) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link to="/feed?tab=forum&community=market-gaps" className="inline-flex items-center gap-2 text-[#CBAA5A] hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to forum
        </Link>
        <div className="mt-6 text-white">Report not found.</div>
      </div>
    );
  }

  const sentiment = typeof post.sentiment_score === 'number' ? post.sentiment_score : null;
  const sentimentPct = sentiment === null ? null : Math.round(sentiment * 100);
  const sources = Array.isArray(post.sources) ? post.sources : [];

  return (
    <div className="min-h-screen bg-black font-reddit">
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-[#222]">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between gap-3 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
          <Link to="/feed?tab=forum&community=market-gaps" className="inline-flex items-center gap-2 text-[#CBAA5A] hover:underline">
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium">Back to forum</span>
          </Link>

          <Link to={`/forum/post/${post.id}`}>
            <Button variant="outline" className="h-9 border-[#333] bg-[#111] hover:bg-[#151515] text-white">
              <BookOpen className="w-4 h-4 mr-2" />
              Open discussion
              <ExternalLink className="w-3 h-3 ml-2" />
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[220px_1fr] gap-6">
          <aside className="hidden xl:block">
            <div className="sticky top-20 space-y-3">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#1a1a1a]">
                  <h3 className="text-[10px] font-bold text-[#606060] uppercase tracking-wider">Communities</h3>
                </div>
                <div className="py-1">
                  <Link to="/feed?tab=forum&community=all" className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[#b0b0b0] hover:bg-[#111] hover:text-white transition-colors">
                    {(() => {
                      const Icon = getCommunityIcon('all');
                      return <Icon className="w-4 h-4" />;
                    })()}
                    <span>All</span>
                  </Link>
                  {sidebarCommunities.map((c) => (
                    <Link
                      key={c.id}
                      to={`/feed?tab=forum&community=${c.slug === 'pain-points' ? 'market-gaps' : c.slug}`}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                        (c.slug === 'market-gaps' || c.slug === 'pain-points')
                          ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                          : 'text-[#b0b0b0] hover:bg-[#111] hover:text-white'
                      }`}
                    >
                      {(() => {
                        const Icon = getCommunityIcon(c.slug === 'pain-points' ? 'market-gaps' : c.slug);
                        return <Icon className="w-4 h-4" />;
                      })()}
                      <span className="truncate">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {recent.length > 0 && (
                <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
                  <div className="px-3 py-2 border-b border-[#1a1a1a]">
                    <h3 className="text-[10px] font-bold text-[#606060] uppercase tracking-wider">Recently viewed</h3>
                  </div>
                  <div className="py-1 max-h-[280px] overflow-auto">
                    {recent.slice(0, 10).map((p) => (
                      <Link
                        key={p.id}
                        to={`/forum/post/${p.id}`}
                        className="block px-3 py-2 text-xs text-[#b0b0b0] hover:bg-[#111] hover:text-white transition-colors"
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

          <div className="min-w-0">
            <div className="mt-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-[#1a1a1a] flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/20 flex items-center justify-center">
                      <Target className="w-5 h-5 text-pink-400" />
                    </div>
                    <div>
                      <Badge variant="outline" className="text-[10px] bg-pink-500/10 text-pink-400 border-pink-500/30">
                        Market Gaps
                      </Badge>
                      <div className="text-[11px] text-[#666] mt-1 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>{readTime} min read</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                        {sentimentPct !== null && (
                          <>
                            <span>•</span>
                            <span className="text-[#CBAA5A] font-medium">{sentimentPct}% sentiment</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <h1 className="text-white font-gilroy text-xl sm:text-2xl font-bold leading-tight">
                    {title}
                  </h1>
                </div>
              </div>

              <div>
                  {sources.length > 0 && (
                    <div className="mb-6 flex flex-wrap gap-2">
                      <span className="text-[11px] text-[#666]">Sources:</span>
                      {sources.slice(0, 4).map((u) => (
                        <a
                          key={u}
                          href={u}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-[#CBAA5A] hover:underline"
                        >
                          {(() => {
                            try {
                              return new URL(u).hostname.replace(/^www\./, '');
                            } catch {
                              return 'source';
                            }
                          })()}
                        </a>
                      ))}
                      {sources.length > 4 && <span className="text-[11px] text-[#666]">+{sources.length - 4} more</span>}
                    </div>
                  )}
                  <ReportReader markdown={post.body || ''} tocTitle="Contents" showTocIfAtLeast={3} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


