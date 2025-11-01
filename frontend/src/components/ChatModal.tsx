import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import EmojiPicker, { EmojiClickData } from 'emoji-picker-react';
import {
  Send,
  ArrowUp,
  X,
  MessageSquare,
  Clock,
  Check,
  CheckCheck,
  Smile,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Loader2
} from 'lucide-react';
import { OfferApprovalMessage } from './OfferApprovalMessage';
import { IntroCallRequestMessage } from './IntroCallRequestMessage';
import { useToast } from '@/hooks/use-toast';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string | null;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
}

const ChatModal: React.FC<ChatModalProps> = ({
  isOpen,
  onClose,
  conversationId: initialConversationId,
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

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
          console.log('🔄 Loading messages with user:', otherUserId);
          console.log('Initial conversation ID:', initialConversationId);

          // Always use otherUserId for direct messages (after migration, all DMs use receiver_id)
          const idToUse = otherUserId;
          
          if (!cancelled) {
            console.log('✅ Using ID:', idToUse);
            setConversationId(idToUse);

            // Load messages
            await loadMessages(idToUse);
            
            // Mark messages as read
            await markMessagesAsRead(idToUse);
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

      // Messages already come in ASC order (oldest first) from SQL
      setMessages(data || []);
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Error loading messages:', error);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  // Mark direct messages as read
  const markMessagesAsRead = async (otherUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('mark_direct_messages_read', {
        p_other_user_id: otherUserId
      });

      if (error) throw error;

      console.log(`✅ Marked ${data} messages as read from user:`, otherUserId);
    } catch (error) {
      console.error('❌ Error marking messages as read:', error);
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
    
    // Optimistic update: Add message to UI immediately
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSending(false);
      return;
    }

    const optimisticMessage = {
      message_id: `temp-${Date.now()}`,
      sender_id: user.id,
      sender_name: 'You',
      sender_avatar: user.user_metadata?.avatar_url,
      content: content,
      sent_at: new Date().toISOString(),
      read_at: null,
      is_own_message: true,
      message_type: 'text',
      _isPending: true // Mark as pending
    };

    // Add to messages immediately (optimistic)
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageText('');
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: conversationId, // conversationId is actually otherUserId for direct messages
          content: content,
          message_type: 'text'
        });
      
      if (error) throw error;
      
      // Reload messages to replace optimistic message with real one
      await loadMessages(conversationId);
      
    } catch (e) {
      console.error('send_message failed', e);
      setError('Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.message_id !== optimisticMessage.message_id));
      // Restore message text on error
      setMessageText(content);
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

  // Handle emoji selection
  const onEmojiClick = (emojiData: EmojiClickData) => {
    setMessageText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  // Handle media upload
  const handleMediaUpload = async (file: File) => {
    if (!conversationId) return;
    
    // Validate file
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      toast({
        variant: 'destructive',
        title: 'File too large',
        description: 'Please upload files smaller than 50MB'
      });
      return;
    }

    setUploadingMedia(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create file path: {user_id}/{timestamp}_{filename}
      const timestamp = Date.now();
      const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `${user.id}/${timestamp}_${sanitizedFilename}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('message-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Determine message type from file
      let messageType = 'document';
      let mediaType = 'document';
      if (file.type.startsWith('image/')) {
        messageType = 'image';
        mediaType = 'image';
      } else if (file.type.startsWith('video/')) {
        messageType = 'video';
        mediaType = 'video';
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('message-media')
        .getPublicUrl(filePath);

      // Insert message with media
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: conversationId,
          content: file.name, // Filename as content
          message_type: messageType,
          media_type: mediaType,
          media_size: file.size,
          metadata: {
            media_url: filePath,
            media_name: file.name,
            media_public_url: urlData.publicUrl
          }
        });

      if (messageError) throw messageError;

      // Reload messages
      await loadMessages(conversationId);

      toast({
        title: 'Media sent!',
        description: `${file.name} uploaded successfully`
      });

    } catch (error: any) {
      console.error('Media upload error:', error);
      toast({
        variant: 'destructive',
        title: 'Upload failed',
        description: error.message || 'Failed to upload media'
      });
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleMediaUpload(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  const formatFileSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (showEmojiPicker && !target.closest('.EmojiPickerReact')) {
        setShowEmojiPicker(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showEmojiPicker]);

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

                  // Special rendering for offer approval messages
                  if (message.message_type === 'offer_approval_request') {
                    return (
                      <div
                        key={message.message_id}
                        className="flex justify-center w-full my-2"
                      >
                        <div className="w-full max-w-md">
                          <OfferApprovalMessage
                            message={message}
                            onStatusChange={() => {
                              // Optionally reload messages or update UI
                              loadMessages(conversationId!);
                            }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Special rendering for intro call request messages
                  if (message.message_type === 'intro_call_request') {
                    return (
                      <div
                        key={message.message_id}
                        className="flex justify-center w-full my-2"
                      >
                        <div className="w-full max-w-md">
                          <IntroCallRequestMessage
                            message={message}
                            onStatusChange={() => {
                              // Reload messages after approval/rejection
                              loadMessages(conversationId!);
                            }}
                          />
                        </div>
                      </div>
                    );
                  }

                  // Image message rendering
                  if (message.message_type === 'image') {
                    return (
                      <div
                        key={message.message_id}
                        className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-[70%]">
                          <img 
                            src={message.metadata?.media_public_url || ''}
                            alt={message.content}
                            className="rounded-lg max-h-96 cursor-pointer hover:opacity-90 transition"
                            onClick={() => window.open(message.metadata?.media_public_url, '_blank')}
                          />
                          {isLastFromSender && (
                            <p className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${
                              message.is_own_message ? 'justify-end' : 'justify-start'
                            }`}>
                              <span>{formatMessageTime(message.sent_at)}</span>
                              {message.is_own_message && (
                                message._isPending ? (
                                  <Clock className="h-3 w-3 opacity-50" />
                                ) : message.read_at ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" title="Read" />
                                ) : (
                                  <CheckCheck className="h-3 w-3 opacity-50" title="Delivered" />
                                )
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Video message rendering
                  if (message.message_type === 'video') {
                    return (
                      <div
                        key={message.message_id}
                        className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className="max-w-[70%]">
                          <video 
                            src={message.metadata?.media_public_url || ''}
                            controls
                            className="rounded-lg max-h-96"
                          />
                          {isLastFromSender && (
                            <p className={`text-xs text-muted-foreground mt-1 flex items-center gap-1 ${
                              message.is_own_message ? 'justify-end' : 'justify-start'
                            }`}>
                              <span>{formatMessageTime(message.sent_at)}</span>
                              {message.is_own_message && (
                                message._isPending ? (
                                  <Clock className="h-3 w-3 opacity-50" />
                                ) : message.read_at ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" title="Read" />
                                ) : (
                                  <CheckCheck className="h-3 w-3 opacity-50" title="Delivered" />
                                )
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Document message rendering
                  if (message.message_type === 'document') {
                    return (
                      <div
                        key={message.message_id}
                        className={`flex ${message.is_own_message ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`px-4 py-3 rounded-lg border max-w-[70%] ${
                          message.is_own_message ? 'bg-primary text-primary-foreground' : 'bg-muted'
                        }`}>
                          <div className="flex items-center gap-3">
                            <FileText className="h-6 w-6 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{message.metadata?.media_name || message.content}</p>
                              <p className="text-xs opacity-70">{formatFileSize(message.media_size)}</p>
                            </div>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              className="flex-shrink-0"
                              onClick={() => window.open(message.metadata?.media_public_url, '_blank')}
                            >
                              <ArrowUp className="h-4 w-4 rotate-45" />
                            </Button>
                          </div>
                          {isLastFromSender && (
                            <p className={`text-xs opacity-70 mt-2 flex items-center gap-1 ${
                              message.is_own_message ? 'justify-end' : 'justify-start'
                            }`}>
                              <span>{formatMessageTime(message.sent_at)}</span>
                              {message.is_own_message && (
                                message._isPending ? (
                                  <Clock className="h-3 w-3 opacity-50" />
                                ) : message.read_at ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" title="Read" />
                                ) : (
                                  <CheckCheck className="h-3 w-3 opacity-50" title="Delivered" />
                                )
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Regular text message rendering
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
                            <p className={`text-xs text-muted-foreground mt-1 px-1 flex items-center gap-1 ${
                              message.is_own_message ? 'justify-end' : 'justify-start'
                            }`}>
                              <span>{formatMessageTime(message.sent_at)}</span>
                              {message.is_own_message && (
                                message._isPending ? (
                                  <Clock className="h-3 w-3 opacity-50" />
                                ) : message.read_at ? (
                                  <CheckCheck className="h-3 w-3 text-blue-500" title="Read" />
                                ) : (
                                  <CheckCheck className="h-3 w-3 opacity-50" title="Delivered" />
                                )
                              )}
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
          <div className="p-4 border-t relative">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {/* Emoji Picker */}
            {showEmojiPicker && (
              <div className="absolute bottom-20 right-4 z-50">
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  width={350}
                  height={400}
                />
              </div>
            )}
            
            {/* Upload Progress */}
            {uploadingMedia && (
              <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Uploading media...</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              {/* Emoji Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                disabled={!canType}
                title="Add emoji"
                className="flex-shrink-0"
              >
                <Smile className="h-5 w-5" />
              </Button>
              
              {/* File Attachment Button */}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canType || uploadingMedia}
                title="Attach file"
                className="flex-shrink-0"
              >
                <Paperclip className="h-5 w-5" />
              </Button>
              
              {/* Message Input */}
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
              
              {/* Send Button */}
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={!canType || (!messageText.trim() && !uploadingMedia)}
                className="flex-shrink-0"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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