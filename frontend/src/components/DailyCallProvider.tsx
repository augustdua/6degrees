import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import DailyIframe, { DailyCall, DailyEventObjectAppMessage, DailyParticipant } from '@daily-co/daily-js';

type BotState = 'passive_listening' | 'active_listening' | 'thinking' | 'raised_hand' | 'speaking' | 'idle';
type MeetingState = 'new' | 'joining-meeting' | 'joined-meeting' | 'left-meeting' | 'error';

interface ConversationMessage {
  speaker_name: string;
  speaker_role: string;
  text: string;
  timestamp: string | null;
}

export interface CoworkingChatMessage {
  id: string;
  text: string;
  senderName: string;
  createdAt: string; // ISO
}

interface DailyCallContextValue {
  dailyCallObject: DailyCall | null;
  meetingState: MeetingState;
  participants: Record<string, DailyParticipant>;
  botState: BotState;
  handRaisedMessage: string | null;
  conversationHistory: ConversationMessage[];
  totalUtterances: number;
  error: string | null;
  sendAppMessage: (message: any) => void;
  coworkingChat: CoworkingChatMessage[];
  sendCoworkingChat: (text: string) => void;
  leaveCall: () => void;
}

const DailyCallContext = createContext<DailyCallContextValue | null>(null);

export function useDailyCall() {
  const context = useContext(DailyCallContext);
  if (!context) {
    throw new Error('useDailyCall must be used within DailyCallProvider');
  }
  return context;
}

interface DailyCallProviderProps {
  roomUrl: string;
  token?: string;
  userName?: string;
  children: React.ReactNode;
  /** If true, enforce Grind House rules: muted mic, required video */
  coworkingMode?: boolean;
  /** Callback when user should be kicked (e.g., turned off video in coworking mode) */
  onForceLeave?: () => void;
}

