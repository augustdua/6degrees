import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MessagesTab from '@/components/MessagesTab';
import { useAuth } from '@/hooks/useAuth';

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('c') || undefined;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-4">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="text-sm text-gray-400">Loading...</p>
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

