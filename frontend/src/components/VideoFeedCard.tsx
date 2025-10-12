import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Share2, ArrowRight, Eye, Video as VideoIcon, Play, Pause, Volume2, VolumeX, Info, DollarSign, RotateCcw, Heart, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { convertAndFormatINR } from '@/lib/currency';

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
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [isMuted, setIsMuted] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [seeking, setSeeking] = React.useState(false);
  const [hasEnded, setHasEnded] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);
  const [isInView, setIsInView] = React.useState(false);
  const [thumbnailError, setThumbnailError] = React.useState(false);
  const [isLiked, setIsLiked] = React.useState(false);
  const [likeCount, setLikeCount] = React.useState(0);

  // Use thumbnail if provided and valid; don't use videoUrl as fallback
  const displayThumbnail = !thumbnailError ? videoThumbnail : undefined;

  const startPlayback = () => {
    if (!videoUrl) return;
    setIsPlaying(true);
    requestAnimationFrame(() => {
      try {
        if (videoRef.current) {
          // Always play unmuted
          videoRef.current.muted = false;
          videoRef.current.volume = 1;
          setIsMuted(false);
          const p = videoRef.current.play();
          if (p && typeof p.catch === 'function') p.catch(() => {
            console.log('Unmuted autoplay blocked by browser');
            setIsPlaying(false);
          });
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
      setHasEnded(false);
      startPlayback();
    }
  };

  const playAgain = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    setHasEnded(false);
    startPlayback();
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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

  const handleLike = () => {
    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    // TODO: Add API call to persist like to database
  };

  // Intersection Observer for autoplay
  React.useEffect(() => {
    if (!containerRef.current || !videoRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
          
          if (entry.isIntersecting && videoRef.current) {
            // Video is in view - play immediately if not already playing
            if (!videoRef.current.paused) return; // Already playing, skip
            
            // Reset and play
            videoRef.current.currentTime = 0;
            setHasEnded(false);
            startPlayback();
          } else if (!entry.isIntersecting && videoRef.current) {
            // Video is out of view - pause with slight delay to prevent flickering
            setTimeout(() => {
              if (videoRef.current && !entry.isIntersecting) {
                videoRef.current.pause();
                setIsPlaying(false);
              }
            }, 150);
          }
        });
      },
      {
        threshold: 0.6, // Trigger when 60% of the video is visible
        rootMargin: '0px 0px', // No margin for more immediate response
      }
    );

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []); // Empty deps - observer checks video state directly

  return (
    <>
    <Card
      ref={containerRef}
      className="overflow-hidden hover:shadow-xl transition-shadow h-full mx-auto flex flex-col relative"
      data-request-id={requestId}
      style={{ maxWidth: '420px' }}
    >
      {/* Video Player */}
      {videoUrl ? (
        <div
          className="relative w-full h-full bg-black overflow-hidden flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            // Only toggle if clicking the container (not buttons or video)
            if (e.target === e.currentTarget) {
              togglePlay();
            }
          }}
        >
          {/* Thumbnail image for mobile - displays before video loads */}
          {displayThumbnail && !isPlaying && (
            <img
              src={displayThumbnail}
              alt="Video thumbnail"
              className="max-w-full max-h-full object-contain cursor-pointer"
              loading="eager"
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              onError={() => {
                console.warn('Thumbnail failed to load:', displayThumbnail);
                setThumbnailError(true);
              }}
            />
          )}
          <video
            ref={videoRef}
            src={videoUrl}
            poster={displayThumbnail}
            controls={false}
            playsInline
            muted={isMuted}
            autoPlay={isPlaying}
            preload="metadata"
            className="max-w-full max-h-full object-contain cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              togglePlay();
            }}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => {
              setIsPlaying(false);
              setHasEnded(true);
            }}
            onTimeUpdate={(e) => {
              if (!seeking) {
                setCurrentTime(e.currentTarget.currentTime);
              }
            }}
            onDurationChange={(e) => setDuration(e.currentTarget.duration)}
            onLoadedMetadata={(e) => {
              // Seek to 0.5s to show first frame (same as Dashboard)
              const video = e.currentTarget;
              setDuration(video.duration);
              video.currentTime = 0.5;
            }}
          />
          
          {/* Reward Badge - Top Center */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-black px-4 py-2 rounded-full shadow-xl flex items-center gap-2 text-base md:text-lg font-bold backdrop-blur-sm">
              <span className="text-black text-lg md:text-xl">₹</span>
              <span>{convertAndFormatINR(reward)}</span>
            </div>
          </div>

          {/* Info Button - Top Left */}
          <button
            type="button"
            aria-label="View request details"
            onClick={(e) => {
              e.stopPropagation();
              setShowDetails(true);
            }}
            className="absolute top-3 left-3 z-10 bg-black/60 backdrop-blur-sm rounded-full p-2 shadow-md active:scale-95 transition"
          >
            <Info className="w-5 h-5 text-white" />
          </button>

          {/* Play/Pause indicator - shown when video is paused or ended */}
          {(!isPlaying || hasEnded) && (
            <button
              type="button"
              aria-label={hasEnded ? "Play again" : "Play video"}
              className="absolute inset-0 flex items-center justify-center z-20"
              onClick={(e) => {
                e.stopPropagation();
                if (hasEnded) {
                  playAgain();
                } else {
                  togglePlay();
                }
              }}
            >
              <div className="bg-white/90 rounded-full p-4 shadow-lg">
                <Play className="w-8 h-8 text-emerald-600" />
              </div>
            </button>
          )}

          {/* Right-side controls: Like, Comments, Mute, and Share (TikTok-style) */}
          <div className="absolute right-3 top-20 md:top-1/2 md:-translate-y-1/2 flex flex-col gap-3 z-20">
            {/* Like button */}
            <button
              type="button"
              aria-label="Like video"
              onClick={(e) => {
                e.stopPropagation();
                handleLike();
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="bg-white/90 rounded-full p-3 shadow-md active:scale-95 transition">
                <Heart 
                  className={`w-6 h-6 transition-all ${
                    isLiked 
                      ? 'fill-red-500 text-red-500' 
                      : 'text-emerald-700'
                  }`}
                />
              </div>
              <span className="text-white text-xs font-semibold drop-shadow-md">{likeCount}</span>
            </button>

            {/* Comments button */}
            <button
              type="button"
              aria-label="View comments"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/request/${requestId}`);
              }}
              className="flex flex-col items-center gap-1"
            >
              <div className="bg-white/90 rounded-full p-3 shadow-md active:scale-95 transition">
                <MessageSquare className="w-6 h-6 text-emerald-700" />
              </div>
              <span className="text-white text-xs font-semibold drop-shadow-md">0</span>
            </button>

            <button
              type="button"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="bg-white/90 rounded-full p-3 shadow-md active:scale-95 transition"
            >
              {isMuted ? <VolumeX className="w-5 h-5 text-emerald-700" /> : <Volume2 className="w-5 h-5 text-emerald-700" />}
            </button>
            <button
              type="button"
              aria-label="Share"
              onClick={(e) => {
                e.stopPropagation();
                handleShare();
              }}
              className="bg-white/90 rounded-full p-3 shadow-md active:scale-95 transition"
            >
              <Share2 className="w-5 h-5 text-emerald-700" />
            </button>
          </div>

          {/* Action buttons overlay (bottom) - Instagram/TikTok style */}
          <div className="absolute bottom-20 md:bottom-28 left-3 right-3 z-10">
            <div className="flex flex-col gap-2">
              {/* Join Chain button */}
              {status === 'active' && onJoinChain && (
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoinChain();
                  }}
                  size="lg"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-bold shadow-lg"
                >
                  Join Chain
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              )}

              {/* View Details button */}
              <Button
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/request/${requestId}`);
                }}
              >
                <Eye className="w-4 h-4 mr-1.5" />
                View Details
              </Button>
            </div>
          </div>

          {/* Video Seekbar - Bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-30 px-3 pb-3">
            <div className="bg-black/60 backdrop-blur-sm rounded-full p-2 space-y-1">
              {/* Reload button and Time display */}
              <div className="flex items-center justify-between text-xs text-white px-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Restart video"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (videoRef.current) {
                        videoRef.current.currentTime = 0;
                        setCurrentTime(0);
                        setHasEnded(false);
                        if (!isPlaying) {
                          startPlayback();
                        }
                      }
                    }}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                  <span>{formatTime(currentTime)}</span>
                </div>
                <span>{formatTime(duration)}</span>
              </div>
              {/* Progress bar */}
              <div 
                className="relative h-2 bg-white/20 rounded-full cursor-pointer overflow-hidden"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSeek(e);
                }}
              >
                {/* Filled progress */}
                <div 
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
                {/* Drag handle */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg transition-all"
                  style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`, transform: 'translate(-50%, -50%)' }}
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-black relative overflow-hidden">
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
    
    {/* Request Details Dialog */}
    <Dialog open={showDetails} onOpenChange={setShowDetails}>
      <DialogContent className="sm:max-w-md mx-4">
        <DialogHeader>
          <DialogTitle>Request Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Creator Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12">
              <AvatarImage src={creator.avatar || undefined} />
              <AvatarFallback>
                {creator.firstName?.[0]}{creator.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{creator.firstName} {creator.lastName}</p>
              <p className="text-sm text-muted-foreground">{creator.bio}</p>
            </div>
          </div>

          {/* Target */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Target Connection</p>
            <p className="font-semibold text-lg mt-1">{target}</p>
          </div>

          {/* Message */}
          {message && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Message</p>
              <p className="mt-1">{message}</p>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 pt-2 border-t">
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="font-semibold text-green-600">${reward}</span>
            </div>
            <div className="flex items-center gap-1">
              <Avatar className="w-4 h-4">
                <AvatarFallback className="text-xs">
                  {participantCount}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{participantCount} {participantCount === 1 ? 'participant' : 'participants'}</span>
            </div>
            <Badge variant={status === 'completed' ? 'secondary' : 'default'}>
              {status === 'completed' ? 'Completed' : 'Active'}
            </Badge>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
