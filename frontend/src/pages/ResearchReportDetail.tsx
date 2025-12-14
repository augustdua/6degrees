import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import ReactMarkdown from 'react-markdown';
import { apiGet } from '@/lib/api';
import { getRecentForumPosts } from '@/lib/forumSeen';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen, Clock, ExternalLink, FileText, List, LayoutGrid, Newspaper, TrendingUp, Target, Users } from 'lucide-react';

interface ResearchPost {
  id: string;
  content: string;
  body?: string | null;
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
    case 'pain-points':
      return Target;
    default:
      return Users;
  }
}

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
    return m ? m[1] : post.content.slice(0, 100);
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
      <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-sm border-b border-[#222]">
        <div className="max-w-6xl mx-auto h-14 flex items-center justify-between gap-3 pl-[calc(1rem+env(safe-area-inset-left))] pr-[calc(1rem+env(safe-area-inset-right))]">
          <Link
            to="/feed?tab=forum&community=market-research"
            className="inline-flex items-center gap-2 text-[#CBAA5A] hover:underline"
          >
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
          {/* Left Sidebar - Communities & Recently Viewed */}
          <aside className="hidden xl:block">
            <div className="sticky top-20 space-y-3">
              <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
                <div className="px-3 py-2 border-b border-[#1a1a1a]">
                  <h3 className="text-[10px] font-bold text-[#606060] uppercase tracking-wider">Communities</h3>
                </div>
                <div className="py-1">
                  <Link
                    to="/feed?tab=forum&community=all"
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-[#b0b0b0] hover:bg-[#111] hover:text-white transition-colors"
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
                        c.slug === 'market-research'
                          ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]'
                          : 'text-[#b0b0b0] hover:bg-[#111] hover:text-white'
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
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/30">
                  Market Research
                </Badge>
                <div className="text-[11px] text-[#666] mt-1 flex items-center gap-2">
                  <Clock className="w-3 h-3" />
                  <span>{readTime} min read</span>
                  <span>•</span>
                  <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                </div>
              </div>
            </div>

            <h1 className="text-white font-gilroy text-xl sm:text-2xl font-bold leading-tight">
              {title}
            </h1>
          </div>
        </div>

        <div className="flex">
          {tableOfContents.length > 2 && (
            <aside className="hidden lg:block w-72 border-r border-[#1a1a1a] p-4">
              <div className="sticky top-4">
                <div className="text-[10px] font-bold text-[#666] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <List className="w-3 h-3" /> Contents
                </div>
                <nav className="space-y-1.5">
                  {tableOfContents.map((h, idx) => (
                    <a
                      key={idx}
                      href={`#${h.id}`}
                      className={`block hover:text-white transition-colors ${
                        h.level === 1 ? 'text-[#bbb] font-medium' :
                        h.level === 2 ? 'text-[#888] pl-3 text-sm' :
                        'text-[#666] pl-6 text-xs'
                      }`}
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              </div>
            </aside>
          )}

          <main className="flex-1 p-5 sm:p-7">
            <article
              className="prose prose-invert max-w-none
              prose-headings:font-gilroy prose-headings:text-white prose-headings:scroll-mt-24
              prose-h1:text-2xl prose-h1:mb-6 prose-h1:pb-3 prose-h1:border-b prose-h1:border-[#222]
              prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:text-[#CBAA5A]
              prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-h3:text-[#bbb]
              prose-p:text-[#cfcfcf] prose-p:leading-relaxed
              prose-li:text-[#cfcfcf]
              prose-strong:text-white
              prose-a:text-[#CBAA5A] prose-a:no-underline hover:prose-a:underline
              prose-blockquote:border-l-4 prose-blockquote:border-l-[#CBAA5A] prose-blockquote:bg-[#111] prose-blockquote:py-2 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              prose-code:text-[#CBAA5A] prose-code:bg-[#111] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
              prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#222] prose-pre:rounded-lg
              prose-hr:border-[#222]
              prose-th:bg-[#111] prose-th:border prose-th:border-[#222] prose-td:border prose-td:border-[#222]"
            >
              <ReactMarkdown
                components={{
                  h1: ({ children, ...props }) => (
                    <h1 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h1>
                  ),
                  h2: ({ children, ...props }) => (
                    <h2 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h2>
                  ),
                  h3: ({ children, ...props }) => (
                    <h3 id={String(children).toLowerCase().replace(/[^a-z0-9]+/g, '-')} {...props}>{children}</h3>
                  ),
                }}
              >
                {post.body || ''}
              </ReactMarkdown>
            </article>
          </main>
        </div>
      </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


