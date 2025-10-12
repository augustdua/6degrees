import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, ArrowRight, Heart, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  requestId: string;
  target: string;
  shareableLink?: string;
  onShare?: () => void;
  /** If true, Join Chain will go to request details (for authenticated users in dashboard). If false, will extract linkId from shareableLink and go to public chain invite */
  isAuthenticatedView?: boolean;
}

export function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  requestId,
  target,
  shareableLink,
  onShare,
  isAuthenticatedView = true
}: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const navigate = useNavigate();

  // Extract linkId from shareableLink for public chain invite
  const linkId = shareableLink ? shareableLink.match(/\/r\/(.+)$/)?.[1] : null;

  // Auto-play when modal opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      // Reset video and play immediately
      videoRef.current.currentTime = 0;
      videoRef.current.muted = false; // Unmute for user interaction
      const playPromise = videoRef.current.play();

      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(err => {
            console.error('Auto-play failed:', err);
            // If unmuted autoplay fails, try muted
            if (videoRef.current) {
              videoRef.current.muted = true;
              videoRef.current.play().then(() => setIsPlaying(true));
            }
          });
      }
    } else if (!isOpen && videoRef.current) {
      // Pause and reset when closing
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  }, [isOpen]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleVideoClick = (e: React.MouseEvent) => {
    // Only toggle play/pause if clicking on the video itself, not buttons
    if (e.target === videoRef.current || e.currentTarget === e.target) {
      togglePlayPause();
    }
  };

  const handleJoinChain = () => {
    // Always use the participant's personal shareable link
    if (linkId) {
      // Navigate to public chain invite using THIS participant's link
      navigate(`/r/${linkId}`);
    } else {
      // Fallback to request details if no linkId available
      navigate(`/request/${requestId}`);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    // TODO: Add API call to persist like to database
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-black border-none overflow-hidden [&>button]:top-3 [&>button]:right-3 [&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary/90 [&>button]:w-10 [&>button]:h-10 [&>button]:rounded-full [&>button]:shadow-lg [&>button]:border-2 [&>button]:border-primary-foreground/20 [&>button]:flex [&>button]:items-center [&>button]:justify-center [&>button>svg]:w-4 [&>button>svg]:h-4">
        <div className="relative aspect-[9/16] bg-black">
          {/* Video element - Instagram reels style */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover cursor-pointer"
            playsInline
            loop
            autoPlay
            onClick={handleVideoClick}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />

          {/* Target info overlay (top) */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-white font-bold text-sm">{target}</p>
            </div>
          </div>

          {/* Like and Comments buttons (right side - TikTok style) */}
          <div className="absolute right-4 bottom-20 z-10 flex flex-col gap-4">
            {/* Like button */}
            <button
              onClick={handleLike}
              className="flex flex-col items-center gap-1 group"
              aria-label="Like video"
            >
              <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/60 transition-all">
                <Heart 
                  className={`w-7 h-7 transition-all ${
                    isLiked 
                      ? 'fill-red-500 text-red-500 scale-110' 
                      : 'text-white group-hover:scale-110'
                  }`}
                />
              </div>
              <span className="text-white text-xs font-semibold">{likeCount}</span>
            </button>

            {/* Comments button */}
            <button
              onClick={() => navigate(`/request/${requestId}`)}
              className="flex flex-col items-center gap-1 group"
              aria-label="View comments"
            >
              <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center group-hover:bg-black/60 transition-all">
                <MessageSquare className="w-6 h-6 text-white group-hover:scale-110 transition-all" />
              </div>
              <span className="text-white text-xs font-semibold">0</span>
            </button>
          </div>

          {/* Action buttons overlay (bottom) - Instagram style */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4 z-10">
            <Button
              size="lg"
              className="flex-1 max-w-[160px] bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              onClick={handleJoinChain}
            >
              Join Chain
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 max-w-[120px] bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>

          {/* Play/Pause indicator (subtle, fades out) */}
          {!isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-20 h-20 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                <div className="w-0 h-0 border-t-[15px] border-t-transparent border-l-[25px] border-l-white border-b-[15px] border-b-transparent ml-1"></div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
