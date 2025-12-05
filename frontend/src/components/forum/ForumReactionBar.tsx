import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [animatingEmoji, setAnimatingEmoji] = useState<string | null>(null);

  const handleClick = (emoji: string) => {
    setAnimatingEmoji(emoji);
    onReactionToggle(emoji);
    setTimeout(() => setAnimatingEmoji(null), 300);
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="flex items-center gap-1">
      {/* Emoji Buttons */}
      <div className="flex items-center gap-1">
        {EMOJIS.map((emoji) => {
          const count = reactionCounts[emoji] || 0;
          const isActive = userReactions.includes(emoji);
          const isAnimating = animatingEmoji === emoji;

          return (
            <motion.button
              key={emoji}
              onClick={() => handleClick(emoji)}
              className={`relative flex items-center gap-0.5 px-1.5 py-0.5 rounded text-base transition-all ${
                isActive
                  ? 'bg-[#1a1a1a]'
                  : 'hover:bg-[#111]'
              }`}
              whileTap={{ scale: 0.95 }}
              animate={isAnimating ? { scale: [1, 1.15, 1] } : {}}
              transition={{ duration: 0.15 }}
            >
              <span>{emoji}</span>
              {count > 0 && (
                <span className={`text-[10px] ${isActive ? 'text-[#CBAA5A]' : 'text-[#555]'}`}>
                  {count}
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Total Count */}
      {totalReactions > 0 && (
        <div className="ml-auto text-xs text-[#888]">
          {totalReactions} reaction{totalReactions !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
};

