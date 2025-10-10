import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Share2, ArrowRight, Eye, Video as VideoIcon, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
        <div className="relative aspect-[9/16] bg-black w-full max-w-[420px] mx-auto overflow-hidden cursor-pointer" onClick={() => navigate(`/request/${requestId}`)}>
          {/* Thumbnail only; click opens details/modal page */}
          <img src={videoThumbnail || '/favicon.svg'} alt="Video thumbnail" className="w-full h-full object-cover opacity-90" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white/90 rounded-full p-4 shadow-lg">
              <Play className="w-8 h-8 text-emerald-600" />
            </div>
          </div>

          {/* Creator Overlay (bottom-left) */}
          <div className="absolute bottom-20 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-full px-3 py-2">
            <Avatar className="w-8 h-8 border-2 border-white">
              <AvatarImage src={creator.avatar} />
              <AvatarFallback>
                {creator.firstName?.[0]}{creator.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-white text-sm font-semibold">
                {creator.firstName} {creator.lastName}
              </p>
            </div>
          </div>

          {/* Target Info (top overlay) */}
          <div className="absolute top-4 left-4 right-4">
            <div className="bg-black/60 backdrop-blur-sm rounded-lg p-3">
              <p className="text-white font-semibold text-sm">Looking to connect with:</p>
              <p className="text-white font-bold">{target}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="aspect-[9/16] w-full max-w-[420px] mx-auto flex items-center justify-center bg-gradient-to-br from-emerald-600/15 via-cyan-600/10 to-indigo-600/15">
          <div className="text-center">
            <img src="/favicon.svg" alt="6Degree" className="w-16 h-16 mx-auto mb-3 opacity-90" />
            <p className="text-sm font-medium text-foreground/80">6Degree</p>
            <p className="text-xs text-muted-foreground">No video yet</p>
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
