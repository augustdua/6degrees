import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  X,
  Minimize2,
  Send,
  Sparkles,
  Loader2,
  User,
  Bot,
  ArrowRight,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAIChat } from '@/hooks/useAIChat';
import { useAuth } from '@/hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';

interface AIChatOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  functionCall?: {
    name: string;
    arguments: any;
  };
}

export const AIChatOverlay: React.FC<AIChatOverlayProps> = ({
  isOpen,
  onClose,
  onMinimize,
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    messages,
    sendMessage,
    suggestions,
    isLoading,
    error,
    clearError,
  } = useAIChat();

  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Get current page name for context
  const getCurrentPage = (): string => {
    const path = location.pathname;
    if (path === '/dashboard') return 'dashboard';
    if (path === '/connections') return 'connections';
    if (path === '/offers') return 'offers';
    if (path === '/profile') return 'profile';
    if (path === '/wallet') return 'wallet';
    if (path.includes('/messages')) return 'messages';
    return 'unknown';
  };

  // Handle sending a message
  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsTyping(true);

    try {
      await sendMessage(userMessage, getCurrentPage());
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setIsTyping(false);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Handle suggestion click
  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  // Handle function calls (navigation, actions, etc.)
  const handleFunctionCall = (functionCall: { name: string; arguments: any }) => {
    switch (functionCall.name) {
      case 'navigate_to_page':
        const page = functionCall.arguments.page;
        const tab = functionCall.arguments.tab;
        
        // Map page names to actual routes
        // Most features are tabs within /dashboard, not standalone pages
        const dashboardTabs = ['messages', 'offers', 'wallet', 'network', 'mychains', 'intros', 'people'];
        
        if (dashboardTabs.includes(page)) {
          // These are dashboard tabs
          navigate(`/dashboard?tab=${page}`);
        } else if (tab) {
          // Explicit page with tab parameter
          navigate(`/${page}?tab=${tab}`);
        } else {
          // Standalone pages like 'dashboard', 'profile', etc.
          navigate(`/${page}`);
        }
        break;

      case 'search_users':
      case 'search_offers':
        // These are handled by the backend, results are shown in message
        break;

      default:
        console.log('Unknown function call:', functionCall);
    }
  };

  // Render a message
  const renderMessage = (message: Message) => {
    const isUser = message.role === 'user';

    return (
      <motion.div
        key={message.id}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={`flex gap-3 mb-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {/* Avatar */}
        <Avatar className="h-8 w-8 flex-shrink-0">
          {isUser ? (
            <>
              <AvatarFallback className="bg-primary text-white">
                <User className="h-4 w-4" />
              </AvatarFallback>
            </>
          ) : (
            <>
              <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white">
                <Bot className="h-4 w-4" />
              </AvatarFallback>
            </>
          )}
        </Avatar>

        {/* Message Content */}
        <div className={`flex flex-col gap-1 max-w-[75%]`}>
          <div
            className={`rounded-2xl px-4 py-2 ${
              isUser
                ? 'bg-primary text-white'
                : 'bg-muted text-foreground border border-border'
            }`}
          >
            {isUser ? (
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            ) : (
              <div className="text-sm prose prose-invert max-w-none">
                <ReactMarkdown
                  components={{
                    p: ({ node, ...props }) => <p className="mb-2" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-5 my-2" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-5 my-2" {...props} />,
                    li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                    strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                    em: ({ node, ...props }) => <em className="italic" {...props} />,
                    h1: ({ node, ...props }) => <h1 className="text-base font-semibold mb-2" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-sm font-semibold mb-2" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-sm font-semibold mb-1" {...props} />,
                    code: ({ node, inline, ...props }) => (
                      <code className={`rounded px-1 ${inline ? 'bg-black/10' : ''}`} {...props} />
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Function Call Action Button */}
          {!isUser && message.functionCall && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFunctionCall(message.functionCall!)}
              className="w-fit text-xs gap-2"
            >
              <ArrowRight className="h-3 w-3" />
              {message.functionCall.name === 'navigate_to_page' && (() => {
                const page = message.functionCall.arguments.page;
                const pageLabels: Record<string, string> = {
                  'dashboard': 'Go to Dashboard',
                  'profile': 'Go to Profile',
                  'messages': 'Go to Messages',
                  'offers': 'Go to My Offers',
                  'wallet': 'Go to Wallet',
                  'network': 'Go to My Network',
                  'mychains': 'Go to My Chains',
                  'intros': 'Go to Intros',
                  'people': 'Go to Discover People',
                };
                return pageLabels[page] || `Go to ${page}`;
              })()}
              {message.functionCall.name === 'search_users' && 'View Results'}
              {message.functionCall.name === 'search_offers' && 'View Results'}
            </Button>
          )}

          {/* Timestamp */}
          <span className={`text-xs text-muted-foreground ${isUser ? 'text-right' : 'text-left'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
      </motion.div>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-6 right-6 z-50 w-[450px] max-w-[calc(100vw-3rem)]"
        >
          <Card className="flex flex-col h-[600px] max-h-[calc(100vh-6rem)] shadow-2xl border-2">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary to-accent rounded-t-lg">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">AI Assistant</h3>
                  <p className="text-xs text-white/80">Always here to help</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onMinimize}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <Minimize2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="h-8 w-8 text-white hover:bg-white/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Welcome Message & Suggestions (when no messages) */}
            {messages.length === 0 && (
              <div className="p-4 border-b bg-muted/50">
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium mb-1">
                      Hi {user?.firstName || 'there'}! 👋
                    </p>
                    <p className="text-sm text-muted-foreground">
                      I'm your AI assistant. I can help you navigate the platform, answer
                      questions, and accomplish tasks. What can I help you with?
                    </p>
                  </div>
                </div>

                {/* Quick Suggestions */}
                {suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleSuggestionClick(suggestion)}
                        className="text-xs h-auto py-2"
                      >
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
              {messages.map(renderMessage)}

              {/* Typing Indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3 mb-4"
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className="bg-gradient-to-r from-primary to-accent text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3 border border-border">
                    <div className="flex gap-1">
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                        className="h-2 w-2 bg-foreground/40 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                        className="h-2 w-2 bg-foreground/40 rounded-full"
                      />
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                        className="h-2 w-2 bg-foreground/40 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 mb-4"
                >
                  <p className="text-sm text-destructive">{error}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearError}
                    className="mt-2 h-auto py-1 text-xs"
                  >
                    Dismiss
                  </Button>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything..."
                  disabled={isLoading}
                  className="flex-1"
                />
                <Button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  size="icon"
                  className="flex-shrink-0"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground mt-2 text-center">
                AI assistant powered by GPT-4
              </p>
            </div>
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AIChatOverlay;
