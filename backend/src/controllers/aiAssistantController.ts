import { Request, Response } from 'express';
import { supabase } from '../config/database';
import { generateAIResponse, getQuickSuggestions } from '../services/aiAssistantService';

/**
 * @route   POST /api/ai-assistant/chat
 * @desc    Send message to AI assistant and get response
 * @access  Private
 */
export async function sendMessage(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { message, sessionId, currentPage, context } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session
    let activeSessionId = sessionId;
    if (!activeSessionId) {
      const { data: newSessionId, error: sessionError } = await supabase
        .rpc('get_or_create_ai_chat_session', {
          p_user_id: userId,
        });

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        return res.status(500).json({ error: 'Failed to create chat session' });
      }

      activeSessionId = newSessionId;
    }

    // Get conversation history
    const { data: historyData, error: historyError } = await supabase
      .rpc('get_ai_chat_history', {
        p_user_id: userId,
        p_session_id: activeSessionId,
        p_limit: 10, // Last 10 messages for context
      });

    if (historyError) {
      console.error('Error fetching history:', historyError);
      return res.status(500).json({ error: 'Failed to fetch conversation history' });
    }

    // Get user context
    const { data: userContext, error: contextError } = await supabase
      .rpc('get_ai_user_context', {
        p_user_id: userId,
      });

    if (contextError) {
      console.error('Error fetching user context:', contextError);
    }

    // Build conversation history for AI
    const conversationHistory = (historyData || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      context: msg.context,
    }));

    // Save user message
    const { error: saveUserMsgError } = await supabase
      .rpc('save_ai_chat_message', {
        p_user_id: userId,
        p_session_id: activeSessionId,
        p_role: 'user',
        p_content: message,
        p_context: { currentPage, ...context },
      });

    if (saveUserMsgError) {
      console.error('Error saving user message:', saveUserMsgError);
    }

    // Generate AI response
    const aiResponse = await generateAIResponse(
      message,
      conversationHistory,
      userContext,
      currentPage
    );

    // Save AI message
    const { data: assistantMessageId, error: saveAIMsgError } = await supabase
      .rpc('save_ai_chat_message', {
        p_user_id: userId,
        p_session_id: activeSessionId,
        p_role: 'assistant',
        p_content: aiResponse.message,
        p_context: { currentPage, ...context },
        p_function_call: aiResponse.functionCall || null,
        p_tokens_used: aiResponse.tokensUsed,
      });

    if (saveAIMsgError) {
      console.error('Error saving assistant message:', saveAIMsgError);
    }

    // If there's a function call, log the action
    if (aiResponse.functionCall && assistantMessageId) {
      await supabase.rpc('log_ai_chat_action', {
        p_user_id: userId,
        p_session_id: activeSessionId,
        p_message_id: assistantMessageId,
        p_action_type: aiResponse.functionCall.name,
        p_action_data: aiResponse.functionCall.arguments,
        p_success: true,
      });
    }

    return res.json({
      sessionId: activeSessionId,
      message: aiResponse.message,
      functionCall: aiResponse.functionCall,
      tokensUsed: aiResponse.tokensUsed,
    });
  } catch (error: any) {
    console.error('Error in sendMessage:', error);
    return res.status(500).json({
      error: error.message || 'Failed to process message',
    });
  }
}

/**
 * @route   GET /api/ai-assistant/history
 * @desc    Get conversation history
 * @access  Private
 */
export async function getHistory(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sessionId = req.query.sessionId as string | undefined;
    const limit = parseInt(req.query.limit as string) || 20;

    const { data, error } = await supabase
      .rpc('get_ai_chat_history', {
        p_user_id: userId,
        p_session_id: sessionId || null,
        p_limit: limit,
      });

    if (error) {
      console.error('Error fetching history:', error);
      return res.status(500).json({ error: 'Failed to fetch conversation history' });
    }

    return res.json({ messages: data || [] });
  } catch (error: any) {
    console.error('Error in getHistory:', error);
    return res.status(500).json({ error: 'Failed to fetch conversation history' });
  }
}

/**
 * @route   GET /api/ai-assistant/context
 * @desc    Get user context for AI assistant
 * @access  Private
 */
