import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Share2, ArrowRight, Eye, Video as VideoIcon, Play } from 'lucide-react';
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

  const startPlayback = () => {
    if (!videoUrl) return;
    setIsPlaying(true);
    requestAnimationFrame(() => {
      try {
        if (videoRef.current) {
          videoRef.current.muted = true;
          const p = videoRef.current.play();
          if (p && typeof p.catch === 'function') p.catch(() => {});
        }
      } catch {}
    });
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
      className="overflow-hidden hover:shadow-xl transition-shadow md:max-w-[480px] mx-auto"
      data-request-id={requestId}
    >
      {/* Video Player */}
      {videoUrl ? (
        <div className="relative aspect-[9/16] bg-black w-full max-w-[420px] mx-auto overflow-hidden">
          <video
            ref={videoRef}
            src={videoUrl}
            poster={videoThumbnail || videoUrl}
            controls={isPlaying}
            playsInline
            muted
            autoPlay={isPlaying}
            className="w-full h-full object-contain bg-black"
            onLoadedMetadata={(e) => {
              const video = e.currentTarget;
              // Seek to 0.5 seconds to get a good thumbnail frame
              if (!videoThumbnail) {
                video.currentTime = 0.5;
              }
            }}
          />
          {!isPlaying && (
            <button
              type="button"
              aria-label="Play video"
              className="absolute inset-0 flex items-center justify-center"
              onClick={startPlayback}
            >
              <div className="bg-white/90 rounded-full p-4 shadow-lg">
                <Play className="w-8 h-8 text-emerald-600" />
              </div>
            </button>
          )}
        </div>
      ) : (
        <div className="aspect-[9/16] w-full max-w-[420px] mx-auto flex items-center justify-center bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600 relative overflow-hidden">
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

      {/* Action Buttons */}
      <CardContent className="p-4 space-y-3">
        {/* Stats */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              {participantCount} {participantCount === 1 ? 'participant' : 'participants'}
            </span>
            <span className="font-semibold text-green-600">${reward}</span>
          </div>
          <Badge variant={status === 'completed' ? 'secondary' : 'default'}>
            {status === 'completed' ? 'Completed' : 'Active'}
          </Badge>
        </div>

        {/* Main CTA - Join Chain (Prominent) */}
        {status === 'active' && (
          <Button
            onClick={onJoinChain}
            size="lg"
            className="w-full font-bold text-lg"
            variant="default"
          >
            Join Chain
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        )}

        {/* Secondary Actions */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => navigate(`/request/${requestId}`)}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Details
          </Button>

          {shareableLink && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleShare}
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
