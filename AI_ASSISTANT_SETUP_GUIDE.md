# AI Assistant Chatbot - Setup and Testing Guide

## Overview

The AI Assistant is a full-featured chatbot overlay that helps users navigate the 6Degrees platform, answer questions, and perform actions. It's powered by OpenAI GPT-4 and integrates deeply with the application.

## Features Implemented

### ✅ Backend
- [x] Database schema (sessions, messages, actions tables)
- [x] RPC functions for history and context
- [x] API routes (`/api/ai-assistant/*`)
- [x] OpenAI GPT-4 integration
- [x] Function calling for app actions
- [x] Context awareness system
- [x] Token usage tracking
- [x] Error handling and rate limiting

### ✅ Frontend
- [x] Floating AI chat button with pulse animation
- [x] Chat overlay with modern UI
- [x] Message history with typing indicators
- [x] Quick suggestions based on context
- [x] Function call action buttons
- [x] Keyboard shortcut (Cmd/Ctrl + K)
- [x] Responsive design
- [x] Framer Motion animations

### ✅ Knowledge Base
- [x] App overview documentation
- [x] Navigation guide
- [x] Offers system guide
- [x] FAQ document
- [x] Extensible markdown-based system

## Setup Instructions

### 1. Environment Variables

#### Backend (.env)
Add the following to your `backend/.env` file:

```bash
# OpenAI API Configuration
OPENAI_API_KEY=your_openai_api_key_here
```

**Getting an OpenAI API Key:**
1. Go to https://platform.openai.com/api-keys
2. Sign in or create an account
3. Click "Create new secret key"
4. Copy the key and paste it in your `.env` file
5. **Important**: Never commit the `.env` file to git!

