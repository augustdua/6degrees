import React, { useState, useRef } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { MapPin, TrendingUp, Building2, ChevronLeft, ChevronRight } from 'lucide-react';

interface ConnectionStory {
  id: string;
  photo_url: string;
  story?: string;
  featured_connection_name?: string;
}

interface SwipeableUser {
  id: string;
  first_name: string;
  last_name: string;
  bio?: string;
  profile_picture_url?: string;
  social_capital_score: number;
  mutual_orgs_count: number;
  connection_stories: ConnectionStory[];
}

interface SwipeCardProps {
  user: SwipeableUser;
  onSwipe: (direction: 'left' | 'right') => void;
  isTop?: boolean;
}

/**
 * Vertical swipe card (like Hinge/Bumble)
 * Shows connection stories as gallery, or profile photo
 */
export const SwipeCard: React.FC<SwipeCardProps> = ({ user, onSwipe, isTop = false }) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Photos: connection stories first, then profile photo as fallback
  const photos = user.connection_stories.length > 0 
    ? user.connection_stories.map(s => ({ url: s.photo_url, story: s.story, connection: s.featured_connection_name }))
    : [{ url: user.profile_picture_url || '', story: null, connection: null }];

  const currentPhoto = photos[currentPhotoIndex];

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (Math.abs(info.offset.x) > 100) {
      onSwipe(info.offset.x > 0 ? 'right' : 'left');
    }
  };

  const nextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => Math.min(prev + 1, photos.length - 1));
  };

  const prevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentPhotoIndex(prev => Math.max(prev - 1, 0));
  };

  return (
    <motion.div
      ref={cardRef}
      className="absolute inset-4 rounded-3xl overflow-hidden bg-[#0a0a0a] shadow-2xl cursor-grab active:cursor-grabbing"
      style={{ x, rotate, opacity }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 0.98 }}
    >
      {/* Photo */}
      <div className="absolute inset-0">
        {currentPhoto.url ? (
          <img 
            src={currentPhoto.url} 
            alt={user.first_name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#333] to-[#1a1a1a] flex items-center justify-center">
            <span className="font-riccione text-8xl text-[#444]">
              {user.first_name[0]}{user.last_name[0]}
            </span>
          </div>
        )}
      </div>

      {/* Photo Navigation Dots */}
      {photos.length > 1 && (
        <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 z-10">
          {photos.map((_, i) => (
            <div 
              key={i}
              className={`h-1 rounded-full transition-all ${
                i === currentPhotoIndex 
                  ? 'w-6 bg-white' 
                  : 'w-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}

      {/* Photo Navigation Areas */}
      {photos.length > 1 && (
        <>
          <button 
            onClick={prevPhoto}
            className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
          />
          <button 
            onClick={nextPhoto}
            className="absolute right-0 top-0 bottom-0 w-1/3 z-10"
          />
        </>
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

      {/* Swipe Indicators */}
      <motion.div
        className="absolute top-8 left-8 px-4 py-2 rounded-lg border-4 border-green-500 z-20"
        style={{
          opacity: useTransform(x, [0, 100], [0, 1]),
          rotate: -15
        }}
      >
        <span className="text-green-500 font-gilroy font-bold text-xl tracking-wider">CONNECT</span>
      </motion.div>
      
      <motion.div
        className="absolute top-8 right-8 px-4 py-2 rounded-lg border-4 border-red-500 z-20"
        style={{
          opacity: useTransform(x, [-100, 0], [1, 0]),
          rotate: 15
        }}
      >
        <span className="text-red-500 font-gilroy font-bold text-xl tracking-wider">PASS</span>
      </motion.div>

      {/* Content Overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
        {/* Connection Story Caption */}
        {currentPhoto.story && (
          <div className="mb-4 p-3 bg-black/60 backdrop-blur-sm rounded-xl">
            <p className="text-white font-gilroy text-sm leading-relaxed">
              "{currentPhoto.story}"
            </p>
            {currentPhoto.connection && (
              <p className="text-[#CBAA5A] text-[11px] font-gilroy font-bold tracking-[0.1em] uppercase mt-2">
                with {currentPhoto.connection}
              </p>
            )}
          </div>
        )}

        {/* Name & Score */}
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="font-riccione text-3xl text-white mb-1">
              {user.first_name} {user.last_name}
            </h2>
            {user.bio && (
              <p className="text-white/70 font-gilroy text-sm line-clamp-2 max-w-[250px]">
                {user.bio}
              </p>
            )}
          </div>
          
          {/* SoCap Badge */}
          <div className="bg-black/60 backdrop-blur-sm rounded-xl p-3 border border-[#CBAA5A]/30">
            <div className="flex items-center gap-1 mb-0.5">
              <TrendingUp className="w-3 h-3 text-[#CBAA5A]" />
              <span className="text-[8px] font-gilroy font-bold tracking-[0.15em] text-[#888] uppercase">
                SoCap
              </span>
            </div>
            <div className="font-riccione text-2xl text-[#CBAA5A]">
              {user.social_capital_score}
            </div>
          </div>
        </div>

        {/* Mutual Orgs */}
        {user.mutual_orgs_count > 0 && (
          <div className="flex items-center gap-2 text-white/60">
            <Building2 className="w-4 h-4" />
            <span className="font-gilroy text-sm">
              {user.mutual_orgs_count} mutual organization{user.mutual_orgs_count > 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Empty state when no more users
 */
export const NoMoreUsers: React.FC<{ onRefresh: () => void }> = ({ onRefresh }) => (
  <div className="absolute inset-4 rounded-3xl bg-[#111] border border-[#333] flex flex-col items-center justify-center p-8 text-center">
    <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mb-6">
      <span className="text-4xl">🎯</span>
    </div>
    <h3 className="font-riccione text-2xl text-white mb-2">You've seen everyone!</h3>
    <p className="font-gilroy text-[#888] text-sm mb-6">
      Check back later for new people to connect with
    </p>
    <button 
      onClick={onRefresh}
      className="px-6 py-3 bg-[#CBAA5A] text-black font-gilroy font-bold tracking-[0.1em] uppercase text-[11px] rounded-full hover:bg-white transition-colors"
    >
      Refresh
    </button>
  </div>
);

export default SwipeCard;

