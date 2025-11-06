import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MessagesTab from '@/components/MessagesTab';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('c') || undefined;
  const telegramToken = searchParams.get('telegram_token');
  const [isAuthenticating, setIsAuthenticating] = useState(!!telegramToken);

  // Handle Telegram Mini App authentication
  useEffect(() => {
    if (!telegramToken) return;

    async function authenticateWithTelegram() {
      try {
        // Exchange Telegram token for Supabase session
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://6degreesbackend-production.up.railway.app'}/api/telegram/webapp/exchange-session`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ telegramToken }),
        });
        
        if (!response.ok) {
          throw new Error('Token exchange failed');
        }

        const data = await response.json();
        
        // Use the magic link token to create a Supabase session
        const { data: sessionData, error: sessionError } = await supabase.auth.verifyOtp({
          email: data.email,
          token: data.magicLinkToken,
          type: 'magiclink'
        });

        if (sessionError) {
          console.error('Session creation error:', sessionError);
          throw new Error('Failed to create session');
        }

        console.log('✅ Telegram auth successful, session created');
        setIsAuthenticating(false);
      } catch (error) {
        console.error('Telegram auth error:', error);
        setIsAuthenticating(false);
        navigate('/auth');
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
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-sm text-gray-400">
            {isAuthenticating ? 'Authenticating from Telegram...' : 'Loading...'}
          </p>
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

