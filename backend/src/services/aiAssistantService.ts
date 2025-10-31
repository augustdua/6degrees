import OpenAI from 'openai';
import { ChatCompletionMessageParam, ChatCompletionTool } from 'openai/resources/chat/completions';
import fs from 'fs';
import path from 'path';

// OpenAI Configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.warn('WARNING: OPENAI_API_KEY not set. AI Assistant will not work.');
}

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY,
});

// AI Model Configuration
const AI_MODEL = 'gpt-4-turbo-preview';
const AI_TEMPERATURE = 0.7;
const MAX_TOKENS = 800;

// Knowledge Base
let KNOWLEDGE_BASE = '';

/**
 * Load knowledge base from markdown files
 */
function loadKnowledgeBase(): string {
  const knowledgeDir = path.join(__dirname, '..', '..', '..', 'docs', 'ai-knowledge');

  try {
    if (!fs.existsSync(knowledgeDir)) {
      console.log('Knowledge base directory not found. Using minimal knowledge.');
      return getMinimalKnowledge();
    }

    const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.md'));
    let knowledge = '# 6Degrees Platform Knowledge Base\n\n';

    for (const file of files) {
      const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8');
      knowledge += content + '\n\n';
    }

    return knowledge;
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    return getMinimalKnowledge();
  }
}

/**
 * Get minimal knowledge if files don't exist yet
 */
function getMinimalKnowledge(): string {
  return `# 6Degrees Platform Knowledge Base

## Platform Overview
6Degrees is a professional networking platform that helps users build meaningful connections through:
- **Connection Requests**: Send and receive connection requests to expand your network
- **Direct Messaging**: Chat with your connections in real-time
- **Offers System**: Create and browse professional opportunities (services, collaborations, jobs)
- **Intro Calls**: Book AI-assisted video consultations with your connections
- **Credits & Wallet**: Platform currency system for premium features

## Key Features

### Dashboard
Main hub showing:
- Pending connection requests
- Recent messages
- Active offers
- Quick actions

### Connections
- View all your connections
- Send new connection requests
- Manage pending requests
- See connection suggestions

### Messages
- Direct messaging with connections
- Real-time notifications
- Message search
- Conversation history

### Offers
- Browse offers from your network
- Create new offers
- Manage your offers
- Bid on opportunities

### Profile
- Edit your profile information
- Update bio and industry
- Add LinkedIn profile
- Manage account settings

### Wallet
- View credit balance
- Purchase credits
- Transaction history
- Multi-currency support

## Navigation
- **/dashboard** - Main dashboard
- **/connections** - Connections page
- **/messages** - Messages tab on dashboard
- **/offers** - Marketplace
- **/profile** - User profile and settings
- **/wallet** - Wallet and credits
`;
}

// Load knowledge base on startup
KNOWLEDGE_BASE = loadKnowledgeBase();

/**
 * System prompt for AI assistant
 */
function getSystemPrompt(userContext?: any): string {
  const contextInfo = userContext ? `

## Current User Context
- Name: ${userContext.user?.full_name || 'User'}
- Email: ${userContext.user?.email || 'N/A'}
- Organization: ${userContext.user?.organization || 'N/A'}
- Industry: ${userContext.user?.industry || 'N/A'}
- Total Connections: ${userContext.stats?.total_connections || 0}
- Pending Requests: ${userContext.stats?.pending_requests || 0}
- Active Offers: ${userContext.stats?.active_offers || 0}
- Unread Messages: ${userContext.stats?.unread_messages || 0}
- Wallet Balance: ${userContext.wallet?.credits || 0} ${userContext.wallet?.currency || 'USD'}
` : '';

  return `You are the helpful AI assistant for 6Degrees, a professional networking platform. Your role is to help users navigate the platform, understand features, and accomplish their goals.

${KNOWLEDGE_BASE}
${contextInfo}

## Your Capabilities
1. **Answer Questions**: Provide clear, concise answers about platform features
2. **Navigation Help**: Guide users to specific pages and features
3. **Feature Explanations**: Explain how to use different parts of the platform
4. **Troubleshooting**: Help users solve common issues
5. **Action Execution**: Help users take actions like creating offers, sending messages, etc.

## Communication Style
- Be friendly, helpful, and concise
- Use bullet points for clarity
- Provide step-by-step instructions when needed
- Reference specific UI elements (buttons, tabs, etc.)
- Ask clarifying questions if the user's intent is unclear
- Keep responses under 150 words unless detailed explanation is needed

## Available Actions
You can help users by:
- Guiding them to navigate to different pages
- Explaining features and functionality
- Helping them create offers or send connection requests
- Searching for users or offers
- Checking their stats and activity

## Important Guidelines
- Never share API keys, passwords, or sensitive technical details
- Don't make promises about features that don't exist
- If you're unsure, say so and suggest checking documentation
- Always prioritize user privacy and security
- Don't access data the user shouldn't see

Remember: You're here to make the user's experience smooth and productive. Be proactive in suggesting helpful actions!`;
}

