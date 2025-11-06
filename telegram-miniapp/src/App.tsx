import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';

const API_URL = import.meta.env.VITE_API_URL || 'https://6degreesbackend-production.up.railway.app';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | undefined>();

  useEffect(() => {
    // Get conversation ID from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const cId = urlParams.get('c');
    if (cId) setConversationId(cId);

    // Check if in Telegram
    if (!WebApp.initDataUnsafe.user) {
      setError('This app can only be opened from Telegram');
      setIsLoading(false);
      return;
    }

    // Initialize Telegram WebApp
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor('#1a1a1a');
    WebApp.setBackgroundColor('#1a1a1a');

    // Authenticate
    async function authenticate() {
      try {
        const response = await fetch(`${API_URL}/api/telegram/webapp/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData: WebApp.initData }),
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

      } catch (err: any) {
        console.error('Auth error:', err);
        setError(err.message || 'Failed to authenticate');
        setIsLoading(false);

        WebApp.showAlert(
          'Account not linked. Please link your Telegram in the 6Degree app first.'
        );
      }
    }

    authenticate();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a] text-white">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-sm text-gray-400">Loading messages...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a] text-white p-6">
        <div className="text-center space-y-4 max-w-md">
          <div className="text-4xl">❌</div>
          <h2 className="text-xl font-semibold">Authentication Failed</h2>
          <p className="text-gray-400">{error}</p>
          <p className="text-sm text-gray-500 mt-4">
            Please link your Telegram account in the 6Degree app first:
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

  // Embed clean messages UI from main frontend
  return (
    <div className="h-screen overflow-hidden bg-[#1a1a1a]">
      <iframe
        src={`https://6degree.app/messages${conversationId ? `?c=${conversationId}` : ''}`}
        style={{
          width: '100%',
          height: '100vh',
          border: 'none',
          display: 'block'
        }}
        title="6Degree Messages"
      />
    </div>
  );
}

