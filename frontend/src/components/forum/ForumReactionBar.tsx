import { useState } from 'react';
import { motion } from 'framer-motion';

const EMOJIS = ['❤️', '🔥', '🚀', '💯', '🙌', '🤝', '💸', '👀'];

interface ForumReactionBarProps {
  reactionCounts: Record<string, number>;
  userReactions: string[];
  onReactionToggle: (emoji: string) => void;
}

export const ForumReactionBar = ({
  reactionCounts,
  userReactions,
  onReactionToggle
}: ForumReactionBarProps) => {
  const [expanded, setExpanded] = useState(false);
  const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);

  const handleClick = (emoji: string) => {
    setAnimatingEmoji(emoji);
    onReactionToggle(emoji);
    setTimeout(() => setAnimatingEmoji(null), 300);
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  
  // Get top 3 emojis with counts > 0
  const topEmojis = EMOJIS
    .filter((e) => (reactionCounts[e] || 0) > 0)
    .slice(0, 3);

  return (
    <div className="flex items-center justify-between font-reddit">
      {/* LinkedIn-style collapsed view */}
      {!expanded ? (
        <button
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 hover:bg-[#111] rounded-full px-2 py-1 transition-colors"
        >
          {/* Stacked emoji icons */}
          {topEmojis.length > 0 ? (
            <div className="flex -space-x-1">
              {topEmojis.map((emoji, i) => (
                <span 
                  key={emoji} 
                  className="text-sm"
                  style={{ zIndex: 3 - i }}
                >
                  {emoji}
                </span>
              ))}
            </div>
          ) : (
            <span className="text-sm">👍</span>
          )}
          {totalReactions > 0 && (
            <span className="text-xs text-[#888] ml-1">{totalReactions}</span>
          )}
        </button>
      ) : (
        /* Expanded emoji picker */
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center gap-0.5 bg-[#111] rounded-full px-2 py-1"
        >
          {EMOJIS.map((emoji) => {
            const count = reactionCounts[emoji] || 0;
            const isActive = userReactions.includes(emoji);
            const isAnimating = animatingEmoji === emoji;

            return (
              <motion.button
                key={emoji}
                onClick={() => handleClick(emoji)}
                className={`relative p-1 rounded-full transition-all ${
                  isActive ? 'bg-[#222]' : 'hover:bg-[#1a1a1a]'
                }`}
                whileTap={{ scale: 0.9 }}
                animate={isAnimating ? { scale: [1, 1.2, 1] } : {}}
                transition={{ duration: 0.15 }}
                title={`${emoji} ${count}`}
              >
                <span className="text-base">{emoji}</span>
                {count > 0 && (
                  <span className="absolute -top-1 -right-1 text-[8px] bg-[#333] text-white rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {count > 9 ? '9+' : count}
                  </span>
                )}
              </motion.button>
            );
          })}
          <button
            onClick={() => setExpanded(false)}
            className="ml-1 text-[#666] hover:text-white text-xs"
          >
            ✕
          </button>
        </motion.div>
      )}

      {/* Add reaction text button (when collapsed) */}
      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="text-xs text-[#666] hover:text-[#CBAA5A] transition-colors"
        >
          React
        </button>
      )}
    </div>
  );
};

