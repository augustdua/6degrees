import axios from 'axios';
import crypto from 'crypto';

const PERSONA_API_KEY = process.env.PERSONA_API_KEY as string | undefined;
const PERSONA_WEBHOOK_SECRET = process.env.PERSONA_WEBHOOK_SECRET as string | undefined;
const PERSONA_ENV = process.env.PERSONA_ENV || 'sandbox';

const PERSONA_BASE_URL = PERSONA_ENV === 'production'
  ? 'https://withpersona.com/api/v1'
  : 'https://withpersona.com/api/v1';

export interface CreateInquiryParams {
  referenceId: string; // our internal ID, e.g., persona_verifications.id
  name?: string;
  email?: string;
}

export interface InquiryResult {
  inquiryId: string;
  sessionLink: string;
}

export async function createPersonaInquiry(params: CreateInquiryParams): Promise<InquiryResult> {
  if (!PERSONA_API_KEY) throw new Error('PERSONA_API_KEY not configured');
  const payload = {
    data: {
      type: 'inquiries',
      attributes: {
        'reference-id': params.referenceId,
        'template-id': process.env.PERSONA_TEMPLATE_ID || undefined,
        name: params.name,
        email: params.email
      }
    }
  };
  const resp = await axios.post(`${PERSONA_BASE_URL}/inquiries`, payload, {
    headers: {
      Authorization: `Bearer ${PERSONA_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const inquiry = resp.data?.data;
  const inquiryId = inquiry?.id;
  // Create a session link
  const sessionResp = await axios.post(`${PERSONA_BASE_URL}/inquiries/${inquiryId}/sessions`, {}, {
    headers: {
      Authorization: `Bearer ${PERSONA_API_KEY}`,
      'Content-Type': 'application/json'
    }
  });
  const sessionLink = sessionResp.data?.data?.attributes?.url;
  return { inquiryId, sessionLink };
}

export function verifyPersonaSignature(body: string, signature: string): boolean {
  if (!PERSONA_WEBHOOK_SECRET) return false;
  const hmac = crypto.createHmac('sha256', PERSONA_WEBHOOK_SECRET);
  hmac.update(body, 'utf8');
  const digest = `sha256=${hmac.digest('hex')}`;
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}













