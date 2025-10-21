import axios from 'axios';
import { Request, Response } from 'express';

const DAILY_API_BASE = 'https://api.daily.co/v1';

export async function getDailyToken(req: Request, res: Response) {
  try {
    const apiKey = process.env.DAILY_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'DAILY_API_KEY not configured on server' });
    }

    const room = (req.query.room as string) || '6degreemeeting';
    const name = (req.query.name as string) || 'Guest';

    const resp = await axios.post(
      `${DAILY_API_BASE}/meeting-tokens`,
      {
        properties: {
          room_name: room,
          is_owner: false,
          user_name: name,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const token = resp.data?.token;
    if (!token) {
      return res.status(500).json({ error: 'Token not returned by Daily' });
    }
    return res.status(200).json({ token });
  } catch (err: any) {
    const msg = err.response?.data || err.message || 'Failed to mint Daily token';
    return res.status(500).json({ error: msg });
  }
}

/**
 * Daily.co Video Service
 * Handles video room creation and management for PayNet intro calls
 */

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
 * Generate a meeting token for a user to join the room
 */
export async function generateMeetingToken(
  roomName: string,
  userName: string,
  isOwner: boolean = false,
  expiresIn: number = 3600,
  userData?: {
    role?: 'buyer' | 'seller' | 'target';
    userId?: string;
    [key: string]: any;
  }
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
        // Add custom user metadata (visible to bot!)
        user_data: userData || {}
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

// Recording controls
export async function startRecording(roomName: string, options?: any): Promise<void> {
  if (!DAILY_API_KEY) throw new Error('DAILY_API_KEY not configured');
  await axios.post(`${DAILY_API_URL}/rooms/${roomName}/recordings/start`, options || {}, {
    headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
  });
}

export async function stopRecording(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) throw new Error('DAILY_API_KEY not configured');
  await axios.post(`${DAILY_API_URL}/rooms/${roomName}/recordings/stop`, {}, {
    headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
  });
}

// Transcription controls
export async function startTranscription(roomName: string, options?: any): Promise<void> {
  if (!DAILY_API_KEY) throw new Error('DAILY_API_KEY not configured');
  await axios.post(`${DAILY_API_URL}/rooms/${roomName}/transcription/start`, options || {}, {
    headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
  });
}

export async function stopTranscription(roomName: string): Promise<void> {
  if (!DAILY_API_KEY) throw new Error('DAILY_API_KEY not configured');
  await axios.post(`${DAILY_API_URL}/rooms/${roomName}/transcription/stop`, {}, {
    headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
  });
}

// Session data helpers
export async function setSessionData(roomName: string, data: any): Promise<void> {
  if (!DAILY_API_KEY) throw new Error('DAILY_API_KEY not configured');
  await axios.post(`${DAILY_API_URL}/rooms/${roomName}/set-session-data`, data, {
    headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
  });
}

export async function getSessionData(roomName: string): Promise<any> {
  if (!DAILY_API_KEY) throw new Error('DAILY_API_KEY not configured');
  const resp = await axios.get(`${DAILY_API_URL}/rooms/${roomName}/get-session-data`, {
    headers: { 'Authorization': `Bearer ${DAILY_API_KEY}` }
  });
  return resp.data;
}
