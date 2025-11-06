import { useEffect, useState } from 'react';
import WebApp from '@twa-dev/sdk';
import Messages from './Messages';

const API_URL = import.meta.env.VITE_API_URL || 'https://6degreesbackend-production.up.railway.app';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    console.log('🚀 Mini App starting...');
    console.log('WebApp object:', WebApp);
    console.log('initDataUnsafe:', WebApp.initDataUnsafe);

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
        
        // Get auth token from backend
        const authResponse = await fetch(`${API_URL}/api/telegram/webapp/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ initData: WebApp.initData }),
        });

        console.log('📡 Auth response status:', authResponse.status);
        const authData = await authResponse.json();

        if (!authResponse.ok) {
          throw new Error(authData.message || authData.error || 'Authentication failed');
        }

        console.log('✅ Got auth token!');
        setAuthToken(authData.authToken);
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

  if (!isAuthenticated || !authToken) {
    return null;
  }

  return <Messages authToken={authToken} apiUrl={API_URL} />;
}

