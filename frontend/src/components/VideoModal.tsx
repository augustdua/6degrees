import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Share2, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  requestId: string;
  target: string;
  shareableLink?: string;
  onShare?: () => void;
}

export function VideoModal({
  isOpen,
  onClose,
  videoUrl,
  requestId,
  target,
  shareableLink,
  onShare
}: VideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const navigate = useNavigate();

  // Auto-play when modal opens
  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.play().catch(err => {
        console.error('Auto-play failed:', err);
      });
      setIsPlaying(true);
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
    navigate(`/request/${requestId}`);
  };

  const handleShare = () => {
    if (onShare) {
      onShare();
    } else if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 bg-black border-none overflow-hidden">
        <div className="relative aspect-[9/16] bg-black">
          {/* Video element - Instagram reels style */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover cursor-pointer"
            playsInline
            loop
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
