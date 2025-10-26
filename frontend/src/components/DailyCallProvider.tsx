import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import DailyIframe, { DailyCall, DailyEventObjectAppMessage, DailyParticipant } from '@daily-co/daily-js';

type BotState = 'passive_listening' | 'active_listening' | 'thinking' | 'raised_hand' | 'speaking' | 'idle';
type MeetingState = 'new' | 'joining-meeting' | 'joined-meeting' | 'left-meeting' | 'error';

interface DailyCallContextValue {
  dailyCallObject: DailyCall | null;
  meetingState: MeetingState;
  participants: Record<string, DailyParticipant>;
  botState: BotState;
  handRaisedMessage: string | null;
  error: string | null;
  sendAppMessage: (message: any) => void;
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
}

export function DailyCallProvider({ roomUrl, token, userName, children }: DailyCallProviderProps) {
  const [dailyCallObject, setDailyCallObject] = useState<DailyCall | null>(null);
  const [meetingState, setMeetingState] = useState<MeetingState>('new');
  const [participants, setParticipants] = useState<Record<string, DailyParticipant>>({});
  const [botState, setBotState] = useState<BotState>('idle');
  const [handRaisedMessage, setHandRaisedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const callObjectRef = useRef<DailyCall | null>(null);

  // Initialize Daily call
  useEffect(() => {
    if (!roomUrl) return;

    const initCall = async () => {
      try {
        console.log('🎥 Initializing Daily call:', { roomUrl, hasToken: !!token, userName });
        
        const callObject = DailyIframe.createCallObject({
          audioSource: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
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
        });

        callObject.on('participant-left', (event) => {
          console.log('👋 Participant left:', event.participant);
          setParticipants((prev) => {
            const updated = { ...prev };
            delete updated[event.participant.session_id];
            return updated;
          });
        });

        // Listen for app messages from bot
        callObject.on('app-message', (event: DailyEventObjectAppMessage) => {
          console.log('📨 App message received:', event.data);
          
          if (event.data && typeof event.data === 'object') {
            const data = event.data as any;
            
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
          }
        });

        // Join the call
        setMeetingState('joining-meeting');
        await callObject.join({
          url: roomUrl,
          token: token,
          userName: userName || 'Guest',
          subscribeToTracksAutomatically: true,
        });

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
    error,
    sendAppMessage,
    leaveCall,
  };

  return <DailyCallContext.Provider value={value}>{children}</DailyCallContext.Provider>;
}
