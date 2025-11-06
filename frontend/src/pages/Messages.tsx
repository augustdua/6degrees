import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MessagesTab from '@/components/MessagesTab';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'https://6degreesbackend-production.up.railway.app';

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('c') || undefined;
  const telegramToken = searchParams.get('telegram_token');
  const [isAuthenticating, setIsAuthenticating] = useState(!!telegramToken);
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  
  const addDebug = (msg: string) => {
    console.log(msg);
    setDebugInfo(prev => [...prev, msg]);
    
    // Send to backend for Railway logs - fire and forget
    fetch(`${API_URL}/api/telegram/webapp/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: msg })
    }).catch(() => {}); // Ignore errors
  };

  // Handle Telegram Mini App authentication
  useEffect(() => {
    if (!telegramToken) return;

    async function authenticateWithTelegram() {
      try {
        addDebug('🔐 Starting authentication...');
        addDebug(`Token: ${telegramToken?.substring(0, 20)}...`);
        
        // Exchange Telegram token for Supabase session
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://6degreesbackend-production.up.railway.app'}/api/telegram/webapp/exchange-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ telegramToken }),
        });
        
        addDebug(`📡 Response: ${response.status}`);
        const data = await response.json();
        addDebug(`📦 Data: ${JSON.stringify(data).substring(0, 100)}`);
        
        if (!response.ok) {
          throw new Error(data.error || 'Token exchange failed');
        }

        // Use the tokens to create a Supabase session
        addDebug(`🔑 Setting session for: ${data.email}`);
        
        // Try setSession first
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token
        });

        if (sessionError) {
          addDebug(`⚠️ setSession error: ${sessionError.message}`);
          addDebug(`🔄 Trying alternative: storing in localStorage...`);
          
          // Alternative: Store directly in localStorage
          const session = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            token_type: 'bearer',
            expires_in: 3600,
            expires_at: Math.floor(Date.now() / 1000) + 3600,
            user: {
              id: '',
              email: data.email,
              aud: 'authenticated'
            }
          };
          
          localStorage.setItem('supabase.auth.token', JSON.stringify(session));
          addDebug(`💾 Stored in localStorage, reloading...`);
          
          // Reload to let Supabase pick up the session
          window.location.reload();
          return;
        }

        addDebug(`✅ Session data: ${JSON.stringify(sessionData).substring(0, 100)}`);
        addDebug('✅ Auth successful!');
        setIsAuthenticating(false);
      } catch (error: any) {
        addDebug(`❌ ERROR: ${error.message}`);
        setIsAuthenticating(false);
        // Don't redirect, keep showing debug info
      }
    }

    authenticateWithTelegram();
  }, [telegramToken, navigate]);

  useEffect(() => {
    if (!loading && !user && !telegramToken) {
      navigate('/auth');
    }
  }, [user, loading, navigate, telegramToken]);

  if (loading || isAuthenticating) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <div className="text-center space-y-4 max-w-2xl w-full">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-sm text-gray-400">
            {isAuthenticating ? 'Authenticating from Telegram...' : 'Loading...'}
          </p>
          {debugInfo.length > 0 && (
            <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded text-left text-xs max-h-64 overflow-y-auto">
              <p className="font-bold mb-2">Debug Info:</p>
              {debugInfo.map((msg, i) => (
                <p key={i} className="font-mono">{msg}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen overflow-hidden">
      <MessagesTab initialConversationId={conversationId} isTelegramMiniApp={false} />
    </div>
  );
}