export async function getContext(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { data, error } = await supabase
      .rpc('get_ai_user_context', {
        p_user_id: userId,
      });

    if (error) {
      console.error('Error fetching context:', error);
      return res.status(500).json({ error: 'Failed to fetch user context' });
    }

    return res.json({ context: data });
  } catch (error: any) {
    console.error('Error in getContext:', error);
    return res.status(500).json({ error: 'Failed to fetch user context' });
  }
}

/**
 * @route   GET /api/ai-assistant/suggestions
 * @desc    Get quick suggestions for current page
 * @access  Private
 */
export async function getSuggestions(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const currentPage = req.query.page as string | undefined;

    // Get user context
    const { data: userContext } = await supabase
      .rpc('get_ai_user_context', {
        p_user_id: userId,
      });

    const suggestions = getQuickSuggestions(currentPage, userContext);

    return res.json({ suggestions });
  } catch (error: any) {
    console.error('Error in getSuggestions:', error);
    return res.status(500).json({ error: 'Failed to generate suggestions' });
  }
}

/**
 * @route   POST /api/ai-assistant/action
 * @desc    Execute an action requested by AI
 * @access  Private
 */
export async function executeAction(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId, messageId, actionType, actionData } = req.body;

    if (!actionType) {
      return res.status(400).json({ error: 'Action type is required' });
    }

    // Log the action attempt
    let actionResult: any = { success: true };
    let errorMessage: string | null = null;

    try {
      // Handle different action types
      switch (actionType) {
        case 'navigate_to_page':
          // Navigation is handled on frontend, just acknowledge
          actionResult = {
            success: true,
            page: actionData.page,
            tab: actionData.tab,
          };
          break;

        case 'search_users':
          // Perform user search
          const { data: users, error: userError } = await supabase
            .from('users')
            .select('id, full_name, email, bio, industry, organization')
            .or(`full_name.ilike.%${actionData.query}%,email.ilike.%${actionData.query}%,industry.ilike.%${actionData.query}%,organization.ilike.%${actionData.query}%`)
            .limit(10);

          if (userError) throw userError;
          actionResult = { success: true, results: users };
          break;

        case 'search_offers':
          // Perform offer search
          const { data: offers, error: offerError } = await supabase
            .from('offers')
            .select('*')
            .or(`title.ilike.%${actionData.query}%,description.ilike.%${actionData.query}%`)
            .eq('status', 'active')
            .limit(10);

          if (offerError) throw offerError;
          actionResult = { success: true, results: offers };
          break;

        case 'get_user_stats':
          // Get user stats (already have this in context, but can refresh)
          const { data: stats } = await supabase
            .rpc('get_ai_user_context', {
              p_user_id: userId,
            });
          actionResult = { success: true, stats };
          break;

        default:
          actionResult = { success: false, error: 'Unknown action type' };
          errorMessage = 'Unknown action type';
      }
    } catch (actionError: any) {
      console.error('Error executing action:', actionError);
      actionResult = { success: false };
      errorMessage = actionError.message || 'Action execution failed';
    }

    // Log the action
    if (sessionId && messageId) {
      await supabase.rpc('log_ai_chat_action', {
        p_user_id: userId,
        p_session_id: sessionId,
        p_message_id: messageId,
        p_action_type: actionType,
        p_action_data: { ...actionData, result: actionResult },
        p_success: actionResult.success,
        p_error_message: errorMessage,
      });
    }

    return res.json(actionResult);
  } catch (error: any) {
    console.error('Error in executeAction:', error);
    return res.status(500).json({ error: 'Failed to execute action' });
  }
}

/**
 * @route   POST /api/ai-assistant/session/end
 * @desc    End current AI chat session
 * @access  Private
 */
export async function endSession(req: Request, res: Response) {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const { error } = await supabase
      .from('ai_chat_sessions')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', sessionId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error ending session:', error);
      return res.status(500).json({ error: 'Failed to end session' });
    }

    return res.json({ success: true });
  } catch (error: any) {
    console.error('Error in endSession:', error);
    return res.status(500).json({ error: 'Failed to end session' });
  }
}
