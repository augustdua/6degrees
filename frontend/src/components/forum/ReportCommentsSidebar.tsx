import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { apiGet, apiPost } from '@/lib/api';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { MessageSquare, Send } from 'lucide-react';

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user?: { id: string; anonymous_name: string } | null;
};

const scrollbarHideStyles = `
  .report-scroll-container {
    scrollbar-width: none; /* Firefox */
    -ms-overflow-style: none; /* IE/Edge */
  }
  .report-scroll-container::-webkit-scrollbar {
    display: none; /* Chrome, Safari, Opera */
  }
`;

export function ReportCommentsSidebar({ postId }: { postId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    try {
      const data = await apiGet(`/api/forum/posts/${postId}/comments`);
      const list = Array.isArray(data?.comments) ? (data.comments as Comment[]) : [];
      // Newest first for discussion sidebar
      list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setComments(list);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  const countLabel = useMemo(() => {
    const n = comments.length;
    if (n === 0) return 'No comments yet';
    if (n === 1) return '1 comment';
    return `${n} comments`;
  }, [comments.length]);

  const submit = useCallback(async () => {
    const text = newComment.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const resp = await apiPost(`/api/forum/posts/${postId}/comments`, { content: text });
      if (resp?.comment) {
        setComments((prev) => [resp.comment as Comment, ...prev]);
        setNewComment('');
      } else {
        // Fallback: reload
        await load();
        setNewComment('');
      }
    } finally {
      setSubmitting(false);
    }
  }, [newComment, postId, submitting, load]);

  return (
    <aside className="bg-[#080808] border border-[#1a1a1a] rounded-xl overflow-hidden h-full flex flex-col">
      <style>{scrollbarHideStyles}</style>

      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-[#666]" />
          <div className="text-[12px] font-bold uppercase tracking-widest text-[#555]">Discussion</div>
        </div>
        <div className="text-[11px] text-[#666]">{countLabel}</div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto report-scroll-container px-4 py-4 space-y-4">
        {loading ? (
          <div className="text-sm text-[#888]">Loading comments…</div>
        ) : comments.length === 0 ? (
          <div className="text-sm text-[#888] leading-relaxed">
            Start the discussion. Ask a question, challenge a claim, or share a counterexample.
          </div>
        ) : (
          comments.map((c) => (
            <div key={c.id} className="border border-[#141414] bg-[#0a0a0a] rounded-lg p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-xs text-[#aaa] font-medium truncate">
                  {c.user?.anonymous_name || 'Anonymous'}
                </div>
                <div className="text-[11px] text-[#666] whitespace-nowrap">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </div>
              </div>
              <div className="text-[13px] text-[#c8c8c8] leading-relaxed whitespace-pre-wrap">
                {c.content}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-[#1a1a1a] p-4">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment…"
          className="min-h-[88px] bg-[#0a0a0a] border-[#222] text-white placeholder-[#555] focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="text-[#888] hover:text-white hover:bg-[#111]"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            className="bg-[#CBAA5A] hover:bg-[#e0c575] text-black font-semibold"
            onClick={submit}
            disabled={submitting || newComment.trim().length === 0}
          >
            <Send className="w-4 h-4 mr-2" />
            Comment
          </Button>
        </div>
      </div>
    </aside>
  );
}


