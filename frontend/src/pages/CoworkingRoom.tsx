import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { DailyCallProvider } from '@/components/DailyCallProvider';
import { CoworkingCallUI } from '@/components/CoworkingCallUI';
import { useAuth } from '@/hooks/useAuth';

type JoinPayload = {
  roomUrl?: string | null;
  token?: string | null;
  roomName?: string | null;
};

const CoworkingRoom = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [join, setJoin] = useState<JoinPayload>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setError('Missing session id');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await apiPost(`/api/coworking/${sessionId}/join`, {});
        if (!cancelled) setJoin(data || {});
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to join session');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();

    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  return (
    <div className="h-screen w-full bg-background text-foreground overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-background/90 backdrop-blur">
        <Button variant="ghost" className="gap-2" onClick={() => navigate('/?c=grind-house', { replace: true })}>
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div className="text-xs font-bold tracking-[0.18em] uppercase text-muted-foreground">Grind House</div>
        <div className="w-[72px]" />
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
            Joining session…
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-card border border-border rounded-lg p-5">
            <div className="text-sm font-semibold">Could not join</div>
            <div className="text-xs text-muted-foreground mt-1">{error}</div>
            <div className="mt-4 flex gap-2">
              <Button onClick={() => window.location.reload()} className="bg-[#CBAA5A] text-black hover:bg-[#D4B76A]">
                Retry
              </Button>
              <Button variant="outline" onClick={() => navigate('/?c=grind-house', { replace: true })}>
                Back to Grind House
              </Button>
            </div>
          </div>
        </div>
      ) : !join.roomUrl ? (
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-sm text-muted-foreground">Room is not ready yet.</div>
        </div>
      ) : (
        <div className="flex-1">
          <DailyCallProvider
            roomUrl={join.roomUrl}
            token={join.token || undefined}
            userName={
              user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'You' : 'You'
            }
          >
            <CoworkingCallUI sessionId={sessionId || ''} />
          </DailyCallProvider>
        </div>
      )}
    </div>
  );
};

export default CoworkingRoom;


