import { useEffect, useState, useRef } from 'react';

interface Message {
  id: string;
  content: string;
  senderId: string;
  senderName: string;
  sentAt: string;
  isOwnMessage: boolean;
}

interface ChatViewProps {
  conversation: {
    conversationId: string;
    otherUserId: string;
    otherUserName: string;
    otherUserAvatar?: string;
  };
  authToken: string;
  apiUrl: string;
  onBack: () => void;
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

export default function ChatView({ conversation, authToken, apiUrl, onBack }: ChatViewProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [messageText, setMessageText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    // Set up polling for new messages
    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [conversation.otherUserId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/messages/direct/${conversation.otherUserId}`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      if (!response.ok) throw new Error('Failed to load messages');

      const data = await response.json();
      const formattedMessages: Message[] = data.map((msg: any) => ({
        id: msg.message_id,
        content: msg.content,
        senderId: msg.sender_id,
        senderName: msg.sender_name,
        sentAt: msg.sent_at,
        isOwnMessage: msg.is_own_message
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || sending) return;

    setSending(true);
    try {
      const response = await fetch(`${apiUrl}/api/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiverId: conversation.otherUserId,
          content: messageText.trim()
        })
      });

      if (!response.ok) throw new Error('Failed to send message');

      setMessageText('');
      await fetchMessages();
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-screen bg-[#1a1a1a] text-white">
      {/* Header */}
      <div className="bg-[#2a2a2a] px-3 py-2.5 flex items-center gap-3 border-b border-[#3a3a3a]">
        <button
          onClick={onBack}
          className="p-2 -ml-2 active:bg-[#3a3a3a] rounded-full transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-shrink-0">
          {conversation.otherUserAvatar ? (
            <img
              src={conversation.otherUserAvatar}
              alt={conversation.otherUserName}
              className="w-10 h-10 rounded-full object-cover ring-2 ring-[#3a3a3a]"
            />
          ) : (
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(conversation.otherUserId)} flex items-center justify-center text-white font-semibold text-sm ring-2 ring-[#3a3a3a]`}>
              {getInitials(conversation.otherUserName)}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-base truncate">{conversation.otherUserName}</h2>
          <p className="text-xs text-gray-400">Tap to view profile</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-sm">
            No messages yet. Send the first message!
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.isOwnMessage ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 shadow-md ${
                  message.isOwnMessage
                    ? 'bg-[#37c99e] text-[#0a1520] rounded-br-md'
                    : 'bg-[#2a2a2a] text-white rounded-bl-md'
                }`}
              >
                <p className="text-sm break-words leading-relaxed">{message.content}</p>
                <p className={`text-xs mt-1.5 ${message.isOwnMessage ? 'text-[#0a1520] opacity-70' : 'text-gray-400'}`}>
                  {formatTime(message.sentAt)}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-[#2a2a2a] px-4 py-3 flex items-center gap-2 border-t border-[#3a3a3a]">
        <input
          type="text"
          value={messageText}
          onChange={(e) => setMessageText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          className="flex-1 bg-[#1a1a1a] text-white placeholder-gray-500 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#37c99e]"
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!messageText.trim() || sending}
          className="bg-[#37c99e] text-[#0a1520] rounded-full w-11 h-11 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed transition-transform active:scale-95 shadow-lg"
        >
          {sending ? (
            <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-[#0a1520] border-r-transparent"></div>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}

