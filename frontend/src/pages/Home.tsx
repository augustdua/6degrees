import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, API_ENDPOINTS } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TopHeader } from '@/components/TopHeader';
import { ForumTabContent } from '@/components/forum';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Footer } from '@/components/Footer';
import { DailyStandupModal } from '@/components/DailyStandupModal';
import { PersonalityQuestionModal } from '@/components/PersonalityQuestionModal';

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // ============================================================================
  // Daily Standup Unlock (members must complete daily standup to unlock feed)
  // ============================================================================
  const shouldGateStandup = !!user && (user as any).membershipStatus === 'member';
  const [standupStatusLoading, setStandupStatusLoading] = useState(false);
  const [standupCompletedToday, setStandupCompletedToday] = useState(true);
  const standupTimezone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
  }, []);

  const refreshStandupStatus = useCallback(async () => {
    if (!shouldGateStandup) return;

    setStandupStatusLoading(true);
    try {
      const data = await apiGet(
        `${API_ENDPOINTS.DAILY_STANDUP_STATUS}?timezone=${encodeURIComponent(standupTimezone)}`,
        { skipCache: true }
      );
      const completed = Boolean(data?.completedToday || data?.skippedToday);
      setStandupCompletedToday(completed);
    } catch (err) {
      console.error('Failed to load daily standup status:', err);
      setStandupCompletedToday(true);
    } finally {
      setStandupStatusLoading(false);
    }
  }, [shouldGateStandup, standupTimezone]);

  useEffect(() => {
    if (!shouldGateStandup) {
      setStandupCompletedToday(true);
      return;
    }
    refreshStandupStatus();
  }, [shouldGateStandup, user?.id, refreshStandupStatus]);

  const handleStandupComplete = useCallback(() => {
    setStandupCompletedToday(true);
  }, []);

  // ============================================================================
  // Personality Question Popup (random trigger on feed)
  // ============================================================================
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const personalityTriggered = useRef(false);

  // Trigger personality question after random delay (30-60 seconds)
  useEffect(() => {
    if (!user || !standupCompletedToday || personalityTriggered.current) return;

    // Random delay between 30-60 seconds
    const delay = 30000 + Math.random() * 30000;
    
    const timer = setTimeout(() => {
      // Only show if user is still on the page and hasn't been triggered before
      if (!personalityTriggered.current) {
        personalityTriggered.current = true;
        setShowPersonalityModal(true);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [user, standupCompletedToday]);

  // Auth loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CBAA5A] mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Reddit-style Top Header */}
      <TopHeader />

      {/* Main Content */}
      <main className="w-full max-w-7xl mx-auto px-4 py-4 pb-20 md:pb-8">
        <ForumTabContent />
      </main>

      {/* Footer */}
      <Footer className="mt-8 mb-20 md:mb-0" />

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* Daily Standup Modal (members only) */}
      <DailyStandupModal
        isOpen={shouldGateStandup && !standupStatusLoading && !standupCompletedToday}
        onComplete={handleStandupComplete}
        userId={user?.id}
      />

      {/* Personality Question Modal (random trigger on feed) */}
      <PersonalityQuestionModal
        isOpen={showPersonalityModal}
        onClose={() => setShowPersonalityModal(false)}
        onComplete={() => setShowPersonalityModal(false)}
      />
    </div>
  );
};

export default Home;