#### Frontend (.env)
The frontend already has the necessary environment variables configured:
- `VITE_API_BASE_URL` - Points to backend API (default: http://localhost:3001)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous key

### 2. Database Migration

The database migration has already been run successfully! ✅

If you need to run it again or on a different environment:

```bash
PGPASSWORD="your_password" psql "postgresql://connection_string" -f supabase/migrations/061_create_ai_assistant_tables.sql
```

This creates:
- `ai_chat_sessions` - Session tracking
- `ai_chat_messages` - Conversation history
- `ai_chat_actions` - Action logging
- RPC functions for querying and managing chats
- Row Level Security policies

### 3. Install Dependencies

#### Backend
```bash
cd backend
npm install
# openai is already installed (^6.3.0)
```

#### Frontend
```bash
cd frontend
npm install
# All required packages are already installed:
# - framer-motion
# - lucide-react
# - @radix-ui components
```

### 4. Start the Application

#### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```

Backend will run on http://localhost:3001

#### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```

Frontend will run on http://localhost:5173

## Testing the AI Assistant

### Manual Testing Checklist

#### 1. Basic Functionality
- [ ] Log in to the application
- [ ] Verify the AI chat button appears in the bottom-right corner
- [ ] Click the button to open the chat overlay
- [ ] Verify the welcome message appears
- [ ] Verify quick suggestions are displayed

#### 2. Messaging
- [ ] Type a message and press Enter
- [ ] Verify message appears in chat
- [ ] Verify typing indicator shows while AI is thinking
- [ ] Verify AI response appears
- [ ] Try keyboard shortcut (Cmd/Ctrl + K) to toggle chat

#### 3. Context Awareness
- [ ] Navigate to Dashboard
- [ ] Open chat and ask "Where am I?"
- [ ] Verify AI knows you're on the dashboard
- [ ] Navigate to Offers page
- [ ] Ask "What can I do here?"
- [ ] Verify AI provides offers-specific help

#### 4. Quick Suggestions
- [ ] Click on a suggestion chip
- [ ] Verify it populates the input field
- [ ] Send the message
- [ ] Verify AI responds appropriately

#### 5. Function Calls (Navigation)
- [ ] Ask "Take me to my connections"
- [ ] Verify AI responds with navigation button
- [ ] Click the navigation button
- [ ] Verify you're navigated to connections page

#### 6. Conversation History
- [ ] Close and reopen the chat
- [ ] Verify previous messages are still visible
- [ ] Continue the conversation
- [ ] Verify context is maintained

### Test Queries

Try asking the AI these questions:

**Navigation Help:**
- "How do I get to my profile?"
- "Show me my offers"
- "Take me to the dashboard"
- "Where can I see my messages?"

**Feature Explanations:**
- "What are offers?"
- "How do I send a connection request?"
- "What are intro calls?"
- "How does the wallet work?"

**User Stats:**
- "How many connections do I have?"
- "Do I have any unread messages?"
- "What's my wallet balance?"
- "Show me my stats"

**Troubleshooting:**
- "I can't find the create offer button"
- "How do I upload a profile photo?"
- "Why can't I message someone?"
- "How do I delete my account?"

**General Questions:**
- "What can you help me with?"
- "Tell me about 6Degrees"
- "What are the main features?"
- "How do I get started?"

### Expected Behavior

**Successful Response:**
- AI responds within 2-3 seconds
- Response is relevant and helpful
- Navigation actions include clickable buttons
- Suggestions update based on context
- Error messages are clear if something fails

**Common Errors and Solutions:**

1. **"OpenAI API key is invalid or missing"**
   - Solution: Add `OPENAI_API_KEY` to `backend/.env`
   - Restart the backend server

2. **"Failed to fetch conversation history"**
   - Solution: Verify database migration ran successfully
   - Check Supabase connection

3. **"You must be logged in to use the AI assistant"**
   - Solution: Log in to the application
   - Verify JWT token is being sent in requests

4. **Chat button not appearing**
   - Solution: Make sure you're logged in
   - Check browser console for errors
   - Verify frontend compiled successfully

5. **AI responses are slow**
   - This is normal! GPT-4 can take 2-5 seconds
   - Consider upgrading to GPT-4-turbo for faster responses

## Customization

### Adding Knowledge

To add more knowledge to the AI assistant:

1. Create a new markdown file in `docs/ai-knowledge/`
2. Add comprehensive documentation
3. Restart the backend server (knowledge base loads on startup)

Example: `docs/ai-knowledge/intro-calls-guide.md`

### Changing AI Model

Edit `backend/src/services/aiAssistantService.ts`:

```typescript
const AI_MODEL = 'gpt-4-turbo-preview'; // Change to desired model
const AI_TEMPERATURE = 0.7; // Adjust creativity (0-1)
const MAX_TOKENS = 800; // Adjust response length
```

Models:
- `gpt-4-turbo-preview` - Fast, cost-effective (recommended)
- `gpt-4` - Highest quality, slower
- `gpt-3.5-turbo` - Fastest, lower quality

### Adding New Functions

To add new actions the AI can perform:

1. Add function definition in `backend/src/services/aiAssistantService.ts`:

```typescript
{
  type: 'function',
  function: {
    name: 'create_offer',
    description: 'Help user create a new offer',
    parameters: {
      type: 'object',
      properties: {
        offerType: { type: 'string' },
      },
    },
  },
}
```

2. Handle the function in `backend/src/controllers/aiAssistantController.ts`:

```typescript
case 'create_offer':
  // Implementation here
  break;
```

3. Add frontend handler in `frontend/src/components/AIChatOverlay.tsx`:

```typescript
case 'create_offer':
  navigate('/offers/create');
  break;
```

### Styling Customization

The AI chat components use Tailwind CSS and match your existing design system. To customize:

- **Colors**: Edit the gradient in `AIChatButton.tsx` and `AIChatOverlay.tsx`
- **Size**: Change the `w-[450px]` and `h-[600px]` values
- **Position**: Modify `bottom-6 right-6` classes
- **Animations**: Adjust Framer Motion configs

## Monitoring & Analytics

### Database Queries

**View all sessions:**
```sql
SELECT * FROM ai_chat_sessions ORDER BY created_at DESC LIMIT 10;
```

**View recent messages:**
```sql
SELECT * FROM ai_chat_messages ORDER BY created_at DESC LIMIT 20;
```

**View actions taken:**
```sql
SELECT * FROM ai_chat_actions ORDER BY created_at DESC LIMIT 20;
```

**User engagement stats:**
```sql
SELECT
  COUNT(DISTINCT user_id) as total_users,
  COUNT(*) as total_messages,
  AVG(message_count) as avg_messages_per_session
FROM ai_chat_sessions
WHERE created_at > NOW() - INTERVAL '30 days';
```

**Popular queries:**
```sql
SELECT
  content,
  COUNT(*) as frequency
FROM ai_chat_messages
WHERE role = 'user'
  AND created_at > NOW() - INTERVAL '7 days'
GROUP BY content
ORDER BY frequency DESC
LIMIT 10;
```

### API Monitoring

Monitor these endpoints:
- `POST /api/ai-assistant/chat` - Main chat endpoint
- `GET /api/ai-assistant/history` - History loading
- `GET /api/ai-assistant/suggestions` - Suggestions
- `POST /api/ai-assistant/action` - Actions

## Cost Management

**OpenAI API Costs:**
- GPT-4-turbo: ~$0.01 per message (input + output)
- Average conversation: $0.05 - $0.15
- 1000 users @ 10 messages/month: ~$100-300/month

**Cost Optimization:**
1. Use GPT-4-turbo instead of GPT-4
2. Limit `MAX_TOKENS` to reduce output costs
3. Cache common responses (future feature)
4. Implement rate limiting per user
5. Monitor usage via OpenAI dashboard

**Rate Limiting:**
Current: General rate limiter applies to all API routes
Consider: User-specific limits for AI chat (e.g., 50 messages/day)

## Troubleshooting

### Backend Issues

**Check backend logs:**
```bash
cd backend
npm run dev
# Watch for errors in console
```

**Common backend errors:**
- Database connection issues → Check Supabase credentials
- OpenAI API errors → Verify API key and quota
- Function call errors → Check controller implementation

### Frontend Issues

**Check browser console:**
- Open DevTools (F12)
- Look for errors in Console tab
- Check Network tab for failed requests

**Common frontend errors:**
- Component not rendering → Check for TypeScript errors
- API calls failing → Verify backend is running
- Authentication errors → Log out and back in

### Database Issues

**Verify tables exist:**
```sql
\dt ai_chat*
```

**Verify RPC functions:**
```sql
\df get_or_create_ai_chat_session
\df get_ai_chat_history
\df save_ai_chat_message
\df get_ai_user_context
```

**Reset chat history (if needed):**
```sql
TRUNCATE ai_chat_messages, ai_chat_sessions, ai_chat_actions CASCADE;
```

## Next Steps

### Potential Enhancements

1. **Streaming Responses** - Show AI response word-by-word
2. **Voice Input** - Allow users to speak to the AI
3. **Rich Responses** - Include images, cards, buttons
4. **Multi-language Support** - Detect and respond in user's language
5. **Personalization** - Learn from user interactions
6. **Analytics Dashboard** - Show usage stats and popular queries
7. **Feedback System** - Thumbs up/down on responses
8. **Smart Suggestions** - ML-based contextual prompts
9. **Integration Actions** - Actually create offers, send messages, etc.
10. **Mobile Optimization** - Full-screen on mobile devices

### Feedback

Please test the AI assistant and provide feedback:
- What works well?
- What's confusing?
- What features are missing?
- How can we improve responses?
- Any bugs or issues?

## Support

For issues or questions:
1. Check this guide first
2. Review error messages in logs
3. Test with simple queries
4. Verify environment variables
5. Restart services if needed

## Success!

If you can:
- ✅ Open the AI chat overlay
- ✅ Send a message and get a response
- ✅ Click suggestions and they work
- ✅ Ask questions and get helpful answers
- ✅ Navigate using AI guidance

**Congratulations! Your AI Assistant is working! 🎉**

---

**Built with:**
- OpenAI GPT-4
- React + TypeScript
- Framer Motion
- Radix UI
- Tailwind CSS
- Supabase (PostgreSQL)
- Express.js

**Last Updated:** October 31, 2025
