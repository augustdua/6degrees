import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';

interface VideoTileProps {
  participant: {
    user_name?: string;
    video?: boolean;
    audio?: boolean;
    tracks?: {
      video?: { track: MediaStreamTrack; state: string };
      audio?: { track: MediaStreamTrack; state: string };
    };
    local?: boolean;
  };
  isLocal: boolean;
  isBot: boolean;
}

export function VideoTile({ participant, isLocal, isBot }: VideoTileProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const userName = participant.user_name || (isLocal ? 'You' : 'Guest');
  const hasVideo = participant.video && participant.tracks?.video?.state === 'playable';
  const hasAudio = participant.audio && participant.tracks?.audio?.state === 'playable';

  // Set up video track
  useEffect(() => {
    if (videoRef.current && participant.tracks?.video?.track) {
      const videoTrack = participant.tracks.video.track;
      videoRef.current.srcObject = new MediaStream([videoTrack]);
    }
  }, [participant.tracks?.video?.track]);

  // Set up audio track (not for local participant to avoid echo)
  useEffect(() => {
    if (audioRef.current && !isLocal && participant.tracks?.audio?.track) {
      const audioTrack = participant.tracks.audio.track;
      audioRef.current.srcObject = new MediaStream([audioTrack]);
    }
  }, [participant.tracks?.audio?.track, isLocal]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Video or Avatar */}
      {hasVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <Avatar className="w-24 h-24">
            <AvatarFallback className="text-3xl bg-primary text-primary-foreground">
              {userName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}

      {/* Audio element (hidden, only for remote participants) */}
      {!isLocal && hasAudio && (
        <audio ref={audioRef} autoPlay playsInline />
      )}

      {/* Name and status badges */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="bg-black/70 backdrop-blur-sm px-3 py-1.5 rounded-full">
          <span className="text-white text-sm font-medium">{userName}</span>
          {isBot && (
            <span className="ml-2 text-xs text-blue-400">AI Co-Pilot</span>
          )}
        </div>

        <div className="flex gap-2">
          {/* Microphone status */}
          <div className={`p-2 rounded-full ${hasAudio ? 'bg-gray-800/70' : 'bg-red-600/70'}`}>
            {hasAudio ? (
              <Mic className="w-4 h-4 text-white" />
            ) : (
              <MicOff className="w-4 h-4 text-white" />
            )}
          </div>

          {/* Camera status */}
          <div className={`p-2 rounded-full ${hasVideo ? 'bg-gray-800/70' : 'bg-red-600/70'}`}>
            {hasVideo ? (
              <Video className="w-4 h-4 text-white" />
            ) : (
              <VideoOff className="w-4 h-4 text-white" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}














