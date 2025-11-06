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

    // Immediately remove telegram_token from URL to prevent infinite loop
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete('telegram_token');
    window.history.replaceState({}, '', `${window.location.pathname}?${newSearchParams}`);

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

        // Verify the OTP hashed token to create a real Supabase session
        addDebug(`🔑 Verifying OTP for: ${data.email}`);
        
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          token_hash: data.hashed_token,
          type: 'magiclink'
        });

        if (sessionError) {
          addDebug(`❌ OTP verification failed: ${sessionError.message}`);
          throw new Error('Failed to verify OTP: ' + sessionError.message);
        }

        if (!sessionData.session) {
          addDebug(`❌ No session returned from OTP verification`);
          throw new Error('No session created');
        }

        addDebug(`✅ Session created! User: ${sessionData.user?.email}`);
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
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a] p-4">
        <div className="text-center space-y-4 w-full max-w-2xl">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
          <p className="text-base text-white font-medium">
            {isAuthenticating ? 'Authenticating...' : 'Loading Messages...'}
          </p>
          {debugInfo.length > 0 && (
            <div className="mt-4 p-4 bg-gray-800 rounded text-left text-xs max-h-64 overflow-y-auto">
              <p className="font-bold mb-2 text-white">Debug:</p>
              {debugInfo.map((msg, i) => (
                <p key={i} className="font-mono text-gray-300">{msg}</p>
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
    <div className="h-screen overflow-auto bg-[#1a1a1a]">
      <MessagesTab initialConversationId={conversationId} isTelegramMiniApp={true} />
    </div>
  );
}

