import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: any;
  functionCall?: {
    name: string;
    arguments: any;
  };
}

interface AIChat {
  messages: Message[];
  sendMessage: (message: string, currentPage?: string, context?: any) => Promise<void>;
  suggestions: string[];
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
  clearMessages: () => void;
  sessionId: string | null;
}

export const useAIChat = (): AIChat => {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const initialized = useRef(false);

  // Load conversation history on mount
  useEffect(() => {
    if (!session?.access_token || initialized.current) return;

    initialized.current = true;
    loadHistory();
    loadSuggestions();
  }, [session]);

  // Load conversation history
  const loadHistory = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/ai-assistant/history?limit=20`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load conversation history');
      }

      const data = await response.json();
      const formattedMessages: Message[] = (data.messages || []).map((msg: any) => ({
        id: msg.id,
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.created_at),
        context: msg.context,
        functionCall: msg.function_call,
      }));

      setMessages(formattedMessages);
    } catch (err) {
      console.error('Error loading history:', err);
      // Don't show error to user for history loading failures
    }
  };

  // Load quick suggestions
  const loadSuggestions = async (currentPage?: string) => {
    try {
      const pageParam = currentPage ? `?page=${currentPage}` : '';
      const response = await fetch(`${API_BASE_URL}/api/ai-assistant/suggestions${pageParam}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load suggestions');
      }

      const data = await response.json();
      setSuggestions(data.suggestions || []);
    } catch (err) {
      console.error('Error loading suggestions:', err);
      // Fallback suggestions
      setSuggestions([
        'How do I send a connection request?',
        'What are offers?',
        'Show me my dashboard',
      ]);
    }
  };

  // Send a message to the AI assistant
  const sendMessage = useCallback(
    async (message: string, currentPage?: string, context?: any) => {
      if (!session?.access_token) {
        setError('You must be logged in to use the AI assistant');
        return;
      }

      if (!message.trim()) {
        return;
      }

      setIsLoading(true);
      setError(null);

      // Add user message immediately to UI
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: message,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await fetch(`${API_BASE_URL}/api/ai-assistant/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            message,
            sessionId: sessionId || undefined,
            currentPage,
            context,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to send message');
        }

        const data = await response.json();

        // Update session ID if we got a new one
        if (data.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }

        // Add assistant message to UI
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date(),
          functionCall: data.functionCall,
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Reload suggestions for context-aware prompts
        if (currentPage) {
          loadSuggestions(currentPage);
        }
      } catch (err: any) {
        console.error('Error sending message:', err);
        setError(err.message || 'Failed to send message. Please try again.');

        // Remove the user message if send failed
        setMessages((prev) => prev.filter((m) => m.id !== userMessage.id));
      } finally {
        setIsLoading(false);
      }
    },
    [session, sessionId]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Clear messages
  const clearMessages = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    loadSuggestions();
  }, []);

  return {
    messages,
    sendMessage,
    suggestions,
    isLoading,
    error,
    clearError,
    clearMessages,
    sessionId,
  };
};

export default useAIChat;
