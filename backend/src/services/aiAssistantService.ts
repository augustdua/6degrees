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
const MAX_TOKENS = 300;  // Reduced from 800 to enforce concise responses (50-75 words ~ 75-100 tokens)

// Knowledge Base
let KNOWLEDGE_BASE = '';
let TASK_RECIPES: any = null;

/**
 * Load task recipes from JSON
 */
function loadTaskRecipes(): any {
  const recipesPath = path.join(__dirname, '..', '..', '..', 'docs', 'ai-knowledge', 'task-recipes.json');
  
  try {
    if (fs.existsSync(recipesPath)) {
      const content = fs.readFileSync(recipesPath, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error loading task recipes:', error);
  }
  
  return null;
}

/**
 * Load knowledge base from markdown files + task recipes
 */
function loadKnowledgeBase(): string {
  const knowledgeDir = path.join(__dirname, '..', '..', '..', 'docs', 'ai-knowledge');

  try {
    // Load task recipes (primary knowledge source)
    TASK_RECIPES = loadTaskRecipes();
    
    let knowledge = '# 6Degrees Platform Knowledge Base\n\n';
    
    // Add task recipes if available
    if (TASK_RECIPES) {
      knowledge += formatTaskRecipesForAI(TASK_RECIPES);
    }
    
    // Still load markdown files for additional context
    if (fs.existsSync(knowledgeDir)) {
      const files = fs.readdirSync(knowledgeDir).filter(f => f.endsWith('.md'));
      for (const file of files) {
        const content = fs.readFileSync(path.join(knowledgeDir, file), 'utf-8');
        knowledge += content + '\n\n';
      }
    }

    return knowledge;
  } catch (error) {
    console.error('Error loading knowledge base:', error);
    return getMinimalKnowledge();
  }
}

/**
 * Format task recipes for AI consumption
 */
function formatTaskRecipesForAI(recipes: any): string {
  let formatted = '## App Structure & UI Elements\n\n';
  
  // App structure
  if (recipes.app_structure) {
    formatted += '### Pages:\n';
    for (const [pageName, pageInfo] of Object.entries(recipes.app_structure.main_pages)) {
      const page: any = pageInfo;
      formatted += `- **${pageName}** (${page.route}): ${page.description}\n`;
      if (page.tabs) {
        formatted += '  Tabs: ' + page.tabs.map((t: any) => `"${t.label}"`).join(', ') + '\n';
      }
      if (page.sidebar_tabs) {
        formatted += '  Sidebar: ' + page.sidebar_tabs.map((t: any) => `"${t.label}"`).join(', ') + '\n';
      }
    }
    formatted += '\n';
  }
  
  // Common tasks
  if (recipes.tasks) {
    formatted += '## How to Do Common Tasks\n\n';
    for (const [taskId, task] of Object.entries(recipes.tasks)) {
      const t: any = task;
      formatted += `### ${t.name}\n`;
      formatted += `**Steps:**\n`;
      t.steps.forEach((step: string, i: number) => {
        formatted += `${i + 1}. ${step}\n`;
      });
      formatted += '\n';
    }
  }
  
  // Common questions
  if (recipes.common_questions) {
    formatted += '## Common Questions & Answers\n\n';
    for (const [qId, qa] of Object.entries(recipes.common_questions)) {
      const q: any = qa;
      formatted += `**Q: ${q.question}**\n`;
      formatted += `A: ${q.answer}\n\n`;
    }
  }
  
  return formatted;
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

  return `You are the helpful AI assistant for 6Degrees, a professional networking platform. Your role is to help users navigate and use the platform effectively.

${KNOWLEDGE_BASE}
${contextInfo}

## CRITICAL: Response Length Rules
- Maximum 2-3 sentences per response (50-75 words MAX)
- If it needs more explanation, use bullet points
- NEVER write paragraphs or long explanations
- Prefer action buttons over text explanations

## Response Format Rules
1. Short direct answer (1-2 sentences)
2. Bullet points ONLY if multiple steps needed (max 4 bullets)
3. Offer navigation action if relevant
4. NO introductory phrases like "Sure!" or "Of course!"

## GOOD Response Examples:
❓ "How do I create an offer?"
✅ "Go to Dashboard → Offers tab → click 'Create Offer' in My Offers section. Fill in the details."

❓ "What are intro calls?"
✅ "AI-moderated video calls that help you connect professionally. Book them from user profiles."

❓ "Where are my messages?"
✅ "Your messages are on the Dashboard in the Messages tab. [Navigate to Dashboard button]"

## BAD Response Examples (TOO LONG):
❌ "Sure! I'd be happy to help you understand intro calls. Intro calls are a really great feature we have on 6Degrees that allows you to connect with other professionals through video calls. These calls are moderated by an AI assistant who helps keep the conversation productive and ensures your questions get answered..."

❌ "Of course! Let me explain the offers system for you. The offers system is designed to help users create opportunities for networking and professional growth. There are several types of offers you can create, including..."

## Your Capabilities
- Answer questions about platform features
- Navigate users to specific pages (use function calls!)
- Explain features briefly
- Show user stats from context above
- Troubleshoot common issues

## Important Rules
- NEVER write long explanations
- NEVER use introductory phrases
- NEVER write multiple paragraphs
- ALWAYS use action buttons for navigation
- ALWAYS be direct and concise
- If question needs detailed answer, say "Check the Help section" and navigate there

Remember: Users want QUICK answers, not essays. Be brief and actionable!`;
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
      if (toolCall.type === 'function') {
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
