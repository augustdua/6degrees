import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { apiPost, apiDelete } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { ForumCommentList } from './ForumCommentList';
import { MoreHorizontal, Trash2, ExternalLink } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ForumPost {
  id: string;
  content: string;
  media_urls: string[] | null;
  post_type: string;
  day_number: number | null;
  milestone_title: string | null;
  created_at: string;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url: string;
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
  comment_count: number;
}

interface ForumPostCardProps {
  post: ForumPost;
  onDelete?: () => void;
}

const EMOJIS = ['❤️', '🔥', '🚀', '💯', '🙌', '🤝', '💸', '👀'];

export const ForumPostCard = ({ post, onDelete }: ForumPostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || {});
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [deleting, setDeleting] = useState(false);

  if (!post?.user || !post?.community) {
    return null;
  }

  const isOwner = user?.id === post.user.id;
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const topEmojis = EMOJIS.filter((e) => (reactionCounts[e] || 0) > 0).slice(0, 3);

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

  return (
    <div className="bg-[#111] hover:bg-[#151515] transition-colors rounded-lg overflow-hidden">
      {/* Header - Reddit style */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-center gap-2 text-xs text-[#666]">
          <Avatar 
            className="w-5 h-5 cursor-pointer"
            onClick={() => navigate(`/profile/${post.user!.id}`)}
          >
            <AvatarImage src={post.user.profile_picture_url} />
            <AvatarFallback className="bg-[#333] text-[10px]">
              {post.user.first_name?.[0]}
            </AvatarFallback>
          </Avatar>
          <span 
            className="text-[#888] hover:text-white cursor-pointer"
            onClick={() => navigate(`/profile/${post.user!.id}`)}
          >
            {post.user.first_name}
          </span>
          <span className="text-[#444]">•</span>
          <span style={{ color: post.community.color }}>
            {post.community.icon} {post.community.name}
          </span>
          <span className="text-[#444]">•</span>
          <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
          
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-auto opacity-0 group-hover:opacity-100">
                <MoreHorizontal className="w-4 h-4 text-[#555] hover:text-white" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333]">
                <DropdownMenuItem onClick={handleDelete} className="text-red-500" disabled={deleting}>
                  <Trash2 className="w-3 h-3 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Day Badge */}
        {post.day_number && (
          <div className="mt-2 flex items-center gap-2">
            <span className="bg-[#10B981] text-black text-[10px] font-semibold px-1.5 py-0.5 rounded">
              Day {post.day_number}
            </span>
            {post.milestone_title && (
              <span className="text-[#10B981] text-xs">🎯 {post.milestone_title}</span>
            )}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-3 pb-2">
        <p className="text-[#e0e0e0] text-sm font-gilroy leading-relaxed whitespace-pre-wrap">
          {post.content}
        </p>
        
        {/* Project Link */}
        {post.project && (
          <a
            href={post.project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-[#CBAA5A] hover:underline"
          >
            {post.project.name} <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="px-3 pb-2">
          <div className={`grid gap-1 ${
            post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}>
            {post.media_urls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative aspect-video overflow-hidden rounded">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Reddit-style Action Bar */}
      <div className="px-3 py-2 flex items-center gap-4 text-xs text-[#555]">
        {/* Reactions */}
        <div className="flex items-center gap-1 group relative">
          <button className="flex items-center gap-1 hover:text-white transition-colors">
            {topEmojis.length > 0 ? (
              <span className="flex -space-x-0.5">
                {topEmojis.map(e => <span key={e}>{e}</span>)}
              </span>
            ) : (
              <span>❤️</span>
            )}
            {totalReactions > 0 && <span>{totalReactions}</span>}
          </button>
          
          {/* Emoji picker on hover */}
          <div className="absolute bottom-full left-0 mb-1 hidden group-hover:flex bg-[#1a1a1a] rounded-full px-1 py-0.5 gap-0.5 shadow-lg border border-[#333]">
            {EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => handleReactionToggle(emoji)}
                className={`p-1 hover:bg-[#333] rounded transition-colors ${
                  userReactions.includes(emoji) ? 'bg-[#333]' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Comments */}
        <button 
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1 hover:text-white transition-colors"
        >
          <span>💬</span>
          <span>{commentCount}</span>
        </button>

        {/* Quick actions */}
        <button 
          onClick={() => { apiPost(`/api/forum/posts/${post.id}/quick-reply`, { type: 'can_intro' }); setCommentCount(c => c + 1); }}
          className="hover:text-white transition-colors"
        >
          🤝
        </button>
        <button 
          onClick={() => { apiPost(`/api/forum/posts/${post.id}/quick-reply`, { type: 'ship_it' }); setCommentCount(c => c + 1); }}
          className="hover:text-white transition-colors"
        >
          🚀
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <ForumCommentList 
          postId={post.id} 
          onCommentAdded={() => setCommentCount(c => c + 1)}
        />
      )}
    </div>
  );
};
