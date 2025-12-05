import { useState } from 'react';
import { motion } from 'framer-motion';

const QUICK_REPLIES = [
  { type: 'can_intro', emoji: '🤝', label: 'I can intro' },
  { type: 'paid_intro', emoji: '💸', label: 'Paid intro' },
  { type: 'watching', emoji: '👀', label: 'Watching' },
  { type: 'ship_it', emoji: '🚀', label: 'Ship it' },
  { type: 'dm_me', emoji: '💬', label: 'DM me' }
];

interface ForumQuickReplyBarProps {
  onQuickReply: (type: string) => void;
}

export const ForumQuickReplyBar = ({ onQuickReply }: ForumQuickReplyBarProps) => {
  const [clickedType, setClickedType] = useState<string | null>(null);

  const handleClick = (type: string) => {
    setClickedType(type);
    onQuickReply(type);
    setTimeout(() => setClickedType(null), 500);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 font-reddit">
      {QUICK_REPLIES.map((reply) => (
        <motion.button
          key={reply.type}
          onClick={() => handleClick(reply.type)}
          className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-reddit transition-all ${
            clickedType === reply.type
              ? 'bg-[#1a1a1a] text-[#CBAA5A]'
              : 'text-[#555] hover:text-[#888] hover:bg-[#111]'
          }`}
          whileTap={{ scale: 0.97 }}
        >
          <span className="text-sm">{reply.emoji}</span>
          <span>{reply.label}</span>
        </motion.button>
      ))}
    </div>
  );
};

