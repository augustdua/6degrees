import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { apiGet } from '@/lib/api';
import { getRecentForumPosts } from '@/lib/forumSeen';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, FileText, LayoutGrid, Newspaper, TrendingUp, AlertTriangle, Users } from 'lucide-react';
import { ReportReader, stripInlineMarkdown } from '@/components/forum/ReportReader';
import { ReportBlocksRenderer } from '@/components/forum/ReportBlocksRenderer';
import { ReportCommentsSidebar } from '@/components/forum/ReportCommentsSidebar';

interface ResearchPost {
  id: string;
  content: string;
  body?: string | null;
  report_blocks?: any;
  created_at: string;
  user?: { id: string; anonymous_name: string } | null;
  community?: { id: string; name: string; slug: string; icon: string; color: string } | null;
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

// normalizeReadableMarkdown moved to shared ReportReader

export default function ResearchReportDetail() {
  const { postId } = useParams();
  const [post, setPost] = useState<ResearchPost | null>(null);
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
      } catch (e) {
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

  const tableOfContents = useMemo(() => {
    if (!post?.body) return [];
    const headings = Array.from(post.body.matchAll(/^(#{1,3})\s+(.+)$/gm));
    return headings.map((m) => {
      const level = m[1].length;
      const text = m[2].trim();
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      return { level, text, id };
    });
  }, [post?.body]);

  const readTime = useMemo(() => {
    const words = post?.body ? post.body.split(/\s+/).length : 0;
    return Math.max(1, Math.ceil(words / 200));
  }, [post?.body]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10 text-[#888]">
        Loading report…
      </div>
    );
  }

  if (!post) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          to="/feed?tab=forum&community=market-research"
          className="inline-flex items-center gap-2 text-[#CBAA5A] hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to forum
        </Link>
        <div className="mt-6 text-white">Report not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-reddit">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 bg-black/95 backdrop-blur-md border-b border-[#1a1a1a]">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            to="/feed?tab=forum&community=market-research"
            className="inline-flex items-center gap-2 text-[#CBAA5A] hover:text-[#e0c575] transition-colors"
          >
            <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg hover:bg-white/5 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </span>
            <span className="text-sm font-medium hidden sm:inline">Back to forum</span>
          </Link>

{/* No discussion redirect - report page is the final destination */}
        </div>
      </div>

      {/* Main content area */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 xl:grid-cols-[200px_1fr_280px] gap-8 xl:h-[calc(100vh-56px-48px)]">
          {/* Left Sidebar - Communities & Recently Viewed */}
          <aside className="hidden xl:block">
            <div className="sticky top-20 space-y-4">
              <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1a1a1a]">
                  <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Communities</h3>
                </div>
                <div className="py-2">
                  <Link
                    to="/feed?tab=forum&community=all"
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-[#999] hover:bg-[#111] hover:text-white transition-colors"
                  >
                    {(() => {
                      const Icon = getCommunityIcon('all');
                      return <Icon className="w-4 h-4 opacity-70" />;
                    })()}
                    <span>All</span>
                  </Link>
                  {sidebarCommunities.map((c) => (
                    <Link
                      key={c.id}
                      to={`/feed?tab=forum&community=${c.slug}`}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors ${
                        c.slug === 'market-research'
                          ? 'bg-[#CBAA5A]/10 text-[#CBAA5A] border-l-2 border-l-[#CBAA5A]'
                          : 'text-[#999] hover:bg-[#111] hover:text-white'
                      }`}
                    >
                      {(() => {
                        const Icon = getCommunityIcon(c.slug);
                        return <Icon className="w-4 h-4 opacity-70" />;
                      })()}
                      <span className="truncate">{c.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              {recent.length > 0 && (
                <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#1a1a1a]">
                    <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest">Recently viewed</h3>
                  </div>
                  <div className="py-2 max-h-[260px] overflow-y-auto scrollbar-thin">
                    {recent.slice(0, 8).map((p) => (
                      <Link
                        key={p.id}
                        to={`/forum/post/${p.id}`}
                        className="block px-4 py-2.5 text-xs text-[#888] hover:bg-[#111] hover:text-white transition-colors"
                        title={p.title}
                      >
                        <span className="line-clamp-2 leading-relaxed">{p.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>

          {/* Report content */}
          <div className="min-w-0 xl:min-h-0 xl:overflow-hidden">
            <div className="bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden shadow-xl shadow-black/20 h-full flex flex-col">
              {/* Report header */}
              <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-[#1a1a1a] bg-gradient-to-b from-[#0d0d0d] to-transparent">
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/10 flex items-center justify-center border border-blue-500/20">
                    <FileText className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 mb-2">
                      Market Research
                    </Badge>
                    <div className="text-[12px] text-[#666] flex items-center gap-2 flex-wrap">
                      <Clock className="w-3 h-3" />
                      <span>{readTime} min read</span>
                      <span className="text-[#333]">•</span>
                      <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>

                <h1 className="text-white font-gilroy text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
                  {title}
                </h1>
              </div>

              {/* Report body (prefer structured JSON blocks; fallback to markdown) */}
              <div className="flex-1 min-h-0 overflow-y-auto report-scroll-container">
                {post?.report_blocks?.version === 1 && Array.isArray(post?.report_blocks?.blocks) ? (
                  <ReportBlocksRenderer doc={post.report_blocks} />
                ) : (
                  <ReportReader markdown={post.body || ''} tocTitle="Contents" showTocIfAtLeast={3} />
                )}
              </div>
            </div>
          </div>

          {/* Comments sidebar (reports only) */}
          <div className="hidden xl:block xl:min-h-0">
            {postId ? <ReportCommentsSidebar postId={postId} /> : null}
          </div>
        </div>

        {/* Mobile comments (below report) */}
        <div className="xl:hidden mt-6">
          {postId ? <ReportCommentsSidebar postId={postId} /> : null}
        </div>
      </div>
    </div>
  );
}


