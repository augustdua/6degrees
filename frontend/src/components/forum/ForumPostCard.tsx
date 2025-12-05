import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { apiPost, apiDelete } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { MoreHorizontal, Trash2, ExternalLink, Check } from 'lucide-react';
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
}

interface ForumPostCardProps {
  post: ForumPost;
  onDelete?: () => void;
}

const EMOJIS = ['❤️', '🔥', '🚀', '💯', '🙌', '🤝', '💸', '👀'];

export const ForumPostCard = ({ post, onDelete }: ForumPostCardProps) => {
  const { user } = useAuth();
  const [reactionCounts, setReactionCounts] = useState(post.reaction_counts || {});
  const [userReactions, setUserReactions] = useState<string[]>([]);
  const [deleting, setDeleting] = useState(false);
  
  // Poll state
  const [pollData, setPollData] = useState<Poll | null>(post.poll || null);
  const [voting, setVoting] = useState(false);

  if (!post?.user || !post?.community) {
    return null;
  }

  const isOwner = user?.id === post.user.id;
  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const topEmojis = EMOJIS.filter((e) => (reactionCounts[e] || 0) > 0).slice(0, 3);
  const hasVoted = pollData?.user_vote !== undefined;

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
    <div className="bg-[#111] hover:bg-[#131313] transition-colors rounded-xl overflow-hidden group" style={{ fontFamily: "'Gilroy', sans-serif" }}>
      {/* Header - Minimal */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#555]">
            <span style={{ color: post.community.color }}>
              {post.community.icon} {post.community.name}
            </span>
            <span className="text-[#333]">•</span>
            <span>{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
            <span className="text-[#333]">•</span>
            <span className="text-[#444]">{post.user.anonymous_name || 'Anonymous'}</span>
          </div>
          
          {isOwner && (
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4 text-[#555] hover:text-white" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-[#1a1a1a] border-[#333]">
                <DropdownMenuItem onClick={handleDelete} className="text-red-500" disabled={deleting}>
                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Day Badge */}
        {post.day_number && (
          <div className="mt-2 flex items-center gap-2">
            <span className="bg-[#10B981] text-black text-xs font-semibold px-2 py-0.5 rounded">
              Day {post.day_number}
            </span>
            {post.milestone_title && (
              <span className="text-[#10B981] text-sm">🎯 {post.milestone_title}</span>
            )}
          </div>
        )}
      </div>

      {/* Content - Emphasized */}
      <div className="px-5 pb-4">
        <p className="text-white text-lg leading-relaxed whitespace-pre-wrap font-medium">
          {post.content}
        </p>
        
        {/* Project Link */}
        {post.project && (
          <a
            href={post.project.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-[#CBAA5A] hover:underline"
          >
            {post.project.name} <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="px-5 pb-4">
          <div className={`grid gap-2 ${
            post.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
          }`}>
            {post.media_urls.slice(0, 4).map((url, i) => (
              <div key={i} className="relative aspect-video overflow-hidden rounded-lg">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Poll Section */}
      {pollData && (
        <div className="px-5 pb-4">
          <div className="bg-[#0a0a0a] rounded-xl p-4 border border-[#222]">
            <p className="text-white font-medium text-base mb-4">{pollData.question}</p>
            
            <div className="space-y-2">
              {pollData.options.map((option, index) => {
                const percentage = getPercentage(pollData.vote_counts[index] || 0);
                const isSelected = pollData.user_vote === index;
                
                return (
                  <button
                    key={index}
                    onClick={() => handleVote(index)}
                    disabled={hasVoted || voting}
                    className={`w-full relative overflow-hidden rounded-lg transition-all ${
                      hasVoted 
                        ? 'cursor-default' 
                        : 'cursor-pointer hover:border-[#8B5CF6]'
                    } ${
                      isSelected 
                        ? 'border-2 border-[#8B5CF6]' 
                        : 'border border-[#333]'
                    }`}
                  >
                    {/* Background fill for voted state */}
                    {hasVoted && (
                      <div 
                        className="absolute inset-0 bg-gradient-to-r from-[#8B5CF6]/20 to-[#EC4899]/20 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    )}
                    
                    <div className="relative px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-[#8B5CF6] flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        <span className={`text-sm ${isSelected ? 'text-white font-medium' : 'text-[#aaa]'}`}>
                          {option}
                        </span>
                      </div>
                      
                      {hasVoted && (
                        <span className={`text-sm font-medium ${isSelected ? 'text-[#8B5CF6]' : 'text-[#666]'}`}>
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            <p className="text-xs text-[#555] mt-3">
              {pollData.total_votes} vote{pollData.total_votes !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      )}

      {/* Reactions Bar */}
      <div className="px-5 py-3 border-t border-[#1a1a1a] flex items-center gap-4">
        <div className="flex items-center gap-1.5 group/reactions relative">
          <button className="flex items-center gap-1.5 text-sm hover:text-white transition-colors text-[#666]">
            {topEmojis.length > 0 ? (
              <span className="flex -space-x-1">
                {topEmojis.map(e => <span key={e} className="text-base">{e}</span>)}
              </span>
            ) : (
              <span className="text-base">❤️</span>
            )}
            {totalReactions > 0 && <span>{totalReactions}</span>}
          </button>
          
          {/* Emoji picker on hover - with padding bridge to prevent gap */}
          <div className="absolute bottom-full left-0 pb-2 hidden group-hover/reactions:block z-10">
            <div className="flex bg-[#1a1a1a] rounded-full px-2 py-1 gap-1 shadow-xl border border-[#333]">
              {EMOJIS.map(emoji => (
                <button
                  key={emoji}
                  onClick={() => handleReactionToggle(emoji)}
                  className={`p-1.5 hover:bg-[#333] rounded-full transition-colors text-lg ${
                    userReactions.includes(emoji) ? 'bg-[#333]' : ''
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
