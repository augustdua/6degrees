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
    console.log('🚀 Mini App starting...');
    console.log('WebApp object:', WebApp);
    console.log('initDataUnsafe:', WebApp.initDataUnsafe);
    
    // Get conversation ID from URL if present
    const urlParams = new URLSearchParams(window.location.search);
    const cId = urlParams.get('c');
    if (cId) {
      console.log('📌 Conversation ID:', cId);
      setConversationId(cId);
    }

    // Check if in Telegram
    if (!WebApp.initDataUnsafe.user) {
      console.error('❌ Not opened from Telegram');
      setError('This app can only be opened from Telegram');
      setIsLoading(false);
      return;
    }
    
    console.log('✅ Telegram user detected:', WebApp.initDataUnsafe.user);

    // Initialize Telegram WebApp
    WebApp.ready();
    WebApp.expand();
    WebApp.setHeaderColor('#1a1a1a');
    WebApp.setBackgroundColor('#1a1a1a');

    // Authenticate
    async function authenticate() {
      try {
        console.log('🔐 Starting authentication...');
        console.log('API_URL:', API_URL);
        console.log('initData:', WebApp.initData);
        
        const response = await fetch(`${API_URL}/api/telegram/webapp/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData: WebApp.initData }),
        });

        console.log('📡 Response status:', response.status);
        const data = await response.json();
        console.log('📦 Response data:', data);

        if (!response.ok) {
          throw new Error(data.message || data.error || 'Authentication failed');
        }

        // Store auth token
        console.log('✅ Authentication successful!');
        setAuthToken(data.authToken);
        localStorage.setItem('telegram_auth_token', data.authToken);
        localStorage.setItem('telegram_user', JSON.stringify(data.user));
        
        setIsAuthenticated(true);
        setIsLoading(false);

      } catch (err: any) {
        console.error('❌ Auth error:', err);
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
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
          <p className="text-base text-white font-medium">Loading...</p>
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
  // Pass auth token to iframe via URL parameter
  const iframeUrl = new URL('https://6degree.app/messages');
  if (authToken) {
    iframeUrl.searchParams.set('telegram_token', authToken);
  }
  if (conversationId) {
    iframeUrl.searchParams.set('c', conversationId);
  }

  return (
    <div className="h-screen overflow-hidden bg-[#1a1a1a]">
      <iframe
        src={iframeUrl.toString()}
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

