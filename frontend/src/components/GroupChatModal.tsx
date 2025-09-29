import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import {
  Send,
  X,
  MessageSquare,
  Clock,
  Users,
  Hash
} from 'lucide-react';

interface GroupChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  chainId: string;
  chainTarget: string;
  participants: Array<{
    userid: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    joinedAt: string;
  }>;
}

interface GroupMessage {
  messageId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  content: string;
  sentAt: string;
  isOwnMessage: boolean;
}

const GroupChatModal: React.FC<GroupChatModalProps> = ({
  isOpen,
  onClose,
  chainId,
  chainTarget,
  participants
}) => {
  const { user } = useAuth();
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load group messages
  const loadMessages = async () => {
    if (!chainId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('get_group_chat_messages', {
        p_chain_id: chainId,
        p_limit: 50
      });

      if (error) throw error;

      const formattedMessages: GroupMessage[] = (data || []).map((msg: any) => ({
        messageId: msg.message_id,
        senderId: msg.sender_id,
        senderName: msg.sender_name || 'Unknown User',
        senderAvatar: msg.sender_avatar,
        content: msg.content,
        sentAt: msg.sent_at,
        isOwnMessage: msg.sender_id === user?.id,
      }));

      setMessages(formattedMessages);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading group messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Send group message
  const handleSendMessage = async () => {
    if (!chainId || !user) return;
    const content = messageText.trim();
    if (!content) return;

    setSending(true);
    try {
      const { error } = await supabase.rpc('send_group_message', {
        p_chain_id: chainId,
        p_content: content,
      });

      if (error) throw error;

      setMessageText('');

      // Add optimistic message
      const optimisticMessage: GroupMessage = {
        messageId: 'temp-' + Date.now(),
        senderId: user.id,
        senderName: `${user.first_name} ${user.last_name}`,
        senderAvatar: user.avatar_url,
        content: content,
        sentAt: new Date().toISOString(),
        isOwnMessage: true,
      };

      setMessages(prev => [...prev, optimisticMessage]);
      setTimeout(scrollToBottom, 100);

      // Reload messages to get the actual message
      setTimeout(() => loadMessages(), 500);

    } catch (error) {
      console.error('send_group_message failed', error);
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
    setMessageText('');
    setMessages([]);
    setError(null);
    setSending(false);
    onClose();
  };

  // Load messages when modal opens
  useEffect(() => {
    if (isOpen && chainId) {
      loadMessages();
    }
  }, [isOpen, chainId]);

  // Set up real-time subscription for group messages
  useEffect(() => {
    if (!isOpen || !chainId) return;

    const subscription = supabase
      .channel(`group-chat-${chainId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'group_messages',
          filter: `chain_id=eq.${chainId}`,
        },
        (payload) => {
          // Reload messages when new message is added
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, chainId]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl h-[700px] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Hash className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-lg">Chain Group Chat</DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm">
                <span className="truncate">{chainTarget}</span>
                <Badge variant="secondary" className="text-xs">
                  <Users className="h-3 w-3 mr-1" />
                  {participants.length} members
                </Badge>
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Participants List - Collapsible */}
        <div className="px-4 py-2 border-b bg-muted/30">
          <div className="flex flex-wrap gap-2">
            {participants.slice(0, 5).map((participant) => (
              <div key={participant.userid} className="flex items-center gap-1">
                <Avatar className="h-6 w-6">
                  <AvatarFallback className="text-xs">
                    {participant.firstName[0]}{participant.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">
                  {participant.firstName} ({participant.role})
                </span>
              </div>
            ))}
            {participants.length > 5 && (
              <span className="text-xs text-muted-foreground">
                +{participants.length - 5} more
              </span>
            )}
          </div>
        </div>

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
                <Button variant="outline" size="sm" onClick={loadMessages}>
                  Retry
                </Button>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No messages yet</p>
                <p className="text-muted-foreground text-xs">Start the group conversation!</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {messages.map((message, index) => {
                  const isFirstFromSender = index === 0 ||
                    messages[index - 1].senderId !== message.senderId;
                  const isLastFromSender = index === messages.length - 1 ||
                    messages[index + 1].senderId !== message.senderId;

                  return (
                    <div
                      key={message.messageId}
                      className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`flex items-end space-x-2 max-w-[80%] ${
                        message.isOwnMessage ? 'flex-row-reverse space-x-reverse' : ''
                      }`}>
                        {!message.isOwnMessage && isLastFromSender && (
                          <Avatar className="h-6 w-6 mb-1">
                            <AvatarImage src={message.senderAvatar} />
                            <AvatarFallback className="text-xs">
                              {message.senderName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                        )}
                        {!message.isOwnMessage && !isLastFromSender && (
                          <div className="w-6" />
                        )}

                        <div className="flex flex-col">
                          {isFirstFromSender && !message.isOwnMessage && (
                            <p className="text-xs text-muted-foreground mb-1 px-1">
                              {message.senderName}
                            </p>
                          )}
                          <div className={`px-3 py-2 rounded-2xl ${
                            message.isOwnMessage
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-muted rounded-bl-md'
                          } ${!isFirstFromSender ? 'mt-1' : ''}`}>
                            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          </div>
                          {isLastFromSender && (
                            <p className={`text-xs text-muted-foreground mt-1 px-1 ${
                              message.isOwnMessage ? 'text-right' : 'text-left'
                            }`}>
                              <Clock className="h-3 w-3 inline mr-1" />
                              {formatMessageTime(message.sentAt)}
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
                placeholder="Type a message to the group..."
                disabled={sending}
                className="flex-1 text-sm"
                maxLength={2000}
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={sending || !messageText.trim()}
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

export default GroupChatModal;