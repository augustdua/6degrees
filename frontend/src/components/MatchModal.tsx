import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Calendar, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface MatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  matchedUser: {
    id: string;
    name: string;
    photo?: string;
    score: number;
  };
  currentUser: {
    name: string;
    photo?: string;
  };
}

/**
 * Match celebration modal (like Tinder/Hinge)
 * Shows when two users mutually swipe right
 */
export const MatchModal: React.FC<MatchModalProps> = ({
  isOpen,
  onClose,
  matchedUser,
  currentUser
}) => {
  const navigate = useNavigate();

  const handleMessage = () => {
    // Navigate to messages with this user
    navigate(`/messages?user=${matchedUser.id}`);
    onClose();
  };

  const handleScheduleCall = () => {
    // Navigate to schedule intro call
    navigate(`/intros/schedule?match=${matchedUser.id}`);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Confetti/Sparkle effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-2 h-2 rounded-full"
                style={{
                  background: i % 2 === 0 ? '#CBAA5A' : '#fff',
                  left: `${Math.random() * 100}%`,
                  top: '-10px'
                }}
                initial={{ y: 0, opacity: 1 }}
                animate={{ 
                  y: window.innerHeight + 100,
                  opacity: 0,
                  rotate: Math.random() * 360
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  delay: Math.random() * 0.5,
                  ease: 'easeOut'
                }}
              />
            ))}
          </div>

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.8, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.8, y: 50 }}
            transition={{ type: 'spring', damping: 20 }}
            className="relative bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] border border-[#333] rounded-3xl p-8 max-w-md w-full text-center z-10"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#333] flex items-center justify-center hover:bg-[#444] transition-colors"
            >
              <X className="w-4 h-4 text-[#888]" />
            </button>

            {/* Header */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="mb-6"
            >
              <div className="flex items-center justify-center gap-1 mb-2">
                <Sparkles className="w-5 h-5 text-[#CBAA5A]" />
                <span className="font-gilroy text-[10px] font-bold tracking-[0.2em] text-[#CBAA5A] uppercase">
                  It's a Match!
                </span>
                <Sparkles className="w-5 h-5 text-[#CBAA5A]" />
              </div>
              <h2 className="font-riccione text-3xl text-white">
                You & {matchedUser.name.split(' ')[0]}
              </h2>
            </motion.div>

            {/* Photos */}
            <motion.div 
              className="flex items-center justify-center gap-4 mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              {/* Your Photo */}
              <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#CBAA5A] shadow-lg shadow-[#CBAA5A]/20">
                  {currentUser.photo ? (
                    <img 
                      src={currentUser.photo} 
                      alt="You" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#333] flex items-center justify-center">
                      <span className="font-riccione text-3xl text-[#666]">
                        {currentUser.name[0]}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Heart Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="w-12 h-12 rounded-full bg-[#CBAA5A] flex items-center justify-center shadow-lg shadow-[#CBAA5A]/30"
              >
                <span className="text-2xl">🤝</span>
              </motion.div>

              {/* Their Photo */}
              <div className="relative">
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-[#CBAA5A] shadow-lg shadow-[#CBAA5A]/20">
                  {matchedUser.photo ? (
                    <img 
                      src={matchedUser.photo} 
                      alt={matchedUser.name} 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-[#333] flex items-center justify-center">
                      <span className="font-riccione text-3xl text-[#666]">
                        {matchedUser.name[0]}
                      </span>
                    </div>
                  )}
                </div>
                {/* SoCap Badge */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-black px-2 py-1 rounded-full border border-[#CBAA5A]">
                  <span className="font-riccione text-sm text-[#CBAA5A]">
                    {matchedUser.score}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Message */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="text-[#888] font-gilroy text-sm mb-8"
            >
              An intro call has been created. Schedule a 15-min chat to connect!
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
              className="space-y-3"
            >
              <Button
                onClick={handleScheduleCall}
                className="w-full bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[11px] h-12"
              >
                <Calendar className="w-4 h-4 mr-2" />
                Schedule 15 min Call
              </Button>
              
              <Button
                onClick={handleMessage}
                variant="outline"
                className="w-full border-[#333] hover:border-[#CBAA5A] text-white hover:text-[#CBAA5A] font-gilroy tracking-[0.15em] uppercase text-[11px] h-12"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Send a Message
              </Button>

              <button
                onClick={onClose}
                className="text-[#666] hover:text-white font-gilroy text-[11px] tracking-[0.1em] uppercase transition-colors"
              >
                Keep Swiping
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MatchModal;