/**
 * Available function definitions for OpenAI function calling
 */
const AVAILABLE_FUNCTIONS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'navigate_to_page',
      description: 'Navigate the user to a specific page in the application',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['dashboard', 'connections', 'messages', 'offers', 'profile', 'wallet'],
            description: 'The page to navigate to',
          },
          tab: {
            type: 'string',
            description: 'Optional tab to open on the page (e.g., "messages" tab on dashboard)',
          },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_users',
      description: 'Search for users on the platform',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (name, email, industry, organization)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_offers',
      description: 'Search for offers on the platform',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query (title, description, category)',
          },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_user_stats',
      description: 'Get current user statistics and activity summary',
      parameters: {
        type: 'object',
        properties: {},
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_offer_guide',
      description: 'Provide step-by-step guidance for creating a new offer',
      parameters: {
        type: 'object',
        properties: {
          offerType: {
            type: 'string',
            description: 'Type of offer the user wants to create',
          },
        },
      },
    },
  },
];

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  context?: any;
}

interface ChatResponse {
  message: string;
  functionCall?: {
    name: string;
    arguments: any;
  };
  tokensUsed?: number;
}

/**
 * Generate AI response for user message
 */
export async function generateAIResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userContext?: any,
  currentPage?: string
): Promise<ChatResponse> {
  try {
    // Add current page to context if provided
    const enhancedContext = {
      ...userContext,
      currentPage,
    };

    // Build messages array
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: getSystemPrompt(enhancedContext),
      },
      // Add conversation history
      ...conversationHistory.map((msg): ChatCompletionMessageParam => ({
        role: msg.role,
        content: msg.content,
      })),
      // Add current user message
      {
        role: 'user',
        content: userMessage,
      },
    ];

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: AI_MODEL,
      messages,
      temperature: AI_TEMPERATURE,
      max_tokens: MAX_TOKENS,
      tools: AVAILABLE_FUNCTIONS,
      tool_choice: 'auto',
    });

    const choice = completion.choices[0];
    const message = choice.message;

    // Check for function call
    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      return {
        message: message.content || '',
        functionCall: {
          name: functionName,
          arguments: functionArgs,
        },
        tokensUsed: completion.usage?.total_tokens,
      };
    }

    return {
      message: message.content || 'I apologize, but I was unable to generate a response. Please try again.',
      tokensUsed: completion.usage?.total_tokens,
    };
  } catch (error: any) {
    console.error('Error generating AI response:', error);

    // Handle specific OpenAI errors
    if (error.status === 401) {
      throw new Error('OpenAI API key is invalid or missing');
    } else if (error.status === 429) {
      throw new Error('Rate limit exceeded. Please try again in a moment.');
    } else if (error.status === 500) {
      throw new Error('OpenAI service is temporarily unavailable. Please try again later.');
    }

    throw new Error('Failed to generate AI response: ' + (error.message || 'Unknown error'));
  }
}

/**
 * Generate quick suggestions based on context
 */
export function getQuickSuggestions(currentPage?: string, userContext?: any): string[] {
  const suggestions = [
    'How do I send a connection request?',
    'What are offers and how do they work?',
    'Show me my wallet balance',
  ];

  // Page-specific suggestions
  if (currentPage === 'dashboard') {
    suggestions.unshift('What can I do on the dashboard?');
  } else if (currentPage === 'connections') {
    suggestions.unshift('How do I find relevant connections?');
  } else if (currentPage === 'messages') {
    suggestions.unshift('How do I start a conversation?');
  } else if (currentPage === 'offers') {
    suggestions.unshift('How do I create an offer?');
  } else if (currentPage === 'profile') {
    suggestions.unshift('How do I improve my profile?');
  }

  // Context-specific suggestions
  if (userContext?.stats?.pending_requests > 0) {
    suggestions.unshift(`You have ${userContext.stats.pending_requests} pending connection request(s)`);
  }
  if (userContext?.stats?.unread_messages > 0) {
    suggestions.unshift(`You have ${userContext.stats.unread_messages} unread message(s)`);
  }

  return suggestions.slice(0, 4); // Return top 4 suggestions
}

/**
 * Reload knowledge base (useful for updates)
 */
export function reloadKnowledgeBase(): void {
  KNOWLEDGE_BASE = loadKnowledgeBase();
  console.log('Knowledge base reloaded successfully');
}

export default {
  generateAIResponse,
  getQuickSuggestions,
  reloadKnowledgeBase,
};
