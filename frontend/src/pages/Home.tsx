import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, API_ENDPOINTS } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TopHeader } from '@/components/TopHeader';
import { ForumTabContent } from '@/components/forum';
import { BottomNavigation } from '@/components/BottomNavigation';
import { PersonalityQuestionModal } from '@/components/PersonalityQuestionModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Users } from 'lucide-react';

// Temporary kill-switch: disable personality-based questions/prompts everywhere.
// Re-enable by setting to true (or converting to an env flag later).
const ENABLE_PERSONALITY_QUESTIONS = false;

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileCommunities, setMobileCommunities] = useState<any[]>([]);

  // Load communities for the mobile drawer (desktop sidebar is inside ForumTabContent)
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const run = async () => {
      try {
        const data = await apiGet(API_ENDPOINTS.FORUM_COMMUNITIES_ACTIVE, { skipCache: true });
        const list = Array.isArray(data?.communities) ? data.communities : [];
        if (!cancelled) setMobileCommunities(list);
      } catch {
        if (!cancelled) setMobileCommunities([]);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // NOTE: Daily Standup gating removed.

  // ============================================================================
  // Personality Question Popup (return after long break -> show after 30s)
  // ============================================================================
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [prefetchedPersonality, setPrefetchedPersonality] = useState<{ assignmentId?: string | null; prompt: any } | null>(null);
  const personalityTimerRef = useRef<number | null>(null);
  const personalityIntervalRef = useRef<number | null>(null);
  const personalityNextCheckRef = useRef<number | null>(null);

  // Personality prompt scheduler (interval-based, while active)
  const PERSONA_PENDING_UNTIL_KEY = '6d_persona_prompt_pending_until'; // short in-flight lock
  const PERSONA_NEXT_AT_KEY = '6d_persona_prompt_next_at'; // throttle across tabs
  const PERSONA_LAST_ACTIVE_AT_KEY = '6d_persona_last_active_at'; // recent user interaction
  // NOTE: retries for unanswered prompts are now server-driven via prompt_assignments.
  const PROMPT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
  const PROMPT_INITIAL_DELAY_MS = 30 * 1000; // wait a bit after mount so UI is stable
  const ACTIVE_WINDOW_MS = 2 * 60 * 1000; // consider user "active" if interacted within last 2 minutes

  useEffect(() => {
    // Personality prompts should appear every 10 minutes after the previous answer.
    // Once eligible, if the app is visible, we should show the modal immediately (no extra wait).
    if (!user) return;
    if (!ENABLE_PERSONALITY_QUESTIONS) return;

    const clearTimer = () => {
      if (personalityTimerRef.current) {
        window.clearTimeout(personalityTimerRef.current);
        personalityTimerRef.current = null;
      }
      if (personalityNextCheckRef.current) {
        window.clearTimeout(personalityNextCheckRef.current);
        personalityNextCheckRef.current = null;
      }
    };

    const markActive = () => {
      try {
        window.localStorage.setItem(PERSONA_LAST_ACTIVE_AT_KEY, String(Date.now()));
      } catch {}
    };

    // Mark user active on common interactions
    const activityEvents: Array<keyof WindowEventMap> = ['mousemove', 'keydown', 'scroll', 'touchstart', 'mousedown'];
    for (const ev of activityEvents) window.addEventListener(ev, markActive, { passive: true });
    markActive();

    const isUserActiveNow = () => {
      try {
        const lastActive = Number(window.localStorage.getItem(PERSONA_LAST_ACTIVE_AT_KEY) || '0');
        return lastActive && Date.now() - lastActive <= ACTIVE_WINDOW_MS;
      } catch {
        return true;
      }
    };

    const scheduleNextCheckAt = (targetMs: number) => {
      const now = Date.now();
      const delay = Math.max(0, targetMs - now);
      // Avoid scheduling extremely frequent timers.
      if (delay < 250) return;
      if (personalityNextCheckRef.current) window.clearTimeout(personalityNextCheckRef.current);
      personalityNextCheckRef.current = window.setTimeout(() => {
        void tryPrompt();
      }, delay);
    };

    async function tryPrompt(): Promise<void> {
      const now = Date.now();
      try {
        if (document.visibilityState !== 'visible') return;
        // Do NOT gate on activity: reading the feed without moving the mouse should still surface prompts.
        if (showPersonalityModal) return;

        // throttle across tabs (based on answer time; set on submit)
        const nextAt = Number(window.localStorage.getItem(PERSONA_NEXT_AT_KEY) || '0');
        if (nextAt && nextAt > now) {
          scheduleNextCheckAt(nextAt);
          return;
        }

        // short in-flight lock to avoid duplicate calls
        const pendingUntil = Number(window.localStorage.getItem(PERSONA_PENDING_UNTIL_KEY) || '0');
        if (pendingUntil && pendingUntil > now) return;
        window.localStorage.setItem(PERSONA_PENDING_UNTIL_KEY, String(now + 15_000));

        const data = await apiGet(API_ENDPOINTS.PROMPTS_NEXT, { skipCache: true });
        if (data?.prompt) {
          setPrefetchedPersonality({ assignmentId: data?.assignmentId ?? null, prompt: data.prompt });
          setShowPersonalityModal(true);
        } else if (data?.cooldownUntil) {
          const until = new Date(String(data.cooldownUntil)).getTime();
          if (!Number.isNaN(until)) {
            window.localStorage.setItem(PERSONA_NEXT_AT_KEY, String(until));
            scheduleNextCheckAt(until);
          }
        } else {
          // avoid hammering if backend returns nothing
          window.localStorage.setItem(PERSONA_NEXT_AT_KEY, String(now + 60_000));
        }
      } catch (e) {
        console.warn('Personality prefetch failed:', e);
      } finally {
        try { window.localStorage.removeItem(PERSONA_PENDING_UNTIL_KEY); } catch {}
      }
    }

    // Fire immediately when the user returns to the tab (don't wait for the next 60s tick).
    const triggerOnReturn = () => {
      if (document.visibilityState !== 'visible') return;
      markActive();
      void tryPrompt();
    };
    document.addEventListener('visibilitychange', triggerOnReturn);
    window.addEventListener('focus', triggerOnReturn);
    window.addEventListener('pageshow', triggerOnReturn);

    // Start after a short delay, then run every minute as a cheap "safety net".
    clearTimer();
    personalityTimerRef.current = window.setTimeout(() => {
      void tryPrompt();
      personalityIntervalRef.current = window.setInterval(() => void tryPrompt(), 60_000);
    }, PROMPT_INITIAL_DELAY_MS);
    // Also do an immediate check on mount if visible (no waiting 30s if already eligible).
    void tryPrompt();

    return () => {
      clearTimer();
      if (personalityIntervalRef.current) window.clearInterval(personalityIntervalRef.current);
      personalityIntervalRef.current = null;
      for (const ev of activityEvents) window.removeEventListener(ev, markActive as any);
      document.removeEventListener('visibilitychange', triggerOnReturn);
      window.removeEventListener('focus', triggerOnReturn);
      window.removeEventListener('pageshow', triggerOnReturn);
    };
  }, [user, showPersonalityModal]);

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
      <div className="hidden md:block">
        <TopHeader />
      </div>

      {/* Mobile: Z opens the left sidebar drawer */}
      <button
        onClick={() => setMobileSidebarOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden bg-card border border-border p-2 rounded-lg shadow-lg hover:scale-105 transition-transform"
        aria-label="Open communities"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20">
          <rect x="1.5" y="1.5" width="21" height="21" rx="6" fill="#CBAA5A" />
          <text x="12" y="16" fontFamily="Riccione-DemiBold, ui-serif, serif" fontSize="11" fontWeight="700" textAnchor="middle" fill="#000000">Z</text>
        </svg>
      </button>

      <Sheet open={mobileSidebarOpen} onOpenChange={setMobileSidebarOpen}>
        <SheetContent side="left" className="w-[320px] bg-black border-r border-[#222] text-white">
          <SheetHeader>
            <SheetTitle className="font-gilroy tracking-[0.16em] uppercase text-xs text-[#CBAA5A]">
              Communities
            </SheetTitle>
          </SheetHeader>

          <div className="mt-4 flex flex-col gap-1">
            <Button
              variant="ghost"
              className="justify-start text-white hover:bg-[#1a1a1a]"
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate({ search: '?c=all' }, { replace: true });
              }}
            >
              All
            </Button>

            {/* Explore */}
            <div className="mt-2 px-2 text-[10px] font-bold tracking-[0.18em] uppercase text-[#777]">
              Explore
            </div>
            <Button
              variant="ghost"
              className="justify-start text-white hover:bg-[#1a1a1a]"
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate({ search: '?c=people' }, { replace: true });
              }}
            >
              <Users className="w-4 h-4 mr-2" />
              People
            </Button>

            <div className="mt-2 px-2 text-[10px] font-bold tracking-[0.18em] uppercase text-[#777]">
              Communities
            </div>
            {mobileCommunities.map((c) => {
              return (
                <Button
                  key={c.id}
                  variant="ghost"
                  className="justify-start text-white hover:bg-[#1a1a1a]"
                  onClick={() => {
                    setMobileSidebarOpen(false);
                    navigate({ search: `?c=${encodeURIComponent(c.slug)}` }, { replace: true });
                  }}
                >
                  <span className="truncate">{c.name}</span>
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Middle scroll region (reddit-style) */}
      <main className="flex-1 min-h-0 overflow-hidden">
        <div className="h-full min-h-0 w-full max-w-7xl mx-auto px-4 py-4 pb-20 md:pb-8 pt-16 md:pt-4">
          <ForumTabContent />
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />

      {/* Daily Standup Modal removed */}

      {/* Personality Question Modal (disabled for now) */}
      {ENABLE_PERSONALITY_QUESTIONS ? (
        <PersonalityQuestionModal
          isOpen={showPersonalityModal}
          prefetched={prefetchedPersonality}
          onClose={() => {
            setShowPersonalityModal(false);
            setPrefetchedPersonality(null);
          }}
          onComplete={() => {
            // Answer-based cooldown: don't try again for 10 minutes after the user responds.
            try { window.localStorage.setItem('6d_persona_prompt_next_at', String(Date.now() + 10 * 60 * 1000)); } catch {}
            setShowPersonalityModal(false);
            setPrefetchedPersonality(null);
          }}
        />
      ) : null}
    </div>
  );
};

export default Home;
