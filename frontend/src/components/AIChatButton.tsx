import React from 'react';
import { Button } from '@/components/ui/button';
import { MessageCircle, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AIChatButtonProps {
  onClick: () => void;
  isOpen: boolean;
  unreadCount?: number;
}

export const AIChatButton: React.FC<AIChatButtonProps> = ({
  onClick,
  isOpen,
  unreadCount = 0,
}) => {
  return (
    <motion.div
      className="fixed bottom-6 right-6 z-50"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{
        type: 'spring',
        stiffness: 260,
        damping: 20,
      }}
    >
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Button
              onClick={onClick}
              className="relative h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-primary to-accent hover:shadow-xl transition-all duration-200 group"
              size="icon"
            >
              {/* Sparkle Icon with Animation */}
              <motion.div
                animate={{
                  rotate: [0, 360],
                }}
                transition={{
                  duration: 20,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <Sparkles className="h-5 w-5 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
              </motion.div>

              {/* Main Icon */}
              <MessageCircle className="h-6 w-6 text-white relative z-10" />

              {/* Pulse Animation */}
              <motion.div
                className="absolute inset-0 rounded-full bg-primary opacity-75"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.75, 0, 0.75],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              />

              {/* Unread Badge */}
              {unreadCount > 0 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                >
                  {unreadCount}
                </motion.div>
              )}
            </Button>

            {/* Tooltip */}
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute right-full mr-3 top-1/2 -translate-y-1/2 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
            >
              Chat with AI Assistant
              <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 rotate-45 w-2 h-2 bg-gray-900" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AIChatButton;
