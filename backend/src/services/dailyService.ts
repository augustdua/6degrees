/**
 * Daily.co Video Service
 * Handles video room creation and management for PayNet intro calls
 */

import axios from 'axios';

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_API_URL = 'https://api.daily.co/v1';

interface CreateRoomOptions {
  name?: string;
  privacy?: 'public' | 'private';
  properties?: {
    max_participants?: number;
    enable_recording?: string;
    enable_screenshare?: boolean;
    enable_chat?: boolean;
    start_video_off?: boolean;
    start_audio_off?: boolean;
    exp?: number; // Expiration timestamp
  };
}

interface DailyRoom {
  id: string;
  name: string;
  api_created: boolean;
  privacy: string;
  url: string;
  created_at: string;
  config: any;
}

interface MeetingToken {
  token: string;
  room_name: string;
  user_name: string;
  is_owner: boolean;
}

/**
 * Create a Daily.co room for an intro call
 */
export async function createDailyRoom(callId: string, expiresIn: number = 3600): Promise<DailyRoom> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;

    const roomOptions: CreateRoomOptions = {
      name: `paynet-call-${callId}`,
      privacy: 'private',
      properties: {
        max_participants: 4, // Seller + Buyer + Target + AI Bot
        enable_recording: 'cloud', // Enable cloud recording
        enable_screenshare: false,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
        exp: expirationTime // Room expires after call scheduled time + buffer
      }
    };

    const response = await axios.post(
      `${DAILY_API_URL}/rooms`,
      roomOptions,
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Daily.co room created:', response.data.name);
    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating Daily.co room:', error.response?.data || error.message);
    throw new Error(`Failed to create Daily.co room: ${error.message}`);
  }
}

/**
 * Create (or fetch) a named Daily.co room.
 * Used for Grind House coworking (recurring rooms).
 */
export async function createNamedRoom(
  roomName: string,
  expiresIn: number = 3600,
  maxParticipants: number = 50
): Promise<DailyRoom> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;

    const roomOptions: CreateRoomOptions = {
      name: roomName,
      privacy: 'private',
      properties: {
        max_participants: maxParticipants,
        enable_chat: true,
        start_video_off: false,
        start_audio_off: false,
        exp: expirationTime,
      },
    };

    const response = await axios.post(`${DAILY_API_URL}/rooms`, roomOptions, {
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      validateStatus: () => true,
    });

    // 409 means room exists — fetch it instead.
    if (response.status === 409) {
      return await getRoomInfo(roomName);
    }

    if (response.status < 200 || response.status >= 300) {
      throw new Error(`Daily create room failed: ${response.status}`);
    }

    return response.data;
  } catch (error: any) {
    console.error('❌ Error creating named Daily.co room:', error.response?.data || error.message);
    throw new Error(`Failed to create Daily.co room: ${error.message}`);
  }
}

/**
 * Generate a meeting token for a user to join the room
 */
export async function generateMeetingToken(
  roomName: string,
  userName: string,
  isOwner: boolean = false,
  expiresIn: number = 3600,
  _userData?: Record<string, any>
): Promise<string> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    const expirationTime = Math.floor(Date.now() / 1000) + expiresIn;

    const tokenData = {
      properties: {
        room_name: roomName,
        user_name: userName,
        is_owner: isOwner,
        exp: expirationTime,
        enable_recording: 'cloud',
      }
    };

    const response = await axios.post(
      `${DAILY_API_URL}/meeting-tokens`,
      tokenData,
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Meeting token generated for:', userName);
    return response.data.token;
  } catch (error: any) {
    console.error('❌ Error generating meeting token:', error.response?.data || error.message);
    throw new Error(`Failed to generate meeting token: ${error.message}`);
  }
}

/**
 * Delete a Daily.co room
 */
export async function deleteDailyRoom(roomName: string): Promise<void> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    await axios.delete(
      `${DAILY_API_URL}/rooms/${roomName}`,
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      }
    );

    console.log('✅ Daily.co room deleted:', roomName);
  } catch (error: any) {
    console.error('❌ Error deleting Daily.co room:', error.response?.data || error.message);
    throw new Error(`Failed to delete Daily.co room: ${error.message}`);
  }
}

/**
 * Get room info
 */
export async function getRoomInfo(roomName: string): Promise<DailyRoom> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    const response = await axios.get(
      `${DAILY_API_URL}/rooms/${roomName}`,
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`
        }
      }
    );

    return response.data;
  } catch (error: any) {
    console.error('❌ Error fetching room info:', error.response?.data || error.message);
    throw new Error(`Failed to fetch room info: ${error.message}`);
  }
}

/**
 * Get room recording info
 */
export async function getRoomRecordings(roomName: string): Promise<any[]> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    const response = await axios.get(
      `${DAILY_API_URL}/recordings`,
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`
        },
        params: {
          room_name: roomName
        }
      }
    );

    return response.data.data || [];
  } catch (error: any) {
    console.error('❌ Error fetching recordings:', error.response?.data || error.message);
    throw new Error(`Failed to fetch recordings: ${error.message}`);
  }
}

/**
 * Start recording for a room
 */
export async function startRecording(roomName: string): Promise<void> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    await axios.post(
      `${DAILY_API_URL}/rooms/${roomName}/start-recording`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Recording started for room:', roomName);
  } catch (error: any) {
    console.error('❌ Error starting recording:', error.response?.data || error.message);
    throw new Error(`Failed to start recording: ${error.message}`);
  }
}

/**
 * Stop recording for a room
 */
export async function stopRecording(roomName: string): Promise<void> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    await axios.post(
      `${DAILY_API_URL}/rooms/${roomName}/stop-recording`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Recording stopped for room:', roomName);
  } catch (error: any) {
    console.error('❌ Error stopping recording:', error.response?.data || error.message);
    throw new Error(`Failed to stop recording: ${error.message}`);
  }
}

/**
 * Start transcription for a room
 */
export async function startTranscription(roomName: string): Promise<void> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    await axios.post(
      `${DAILY_API_URL}/rooms/${roomName}/start-transcription`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Transcription started for room:', roomName);
  } catch (error: any) {
    console.error('❌ Error starting transcription:', error.response?.data || error.message);
    throw new Error(`Failed to start transcription: ${error.message}`);
  }
}

/**
 * Stop transcription for a room
 */
export async function stopTranscription(roomName: string): Promise<void> {
  try {
    if (!DAILY_API_KEY) {
      throw new Error('DAILY_API_KEY not configured');
    }

    await axios.post(
      `${DAILY_API_URL}/rooms/${roomName}/stop-transcription`,
      {},
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Transcription stopped for room:', roomName);
  } catch (error: any) {
    console.error('❌ Error stopping transcription:', error.response?.data || error.message);
    throw new Error(`Failed to stop transcription: ${error.message}`);
  }
}
