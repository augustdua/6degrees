import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import EmojiPicker from 'emoji-picker-react';
import {
  Send,
  X,
  MessageSquare,
  Clock,
  Users,
  Hash,
  Smile,
  Image,
  Plus,
  Heart,
  ThumbsUp,
  Laugh,
  Angry,
  Cry,
  Surprised
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
  reactions?: MessageReaction[];
}

interface MessageReaction {
  emoji: string;
  users: Array<{
    userId: string;
    userName: string;
  }>;
  count: number;
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
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState<string[]>([]);
  const [gifLoading, setGifLoading] = useState(false);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load group messages with reactions
  const loadMessages = async () => {
    if (!chainId) return;

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('get_group_chat_messages_with_reactions', {
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
        reactions: msg.reactions || [],
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

  // Add reaction to message
  const handleReaction = async (messageId: string, emoji: string) => {
    try {
      const { error } = await supabase.rpc('add_message_reaction', {
        p_message_id: messageId,
        p_emoji: emoji
      });

      if (error) throw error;

      // Refresh messages to show updated reactions
      await loadMessages();
    } catch (error) {
      console.error('Failed to add reaction:', error);
    }
  };

  // Remove reaction from message
  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      const { error } = await supabase.rpc('remove_message_reaction', {
        p_message_id: messageId,
        p_emoji: emoji
      });

      if (error) throw error;

      // Refresh messages to show updated reactions
      await loadMessages();
    } catch (error) {
      console.error('Failed to remove reaction:', error);
    }
  };

  // Handle emoji selection from picker
  const handleEmojiSelect = (emojiData: any) => {
    setMessageText(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
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
    setShowEmojiPicker(false);
    setShowGifPicker(false);
    onClose();
  };

  // Quick reaction emojis
  const quickReactions = ['❤️', '👍', '😄', '😮', '😢', '😠'];

  // Simple GIF URLs for demo (fallback when no Tenor API key)
  const demoGifs = [
    'https://media.giphy.com/media/3o7aCSPqXE5C6T8tBC/giphy.gif',
    'https://media.giphy.com/media/l0MYP6WAFfaR7Q1jO/giphy.gif',
    'https://media.giphy.com/media/3o7btPCcdNniyf0ArS/giphy.gif',
    'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif'
  ];

  const handleGifSelect = (gifUrl: string) => {
    setMessageText(prev => prev + ` ${gifUrl} `);
    setShowGifPicker(false);
  };

  // Load trending GIFs from Tenor when picker opens (if API key configured)
  useEffect(() => {
    const fetchTrending = async () => {
      const apiKey = (import.meta as any).env?.VITE_TENOR_API_KEY || (window as any)?.VITE_TENOR_API_KEY;
      if (!showGifPicker) return;
      if (!apiKey) {
        setGifResults(demoGifs);
        return;
      }
      try {
        setGifLoading(true);
        const resp = await fetch(`https://tenor.googleapis.com/v2/featured?key=${apiKey}&limit=12&media_filter=gif,tinygif`);
        const json = await resp.json();
        const urls: string[] = (json?.results || [])
          .map((r: any) => r?.media_formats?.tinygif?.url || r?.media_formats?.gif?.url)
          .filter(Boolean);
        setGifResults(urls.length ? urls : demoGifs);
      } catch (e) {
        setGifResults(demoGifs);
      } finally {
        setGifLoading(false);
      }
    };
    fetchTrending();
  }, [showGifPicker]);

  const searchGifs = async (q: string) => {
    setGifQuery(q);
    const apiKey = (import.meta as any).env?.VITE_TENOR_API_KEY || (window as any)?.VITE_TENOR_API_KEY;
    if (!apiKey) return; // stay on demo results
    if (!q.trim()) return;
    try {
      setGifLoading(true);
      const resp = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${apiKey}&limit=24&media_filter=gif,tinygif`);
      const json = await resp.json();
      const urls: string[] = (json?.results || [])
        .map((r: any) => r?.media_formats?.tinygif?.url || r?.media_formats?.gif?.url)
        .filter(Boolean);
      if (urls.length) setGifResults(urls);
    } finally {
      setGifLoading(false);
    }
  };

  // Render message content with inline images/GIFs
  const renderMessageContent = (content: string) => {
    // Extract markdown image first: ![alt](url)
    const markdownImgRegex = /!\[[^\]]*\]\((https?:[^)]+)\)/g;
    let parts: Array<string | { img: string }> = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = markdownImgRegex.exec(content)) !== null) {
      if (match.index > lastIndex) parts.push(content.slice(lastIndex, match.index));
      parts.push({ img: match[1] });
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < content.length) parts.push(content.slice(lastIndex));

    // Map plain image URLs within text segments
    const mapPlainImages = (text: string) => {
      const urlImgRegex = /(https?:\/\/[^\s]+\.(?:gif|png|jpg|jpeg|webp))/gi;
      const segments: Array<string | { img: string }> = [];
      let idx = 0; let m: RegExpExecArray | null;
      while ((m = urlImgRegex.exec(text)) !== null) {
        if (m.index > idx) segments.push(text.slice(idx, m.index));
        segments.push({ img: m[1] });
        idx = m.index + m[0].length;
      }
      if (idx < text.length) segments.push(text.slice(idx));
      return segments;
    };

    // Expand plain links inside string parts
    let expanded: Array<string | { img: string }> = [];
    for (const p of parts) {
      if (typeof p === 'string') expanded = expanded.concat(mapPlainImages(p));
      else expanded.push(p);
    }

    return (
      <>
        {expanded.map((p, i) =>
          typeof p === 'string' ? (
            <span key={i} className="whitespace-pre-wrap break-words">{p}</span>
          ) : (
            <img
              key={i}
              src={p.img}
              alt="media"
              className="max-w-[250px] sm:max-w-xs max-h-48 rounded mt-1 w-auto h-auto object-contain"
            />
          )
        )}
      </>
    );
  };

  // Load messages when modal opens
  useEffect(() => {
    if (isOpen && chainId) {
      loadMessages();
    }
  }, [isOpen, chainId]);

  // Set up real-time subscription for group messages and reactions
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
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          // Reload messages when reactions are added/removed
          // Only if the reaction is for a message in this chain
          const messageId = payload.new?.message_id || payload.old?.message_id;
          if (messageId) {
            loadMessages();
          }
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
      <DialogContent className="max-w-[95vw] sm:max-w-2xl h-[90vh] sm:h-[700px] flex flex-col p-0 gap-0 rounded-lg">
        <DialogHeader className="px-4 py-3 border-b">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Hash className="h-6 w-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-lg truncate">Chain Group Chat</DialogTitle>
              <DialogDescription className="flex items-center gap-2 text-sm">
                <span className="truncate">{chainTarget}</span>
                <Badge variant="secondary" className="text-xs flex-shrink-0">
                  <Users className="h-3 w-3 mr-1" />
                  <span className="hidden sm:inline">{participants.length} members</span>
                  <span className="sm:hidden">{participants.length}</span>
                </Badge>
              </DialogDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClose} className="flex-shrink-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Participants List - Always Visible */}
        <div className="border-b bg-muted/20">
          <div className="px-4 py-2 bg-muted/30">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">
                {participants.length} Participants
              </span>
            </div>
          </div>
          <ScrollArea className="h-24 sm:h-20">
            <div className="px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {participants.map((participant) => (
                  <TooltipProvider key={participant.userid}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 bg-background rounded-full px-2 py-1 text-xs border">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">
                              {participant.firstName[0]}{participant.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-20">
                            {participant.firstName}
                          </span>
                          <Badge variant="outline" className="text-xs h-4 px-1">
                            {participant.role.charAt(0).toUpperCase()}
                          </Badge>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="text-center">
                          <div className="font-medium">{participant.firstName} {participant.lastName}</div>
                          <div className="text-xs opacity-75">{participant.email}</div>
                          <div className="text-xs opacity-75">{participant.role}</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Messages Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-3 sm:px-4" ref={scrollAreaRef}>
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
                      <div className={`flex items-end space-x-2 max-w-[85%] sm:max-w-[80%] ${
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

                        <div className="flex flex-col group">
                          {isFirstFromSender && !message.isOwnMessage && (
                            <p className="text-xs text-muted-foreground mb-1 px-1">
                              {message.senderName}
                            </p>
                          )}
                          <div className="relative">
                            <div className={`px-3 py-2 rounded-2xl ${
                              message.isOwnMessage
                                ? 'bg-primary text-primary-foreground rounded-br-md'
                                : 'bg-muted rounded-bl-md'
                            } ${!isFirstFromSender ? 'mt-1' : ''}`}>
                              <div className="text-sm">{renderMessageContent(message.content)}</div>
                            </div>

                            {/* Quick Reaction Button */}
                            <div className="absolute -right-1 bottom-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button size="sm" variant="secondary" className="h-6 w-6 p-0 rounded-full shadow-sm">
                                    <Smile className="h-3 w-3" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-2" side="top" align="end">
                                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                                    {quickReactions.map((emoji) => (
                                      <Button
                                        key={emoji}
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 w-8 p-0 hover:bg-muted"
                                        onClick={() => handleReaction(message.messageId, emoji)}
                                      >
                                        {emoji}
                                      </Button>
                                    ))}
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>

                            {/* Message Reactions */}
                            {message.reactions && message.reactions.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {message.reactions.map((reaction) => (
                                  <TooltipProvider key={reaction.emoji}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="h-6 px-2 py-0 text-xs bg-background/80 hover:bg-background"
                                          onClick={() => {
                                            const userReacted = reaction.users.some(u => u.userId === user?.id);
                                            if (userReacted) {
                                              handleRemoveReaction(message.messageId, reaction.emoji);
                                            } else {
                                              handleReaction(message.messageId, reaction.emoji);
                                            }
                                          }}
                                        >
                                          {reaction.emoji} {reaction.count}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        <p>{reaction.users.map(u => u.userName).join(', ')}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                ))}
                              </div>
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
          <div className="p-3 sm:p-4 border-t bg-background">
            <div className="flex items-end space-x-2">
              {/* Extra Input Controls */}
              <div className="flex items-center gap-1 pb-2">
                {/* Emoji Picker */}
                <Popover open={showEmojiPicker} onOpenChange={setShowEmojiPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Smile className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" side="top" align="start">
                    <EmojiPicker
                      onEmojiClick={handleEmojiSelect}
                      width={window.innerWidth > 640 ? 300 : 280}
                      height={window.innerWidth > 640 ? 400 : 350}
                      previewConfig={{ showPreview: false }}
                    />
                  </PopoverContent>
                </Popover>

                {/* GIF Picker */}
                <Popover open={showGifPicker} onOpenChange={setShowGifPicker}>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Image className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[85vw] sm:w-72 p-3 max-h-[60vh]" side="top" align="start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          value={gifQuery}
                          onChange={(e) => searchGifs(e.target.value)}
                          placeholder="Search GIFs..."
                          className="h-8 text-xs"
                        />
                      </div>
                      <ScrollArea className="h-52 sm:h-64">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pr-2">
                          {(gifResults.length ? gifResults : demoGifs).map((gif, index) => (
                            <div
                              key={gif + index}
                              className="cursor-pointer rounded overflow-hidden hover:opacity-80 transition-opacity"
                              onClick={() => handleGifSelect(gif)}
                            >
                              <img
                                src={gif}
                                alt={`GIF ${index + 1}`}
                                className="w-full h-20 sm:h-16 object-cover"
                                loading="lazy"
                              />
                            </div>
                          ))}
                        </div>
                        {gifLoading && (
                          <div className="text-center text-xs text-muted-foreground py-4">
                            Loading GIFs...
                          </div>
                        )}
                      </ScrollArea>
                      <p className="text-xs text-muted-foreground text-center">
                        Powered by Tenor (or demo GIFs)
                      </p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex-1 flex flex-col">
                <Input
                  ref={inputRef}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type a message... 😊"
                  disabled={sending}
                  className="text-sm min-h-[40px]"
                  maxLength={2000}
                />
                {/* Input Footer - Mobile friendly */}
                {messageText.length > 1900 && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {2000 - messageText.length} characters remaining
                  </div>
                )}
              </div>
              <Button
                size="sm"
                onClick={handleSendMessage}
                disabled={sending || !messageText.trim()}
                className="ml-2 h-10 w-10 p-0 flex-shrink-0"
              >
                {sending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Help text - only show on desktop */}
            <div className="hidden sm:block text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GroupChatModal;