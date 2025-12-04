import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Heart, RotateCcw, Trophy, Sparkles, TrendingUp } from 'lucide-react';
import { SwipeCard, NoMoreUsers } from './SwipeCard';
import { MatchModal } from './MatchModal';
import { usePeopleMatching } from '@/hooks/usePeopleMatching';
import { useAuth } from '@/hooks/useAuth';

interface SwipePeopleViewProps {
  onViewMatches?: () => void;
}

/**
 * Swipe-based people discovery (like Hinge/Bumble)
 * Full-screen vertical cards with swipe gestures
 */
export const SwipePeopleView: React.FC<SwipePeopleViewProps> = ({ onViewMatches }) => {
  const { user } = useAuth();
  const {
    currentUser,
    hasMoreUsers,
    matches,
    stats,
    loading,
    newMatch,
    swipe,
    undoSwipe,
    clearNewMatch,
    fetchSwipeableUsers
  } = usePeopleMatching();

  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const handleSwipe = async (direction: 'left' | 'right') => {
    setSwipeDirection(direction);
    await swipe(direction);
    setTimeout(() => setSwipeDirection(null), 300);
  };

  const handleUndo = async () => {
    try {
      await undoSwipe();
    } catch (err) {
      console.error('Could not undo:', err);
    }
  };

  if (loading && !currentUser) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CBAA5A] mx-auto mb-4"></div>
          <p className="text-[#666] font-gilroy tracking-[0.15em] uppercase text-sm">Finding people...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Stats Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#222]">
        <div className="flex items-center gap-4">
          {stats && (
            <>
              <div className="flex items-center gap-1.5">
                <Heart className="w-4 h-4 text-[#CBAA5A]" />
                <span className="text-white font-gilroy text-sm font-bold">{stats.matches}</span>
                <span className="text-[#666] font-gilroy text-[10px] uppercase tracking-wider">matches</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#666]" />
                <span className="text-[#888] font-gilroy text-sm">{stats.match_rate}%</span>
                <span className="text-[#666] font-gilroy text-[10px] uppercase tracking-wider">rate</span>
              </div>
            </>
          )}
        </div>
        
        {matches.length > 0 && (
          <button
            onClick={onViewMatches}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#CBAA5A]/10 border border-[#CBAA5A]/30 rounded-full hover:bg-[#CBAA5A]/20 transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-[#CBAA5A]" />
            <span className="text-[#CBAA5A] font-gilroy text-[10px] font-bold tracking-wider uppercase">
              {matches.length} Matches
            </span>
          </button>
        )}
      </div>

      {/* Swipe Area */}
      <div className="flex-1 relative overflow-hidden">
        <AnimatePresence>
          {hasMoreUsers && currentUser ? (
            <SwipeCard
              key={currentUser.id}
              user={currentUser}
              onSwipe={handleSwipe}
              isTop={true}
            />
          ) : (
            <NoMoreUsers onRefresh={fetchSwipeableUsers} />
          )}
        </AnimatePresence>

        {/* Swipe Feedback Overlay */}
        <AnimatePresence>
          {swipeDirection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`absolute inset-0 pointer-events-none z-30 flex items-center justify-center ${
                swipeDirection === 'right' ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}
            >
              <motion.div
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className={`w-24 h-24 rounded-full flex items-center justify-center ${
                  swipeDirection === 'right' ? 'bg-green-500' : 'bg-red-500'
                }`}
              >
                {swipeDirection === 'right' ? (
                  <Heart className="w-12 h-12 text-white" />
                ) : (
                  <X className="w-12 h-12 text-white" />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action Buttons */}
      {hasMoreUsers && currentUser && (
        <div className="flex items-center justify-center gap-6 py-6 bg-gradient-to-t from-black to-transparent">
          {/* Undo */}
          <button
            onClick={handleUndo}
            className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:border-[#CBAA5A] transition-colors"
          >
            <RotateCcw className="w-5 h-5 text-[#888]" />
          </button>

          {/* Pass (Left) */}
          <button
            onClick={() => handleSwipe('left')}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-red-500/20 to-red-600/20 border-2 border-red-500 flex items-center justify-center hover:bg-red-500/30 transition-colors"
          >
            <X className="w-8 h-8 text-red-500" />
          </button>

          {/* Connect (Right) */}
          <button
            onClick={() => handleSwipe('right')}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-green-600/20 border-2 border-green-500 flex items-center justify-center hover:bg-green-500/30 transition-colors"
          >
            <Heart className="w-8 h-8 text-green-500" />
          </button>

          {/* Super Like (optional) */}
          <button
            className="w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center hover:border-[#CBAA5A] transition-colors"
          >
            <TrendingUp className="w-5 h-5 text-[#CBAA5A]" />
          </button>
        </div>
      )}

      {/* Match Modal */}
      {newMatch && user && (
        <MatchModal
          isOpen={!!newMatch}
          onClose={clearNewMatch}
          matchedUser={{
            id: newMatch.matched_user_id,
            name: newMatch.matched_user_name,
            photo: newMatch.matched_user_photo,
            score: newMatch.matched_user_score
          }}
          currentUser={{
            name: `${user.first_name} ${user.last_name}`,
            photo: user.profile_picture_url
          }}
        />
      )}
    </div>
  );
};

export default SwipePeopleView;

