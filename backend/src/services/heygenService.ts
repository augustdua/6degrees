import axios from 'axios';

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || '';
const HEYGEN_API_URL = 'https://api.heygen.com';

export interface HeyGenVideoRequest {
  script: string;
  avatarId?: string;
  voiceId?: string;
}

export interface HeyGenVideoStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  videoUrl?: string;
  error?: string;
}

/**
 * Generate an AI video using HeyGen API
 */
export async function generateHeyGenVideo(request: HeyGenVideoRequest): Promise<string> {
  const avatarId = request.avatarId || 'Daisy-inskirt-20220818';
  const voiceId = request.voiceId || '2d5b0e6cf36f460aa7fc47e3eee4ba54';

  try {
    const response = await axios.post(
      `${HEYGEN_API_URL}/v2/video/generate`,
      {
        video_inputs: [
          {
            character: {
              type: 'avatar',
              avatar_id: avatarId,
              avatar_style: 'normal'
            },
            voice: {
              type: 'text',
              input_text: request.script,
              voice_id: voiceId
            },
            background: {
              type: 'color',
              value: '#FFFFFF'
            }
          }
        ],
        dimension: {
          width: 720,
          height: 1280  // Vertical video for mobile/feed
        },
        aspect_ratio: '9:16'
      },
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('HeyGen video generation started:', response.data);
    return response.data.data.video_id;
  } catch (error: any) {
    console.error('Error generating HeyGen video:', error.response?.data || error.message);
    throw new Error(`Failed to generate video: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Check the status of a HeyGen video
 */
export async function checkHeyGenVideoStatus(videoId: string): Promise<HeyGenVideoStatus> {
  try {
    const response = await axios.get(
      `${HEYGEN_API_URL}/v1/video_status.get?video_id=${videoId}`,
      {
        headers: {
          'X-Api-Key': HEYGEN_API_KEY
        }
      }
    );

    const data = response.data.data;

    if (data.status === 'completed') {
      return {
        status: 'completed',
        videoUrl: data.video_url
      };
    } else if (data.status === 'failed') {
      return {
        status: 'failed',
        error: data.error || 'Video generation failed'
      };
    } else if (data.status === 'processing') {
      return {
        status: 'processing'
      };
    } else {
      return {
        status: 'pending'
      };
    }
  } catch (error: any) {
    console.error('Error checking HeyGen video status:', error.response?.data || error.message);
    throw new Error(`Failed to check video status: ${error.response?.data?.message || error.message}`);
  }
}

/**
 * Get list of available HeyGen avatars
 */
export async function getHeyGenAvatars() {
  try {
    const response = await axios.get(`${HEYGEN_API_URL}/v2/avatars`, {
      headers: {
        'X-Api-Key': HEYGEN_API_KEY
      }
    });
    return response.data.data.avatars || [];
  } catch (error: any) {
    console.error('Error fetching HeyGen avatars:', error.response?.data || error.message);
    // Return default avatar if API fails
    return [{
      avatar_id: 'Daisy-inskirt-20220818',
      avatar_name: 'Daisy',
      preview_image_url: ''
    }];
  }
}

/**
 * Get list of available HeyGen voices
 */
export async function getHeyGenVoices() {
  try {
    const response = await axios.get(`${HEYGEN_API_URL}/v2/voices`, {
      headers: {
        'X-Api-Key': HEYGEN_API_KEY
      }
    });
    return response.data.data.voices || [];
  } catch (error: any) {
    console.error('Error fetching HeyGen voices:', error.response?.data || error.message);
    // Return default voice if API fails
    return [{
      voice_id: '2d5b0e6cf36f460aa7fc47e3eee4ba54',
      voice_name: 'English Female',
      language: 'English'
    }];
  }
}
