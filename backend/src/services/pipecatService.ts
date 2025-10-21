import axios from 'axios';

const PIPECAT_API_URL = process.env.PIPECAT_API_URL as string | undefined; // https://api.pipecat.daily.co/v1/public
const PIPECAT_AGENT_NAME = process.env.PIPECAT_AGENT_NAME as string | undefined; // your agent name
const PIPECAT_API_KEY = process.env.PIPECAT_API_KEY as string | undefined;

function requiredEnv() {
  if (!PIPECAT_API_URL || !PIPECAT_AGENT_NAME || !PIPECAT_API_KEY) {
    throw new Error('Pipecat env not configured (need PIPECAT_API_URL, PIPECAT_AGENT_NAME, PIPECAT_API_KEY)');
  }
}

export interface StartAgentParams {
  callId: string;
  roomName: string; // Daily room name
  roomUrl: string; // Daily room URL
  token: string; // Daily meeting token for bot
  prompt?: string; // system prompt
  context?: any; // structured context: listing, contact, questions
  config?: any; // agent config: model, voice, etc.
}

export interface StartAgentResult {
  sessionId: string;
}

export async function startAgent(params: StartAgentParams): Promise<StartAgentResult> {
  requiredEnv();
  // Pipecat Cloud expects: POST /v1/public/{agent-name}/start
  const resp = await axios.post(
    `${PIPECAT_API_URL}/${PIPECAT_AGENT_NAME}/start`,
    {
      dailyRoomUrl: params.roomUrl,
      dailyToken: params.token, // Optional: if provided, agent uses this token
      body: {
        callId: params.callId,
        prompt: params.prompt,
        context: params.context,
        config: params.config
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${PIPECAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
  return { sessionId: resp.data.sessionId };
}

export async function stopAgent(sessionId: string): Promise<void> {
  requiredEnv();
  // Pipecat Cloud stop endpoint
  await axios.post(
    `${PIPECAT_API_URL}/${PIPECAT_AGENT_NAME}/stop`,
    { sessionId },
    {
      headers: {
        'Authorization': `Bearer ${PIPECAT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

// ============================================
// Consultation Co-Pilot Bot
// ============================================

export interface StartConsultationCopilotParams {
  callId: string;
  roomUrl: string;
  buyerName: string;
  sellerName: string;
  targetName: string;
  listingTitle: string;
  questions?: string[]; // Array of up to 5 questions
  durationMins?: number; // Default 30
}

/**
 * Start the consultation co-pilot bot for an intro call.
 * This bot tracks buyer questions, manages time, and provides intelligent moderation.
 */
export async function startConsultationCopilot(
  params: StartConsultationCopilotParams
): Promise<StartAgentResult> {
  const COPILOT_API_URL = process.env.PIPECAT_API_URL;
  const COPILOT_AGENT_NAME = process.env.PIPECAT_CONSULTATION_AGENT_NAME || '6degrees-consultation-copilot';
  const COPILOT_API_KEY = process.env.PIPECAT_API_KEY;

  if (!COPILOT_API_URL || !COPILOT_API_KEY) {
    throw new Error('Pipecat env not configured for consultation co-pilot');
  }

  // Build config with consultation context
  const config = {
    BUYER_NAME: params.buyerName,
    SELLER_NAME: params.sellerName,
    TARGET_NAME: params.targetName,
    LISTING_TITLE: params.listingTitle,
    CALL_DURATION_MINS: String(params.durationMins || 30),
    QUESTION_1: params.questions?.[0] || '',
    QUESTION_2: params.questions?.[1] || '',
    QUESTION_3: params.questions?.[2] || '',
    QUESTION_4: params.questions?.[3] || '',
    QUESTION_5: params.questions?.[4] || '',
    CALL_ID: params.callId,
  };

  // Start the consultation co-pilot
  const resp = await axios.post(
    `${COPILOT_API_URL}/${COPILOT_AGENT_NAME}/start`,
    {
      dailyRoomUrl: params.roomUrl,
      body: {
        callId: params.callId,
        config
      }
    },
    {
      headers: {
        'Authorization': `Bearer ${COPILOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return { sessionId: resp.data.sessionId };
}


