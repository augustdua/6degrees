import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import {
  Send,
  ArrowUp,
  X,
  MessageSquare,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  otherUserId,
  otherUserName,
  otherUserAvatar
}) => {
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 2.1 Enable input only based on conversationId + sending
  const canType = Boolean(conversationId) && !sending;
  
  // Debug logging
  useEffect(() => {
    console.log('🔍 ChatModal Debug:', {
      isOpen,
      otherUserId,
      otherUserName,
      otherUserAvatar,
      conversationId,
      sending,
      canType,
      messagesCount: messages.length
    });
  }, [isOpen, otherUserId, otherUserName, otherUserAvatar, conversationId, sending, canType, messages.length]);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize conversation when modal opens
  useEffect(() => {
    if (isOpen && otherUserId && !conversationId) {
      let cancelled = false;

      const initConversation = async () => {
        try {
          console.log('🔄 Loading direct messages with user:', otherUserId);

          // For direct messages, use otherUserId directly as the conversation ID
          if (!cancelled) {
            console.log('✅ Using otherUserId as conversation ID:', otherUserId);
            setConversationId(otherUserId);

            // Load messages for this direct message thread
            await loadMessages(otherUserId);
          }

        } catch (error) {
          if (!cancelled) {
            console.error('❌ Error initializing conversation:', error);
            setError('Failed to start conversation');
          }
        }
      };

      initConversation();

      return () => { cancelled = true; };
    }
  }, [isOpen, otherUserId]);

  // Load messages for a conversation
  const loadMessages = async (convId: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('get_conversation_messages', {
        p_conversation_id: convId,
        p_limit: 50
      });

      if (error) throw error;

      // Ensure oldest messages appear first so newer ones stack at the bottom
      const ordered = (data || []).slice().reverse();
      setMessages(ordered);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Mark conversation as read
  const markConversationAsRead = async (convId: string) => {
    try {
      const { error } = await supabase.rpc('mark_conversation_read', {
        p_conversation_id: convId
      });

      if (error) throw error;

      console.log('✅ Conversation marked as read:', convId);
    } catch (error) {
      console.error('❌ Error marking conversation as read:', error);
    }
  };

  // Scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current && canType) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, canType]);

  // 2.3 Send via RPC (Realtime optional)
  const handleSendMessage = async () => {
    if (!conversationId) return;
    const content = messageText.trim();
    if (!content) return;

    setSending(true);
    try {
      // Check if this is a real conversation or direct message (user ID)
      const { data: isConversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('id', conversationId)
        .maybeSingle();
      
      if (isConversation) {
        // OLD system: Use send_message RPC for conversations
        const { error } = await supabase.rpc('send_message', {
          p_conversation_id: conversationId,
          p_content: content,
        });
        if (error) throw error;
      } else {
        // NEW system: Insert direct message with receiver_id
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
        const { error } = await supabase
          .from('messages')
          .insert({
            sender_id: user.id,
            receiver_id: conversationId, // conversationId is actually otherUserId for direct messages
            content: content,
            message_type: 'text'
          });
        
        if (error) throw error;
      }
      
      setMessageText('');
      
      // Reload messages to show the new one
      await loadMessages(conversationId);
      
    } catch (e) {
      console.error('send_message failed', e);
      setError('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;

    const isToday = date.toDateString() === now.toDateString();
    const isYesterday = date.toDateString() === new Date(now.getTime() - 86400000).toDateString();

    if (isToday) return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (isYesterday) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleClose = () => {
    setConversationId(null);
    setMessageText('');
    setMessages([]);
    setError(null);
    setSending(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md h-[600px] sm:h-[700px] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b flex flex-row items-center space-y-0">
          <div className="flex items-center space-x-3 flex-1">
            <Avatar className="h-8 w-8">
              <AvatarImage src={otherUserAvatar} />
              <AvatarFallback className="text-xs">
                {otherUserName.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div>
              <DialogTitle className="text-base">{otherUserName}</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                {canType ? 'Ready to chat' : 'Connecting...'}
                {/* Debug info - remove later */}
                {process.env.NODE_ENV === 'development' && (
                  <span className="ml-2 text-red-500">
                    (ConvID: {conversationId ? '✓' : '❌'}, Sending: {sending ? '✓' : '❌'}, CanType: {canType ? '✓' : '❌'})
                  </span>
                )}
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
            {loading && messages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-red-600 text-sm mb-2">{error}</p>
                <Button variant="outline" size="sm" onClick={() => conversationId && loadMessages(conversationId)}>
                  Retry
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No messages yet</p>
                <p className="text-muted-foreground text-xs">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((message, index) => {
                  const isFirstFromSender = index === 0 ||
                    messages[index - 1].sender_id !== message.sender_id;
                  const isLastFromSender = index === messages.length - 1 ||
                    messages[index + 1].sender_id !== message.sender_id;

                  return (
                    <div
                      key={message.message_id}
                      className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end space-x-2 max-w-[80%] ${
                        message.is_own_message ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        {!message.is_own_message && isLastFromSender && (
                          <Avatar className="h-6 w-6 mb-1">
                            <AvatarImage src={message.sender_avatar} />
                            <AvatarFallback className="text-xs">
                              {message.sender_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!message.is_own_message && !isLastFromSender && (
                          <div className="w-6" />
                        )}

                        <div className="flex flex-col">
                          {isFirstFromSender && !message.is_own_message && (
                            <p className="text-xs text-muted-foreground mb-1 px-1">
                              {message.sender_name}
                            </p>
                          )}
                          <div className={`px-3 py-2 rounded-2xl ${
                            message.is_own_message
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          } ${!isFirstFromSender ? 'mt-1' : ''}`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                            {message.edited_at && (
                              <p className="text-xs opacity-70 mt-1">edited</p>
                            )}
                          </div>
                          {isLastFromSender && (
                            <p className={`text-xs text-muted-foreground mt-1 px-1 ${
                              message.is_own_message ? 'text-right' : 'text-left'
                            }`}>
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatMessageTime(message.sent_at)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={canType ? "Type a message..." : "Connecting..."}
                disabled={!canType}
                className="flex-1 text-sm"
                maxLength={2000}
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!canType || !messageText.trim()}
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            {messageText.length > 1900 && (
              <p className="text-xs text-muted-foreground mt-1">
                {2000 - messageText.length} characters remaining
              </p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatModal;