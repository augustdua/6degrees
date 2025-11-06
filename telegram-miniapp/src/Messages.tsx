import { useEffect, useState } from 'react';
import ChatView from './ChatView';

interface Conversation {
  conversationId: string;
  otherUserId: string;
  otherUserName: string;
  otherUserAvatar?: string;
  lastMessageContent?: string;
  lastMessageSentAt?: string;
  unreadCount: number;
}

interface MessagesProps {
  authToken: string;
  apiUrl: string;
}

// Avatar color mapping (same as main app)
const AVATAR_COLORS = [
  'from-blue-500 to-purple-600',
  'from-green-500 to-teal-600',
  'from-pink-500 to-rose-600',
  'from-orange-500 to-red-600',
  'from-cyan-500 to-blue-600',
  'from-indigo-500 to-purple-600',
];

const getAvatarColor = (userId: string): string => {
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const logToBackend = (msg: string) => {
  console.log(msg);
  fetch(`${import.meta.env.VITE_API_URL || 'https://6degreesbackend-production.up.railway.app'}/api/telegram/webapp/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `[MINIAPP] ${msg}` })
  }).catch(() => {});
};

export default function Messages({ authToken, apiUrl }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      logToBackend('📡 Fetching conversations via backend API...');
      
      const response = await fetch(`${apiUrl}/api/messages/conversations`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        logToBackend(`❌ API Error: ${errorData.error}`);
        throw new Error(errorData.error || 'Failed to load');
      }

      const data = await response.json();
      logToBackend(`✅ Got ${data.length} conversations`);
      
      const formattedConversations: Conversation[] = data.map((conv: any) => ({
        conversationId: conv.conversation_id,
        otherUserId: conv.other_user_id,
        otherUserName: conv.other_user_name || 'Unknown User',
        otherUserAvatar: conv.other_user_avatar,
        lastMessageContent: conv.last_message_content,
        lastMessageSentAt: conv.last_message_sent_at,
        unreadCount: conv.unread_count || 0,
      }));

      setConversations(formattedConversations);
    } catch (error: any) {
      logToBackend(`❌ Failed to load conversations: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (conv: Conversation) => {
    setSelectedConversation(conv);
  };

  const closeChat = () => {
    setSelectedConversation(null);
    fetchConversations(); // Refresh conversations when closing chat
  };

  // If a conversation is selected, show the chat view
  if (selectedConversation) {
    return (
      <ChatView
        conversation={selectedConversation}
        authToken={authToken}
        apiUrl={apiUrl}
        onBack={closeChat}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a]">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
          <p className="text-white mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a] text-white p-6">
        <div className="text-center">
          <div className="text-4xl mb-4">💬</div>
          <h2 className="text-lg font-semibold mb-2">No Messages Yet</h2>
          <p className="text-sm text-gray-400">
            Start chatting with your connections on 6Degree
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-[#1a1a1a] text-white flex flex-col overflow-hidden">
      <div className="flex-shrink-0 p-4 border-b border-[#2a2a2a]">
        <h1 className="text-xl font-bold">Messages</h1>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.conversationId}
              onClick={() => openChat(conv)}
              className="bg-[#2a2a2a] rounded-xl p-3.5 active:bg-[#3a3a3a] cursor-pointer transition-all hover:shadow-lg border border-transparent hover:border-[#3a3a3a]"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="flex-shrink-0 relative">
                  {conv.otherUserAvatar ? (
                    <img
                      src={conv.otherUserAvatar}
                      alt={conv.otherUserName}
                      className="w-14 h-14 rounded-full object-cover ring-2 ring-[#3a3a3a]"
                    />
                  ) : (
                    <div className={`w-14 h-14 rounded-full bg-gradient-to-br ${getAvatarColor(conv.otherUserId)} flex items-center justify-center text-white font-bold text-base shadow-lg`}>
                      {getInitials(conv.otherUserName)}
                    </div>
                  )}
                  {conv.unreadCount > 0 && (
                    <div className="absolute -top-1 -right-1 bg-[#37c99e] text-[#0a1520] text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5 shadow-lg ring-2 ring-[#1a1a1a]">
                      {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                    </div>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-semibold text-base truncate">{conv.otherUserName}</h3>
                    {conv.lastMessageSentAt && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2 font-medium">
                        {formatTime(conv.lastMessageSentAt)}
                      </span>
                    )}
                  </div>
                  
                  <p className={`text-sm truncate ${conv.unreadCount > 0 ? 'text-white font-medium' : 'text-gray-400'}`}>
                    {conv.lastMessageContent || 'Start a conversation...'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

  if (diffInMinutes < 1) return 'Just now';
  if (diffInMinutes < 60) return `${diffInMinutes}m`;
  if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
  if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
  return date.toLocaleDateString();
}

