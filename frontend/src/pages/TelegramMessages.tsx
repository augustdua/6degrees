import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';
import MessagesTab from '../components/MessagesTab';
import { Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'https://api.6degree.app';

export default function TelegramMessages() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { isTelegram, initData, isReady, webApp } = useTelegramWebApp();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Get conversation ID from URL if present
  const conversationId = searchParams.get('c') || undefined;

  useEffect(() => {
    if (!isTelegram) {
      // Not in Telegram - redirect to regular messages
      navigate('/messages');
      return;
    }

    if (!isReady) return;

    // Authenticate with backend
    async function authenticate() {
      try {
        const response = await fetch(`${API_URL}/api/telegram/webapp/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Authentication failed');
        }

        // Store auth token
        setAuthToken(data.authToken);
        localStorage.setItem('telegram_auth_token', data.authToken);
        localStorage.setItem('telegram_user', JSON.stringify(data.user));
        
        setIsAuthenticated(true);
        setIsLoading(false);

        // Configure Telegram WebApp
        webApp.expand();
        webApp.BackButton.onClick(() => {
          webApp.close();
        });

      } catch (err: any) {
        console.error('Auth error:', err);
        setError(err.message || 'Failed to authenticate');
        setIsLoading(false);

        // Show error in Telegram
        webApp.showAlert(
          'Account not linked. Please link your Telegram in the Zaurq app first.'
        );
      }
    }

    authenticate();
  }, [isTelegram, isReady, initData, navigate, webApp]);

  if (!isTelegram) {
    return null; // Will redirect
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading your messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">❌</div>
          <h2 className="text-xl font-semibold">Authentication Failed</h2>
          <p className="text-muted-foreground">{error}</p>
          <p className="text-sm text-muted-foreground mt-4">
            Please link your Telegram account in the Zaurq app first:
            <br />
            Dashboard → Link Telegram
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Render the same messages interface
  return (
    <div className="h-screen overflow-hidden bg-background">
      <MessagesTab 
        initialConversationId={conversationId}
        isTelegramMiniApp={true}
      />
    </div>
  );
}

