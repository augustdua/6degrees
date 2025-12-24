import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Flame, Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DailyStandupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userId?: string;
}

export function DailyStandupModal({ isOpen, onComplete, userId }: DailyStandupModalProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const [showCoworkingCta, setShowCoworkingCta] = useState(false);
  const [coworkingLoading, setCoworkingLoading] = useState(false);
  const [nextSession, setNextSession] = useState<any | null>(null);
  
  const [yesterday, setYesterday] = useState('');
  const [today, setToday] = useState('');
  
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [localDate, setLocalDate] = useState('');
  const [timezone, setTimezone] = useState(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
  });

  // Fetch standup status when modal opens
  useEffect(() => {
    if (!isOpen || !userId) return;
    
    const fetchStatus = async () => {
      setLoading(true);
      try {
        const data = await apiGet(
          `${API_ENDPOINTS.DAILY_STANDUP_STATUS}?timezone=${encodeURIComponent(timezone)}`,
          { skipCache: true }
        );
        
        setStreak(data?.streak || 0);
        setMaxStreak(data?.maxStreak || 0);
        setLocalDate(data?.localDate || '');
        
        // If already completed, close modal
        if (data?.completedToday || data?.skippedToday) {
          onComplete();
        }
      } catch (err) {
        console.error('Failed to fetch standup status:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchStatus();
  }, [isOpen, userId, timezone, onComplete]);

  const handleSubmit = useCallback(async () => {
    if (!yesterday.trim() || !today.trim()) {
      toast({
        variant: 'destructive',
        title: 'Please fill in both fields',
        description: 'Tell us what you did and what you\'ll do.'
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiPost(API_ENDPOINTS.DAILY_STANDUP_SUBMIT, {
        timezone,
        yesterday: yesterday.trim(),
        today: today.trim()
      });

      setStreak(result?.streak || streak + 1);
      setMaxStreak(result?.maxStreak || maxStreak);

      toast({
        title: `🔥 ${result?.streak || streak + 1} Day Streak!`,
        description: 'Feed unlocked. Keep it going!'
      });

      onComplete();
      setShowCoworkingCta(true);
    } catch (err: any) {
      console.error('Failed to submit standup:', err);
      toast({
        variant: 'destructive',
        title: 'Submission failed',
        description: err?.message || 'Please try again.'
      });
    } finally {
      setSubmitting(false);
    }
  }, [yesterday, today, timezone, streak, maxStreak, toast, onComplete]);

  // Load next Grind House session when CTA opens
  useEffect(() => {
    if (!showCoworkingCta) return;
    let cancelled = false;
    const run = async () => {
      setCoworkingLoading(true);
      try {
        const data = await apiGet('/api/coworking/upcoming?limit=1', { skipCache: true });
        const s = Array.isArray(data?.sessions) ? data.sessions[0] : null;
        if (!cancelled) setNextSession(s || null);
      } catch {
        if (!cancelled) setNextSession(null);
      } finally {
        if (!cancelled) setCoworkingLoading(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [showCoworkingCta]);

  const handleSkip = useCallback(async () => {
    setSkipping(true);
    try {
      await apiPost(API_ENDPOINTS.DAILY_STANDUP_SKIP, { timezone });

      toast({
        title: 'Skipped',
        description: 'Your streak has been reset. No worries, start fresh tomorrow!'
      });

      onComplete();
    } catch (err: any) {
      console.error('Failed to skip standup:', err);
      toast({
        variant: 'destructive',
        title: 'Failed to skip',
        description: err?.message || 'Please try again.'
      });
    } finally {
      setSkipping(false);
    }
  }, [timezone, toast, onComplete]);

  const canSubmit = yesterday.trim().length >= 2 && today.trim().length >= 2;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-lg bg-black border border-[#222] p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        {/* Header with Streak */}
        <div className="px-6 pt-6 pb-4 border-b border-[#222]">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold text-white tracking-tight">
                Daily Check-In
              </DialogTitle>
              <DialogDescription className="text-[#666] text-sm mt-1">
                {localDate || 'Today'}
              </DialogDescription>
            </div>
            
            {/* Streak Display */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-[#111] border border-[#333] rounded-full px-4 py-2">
                <Flame className={`w-5 h-5 ${streak > 0 ? 'text-[#CBAA5A]' : 'text-[#444]'}`} />
                <span className={`text-lg font-bold ${streak > 0 ? 'text-[#CBAA5A]' : 'text-[#666]'}`}>
                  {streak}
                </span>
              </div>
              {maxStreak > 0 && maxStreak > streak && (
                <div className="text-xs text-[#555]">
                  Best: {maxStreak}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="px-6 py-5 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#CBAA5A] border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Yesterday Field */}
              <div className="space-y-2">
                <Label className="text-white text-sm font-medium flex items-center gap-2">
                  <Zap className="w-4 h-4 text-[#CBAA5A]" />
                  What did you accomplish yesterday?
                </Label>
                <Textarea
                  value={yesterday}
                  onChange={(e) => setYesterday(e.target.value)}
                  placeholder="Shipped the new feature, had 3 meetings..."
                  className="bg-[#0a0a0a] border-[#222] text-white placeholder:text-[#444] focus:border-[#CBAA5A] focus:ring-[#CBAA5A]/20 min-h-[80px] resize-none"
                  disabled={submitting || skipping}
                />
              </div>

              {/* Today Field */}
              <div className="space-y-2">
                <Label className="text-white text-sm font-medium flex items-center gap-2">
                  <ArrowRight className="w-4 h-4 text-[#CBAA5A]" />
                  What will you work on today?
                </Label>
                <Textarea
                  value={today}
                  onChange={(e) => setToday(e.target.value)}
                  placeholder="Focus on user feedback, prepare presentation..."
                  className="bg-[#0a0a0a] border-[#222] text-white placeholder:text-[#444] focus:border-[#CBAA5A] focus:ring-[#CBAA5A]/20 min-h-[80px] resize-none"
                  disabled={submitting || skipping}
                />
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#222] flex items-center justify-between">
          {/* Skip Button */}
          <Button
            variant="ghost"
            onClick={handleSkip}
            disabled={submitting || skipping || loading}
            className="text-[#555] hover:text-[#CBAA5A] hover:bg-transparent transition-colors text-sm"
          >
            {skipping ? 'Skipping...' : "I'm Lazy"}
          </Button>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting || skipping || loading}
            className="bg-white hover:bg-[#CBAA5A] text-black font-semibold px-6 py-2 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-black border-t-transparent" />
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Unlock Feed
                <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </div>

        {/* Streak Motivation */}
        {streak > 0 && (
          <div className="px-6 pb-4">
            <div className="text-center text-xs text-[#555]">
              {streak === 1 && "Day 1! Great start. Keep it going."}
              {streak >= 2 && streak < 7 && `${streak} days strong. Build the habit.`}
              {streak >= 7 && streak < 30 && `${streak} day streak! 🔥 You're on fire.`}
              {streak >= 30 && `${streak} days! 🏆 Legendary consistency.`}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Post-standup coworking CTA */}
    <Dialog open={showCoworkingCta} onOpenChange={setShowCoworkingCta}>
      <DialogContent className="sm:max-w-md bg-black border border-[#222]">
        <DialogHeader>
          <DialogTitle className="text-white">Grind House</DialogTitle>
          <DialogDescription className="text-[#666]">
            Book a virtual co-working session. Cameras on.
          </DialogDescription>
        </DialogHeader>

        {coworkingLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#CBAA5A] border-t-transparent" />
            Loading next session…
          </div>
        ) : !nextSession ? (
          <div className="text-sm text-muted-foreground">
            No session found. You can open Grind House anytime from Communities.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-xl border border-[#222] bg-[#0a0a0a] p-3">
              <div className="text-sm text-white font-semibold">
                {new Date(nextSession.startsAt).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}
              </div>
              <div className="text-xs text-[#666] mt-1">60 minutes • Quiet focus</div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                className="border-[#333] text-white hover:bg-[#1a1a1a]"
                onClick={() => {
                  setShowCoworkingCta(false);
                  navigate('/?c=grind-house', { replace: true });
                }}
              >
                Open Grind House
              </Button>
              <Button
                className="bg-[#CBAA5A] text-black hover:bg-[#D4B76A]"
                disabled={coworkingLoading}
                onClick={async () => {
                  try {
                    setCoworkingLoading(true);
                    await apiPost(`/api/coworking/${nextSession.id}/book`, {});
                    setShowCoworkingCta(false);
                    navigate(`/coworking/${nextSession.id}`);
                  } catch {
                    toast({ title: 'Could not book', description: 'Please try again.', variant: 'destructive' });
                  } finally {
                    setCoworkingLoading(false);
                  }
                }}
              >
                Book & Join
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}

export default DailyStandupModal;