export function DailyCallProvider({ roomUrl, token, userName, children, coworkingMode, onForceLeave }: DailyCallProviderProps) {
  const [dailyCallObject, setDailyCallObject] = useState<DailyCall | null>(null);
  const [meetingState, setMeetingState] = useState<MeetingState>('new');
  const [participants, setParticipants] = useState<Record<string, DailyParticipant>>({});
  const [botState, setBotState] = useState<BotState>('idle');
  const [handRaisedMessage, setHandRaisedMessage] = useState<string | null>(null);
  const [conversationHistory, setConversationHistory] = useState<ConversationMessage[]>([]);
  const [totalUtterances, setTotalUtterances] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [coworkingChat, setCoworkingChat] = useState<CoworkingChatMessage[]>([]);
  const callObjectRef = useRef<DailyCall | null>(null);

  // Initialize Daily call
  useEffect(() => {
    if (!roomUrl) return;

    const initCall = async () => {
      try {
        console.log('🎥 Initializing Daily call:', { roomUrl, hasToken: !!token, userName });
        
        const callObject = DailyIframe.createCallObject({
          audioSource: true,
          videoSource: true,
        });

        callObjectRef.current = callObject;
        setDailyCallObject(callObject);

        // Event handlers
        callObject.on('joined-meeting', () => {
          console.log('✅ Joined meeting');
          setMeetingState('joined-meeting');
        });

        callObject.on('left-meeting', () => {
          console.log('👋 Left meeting');
          setMeetingState('left-meeting');
        });

        callObject.on('error', (e) => {
          console.error('❌ Daily error:', e);
          setError(e?.errorMsg || 'An error occurred');
          setMeetingState('error');
        });

        callObject.on('participant-joined', (event) => {
          console.log('👤 Participant joined:', event.participant);
          setParticipants((prev) => ({
            ...prev,
            [event.participant.session_id]: event.participant,
          }));
        });

        callObject.on('participant-updated', (event) => {
          setParticipants((prev) => ({
            ...prev,
            [event.participant.session_id]: event.participant,
          }));
          
          // Coworking mode: if LOCAL user turns off video, auto-leave
          if (coworkingMode && event.participant.local && event.participant.video === false) {
            console.log('📵 Video turned off in coworking mode – leaving call');
            callObject.leave();
            onForceLeave?.();
          }
        });

        callObject.on('participant-left', (event) => {
          console.log('👋 Participant left:', event.participant);
          setParticipants((prev) => {
            const updated = { ...prev };
            delete updated[event.participant.session_id];
            return updated;
          });
        });

        // Listen for app messages (bot + coworking chat)
        callObject.on('app-message', (event: DailyEventObjectAppMessage) => {
          console.log('📨 App message received:', event.data);
          
          if (event.data && typeof event.data === 'object') {
            const data = event.data as any;

            // Grind House chat messages
            if (data.type === 'cowork_chat' && typeof data.text === 'string') {
              const msg: CoworkingChatMessage = {
                id: String(data.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
                text: String(data.text || '').slice(0, 2000),
                senderName: String(data.senderName || 'Member').slice(0, 80),
                createdAt: String(data.createdAt || new Date().toISOString()),
              };
              setCoworkingChat((prev) => {
                const next = [...prev, msg];
                return next.length > 200 ? next.slice(next.length - 200) : next;
              });
              return;
            }
            
            // Bot state changes
            if (data.type === 'bot_state_changed' && data.state) {
              console.log('🤖 Bot state changed:', data.state);
              setBotState(data.state as BotState);
            }
            
            // Hand raised
            if (data.type === 'bot_hand_raised') {
              console.log('✋ Bot raised hand:', data.reason);
              setBotState('raised_hand');
              setHandRaisedMessage(data.reason || 'I have something to add');
            }
            
            // Conversation context update
            if (data.type === 'conversation_context_update') {
              console.log('💬 Conversation context updated:', data.total_utterances, 'total messages');
              setConversationHistory(data.conversation_history || []);
              setTotalUtterances(data.total_utterances || 0);
            }
          }
        });

        // Join the call
        setMeetingState('joining-meeting');
        await callObject.join({
          url: roomUrl,
          token: token,
          userName: userName || 'Guest',
          subscribeToTracksAutomatically: true,
          // Start with video ON in coworking mode
          startVideoOff: false,
          // Start with audio OFF in coworking mode
          startAudioOff: coworkingMode ? true : false,
        });

        // Coworking mode: forcibly mute mic after join to be safe
        if (coworkingMode) {
          try {
            await callObject.setLocalAudio(false);
            console.log('🔇 Mic muted for coworking mode');
          } catch {}
        }

        console.log('✅ Call joined successfully');
      } catch (err: any) {
        console.error('❌ Failed to join call:', err);
        setError(err?.message || 'Failed to join call');
        setMeetingState('error');
      }
    };

    initCall();

    // Cleanup
    return () => {
      if (callObjectRef.current) {
        console.log('🧹 Cleaning up Daily call');
        callObjectRef.current.destroy();
      }
    };
  }, [roomUrl, token, userName]);

  const sendAppMessage = useCallback((message: any) => {
    if (dailyCallObject) {
      console.log('📤 Sending app message:', message);
      dailyCallObject.sendAppMessage(message, '*');
    }
  }, [dailyCallObject]);

  const sendCoworkingChat = useCallback((text: string) => {
    const trimmed = String(text || '').trim();
    if (!trimmed) return;
    const payload = {
      type: 'cowork_chat',
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      text: trimmed.slice(0, 2000),
      senderName: (userName || 'Member').slice(0, 80),
      createdAt: new Date().toISOString(),
    };
    sendAppMessage(payload);
    // Optimistic local insert (so sender sees it even if their own app-message isn't echoed back)
    setCoworkingChat((prev) => {
      const next = [...prev, { id: payload.id, text: payload.text, senderName: payload.senderName, createdAt: payload.createdAt }];
      return next.length > 200 ? next.slice(next.length - 200) : next;
    });
  }, [sendAppMessage, userName]);

  const leaveCall = useCallback(() => {
    if (dailyCallObject) {
      console.log('👋 Leaving call');
      dailyCallObject.leave();
    }
  }, [dailyCallObject]);

  const value: DailyCallContextValue = {
    dailyCallObject,
    meetingState,
    participants,
    botState,
    handRaisedMessage,
    conversationHistory,
    totalUtterances,
    error,
    sendAppMessage,
    coworkingChat,
    sendCoworkingChat,
    leaveCall,
  };

  return <DailyCallContext.Provider value={value}>{children}</DailyCallContext.Provider>;
}
