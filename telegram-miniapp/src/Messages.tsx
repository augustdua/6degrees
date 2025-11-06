import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

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
  hashedToken: string;
  apiUrl: string;
}

const logToBackend = (msg: string) => {
  console.log(msg);
  fetch(`${import.meta.env.VITE_API_URL || 'https://6degreesbackend-production.up.railway.app'}/api/telegram/webapp/log`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `[MINIAPP] ${msg}` })
  }).catch(() => {});
};

export default function Messages({ hashedToken, apiUrl }: MessagesProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // First: Authenticate with Supabase using the hashed token
  useEffect(() => {
    async function authenticate() {
      try {
        logToBackend('🔐 Authenticating with Supabase...');
        logToBackend(`🔑 Hashed token: ${hashedToken.substring(0, 20)}...`);
        
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: hashedToken,
          type: 'magiclink'
        });

        if (error) {
          logToBackend(`❌ Auth error: ${error.message}`);
          setError(`Auth failed: ${error.message}`);
          setLoading(false);
          return;
        }

        logToBackend(`✅ Authenticated with Supabase`);
        logToBackend(`👤 User: ${data.user?.email}`);
        setAuthReady(true);
      } catch (error: any) {
        logToBackend(`❌ Failed to authenticate: ${error.message}`);
        setError(`Auth exception: ${error.message}`);
        setLoading(false);
      }
    }

    authenticate();
  }, [hashedToken]);

  // Second: Fetch conversations once authenticated
  useEffect(() => {
    if (!authReady) return;
    fetchConversations();
  }, [authReady]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      logToBackend('📡 Fetching conversations...');
      
      // Use the same RPC call as the main app
      const { data, error } = await supabase.rpc('get_user_conversations', {
        p_limit: 50,
        p_offset: 0
      });

      if (error) {
        logToBackend(`❌ RPC Error: ${error.message} (code: ${error.code})`);
        setError(`Failed to load: ${error.message}`);
        throw error;
      }

      logToBackend(`✅ Got conversations: ${data?.length || 0} conversations`);
      if (data && data.length > 0) {
        logToBackend(`📋 First conversation: ${JSON.stringify(data[0]).substring(0, 100)}`);
      }

      const formattedConversations: Conversation[] = (data || []).map((conv: any) => ({
        conversationId: conv.conversation_id,
        otherUserId: conv.other_user_id,
        otherUserName: conv.other_user_name || 'Unknown User',
        otherUserAvatar: conv.other_user_avatar,
        lastMessageContent: conv.last_message_content,
        lastMessageSentAt: conv.last_message_sent_at,
        unreadCount: conv.unread_count || 0,
      }));

      logToBackend(`✅ Formatted ${formattedConversations.length} conversations`);
      setConversations(formattedConversations);
    } catch (error: any) {
      logToBackend(`❌ Failed to load conversations: ${error.message}`);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const openChat = (conv: Conversation) => {
    // Open in 6Degree app
    window.open(`https://6degree.app/dashboard?tab=messages&c=${conv.conversationId}`, '_blank');
  };

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
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <div className="p-4">
        <h1 className="text-xl font-bold mb-4">Messages</h1>
        
        <div className="space-y-2">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => openChat(conv)}
              className="bg-[#2a2a2a] rounded-lg p-4 active:bg-[#3a3a3a] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                  {conv.otherUserName.charAt(0).toUpperCase()}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold truncate">{conv.otherUserName}</h3>
                    {conv.lastMessageSentAt && (
                      <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {formatTime(conv.lastMessageSentAt)}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-400 truncate">
                      {conv.lastMessageContent || 'Start a conversation...'}
                    </p>
                    {conv.unreadCount > 0 && (
                      <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5 ml-2 flex-shrink-0">
                        {conv.unreadCount}
                      </span>
                    )}
                  </div>
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

