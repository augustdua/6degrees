import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import MessagesTab from '@/components/MessagesTab';
import { useAuth } from '@/hooks/useAuth';
import { TopHeader } from '@/components/TopHeader';
import { BottomNavigation } from '@/components/BottomNavigation';

export default function Messages() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const conversationId = searchParams.get('c') || undefined;

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#1a1a1a] p-4">
        <div className="text-center space-y-4 w-full max-w-2xl">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-white border-r-transparent"></div>
          <p className="text-base text-white font-medium">Loading Messages...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      <TopHeader />

      {/* Middle scroll region with margins (fixes edge-to-edge messages) */}
      <main className="flex-1 overflow-y-auto">
        <div className="w-full max-w-5xl mx-auto px-4 py-4 pb-24 md:pb-8">
          <MessagesTab initialConversationId={conversationId} isTelegramMiniApp={false} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
}

