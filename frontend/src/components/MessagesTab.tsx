import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { useMessages } from '@/hooks/useMessages';
import ChatModal from './ChatModal';
import {
  Search,
  MessageSquare,
  Clock,
  Users,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

const MessagesTab = () => {
  const {
    conversations,
    loading,
    error,
    fetchConversations,
    getTotalUnreadCount
  } = useMessages();

  const [searchQuery, setSearchQuery] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    userId: string;
    name: string;
    avatar?: string;
  } | null>(null);

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

  const handleConversationClick = (conversation: any) => {
    console.log('🔍 Conversation clicked:', conversation);
    console.log('🔍 Setting selectedConversation with userId:', conversation.otherUserId);
    
    setSelectedConversation({
      id: conversation.conversationId,
      userId: conversation.otherUserId,
      name: conversation.otherUserName,
      avatar: conversation.otherUserAvatar
    });
    setShowChat(true);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messages
            {getTotalUnreadCount() > 0 && (
              <Badge variant="destructive" className="text-xs">
                {getTotalUnreadCount()}
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Chat with your connections
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchConversations} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Search */}
      {conversations.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {/* Empty State */}
      {conversations.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h4 className="font-semibold mb-2">No Conversations Yet</h4>
            <p className="text-sm text-muted-foreground mb-4">
              Start chatting with your connections to see conversations here.
            </p>
            <p className="text-xs text-muted-foreground">
              Go to the Network tab to message your connections or discover new people!
            </p>
          </CardContent>
        </Card>
      )}

      {/* No Search Results */}
      {filteredConversations.length === 0 && searchQuery && conversations.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Search className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              No conversations found matching "{searchQuery}"
            </p>
          </CardContent>
        </Card>
      )}

      {/* Conversations List */}
      <div className="space-y-3">
        {filteredConversations.map((conversation) => (
          <Card
            key={conversation.conversationId}
            className="transition-all hover:shadow-md cursor-pointer"
            onClick={() => handleConversationClick(conversation)}
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-4">
                {/* Avatar */}
                <div className="relative">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={conversation.otherUserAvatar} />
                    <AvatarFallback>
                      {conversation.otherUserName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {conversation.unreadCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                    >
                      {conversation.unreadCount}
                    </Badge>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-base truncate">
                      {conversation.otherUserName}
                    </h4>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatLastMessageTime(conversation.lastMessageSentAt)}
                    </span>
                  </div>

                  {conversation.lastMessageContent && (
                    <p className="text-sm text-muted-foreground truncate">
                      {conversation.lastMessageSenderId ? (
                        conversation.lastMessageSenderId === conversation.otherUserId
                          ? conversation.lastMessageContent
                          : `You: ${conversation.lastMessageContent}`
                      ) : (
                        'Start a conversation...'
                      )}
                    </p>
                  )}
                </div>

                {/* Unread Indicator */}
                {conversation.unreadCount > 0 && (
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-primary rounded-full"></div>
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
          otherUserId={selectedConversation.userId}
          otherUserName={selectedConversation.name}
          otherUserAvatar={selectedConversation.avatar}
        />
      )}
    </div>
  );
};

export default MessagesTab;