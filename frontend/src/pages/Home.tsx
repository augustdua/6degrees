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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Gift, Users, Lock } from 'lucide-react';

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isPartner = !!user && (user as any).role === 'ZAURQ_PARTNER';
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
  const LONG_BREAK_MS = 10 * 60 * 1000; // 10 minutes
  const PROMPT_DELAY_MS = 30 * 1000; // 30 seconds

  useEffect(() => {
    // Personality prompts should be independent of daily standup completion.
    if (!user) return;

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
  }, [user]);

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
            {/* Become Partner CTA (mobile) */}
            {!isPartner && (
              <Button
                className="w-full bg-[#CBAA5A] text-black hover:bg-[#D4B76A]"
                onClick={() => {
                  setMobileSidebarOpen(false);
                  navigate('/profile');
                }}
              >
                Become a Partner
              </Button>
            )}

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

            {/* Partner-only quick links (partners only) */}
            {isPartner && (
              <>
                <div className="mt-2 px-2 text-[10px] font-bold tracking-[0.18em] uppercase text-[#777]">
                  Zaurq Partners
                </div>
                {[
                  { slug: 'zaurq-partners', label: 'Partners Feed' },
                  { slug: 'your-club', label: 'Your Club' },
                  { slug: 'market-research', label: 'Market Research' },
                  { slug: 'events', label: 'Events' },
                ].map((i) => (
                  <Button
                    key={i.slug}
                    variant="ghost"
                    className="justify-start text-white hover:bg-[#1a1a1a]"
                    onClick={() => {
                      setMobileSidebarOpen(false);
                      navigate({ search: `?c=${encodeURIComponent(i.slug)}` }, { replace: true });
                    }}
                  >
                    {i.label}
                  </Button>
                ))}
              </>
            )}

            {/* Offers / People */}
            <div className="mt-2 px-2 text-[10px] font-bold tracking-[0.18em] uppercase text-[#777]">
              Explore
            </div>
            <Button
              variant="ghost"
              className="justify-start text-white hover:bg-[#1a1a1a]"
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate({ search: '?c=grind-house' }, { replace: true });
              }}
            >
              Grind House
            </Button>
            <Button
              variant="ghost"
              className="justify-start text-white hover:bg-[#1a1a1a]"
              onClick={() => {
                setMobileSidebarOpen(false);
                navigate({ search: '?c=offers' }, { replace: true });
              }}
            >
              <Gift className="w-4 h-4 mr-2" />
              Offers
            </Button>
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
              const isLocked =
                !isPartner && (c.slug === 'market-research' || c.slug === 'events' || c.slug === 'zaurq-partners' || c.slug === 'your-club');
              if (isLocked) return null; // ZAURQ_USER should not see locked clutter
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
                  {isLocked && <Lock className="w-4 h-4 ml-auto opacity-70" />}
                </Button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>

      {/* Middle scroll region (reddit-style) */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full w-full max-w-7xl mx-auto px-4 py-4 pb-20 md:pb-8 overflow-hidden pt-16 md:pt-4">
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
