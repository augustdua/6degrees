import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './useAuth';

export interface Message {
  messageId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  sentAt: string;
  editedAt?: string;
  isOwnMessage: boolean;
}

export interface Conversation {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessageContent?: string;
  lastMessageSenderId?: string;
  lastMessageSentAt?: string;
  unreadCount: number;
  updatedAt: string;
}

export const useMessages = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentMessages, setCurrentMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);

  // Real-time subscriptions
  const conversationSubscription = useRef<any>(null);
  const messageSubscription = useRef<any>(null);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_user_conversations', {
        p_limit: 50,
        p_offset: 0
      });

      if (error) throw error;

      console.log('🔍 Raw RPC data:', data);
      console.log('🔍 First conversation:', data?.[0]);

      const formattedConversations: Conversation[] = (data || []).map((conv: any) => ({
        conversationId: conv.conversation_id,
        otherUserId: conv.other_user_id,
        otherUserName: conv.other_user_name || 'Unknown User',
        otherUserAvatar: conv.other_user_avatar,
        lastMessageContent: conv.last_message_content,
        lastMessageSenderId: conv.last_message_sender_id,
        lastMessageSentAt: conv.last_message_sent_at,
        unreadCount: conv.unread_count || 0,
        updatedAt: conv.updated_at,
      }));

      setConversations(formattedConversations);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch conversations';
      setError(errorMessage);
      console.error('Error fetching conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchMessages = useCallback(async (
    conversationId: string,
    beforeMessageId?: string,
    append = false
  ) => {
    if (!user || !conversationId) return;

    if (!append) setMessagesLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: conversationId,
        p_limit: 50,
        p_before_message_id: beforeMessageId || null
      });

      if (error) throw error;

      const formattedMessages: Message[] = (data || []).map((msg: any) => ({
        messageId: msg.message_id,
        senderId: msg.sender_id,
        senderName: msg.sender_name || 'Unknown User',
        senderAvatar: msg.sender_avatar,
        content: msg.content,
        sentAt: msg.sent_at,
        editedAt: msg.edited_at,
        isOwnMessage: msg.is_own_message,
      }));

      // Reverse to show oldest first (since we query newest first for pagination)
      const reversedMessages = formattedMessages.reverse();

      if (append) {
        setCurrentMessages(prev => [...reversedMessages, ...prev]);
      } else {
        setCurrentMessages(reversedMessages);
        setCurrentConversationId(conversationId);
      }

      setHasMoreMessages(formattedMessages.length === 50);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch messages';
      setError(errorMessage);
      console.error('Error fetching messages:', err);
    } finally {
      if (!append) setMessagesLoading(false);
    }
  }, [user]);

  const getOrCreateConversation = async (otherUserId: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase.rpc('get_or_create_conversation', {
        p_other_user_id: otherUserId
      });

      if (error) throw error;

      // Refresh conversations to include the new one
      await fetchConversations();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create conversation';
      setError(errorMessage);
      throw err;
    }
  };

  const sendMessage = async (conversationId: string, content: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    if (!content.trim()) throw new Error('Message cannot be empty');

    try {
      const { data, error } = await supabase.rpc('send_message', {
        p_conversation_id: conversationId,
        p_content: content.trim()
      });

      if (error) throw error;

      // Add optimistic message to current messages
      const optimisticMessage: Message = {
        messageId: data,
        senderId: user.id,
        senderName: `${user.first_name} ${user.last_name}`,
        senderAvatar: user.avatar_url,
        content: content.trim(),
        sentAt: new Date().toISOString(),
        isOwnMessage: true,
      };

      if (currentConversationId === conversationId) {
        setCurrentMessages(prev => [...prev, optimisticMessage]);
      }

      // Refresh conversations to update last message
      await fetchConversations();

      return data;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
      setError(errorMessage);
      throw err;
    }
  };

  const markConversationRead = async (conversationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: conversationId
      });

      if (error) throw error;

      // Update local state to reflect read status
      setConversations(prev =>
        prev.map(conv =>
          conv.conversationId === conversationId
            ? { ...conv, unreadCount: 0 }
            : conv
        )
      );
    } catch (err) {
      console.error('Error marking conversation as read:', err);
    }
  };

  const loadMoreMessages = async () => {
    if (!currentConversationId || !hasMoreMessages || currentMessages.length === 0) return;

    const oldestMessage = currentMessages[0];
    if (oldestMessage) {
      await fetchMessages(currentConversationId, oldestMessage.messageId, true);
    }
  };

  const getTotalUnreadCount = useCallback((): number => {
    return conversations.reduce((total, conv) => total + conv.unreadCount, 0);
  }, [conversations]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to conversation changes
    conversationSubscription.current = supabase
      .channel('user-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations'
        },
        () => {
          fetchConversations();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          // If it's a new message in the current conversation, add it
          if (
            payload.eventType === 'INSERT' &&
            payload.new.conversation_id === currentConversationId &&
            payload.new.sender_id !== user.id
          ) {
            // Fetch the complete message details
            fetchMessages(currentConversationId);
          }
          // Always refresh conversations for last message updates
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      if (conversationSubscription.current) {
        supabase.removeChannel(conversationSubscription.current);
      }
    };
  }, [user, currentConversationId, fetchConversations, fetchMessages]);

  // Load conversations when user is available
  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user, fetchConversations]);

  // Clean up subscriptions
  useEffect(() => {
    return () => {
      if (conversationSubscription.current) {
        supabase.removeChannel(conversationSubscription.current);
      }
      if (messageSubscription.current) {
        supabase.removeChannel(messageSubscription.current);
      }
    };
  }, []);

  return {
    // Data
    conversations,
    currentMessages,
    currentConversationId,
    loading,
    messagesLoading,
    error,
    hasMoreMessages,

    // Actions
    fetchConversations,
    fetchMessages,
    getOrCreateConversation,
    sendMessage,
    markConversationRead,
    loadMoreMessages,

    // Helpers
    getTotalUnreadCount,
  };
};