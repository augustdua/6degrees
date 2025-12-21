import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { apiGet, apiPost, API_ENDPOINTS } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { TopHeader } from '@/components/TopHeader';
import { ForumTabContent } from '@/components/forum';
import { BottomNavigation } from '@/components/BottomNavigation';
import { Footer } from '@/components/Footer';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

const Home = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Daily Standup Unlock (members must complete daily standup to unlock feed)
  const shouldGateStandup = !!user && (user as any).membershipStatus === 'member';
  const [standupStatusLoading, setStandupStatusLoading] = useState(false);
  const [standupCompletedToday, setStandupCompletedToday] = useState(true);
  const [standupAssignedQuestion, setStandupAssignedQuestion] = useState<{ id: string; text: string } | null>(null);
  const [standupLocalDate, setStandupLocalDate] = useState<string>('');
  const [standupTimezone, setStandupTimezone] = useState<string>(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
  });
  const [standupYesterday, setStandupYesterday] = useState('');
  const [standupToday, setStandupToday] = useState('');
  const [standupAnswer, setStandupAnswer] = useState('');
  const [standupSubmitting, setStandupSubmitting] = useState(false);

  const refreshStandupStatus = useCallback(async () => {
    if (!shouldGateStandup) return;
    const tz = standupTimezone;

    setStandupStatusLoading(true);
    try {
      const data = await apiGet(
        `${API_ENDPOINTS.DAILY_STANDUP_STATUS}?timezone=${encodeURIComponent(tz)}`,
        { skipCache: true }
      );
      const completed = !!data?.completedToday;
      setStandupCompletedToday(completed);
      setStandupLocalDate(String(data?.localDate || ''));
      if (!completed && data?.assignedQuestion?.id) {
        setStandupAssignedQuestion({ id: data.assignedQuestion.id, text: data.assignedQuestion.text });
      } else {
        setStandupAssignedQuestion(null);
      }
    } catch (err) {
      console.error('Failed to load daily standup status:', err);
      setStandupCompletedToday(true);
      setStandupAssignedQuestion(null);
    } finally {
      setStandupStatusLoading(false);
    }
  }, [shouldGateStandup, standupTimezone]);

  useEffect(() => {
    if (!shouldGateStandup) {
      setStandupCompletedToday(true);
      setStandupAssignedQuestion(null);
      return;
    }
    refreshStandupStatus();
  }, [shouldGateStandup, user?.id, refreshStandupStatus]);

  const handleSubmitStandup = async () => {
    if (!standupAssignedQuestion?.id) return;
    if (!standupYesterday.trim() || !standupToday.trim() || !standupAnswer.trim()) return;

    setStandupSubmitting(true);
    try {
      await apiPost(API_ENDPOINTS.DAILY_STANDUP_SUBMIT, {
        timezone: standupTimezone,
        yesterday: standupYesterday,
        today: standupToday,
        questionId: standupAssignedQuestion.id,
        answer: standupAnswer
      });

      setStandupCompletedToday(true);
      toast({
        title: 'Standup Submitted!',
        description: 'Thanks — your daily standup is saved.'
      });
    } catch (err: any) {
      console.error('Failed to submit daily standup:', err);
      toast({
        variant: 'destructive',
        title: 'Submission Failed',
        description: err?.message || 'Could not submit standup. Please try again.'
      });
      await refreshStandupStatus();
    } finally {
      setStandupSubmitting(false);
    }
  };

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

      {/* Daily Standup Gate (members only) */}
      <Dialog
        open={shouldGateStandup && !standupStatusLoading && !standupCompletedToday}
        onOpenChange={() => {}}
      >
        <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Daily Standup to Unlock Feed</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {standupLocalDate ? `Today (${standupLocalDate}, ${standupTimezone})` : `Today (${standupTimezone})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="standup-yesterday" className="text-sm font-medium">What did you work on yesterday?</Label>
              <Textarea
                id="standup-yesterday"
                value={standupYesterday}
                onChange={(e) => setStandupYesterday(e.target.value)}
                placeholder="• Shipped feature X&#10;• Fixed bug Y&#10;• Met with team"
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="standup-today" className="text-sm font-medium">What will you work on today?</Label>
              <Textarea
                id="standup-today"
                value={standupToday}
                onChange={(e) => setStandupToday(e.target.value)}
                placeholder="• Deploy feature X&#10;• Start on feature Z&#10;• Code review"
                className="min-h-[80px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Life Question</Label>
              <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border">
                {standupAssignedQuestion?.text || 'Loading question…'}
              </p>
              <Textarea
                value={standupAnswer}
                onChange={(e) => setStandupAnswer(e.target.value)}
                placeholder="Your answer…"
                className="min-h-[60px] resize-none"
              />
            </div>

            <Button
              onClick={handleSubmitStandup}
              disabled={
                standupSubmitting ||
                !standupAssignedQuestion?.id ||
                !standupYesterday.trim() ||
                !standupToday.trim() ||
                !standupAnswer.trim()
              }
              className="w-full bg-[#CBAA5A] hover:bg-[#D4B76A] text-black font-bold"
            >
              {standupSubmitting ? 'Submitting…' : 'Unlock Feed'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Home;

