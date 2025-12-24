import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, LogOut, Users, MessageSquare, Music2, UserPlus, PhoneOff } from 'lucide-react';
import { useDailyCall } from './DailyCallProvider';
import { VideoTile } from './VideoTile';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';

export function CoworkingCallUI({ sessionId }: { sessionId: string }) {
  const { participants, meetingState, leaveCall, error, coworkingChat, sendCoworkingChat } = useDailyCall();
  const [panelTab, setPanelTab] = useState<'participants' | 'chat' | 'focus'>('participants');
  const [chatText, setChatText] = useState('');
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // Focus sounds
  const [noiseOn, setNoiseOn] = useState(false);
  const [noiseVolume, setNoiseVolume] = useState(0.18);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const participantList = useMemo(() => Object.values(participants), [participants]);
  const localParticipant = participantList.find((p) => (p as any).local);
  const remoteParticipants = participantList.filter((p) => !(p as any).local);

  useEffect(() => {
    // keep chat scrolled to bottom
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [coworkingChat.length]);

  const toggleNoise = async () => {
    const next = !noiseOn;
    setNoiseOn(next);
    if (!next) {
      try {
        noiseNodeRef.current?.stop();
      } catch {}
      noiseNodeRef.current = null;
      return;
    }

    // Create simple brown-ish noise (local only)
    const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx: AudioContext = audioCtxRef.current || new AudioCtx();
    audioCtxRef.current = ctx;
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});

    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const out = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      // Brown noise approximation
      lastOut = (lastOut + 0.02 * white) / 1.02;
      out[i] = lastOut * 3.5;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const gain = gainRef.current || ctx.createGain();
    gainRef.current = gain;
    gain.gain.value = noiseVolume;
    source.connect(gain);
    gain.connect(ctx.destination);
    source.start(0);
    noiseNodeRef.current = source;
  };

  useEffect(() => {
    if (gainRef.current) gainRef.current.gain.value = noiseVolume;
  }, [noiseVolume]);

  const inviteLink = useMemo(() => {
    // No token sharing. This link takes them to Grind House + opens booking for this session.
    const url = new URL(window.location.origin);
    url.searchParams.set('c', 'grind-house');
    if (sessionId) url.searchParams.set('book', sessionId);
    return url.toString();
  }, [sessionId]);

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
      <div className="flex-1 flex overflow-hidden">
        {/* Video grid */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 overflow-auto hide-scrollbar">
          {localParticipant && <VideoTile participant={localParticipant as any} isLocal={true} isBot={false} />}
          {remoteParticipants.map((p: any) => (
            <VideoTile key={p.session_id} participant={p} isLocal={false} isBot={false} />
          ))}
        </div>

        {/* Right panel */}
        <aside className="hidden lg:flex w-[360px] border-l border-[#222] bg-black/95 backdrop-blur flex-col">
          <div className="p-3 border-b border-[#222] flex items-center justify-between">
            <div className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground">Session</div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(inviteLink).catch(() => {});
              }}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-xs font-bold border border-[#333] text-white hover:bg-[#1a1a1a]"
              title="Copy invite link (they must still book)"
            >
              <UserPlus className="w-4 h-4" />
              Invite
            </button>
          </div>

          <Tabs value={panelTab} onValueChange={(v) => setPanelTab(v as any)} className="flex-1 flex flex-col">
            <div className="p-3">
              <TabsList className="w-full bg-[#0a0a0a] border border-[#222]">
                <TabsTrigger value="participants" className="w-full">
                  <Users className="w-4 h-4 mr-2" />
                  Participants
                </TabsTrigger>
                <TabsTrigger value="chat" className="w-full">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Chat
                </TabsTrigger>
                <TabsTrigger value="focus" className="w-full">
                  <Music2 className="w-4 h-4 mr-2" />
                  Focus
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="participants" className="flex-1 px-3 pb-3 mt-0">
              <ScrollArea className="h-full pr-2">
                <div className="space-y-2">
                  {participantList.map((p: any) => (
                    <div key={p.session_id || p.user_id || p.user_name} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-white font-semibold truncate">
                          {p.local ? 'You' : p.user_name || 'Member'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {/* Everyone is muted in coworking mode */}
                          <MicOff className="w-4 h-4 text-[#444]" />
                          {p.video ? <Video className="w-4 h-4 text-green-500" /> : <VideoOff className="w-4 h-4 text-red-400" />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="chat" className="flex-1 px-3 pb-3 mt-0 flex flex-col">
              <div className="flex-1 min-h-0">
                <ScrollArea className="h-full pr-2">
                  <div className="space-y-2">
                    {coworkingChat.map((m) => (
                      <div key={m.id} className="rounded-xl border border-[#222] bg-[#0a0a0a] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="text-xs font-bold text-[#CBAA5A] truncate">{m.senderName}</div>
                          <div className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString()}</div>
                        </div>
                        <div className="text-sm text-white mt-1 whitespace-pre-wrap break-words">{m.text}</div>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
              </div>

              <div className="pt-3">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendCoworkingChat(chatText);
                    setChatText('');
                  }}
                  className="flex items-center gap-2"
                >
                  <Input
                    value={chatText}
                    onChange={(e) => setChatText(e.target.value)}
                    placeholder="Message…"
                    className="bg-[#0a0a0a] border-[#222] text-white placeholder:text-[#444]"
                  />
                  <button
                    type="submit"
                    className="px-3 py-2 rounded-full text-xs font-bold transition-colors bg-[#CBAA5A] text-black hover:bg-[#D4B76A]"
                  >
                    Send
                  </button>
                </form>
              </div>
            </TabsContent>

            <TabsContent value="focus" className="flex-1 px-3 pb-3 mt-0">
              <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-4">
                <div className="text-sm font-semibold text-white">Focus sounds</div>
                <div className="text-xs text-muted-foreground mt-1">Local only (doesn’t affect others).</div>
                <div className="mt-4 flex items-center justify-between">
                  <button
                    onClick={toggleNoise}
                    className={`px-3 py-2 rounded-full text-xs font-bold transition-colors ${
                      noiseOn ? 'bg-[#CBAA5A] text-black hover:bg-[#D4B76A]' : 'border border-[#333] text-white hover:bg-[#1a1a1a]'
                    }`}
                  >
                    {noiseOn ? 'Stop Brown Noise' : 'Play Brown Noise'}
                  </button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Vol</span>
                    <input
                      type="range"
                      min={0}
                      max={0.6}
                      step={0.02}
                      value={noiseVolume}
                      onChange={(e) => setNoiseVolume(parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </div>

      {/* Bottom controls */}
      <div className="flex-shrink-0 border-t border-[#222] bg-black/95 backdrop-blur px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              {participantList.length} in room
            </div>
            {/* Info: mic is always muted, camera must stay on */}
            <div className="hidden sm:flex items-center gap-2 text-xs text-[#666]">
              <MicOff className="w-3 h-3" />
              <span>Everyone muted</span>
              <span className="mx-1">·</span>
              <Video className="w-3 h-3" />
              <span>Cameras on</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigator.clipboard?.writeText(inviteLink).catch(() => {})}
              className="lg:hidden px-3 py-2 rounded-full text-xs font-bold transition-colors border border-[#333] text-white hover:bg-[#1a1a1a]"
              title="Copy invite link"
            >
              <UserPlus className="w-4 h-4" />
            </button>
            {/* Leave button - prominent */}
            <button
              onClick={leaveCall}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-colors bg-red-600 text-white hover:bg-red-700"
              title="Leave session"
            >
              <PhoneOff className="w-4 h-4" />
              <span className="hidden sm:inline">Leave</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


