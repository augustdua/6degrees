import { useMemo, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, LogOut, Users } from 'lucide-react';
import { useDailyCall } from './DailyCallProvider';
import { VideoTile } from './VideoTile';

export function CoworkingCallUI() {
  const { participants, meetingState, dailyCallObject, leaveCall, error } = useDailyCall();
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);

  const participantList = useMemo(() => Object.values(participants), [participants]);
  const localParticipant = participantList.find((p) => (p as any).local);
  const remoteParticipants = participantList.filter((p) => !(p as any).local);

  const toggleMic = async () => {
    const next = !micOn;
    setMicOn(next);
    try {
      await (dailyCallObject as any)?.setLocalAudio?.(next);
    } catch {
      // ignore
    }
  };

  const toggleCam = async () => {
    const next = !camOn;
    setCamOn(next);
    try {
      await (dailyCallObject as any)?.setLocalVideo?.(next);
    } catch {
      // ignore
    }
  };

  if (meetingState === 'error') {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center max-w-md px-6">
          <div className="text-white text-lg font-semibold">Connection Error</div>
          <div className="text-muted-foreground text-sm mt-2">{error || 'Failed to join the session.'}</div>
        </div>
      </div>
    );
  }

  if (meetingState !== 'joined-meeting') {
    return (
      <div className="h-full flex items-center justify-center bg-black">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CBAA5A] mx-auto mb-4" />
          <div className="text-white text-lg">Joining Grind House…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Video grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-auto hide-scrollbar">
        {localParticipant && (
          <VideoTile participant={localParticipant as any} isLocal={true} isBot={false} />
        )}
        {remoteParticipants.map((p: any) => (
          <VideoTile key={p.session_id} participant={p} isLocal={false} isBot={false} />
        ))}
      </div>

      {/* Minimal controls */}
      <div className="flex-shrink-0 border-t border-[#222] bg-black/95 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Users className="w-4 h-4" />
            {participantList.length} in room
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMic}
              className={`px-3 py-2 rounded-full text-xs font-bold transition-colors border ${
                micOn ? 'border-[#333] text-white hover:bg-[#1a1a1a]' : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
              }`}
              title={micOn ? 'Mute' : 'Unmute'}
            >
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
            </button>
            <button
              onClick={toggleCam}
              className={`px-3 py-2 rounded-full text-xs font-bold transition-colors border ${
                camOn ? 'border-[#333] text-white hover:bg-[#1a1a1a]' : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
              }`}
              title={camOn ? 'Turn camera off' : 'Turn camera on'}
            >
              {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
            </button>
            <button
              onClick={leaveCall}
              className="px-3 py-2 rounded-full text-xs font-bold transition-colors bg-[#CBAA5A] text-black hover:bg-[#D4B76A]"
              title="Leave"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


