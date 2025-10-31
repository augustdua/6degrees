import fs from 'fs';
import path from 'path';

// Resend API Configuration
const RESEND_API_KEY = process.env.RESEND_API_KEY || 're_bXNycfVJ_HFueqngZ5EnRmeNiip5P2AoP';
const RESEND_API_URL = 'https://api.resend.com/emails';
const FROM_EMAIL = 'hello@6degree.app';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

interface MessageNotificationData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  messagePreview: string;
}

interface ConnectionRequestData {
  recipientEmail: string;
  recipientName: string;
  senderName: string;
  requestMessage: string;
}

interface ConnectionAcceptedData {
  recipientEmail: string;
  recipientName: string;
  accepterName: string;
}

interface UnreadMessagesDigestData {
  recipientEmail: string;
  recipientName: string;
  unreadCount: number;
}

/**
 * Send email via Resend API
 */
async function sendEmail(params: EmailParams): Promise<boolean> {
  try {
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: [params.to],
        subject: params.subject,
        html: params.html,
        reply_to: params.replyTo ? [params.replyTo] : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Resend API error:', error);
      return false;
    }

    const result = await response.json();
    console.log('✅ Email sent successfully:', result.id);
    return true;
  } catch (error) {
    console.error('❌ Error sending email:', error);
    return false;
  }
}

/**
 * Load and populate email template
 */
function loadTemplate(templateName: string, replacements: Record<string, string>): string {
  try {
    // Templates are relative to project root
    const templatePath = path.join(process.cwd(), '..', 'email-templates', `${templateName}.html`);
    let template = fs.readFileSync(templatePath, 'utf-8');

    // Replace all placeholders
    Object.entries(replacements).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      template = template.replace(new RegExp(placeholder, 'g'), value);
    });

    return template;
  } catch (error) {
    console.error(`❌ Error loading template ${templateName}:`, error);
    throw error;
  }
}

/**
 * Send new message notification email
 */
export async function sendNewMessageNotification(data: MessageNotificationData): Promise<boolean> {
  try {
    // Truncate message preview if too long
    const preview = data.messagePreview.length > 150 
      ? data.messagePreview.substring(0, 150) + '...' 
      : data.messagePreview;

    const html = loadTemplate('new-message-notification', {
      SENDER_NAME: data.senderName,
      MESSAGE_PREVIEW: preview,
    });

    return await sendEmail({
      to: data.recipientEmail,
      subject: `💬 New message from ${data.senderName}`,
      html,
    });
  } catch (error) {
    console.error('❌ Error sending message notification:', error);
    return false;
  }
}

/**
 * Send connection request notification email
 */
export async function sendConnectionRequestNotification(data: ConnectionRequestData): Promise<boolean> {
  try {
    const message = data.requestMessage || 'I would like to connect with you on 6Degrees.';
    
    const html = loadTemplate('connection-request-notification', {
      SENDER_NAME: data.senderName,
      REQUEST_MESSAGE: message,
    });

    return await sendEmail({
      to: data.recipientEmail,
      subject: `🤝 ${data.senderName} wants to connect with you`,
      html,
    });
  } catch (error) {
    console.error('❌ Error sending connection request notification:', error);
    return false;
  }
}

/**
 * Send connection accepted notification email
 */
export async function sendConnectionAcceptedNotification(data: ConnectionAcceptedData): Promise<boolean> {
  try {
    const html = loadTemplate('connection-accepted-notification', {
      ACCEPTER_NAME: data.accepterName,
    });

    return await sendEmail({
      to: data.recipientEmail,
      subject: `✅ ${data.accepterName} accepted your connection request`,
      html,
    });
  } catch (error) {
    console.error('❌ Error sending connection accepted notification:', error);
    return false;
  }
}

/**
 * Send unread messages digest email
 */
export async function sendUnreadMessagesDigest(data: UnreadMessagesDigestData): Promise<boolean> {
  try {
    const plural = data.unreadCount > 1 ? 's' : '';
    
    const html = loadTemplate('unread-messages-digest', {
      UNREAD_COUNT: data.unreadCount.toString(),
      PLURAL: plural,
    });

    return await sendEmail({
      to: data.recipientEmail,
      subject: `You have ${data.unreadCount} unread message${plural} on 6Degrees`,
      html,
    });
  } catch (error) {
    console.error('❌ Error sending unread messages digest:', error);
    return false;
  }
}

// Export for testing
export { loadTemplate, sendEmail };

