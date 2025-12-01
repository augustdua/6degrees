import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/hooks/useMessages';
import { apiPost } from '@/lib/api';
import { getAvatarColor, getInitialsFromFullName } from '@/lib/avatarUtils';
import ChatModal from './ChatModal';
import {
  Search,
  MessageSquare,
  Users,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface MessagesTabProps {
  initialConversationId?: string;
  isTelegramMiniApp?: boolean;
}

const MessagesTab = ({ initialConversationId, isTelegramMiniApp = false }: MessagesTabProps) => {
  console.log('🔍 MessagesTab component rendering...', { initialConversationId, isTelegramMiniApp });
  
  const {
    conversations,
    loading,
    error,
    fetchConversations,
    getTotalUnreadCount
  } = useMessages();

  // Debug logging
  useEffect(() => {
    console.log('🔍 MessagesTab mounted, conversations:', conversations);
    console.log('🔍 MessagesTab loading:', loading);
    console.log('🔍 MessagesTab error:', error);
  }, [conversations, loading, error]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    userId: string;
    name: string;
    avatar?: string;
  } | null>(null);

  // Auto-open conversation if initialConversationId is provided (for Telegram Mini App)
  useEffect(() => {
    if (initialConversationId && conversations.length > 0 && !showChat) {
      const conversation = conversations.find(c => c.id === initialConversationId);
      if (conversation) {
        console.log('🔍 Auto-opening conversation:', conversation);
        setSelectedConversation({
          id: conversation.id,
          userId: conversation.otherUserId,
          name: conversation.otherUserName,
          avatar: conversation.otherUserAvatar
        });
        setShowChat(true);
      }
    }
  }, [initialConversationId, conversations, showChat]);

  const filteredConversations = conversations.filter(conversation =>
    conversation.otherUserName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatLastMessageTime = (timestamp?: string) => {
    if (!timestamp) return 'No messages';

    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d ago`;
    return date.toLocaleDateString();
  };

  const truncateMessageMobile = (message: string, maxLength: number = 35) => {
    if (!message) return 'Start a conversation...';
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const handleConversationClick = async (conversation: any) => {
    console.log('🔍 Conversation clicked:', conversation);
    console.log('🔍 Setting selectedConversation with userId:', conversation.otherUserId);

    setSelectedConversation({
      id: conversation.conversationId || conversation.otherUserId,  // Use otherUserId for direct messages
      userId: conversation.otherUserId,
      name: conversation.otherUserName,
      avatar: conversation.otherUserAvatar
    });
    setShowChat(true);

    // Mark messages as read immediately when clicked
    if (conversation.unreadCount > 0) {
      try {
        await apiPost('/api/messages/mark-read', {
          other_user_id: conversation.otherUserId
        });

        // Update local state to reflect read status immediately
        fetchConversations();
      } catch (error) {
        console.error('Error marking messages as read:', error);
      }
    }
  };

  if (loading && conversations.length === 0) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center space-x-4">
                  <div className="rounded-full bg-muted h-12 w-12"></div>
                  <div className="space-y-2 flex-1">
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800 dark:text-red-200">
          Failed to load conversations: {error}
          <Button
            variant="outline"
            size="sm"
            className="ml-2"
            onClick={fetchConversations}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 overflow-x-hidden w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
        <div className="flex-1 min-w-0 max-w-full">
          <h3 className="font-gilroy tracking-[0.15em] uppercase text-sm flex items-center gap-2 truncate text-white">
            <MessageSquare className="h-4 w-4 flex-shrink-0 text-[#CBAA5A]" />
            <span className="truncate">MESSAGES</span>
            {getTotalUnreadCount() > 0 && (
              <Badge variant="destructive" className="text-[9px] flex-shrink-0 font-gilroy">
                {getTotalUnreadCount()}
              </Badge>
            )}
          </h3>
          <p className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#666] truncate">
            CHAT WITH YOUR CONNECTIONS
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchConversations} disabled={loading} className="flex-shrink-0 w-auto border-[#333] text-[#888] hover:text-white font-gilroy tracking-[0.1em] uppercase text-[9px]">
          <RefreshCw className={`h-3 w-3 sm:mr-2 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">REFRESH</span>
        </Button>
      </div>

      {/* Search */}
      {conversations.length > 0 && (
        <div className="relative w-full max-w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[#666] z-10" />
          <Input
            placeholder="SEARCH CONVERSATIONS..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 w-full max-w-full bg-black border-[#333] text-white font-gilroy tracking-[0.05em] uppercase text-[10px] placeholder:text-[#555]"
          />
        </div>
      )}

      {/* Empty State */}
      {conversations.length === 0 && (
        <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-8 text-center">
          <MessageSquare className="h-12 w-12 mx-auto text-[#333] mb-4" />
          <h4 className="font-gilroy tracking-[0.15em] uppercase text-sm text-white mb-2">NO CONVERSATIONS YET</h4>
          <p className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#666] mb-4">
            START CHATTING WITH YOUR CONNECTIONS TO SEE CONVERSATIONS HERE
          </p>
          <p className="font-gilroy tracking-[0.1em] uppercase text-[9px] text-[#555]">
            GO TO THE NETWORK TAB TO MESSAGE YOUR CONNECTIONS
          </p>
        </div>
      )}

      {/* No Search Results */}
      {filteredConversations.length === 0 && searchQuery && conversations.length > 0 && (
        <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-8 text-center">
          <Search className="h-8 w-8 mx-auto text-[#333] mb-2" />
          <p className="font-gilroy tracking-[0.1em] uppercase text-[10px] text-[#666]">
            NO CONVERSATIONS FOUND MATCHING "{searchQuery.toUpperCase()}"
          </p>
        </div>
      )}

      {/* Conversations List */}
      <div className="space-y-3 w-full">
        {filteredConversations.map((conversation) => (
          <Card
            key={conversation.conversationId}
            className="transition-all hover:shadow-md cursor-pointer w-full overflow-hidden"
            onClick={() => handleConversationClick(conversation)}
          >
            <CardContent className="p-3 sm:p-4 w-full">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  <Avatar className="h-10 w-10 sm:h-12 sm:w-12 hover:scale-105 transition-transform">
                    <AvatarImage src={conversation.otherUserAvatar} alt={conversation.otherUserName} />
                    <AvatarFallback className={`bg-gradient-to-br ${getAvatarColor(conversation.otherUserId)}`}>
                      {getInitialsFromFullName(conversation.otherUserName)}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-4 min-w-[16px] sm:h-5 sm:min-w-[20px] flex items-center justify-center p-0 text-[10px] sm:text-xs shadow-lg"
                    >
                      {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1 gap-1 sm:gap-2">
                    <h4 className="font-gilroy text-sm sm:text-base truncate flex-1 min-w-0 text-white tracking-[0.1em] uppercase">
                      {conversation.otherUserName}
                    </h4>
                    <span className="text-[10px] sm:text-xs text-[#666] flex-shrink-0 whitespace-nowrap ml-1 font-gilroy uppercase tracking-[0.05em]">
                      {formatLastMessageTime(conversation.lastMessageSentAt)}
                    </span>
                  </div>

                  {conversation.lastMessageContent && (
                    <>
                      {/* Mobile: Truncated message preview */}
                      <p className="text-xs sm:hidden text-[#888] font-gilroy">
                        {conversation.lastMessageSenderId ? (
                          conversation.lastMessageSenderId === conversation.otherUserId
                            ? truncateMessageMobile(conversation.lastMessageContent, 30)
                            : `You: ${truncateMessageMobile(conversation.lastMessageContent, 25)}`
                        ) : (
                          'Start a conversation...'
                        )}
                      </p>
                      {/* Desktop: Full message with CSS truncate */}
                      <p className="hidden sm:block text-sm text-[#888] truncate font-gilroy">
                        {conversation.lastMessageSenderId ? (
                          conversation.lastMessageSenderId === conversation.otherUserId
                            ? conversation.lastMessageContent
                            : `You: ${conversation.lastMessageContent}`
                        ) : (
                          'Start a conversation...'
                        )}
                      </p>
                    </>
                  )}
                </div>

                {/* Unread Indicator */}
                {conversation.unreadCount > 0 && (
                  <div className="flex items-center flex-shrink-0 ml-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#CBAA5A] rounded-full"></div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chat Modal */}
      {showChat && selectedConversation && (
        <ChatModal
          isOpen={showChat}
          onClose={() => {
            setShowChat(false);
            setSelectedConversation(null);
          }}
          conversationId={selectedConversation.id}
          otherUserId={selectedConversation.userId}
          otherUserName={selectedConversation.name}
          otherUserAvatar={selectedConversation.avatar}
        />
      )}
      
      {/* Debug: Show selectedConversation state */}
      {process.env.NODE_ENV === 'development' && selectedConversation && (
        <div className="fixed bottom-4 right-4 bg-red-100 p-2 rounded text-xs">
          <strong>Debug selectedConversation:</strong><br/>
          userId: {selectedConversation.userId}<br/>
          name: {selectedConversation.name}<br/>
          avatar: {selectedConversation.avatar}
        </div>
      )}
    </div>
  );
};

export default MessagesTab;