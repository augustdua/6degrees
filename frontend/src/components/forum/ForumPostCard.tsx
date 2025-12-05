import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { apiPost, apiDelete } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { ForumReactionBar } from './ForumReactionBar';
import { ForumQuickReplyBar } from './ForumQuickReplyBar';
import { ForumCommentList } from './ForumCommentList';
import {
  MessageSquare,
  MoreHorizontal,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
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


export const ForumPostCard = ({ post, onDelete }: ForumPostCardProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || {});
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.comment_count || 0);
  const [deleting, setDeleting] = useState(false);

  // Safety checks for missing data
  if (!post?.user || !post?.community) {
    return null; // Don't render if essential data is missing
  }

  const isOwner = user?.id === post.user.id;

  const handleReactionToggle = async (emoji: string) => {
    try {
      const response = await apiPost('/api/forum/reactions', {
        target_type: 'post',
        target_id: post.id,
        emoji
      });

      if (response.added) {
        setReactionCounts(prev => ({
          ...prev,
          [emoji]: (prev[emoji] || 0) + 1
        }));
        setUserReactions(prev => [...prev, emoji]);
      } else if (response.removed) {
        setReactionCounts(prev => ({
          ...prev,
          [emoji]: Math.max((prev[emoji] || 1) - 1, 0)
        }));
        setUserReactions(prev => prev.filter(e => e !== emoji));
      }
    } catch (err) {
      console.error('Error toggling reaction:', err);
    }
  };

  const handleQuickReply = async (type: string) => {
    try {
      await apiPost(`/api/forum/posts/${post.id}/quick-reply`, { type });
      setCommentCount(prev => prev + 1);
      setShowComments(true);
    } catch (err) {
      console.error('Error creating quick reply:', err);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this post?')) return;
    
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

  const handleCommentAdded = () => {
    setCommentCount(prev => prev + 1);
  };

  return (
    <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar 
              className="w-10 h-10 cursor-pointer"
              onClick={() => navigate(`/profile/${post.user.id}`)}
            >
              <AvatarImage src={post.user.profile_picture_url} />
              <AvatarFallback className="bg-[#222] text-white">
                {post.user.first_name?.[0]}{post.user.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="flex items-center gap-2">
                <span 
                  className="font-medium text-white cursor-pointer hover:text-[#CBAA5A]"
                  onClick={() => navigate(`/profile/${post.user.id}`)}
                >
                  {post.user.first_name} {post.user.last_name}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#666]">
                <span 
                  className="flex items-center gap-1"
                  style={{ color: post.community.color }}
                >
                  {post.community.icon} {post.community.name}
                </span>
                <span>·</span>
                <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
              </div>
            </div>
          </div>

          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="w-4 h-4 text-[#888]" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333]">
                <DropdownMenuItem 
                  onClick={handleDelete}
                  className="text-red-500 focus:text-red-500"
                  disabled={deleting}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Day Badge for Build in Public */}
        {post.day_number && (
          <div className="mt-3 flex items-center gap-2">
            <span className="bg-[#10B981] text-black text-xs font-semibold px-2 py-0.5 rounded">
              Day {post.day_number}
            </span>
            {post.milestone_title && (
              <span className="text-[#10B981] text-xs">
                🎯 {post.milestone_title}
              </span>
            )}
          </div>
        )}

        {/* Project Link */}
        {post.project && (
          <a
            href={post.project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex items-center gap-2 text-xs text-[#CBAA5A] hover:underline"
          >
            {post.project.logo_url && (
              <img src={post.project.logo_url} alt="" className="w-4 h-4 rounded" />
            )}
            {post.project.name}
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Content */}
      <div className="px-4 py-2">
        <p className="text-[#e0e0e0] whitespace-pre-wrap text-[15px] leading-relaxed">{post.content}</p>
      </div>

      {/* Media */}
      {post.media_urls && Array.isArray(post.media_urls) && post.media_urls.length > 0 && (
        <div className={`grid gap-1 p-2 ${
          post.media_urls.length === 1 ? 'grid-cols-1' :
          post.media_urls.length === 2 ? 'grid-cols-2' :
          post.media_urls.length === 3 ? 'grid-cols-3' :
          'grid-cols-2'
        }`}>
          {post.media_urls.slice(0, 4).map((url, i) => (
            <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
              <img 
                src={url} 
                alt="" 
                className="w-full h-full object-cover"
              />
              {i === 3 && post.media_urls && post.media_urls.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    +{post.media_urls.length - 4}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reaction Bar */}
      <div className="px-4 py-2 border-t border-[#222]">
        <ForumReactionBar
          reactionCounts={reactionCounts}
          userReactions={userReactions}
          onReactionToggle={handleReactionToggle}
        />
      </div>

      {/* Quick Reply Bar */}
      <div className="px-4 py-2 border-t border-[#222]">
        <ForumQuickReplyBar onQuickReply={handleQuickReply} />
      </div>

      {/* Comments Toggle */}
      <button
        onClick={() => setShowComments(!showComments)}
        className="w-full px-4 py-2 border-t border-[#222] flex items-center justify-center gap-2 text-sm text-[#888] hover:text-white transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
        <span>{commentCount} comments</span>
        {showComments ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {/* Comments */}
      {showComments && (
        <div className="border-t border-[#222]">
          <ForumCommentList 
            postId={post.id} 
            onCommentAdded={handleCommentAdded}
          />
        </div>
      )}
    </div>
  );
};

