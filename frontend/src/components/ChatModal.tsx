import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { useMessages, Message } from '@/hooks/useMessages';
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
  const {
    currentMessages,
    currentConversationId,
    messagesLoading,
    error,
    hasMoreMessages,
    fetchMessages,
    getOrCreateConversation,
    sendMessage,
    markConversationRead,
    loadMoreMessages
  } = useMessages();

  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Initialize conversation when modal opens
  useEffect(() => {
    if (isOpen && otherUserId && !conversationId) {
      const initConversation = async () => {
        try {
          const convId = await getOrCreateConversation(otherUserId);
          setConversationId(convId);
          await fetchMessages(convId);
          await markConversationRead(convId);
        } catch (error) {
          console.error('Error initializing conversation:', error);
        }
      };
      initConversation();
    }
  }, [isOpen, otherUserId, conversationId, getOrCreateConversation, fetchMessages, markConversationRead]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (currentMessages.length > 0 && currentConversationId === conversationId) {
      setTimeout(scrollToBottom, 100);
    }
  }, [currentMessages, currentConversationId, conversationId]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Mark as read when modal opens
  useEffect(() => {
    if (isOpen && conversationId) {
      markConversationRead(conversationId);
    }
  }, [isOpen, conversationId, markConversationRead]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversationId || sending) return;

    setSending(true);
    try {
      await sendMessage(conversationId, messageText.trim());
      setMessageText('');
      scrollToBottom();
    } catch (error) {
      console.error('Error sending message:', error);
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
    onClose();
  };

  const displayMessages = conversationId === currentConversationId ? currentMessages : [];

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
                Click to send a message
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
            {messagesLoading && displayMessages.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-pulse">
                  <MessageSquare className="h-8 w-8 text-muted-foreground" />
                </div>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-red-600 text-sm mb-2">Failed to load messages</p>
                <Button variant="outline" size="sm" onClick={() => conversationId && fetchMessages(conversationId)}>
                  Retry
                </Button>
              </div>
            ) : displayMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-2" />
                <p className="text-muted-foreground text-sm">No messages yet</p>
                <p className="text-muted-foreground text-xs">Start the conversation!</p>
              </div>
            ) : (
              <div className="space-y-4 py-4">
                {hasMoreMessages && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={loadMoreMessages}
                      className="text-xs"
                    >
                      <ArrowUp className="h-3 w-3 mr-1" />
                      Load older messages
                    </Button>
                  </div>
                )}

                {displayMessages.map((message, index) => {
                  const isFirstFromSender = index === 0 ||
                    displayMessages[index - 1].senderId !== message.senderId;
                  const isLastFromSender = index === displayMessages.length - 1 ||
                    displayMessages[index + 1].senderId !== message.senderId;

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
                            {message.editedAt && (
                              <p className="text-xs opacity-70 mt-1">edited</p>
                            )}
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
                placeholder="Type a message..."
                disabled={sending || !conversationId}
                className="flex-1 text-sm"
                maxLength={2000}
              />
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!messageText.trim() || sending || !conversationId}
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