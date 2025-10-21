import { Request, Response } from 'express';
import axios from 'axios';

/**
 * Consultation Call Controller
 * Handles AI-moderated consultation call creation and management
 */

interface ConsultationCallRequest {
  userName: string;
  userRole: 'user' | 'broker' | 'consultant';
  consultantName: string;
  consultantRole: 'user' | 'broker' | 'consultant';
  brokerName?: string;
  callTopic: string;
  questions: string[];
}

const DAILY_API_KEY = process.env.DAILY_API_KEY;
const PIPECAT_API_KEY = process.env.PIPECAT_API_KEY;
const PIPECAT_AGENT_NAME = process.env.PIPECAT_AGENT_NAME || '6degrees-consultation-copilot';

/**
 * Start a consultation call with AI co-pilot
 */
export const startConsultationCall = async (req: Request, res: Response): Promise<any> => {
  console.log('========== START CONSULTATION CALL ENDPOINT ==========');
  console.log('Request headers:', req.headers);
  console.log('Request body:', req.body);

  try {
    const {
      userName,
      userRole,
      consultantName,
      consultantRole,
      brokerName,
      callTopic,
      questions
    }: ConsultationCallRequest = req.body;

    console.log('Extracted parameters:', {
      userName,
      userRole,
      consultantName,
      consultantRole,
      brokerName,
      callTopic,
      questions
    });

    // Validate required fields
    if (!userName || !consultantName || !callTopic) {
      console.log('❌ Validation failed - missing required fields');
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: userName, consultantName, callTopic'
      });
    }

    console.log('✅ Required fields validation passed');

    if (!DAILY_API_KEY) {
      console.log('❌ DAILY_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'DAILY_API_KEY not configured'
      });
    }

    if (!PIPECAT_API_KEY) {
      console.log('❌ PIPECAT_API_KEY not configured');
      return res.status(500).json({
        success: false,
        error: 'PIPECAT_API_KEY not configured'
      });
    }

    console.log('✅ API keys validation passed');
    console.log('🎙️ Creating consultation call:', {
      userName,
      consultantName,
      brokerName,
      callTopic
    });

    // Step 1: Create Daily room
    const roomResponse = await axios.post(
      'https://api.daily.co/v1/rooms',
      {
        properties: {
          enable_recording: 'cloud',
          enable_transcription: true,
          exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${DAILY_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const roomUrl = roomResponse.data.url;
    const roomName = roomResponse.data.name;

    console.log('✅ Daily room created:', roomUrl);

    // Step 2: Generate meeting tokens for participants
    const generateToken = async (userName: string) => {
      const tokenResponse = await axios.post(
        'https://api.daily.co/v1/meeting-tokens',
        {
          properties: {
            room_name: roomName,
            user_name: userName,
            enable_recording: 'cloud',
            start_video_off: false,
            start_audio_off: false,
            exp: Math.floor(Date.now() / 1000) + 3600
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${DAILY_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      return tokenResponse.data.token;
    };

    const userToken = await generateToken(userName);
    const consultantToken = await generateToken(consultantName);
    const brokerToken = brokerName ? await generateToken(brokerName) : null;

    console.log('✅ Meeting tokens generated');

    // Step 3: Generate bot token
    const botToken = await generateToken('AI Co-Pilot');

    // Step 4: Map roles correctly
    // The bot expects: BUYER_NAME (user), SELLER_NAME (broker), TARGET_NAME (consultant)
    let buyerName = userName;
    let sellerName = brokerName || 'Facilitator';
    let targetName = consultantName;

    // Adjust based on actual roles
    if (userRole === 'consultant') {
      targetName = userName;
      buyerName = consultantName;
    } else if (consultantRole === 'broker') {
      sellerName = consultantName;
      targetName = brokerName || 'Expert';
    }

    // Step 5: Start Pipecat bot
    const pipecatConfig = {
      BUYER_NAME: buyerName,
      SELLER_NAME: sellerName,
      TARGET_NAME: targetName,
      LISTING_TITLE: callTopic,
      CALL_DURATION_MINS: '30',
      QUESTION_1: questions[0] || '',
      QUESTION_2: questions[1] || '',
      QUESTION_3: questions[2] || '',
      QUESTION_4: questions[3] || '',
      QUESTION_5: questions[4] || '',
      CALL_ID: `test-${Date.now()}`
    };

    console.log('🤖 Starting Pipecat bot with config:', pipecatConfig);

    const pipecatResponse = await axios.post(
      `https://api.pipecat.daily.co/v1/public/${PIPECAT_AGENT_NAME}/start`,
      {
        body: {
          room_url: roomUrl,
          token: botToken,
          config: pipecatConfig
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${PIPECAT_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const sessionId = pipecatResponse.data.sessionId;

    console.log('✅ Pipecat bot started, session:', sessionId);

    // Return all necessary info to frontend
    const responseData = {
      success: true,
      roomUrl,
      roomName,
      tokens: {
        user: userToken,
        consultant: consultantToken,
        broker: brokerToken
      },
      sessionId,
      config: pipecatConfig
    };

    console.log('✅ SUCCESS - Sending response to frontend:');
    console.log('Response data:', responseData);
    console.log('Response structure:', {
      hasSuccess: 'success' in responseData,
      successValue: responseData.success,
      hasRoomUrl: 'roomUrl' in responseData,
      roomUrlValue: responseData.roomUrl,
      hasTokens: 'tokens' in responseData,
      hasUserToken: responseData.tokens && 'user' in responseData.tokens,
      userTokenValue: responseData.tokens?.user ? `${responseData.tokens.user.substring(0, 20)}...` : 'MISSING'
    });

    res.json(responseData);
    console.log('========== END CONSULTATION CALL ENDPOINT (SUCCESS) ==========');

  } catch (error: any) {
    console.error('========== ERROR in startConsultationCall ==========');
    console.error('Error type:', typeof error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Error response:', error.response);
    console.error('Error response data:', error.response?.data);
    console.error('Error response status:', error.response?.status);

    const errorResponse = {
      success: false,
      error: error.response?.data?.error || error.message || 'Failed to start consultation call'
    };

    console.error('Sending error response:', errorResponse);
    res.status(500).json(errorResponse);
    console.log('========== END CONSULTATION CALL ENDPOINT (ERROR) ==========');
  }
};

