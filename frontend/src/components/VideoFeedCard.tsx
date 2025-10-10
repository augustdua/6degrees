import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Share2, ArrowRight, Eye, Video as VideoIcon, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React from 'react';

interface VideoFeedCardProps {
  requestId: string;
  videoUrl?: string;
  videoThumbnail?: string;
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
    bio?: string;
  };
  target: string;
  message?: string;
  reward: number;
  status: 'active' | 'completed';
  participantCount: number;
  shareableLink?: string;
  onJoinChain?: () => void;
}

export function VideoFeedCard({
  requestId,
  videoUrl,
  videoThumbnail,
  creator,
  target,
  message,
  reward,
  status,
  participantCount,
  shareableLink,
  onJoinChain
}: VideoFeedCardProps) {
  const navigate = useNavigate();
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(true);

  const startPlayback = () => {
    if (!videoUrl) return;
    setIsPlaying(true);
    requestAnimationFrame(() => {
      try {
        if (videoRef.current) {
          // Start muted to satisfy mobile autoplay policies; user can unmute via button
          videoRef.current.muted = isMuted;
          videoRef.current.volume = isMuted ? 0 : 1;
          const p = videoRef.current.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        }
      } catch {}
    });
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (videoRef.current) {
      videoRef.current.muted = next;
      videoRef.current.volume = next ? 0 : 1;
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      startPlayback();
    }
  };

  const handleShare = () => {
    if (shareableLink && navigator.share) {
      navigator.share({
        title: `Connect to ${target}`,
        text: message || `Help me connect with ${target}`,
        url: shareableLink
      });
    } else if (shareableLink) {
      navigator.clipboard.writeText(shareableLink);
      alert('Link copied to clipboard!');
    }
  };

  return (
    <Card
      className="overflow-hidden hover:shadow-xl transition-shadow h-full max-w-[420px] md:max-w-[640px] mx-auto w-full"
      data-request-id={requestId}
    >
      {/* Video Player */}
      {videoUrl ? (
        <div className="relative h-full md:aspect-video bg-black w-full mx-auto overflow-hidden">
          {/* Thumbnail image for mobile - displays before video loads */}
          {videoThumbnail && !isPlaying && (
            <img
              src={videoThumbnail}
              alt="Video thumbnail"
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
          )}
          <video
            ref={videoRef}
            src={videoUrl}
            poster={videoThumbnail || videoUrl}
            controls={false}
            playsInline
            muted
            autoPlay={isPlaying}
            preload="none"
            className="w-full h-full object-cover bg-black cursor-pointer"
            onClick={(e) => {
              if (!isPlaying) {
                e.preventDefault();
                startPlayback();
              }
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {/* Target and Stats Overlay (top) */}
          <div className="absolute top-3 left-3 right-3 z-10 space-y-2">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
              <p className="text-white font-bold text-sm line-clamp-1">{target}</p>
            </div>
            {/* Stats badge */}
            <div className="flex items-center gap-2">
              <div className="bg-black/60 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white">
                {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
              </div>
              <div className="bg-green-600/80 backdrop-blur-sm rounded-full px-3 py-1 text-xs text-white font-semibold">
                ${reward}
              </div>
              <Badge variant={status === 'completed' ? 'secondary' : 'default'} className="bg-black/60 backdrop-blur-sm border-white/20">
                {status === 'completed' ? 'Completed' : 'Active'}
              </Badge>
            </div>
          </div>

          {/* Play button - only when not playing */}
          {!isPlaying && (
            <button
              type="button"
              aria-label="Play video"
              className="absolute inset-0 flex items-center justify-center z-20"
              onClick={startPlayback}
            >
              <div className="bg-white/90 rounded-full p-4 shadow-lg">
                <Play className="w-8 h-8 text-emerald-600" />
              </div>
            </button>
          )}

          {/* Right-side controls: Play/Pause and Mute toggle (Shorts-style) */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-20">
            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={togglePlay}
              className="bg-white/90 rounded-full p-3 shadow-md active:scale-95 transition"
            >
              {isPlaying ? <Pause className="w-5 h-5 text-emerald-700" /> : <Play className="w-5 h-5 text-emerald-700" />}
            </button>
            <button
              type="button"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              onClick={toggleMute}
              className="bg-white/90 rounded-full p-3 shadow-md active:scale-95 transition"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-emerald-700" /> : <Volume2 className="w-5 h-5 text-emerald-700" />}
            </button>
          </div>

          {/* Action buttons overlay (bottom) - Instagram/TikTok style */}
          <div className="absolute bottom-3 left-3 right-3 z-10 space-y-2">
            {/* Main CTA - Join Chain */}
            {status === 'active' && (
              <Button
                onClick={onJoinChain}
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg"
              >
                Join Chain
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
            
            {/* Secondary actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1 bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
                onClick={() => navigate(`/request/${requestId}`)}
              >
                <Eye className="w-3.5 h-3.5 mr-1.5" />
                View Details
              </Button>

              {shareableLink && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm"
                  onClick={handleShare}
                >
                  <Share2 className="w-3.5 h-3.5 mr-1.5" />
                  Share
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="h-full md:aspect-video w-full mx-auto flex items-center justify-center bg-black relative overflow-hidden">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
          
          {/* Content */}
          <div className="relative text-center z-10">
            <img src="/favicon.svg" alt="6Degree" className="w-32 h-32 mx-auto mb-4 drop-shadow-2xl" />
            <p className="text-2xl font-bold text-white mb-2">6Degree</p>
            <p className="text-sm text-white/90 font-medium">Connect with {target}</p>
            <p className="text-xs text-white/70 mt-2">Video coming soon</p>
          </div>
        </div>
      )}

    </Card>
  );
}
