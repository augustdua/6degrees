import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, API_ENDPOINTS } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TopHeader } from '@/components/TopHeader';
import { ForumTabContent } from '@/components/forum';
import { BottomNavigation } from '@/components/BottomNavigation';
import { DailyStandupModal } from '@/components/DailyStandupModal';
import { PersonalityQuestionModal } from '@/components/PersonalityQuestionModal';

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // ============================================================================
  // Daily Standup Unlock (members must complete daily standup to unlock feed)
  // ============================================================================
  const shouldGateStandup = !!user && (user as any).role === 'ZAURQ_PARTNER';
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
  // Personality Question Popup (return after long break -> show after 30s)
  // ============================================================================
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [prefetchedPersonality, setPrefetchedPersonality] = useState<{ question: any; totalAnswered?: number } | null>(null);
  const personalityTimerRef = useRef<number | null>(null);

  const PERSONA_LAST_SEEN_KEY = '6d_last_seen_at';
  const PERSONA_PENDING_UNTIL_KEY = '6d_persona_prompt_pending_until';
  const PERSONA_DEFERRED_KEY = '6d_persona_prompt_deferred';
  const LONG_BREAK_MS = 5 * 60 * 60 * 1000; // 5 hours
  const PROMPT_DELAY_MS = 30 * 1000; // 30 seconds

  useEffect(() => {
    if (!user || !standupCompletedToday) return;

    const clearTimer = () => {
      if (personalityTimerRef.current) {
        window.clearTimeout(personalityTimerRef.current);
        personalityTimerRef.current = null;
      }
    };

    const scheduleIfEligible = (reason: 'mount' | 'return') => {
      try {
        const now = Date.now();

        // Deduplicate across Home/Feed renders (only one pending timer globally)
        const pendingUntil = Number(window.localStorage.getItem(PERSONA_PENDING_UNTIL_KEY) || '0');
        if (pendingUntil && pendingUntil > now) return;

        const lastSeen = Number(window.localStorage.getItem(PERSONA_LAST_SEEN_KEY) || '0');
        const isLongBreak = !lastSeen || now - lastSeen >= LONG_BREAK_MS;
        if (!isLongBreak) return;

        const newPendingUntil = now + PROMPT_DELAY_MS;
        window.localStorage.setItem(PERSONA_PENDING_UNTIL_KEY, String(newPendingUntil));

        clearTimer();
        personalityTimerRef.current = window.setTimeout(async () => {
          window.localStorage.removeItem(PERSONA_PENDING_UNTIL_KEY);
          // If the app is not actually visible (some webviews don't fire visibilitychange reliably),
          // defer the prompt until the next time we return to foreground.
          if (document.visibilityState !== 'visible') {
            try { window.localStorage.setItem(PERSONA_DEFERRED_KEY, '1'); } catch {}
            return;
          }
          try {
            const data = await apiGet(API_ENDPOINTS.PERSONALITY_NEXT_QUESTION, { skipCache: true });
            if (data?.question) {
              setPrefetchedPersonality({ question: data.question, totalAnswered: data.totalAnswered });
              setShowPersonalityModal(true);
            }
          } catch (e) {
            console.warn('Personality prefetch failed:', e);
          }
        }, PROMPT_DELAY_MS);
      } catch {
        // ignore
      }
    };

    scheduleIfEligible('mount');

    const onVisibilityChange = () => {
      try {
        if (document.visibilityState === 'hidden') {
          window.localStorage.setItem(PERSONA_LAST_SEEN_KEY, String(Date.now()));
          clearTimer();
          window.localStorage.removeItem(PERSONA_PENDING_UNTIL_KEY);
          return;
        }
        if (document.visibilityState === 'visible') {
          // If a prompt was deferred (timer fired while backgrounded), retry quickly now.
          const wasDeferred = window.localStorage.getItem(PERSONA_DEFERRED_KEY) === '1';
          if (wasDeferred) {
            window.localStorage.removeItem(PERSONA_DEFERRED_KEY);
            // small delay so UI is stable
            const now = Date.now();
            const pendingUntil = Number(window.localStorage.getItem(PERSONA_PENDING_UNTIL_KEY) || '0');
            if (!pendingUntil || pendingUntil <= now) {
              window.localStorage.setItem(PERSONA_PENDING_UNTIL_KEY, String(now + 1500));
              clearTimer();
              personalityTimerRef.current = window.setTimeout(async () => {
                window.localStorage.removeItem(PERSONA_PENDING_UNTIL_KEY);
                try {
                  const data = await apiGet(API_ENDPOINTS.PERSONALITY_NEXT_QUESTION, { skipCache: true });
                  if (data?.question) {
                    setPrefetchedPersonality({ question: data.question, totalAnswered: data.totalAnswered });
                    setShowPersonalityModal(true);
                  }
                } catch (e) {
                  console.warn('Personality prefetch failed:', e);
                }
              }, 1500);
            }
            window.localStorage.setItem(PERSONA_LAST_SEEN_KEY, String(Date.now()));
            return;
          }
          scheduleIfEligible('return');
          window.localStorage.setItem(PERSONA_LAST_SEEN_KEY, String(Date.now()));
        }
      } catch {
        // ignore
      }
    };

    try { window.localStorage.setItem(PERSONA_LAST_SEEN_KEY, String(Date.now())); } catch {}
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      clearTimer();
    };
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
    <div className="h-screen bg-background overflow-hidden flex flex-col">
      {/* Top Header */}
      <TopHeader />

      {/* Middle scroll region (reddit-style) */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full w-full max-w-7xl mx-auto px-4 py-4 pb-20 md:pb-8 overflow-hidden">
          <ForumTabContent />
        </div>
      </main>

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
        prefetched={prefetchedPersonality}
        onClose={() => {
          setShowPersonalityModal(false);
          setPrefetchedPersonality(null);
        }}
        onComplete={() => {
          setShowPersonalityModal(false);
          setPrefetchedPersonality(null);
        }}
      />
    </div>
  );
};

export default Home;
