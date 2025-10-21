import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import DailyIframe, { DailyCall, DailyEvent, DailyEventObject, DailyParticipant } from '@daily-co/daily-js';

type BotState = 'passive_listening' | 'active_listening' | 'thinking' | 'raised_hand' | 'speaking';

interface DailyCallContextValue {
  callObject: DailyCall | null;
  meetingState: 'new' | 'joining-meeting' | 'joined-meeting' | 'left-meeting' | 'error';
  participants: { [id: string]: DailyParticipant };
  error: string | null;
  botState: BotState;
  handRaised: boolean;
  handRaiseMessage: string;
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
  token: string;
  userName?: string;
  children: React.ReactNode;
}

export function DailyCallProvider({ roomUrl, token, userName, children }: DailyCallProviderProps) {
  const [callObject, setCallObject] = useState<DailyCall | null>(null);
  const [meetingState, setMeetingState] = useState<'new' | 'joining-meeting' | 'joined-meeting' | 'left-meeting' | 'error'>('new');
  const [participants, setParticipants] = useState<{ [id: string]: DailyParticipant }>({});
  const [error, setError] = useState<string | null>(null);
  const [botState, setBotState] = useState<BotState>('passive_listening');
  const [handRaised, setHandRaised] = useState(false);
  const [handRaiseMessage, setHandRaiseMessage] = useState('');

  const callObjectRef = useRef<DailyCall | null>(null);

  // Create and join call
  useEffect(() => {
    if (!roomUrl || !token) return;

    const daily = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
    });

    callObjectRef.current = daily;
    setCallObject(daily);

    // Join the call
    daily
      .join({
        url: roomUrl,
        token: token,
        userName: userName || 'User',
      })
      .catch((err) => {
        console.error('Failed to join call:', err);
        setError(err.message || 'Failed to join call');
        setMeetingState('error');
      });

    return () => {
      if (callObjectRef.current) {
        callObjectRef.current
          .leave()
          .then(() => {
            callObjectRef.current?.destroy();
          })
          .catch((err) => console.error('Error leaving call:', err));
      }
    };
  }, [roomUrl, token, userName]);

  // Meeting state event handlers
  useEffect(() => {
    if (!callObject) return;

    const handleJoiningMeeting = () => {
      console.log('📞 Joining meeting...');
      setMeetingState('joining-meeting');
    };

    const handleJoinedMeeting = () => {
      console.log('✅ Joined meeting');
      setMeetingState('joined-meeting');
    };

    const handleLeftMeeting = () => {
      console.log('👋 Left meeting');
      setMeetingState('left-meeting');
    };

    const handleError = (event?: DailyEventObject) => {
      console.error('❌ Call error:', event);
      setError(event?.errorMsg || 'An error occurred');
      setMeetingState('error');
    };

    callObject.on('joining-meeting', handleJoiningMeeting);
    callObject.on('joined-meeting', handleJoinedMeeting);
    callObject.on('left-meeting', handleLeftMeeting);
    callObject.on('error', handleError);

    return () => {
      callObject.off('joining-meeting', handleJoiningMeeting);
      callObject.off('joined-meeting', handleJoinedMeeting);
      callObject.off('left-meeting', handleLeftMeeting);
      callObject.off('error', handleError);
    };
  }, [callObject]);

  // Participant state event handlers
  useEffect(() => {
    if (!callObject) return;

    const updateParticipants = () => {
      const allParticipants = callObject.participants();
      setParticipants(allParticipants);
    };

    const handleParticipantJoined = (event?: DailyEventObject) => {
      console.log('👤 Participant joined:', event?.participant?.user_name);
      updateParticipants();
    };

    const handleParticipantLeft = (event?: DailyEventObject) => {
      console.log('👋 Participant left:', event?.participant?.user_name);
      updateParticipants();
    };

    const handleParticipantUpdated = () => {
      updateParticipants();
    };

    // Get initial participants
    updateParticipants();

    callObject.on('participant-joined', handleParticipantJoined);
    callObject.on('participant-left', handleParticipantLeft);
    callObject.on('participant-updated', handleParticipantUpdated);

    return () => {
      callObject.off('participant-joined', handleParticipantJoined);
      callObject.off('participant-left', handleParticipantLeft);
      callObject.off('participant-updated', handleParticipantUpdated);
    };
  }, [callObject]);

  // App message event handlers (bot state and hand raise)
  useEffect(() => {
    if (!callObject) return;

    const handleAppMessage = (event?: DailyEventObject) => {
      if (!event?.data) return;

      console.log('📩 App message received:', event.data);

      const { type, state, message } = event.data;

      // Bot state changes
      if (type === 'bot_state_changed' && state) {
        console.log('🤖 Bot state changed:', state);
        setBotState(state as BotState);
        
        // Clear hand raised when bot starts speaking or goes back to listening
        if (state === 'speaking' || state === 'passive_listening' || state === 'active_listening') {
          setHandRaised(false);
        }
      }

      // Hand raised (bot uses 'bot_hand_raised' type with 'reason' field)
      if (type === 'hand_raised' || type === 'bot_hand_raised') {
        console.log('✋ Bot raised hand');
        setHandRaised(true);
        // Bot sends 'reason' field, not 'message'
        const handMessage = message || event.data.reason || 'The AI Co-Pilot wants to speak';
        setHandRaiseMessage(handMessage);
      }
    };

    callObject.on('app-message', handleAppMessage);

    return () => {
      callObject.off('app-message', handleAppMessage);
    };
  }, [callObject]);

  // Send app message to bot
  const sendAppMessage = useCallback(
    (message: any) => {
      if (!callObject) {
        console.error('Cannot send app message: call object not ready');
        return;
      }

      console.log('📤 Sending app message:', message);
      callObject.sendAppMessage(message, '*');
    },
    [callObject]
  );

  // Leave call
  const leaveCall = useCallback(() => {
    if (callObject) {
      callObject
        .leave()
        .then(() => {
          console.log('Left call successfully');
        })
        .catch((err) => {
          console.error('Error leaving call:', err);
        });
    }
  }, [callObject]);

  const value: DailyCallContextValue = {
    callObject,
    meetingState,
    participants,
    error,
    botState,
    handRaised,
    handRaiseMessage,
    sendAppMessage,
    leaveCall,
  };

  return <DailyCallContext.Provider value={value}>{children}</DailyCallContext.Provider>;
}


