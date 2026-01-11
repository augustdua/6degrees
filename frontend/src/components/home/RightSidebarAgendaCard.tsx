import React, { useEffect, useState } from 'react';
import { Calendar, RefreshCw } from 'lucide-react';
import { apiGet } from '@/lib/api';

type AgendaEvent = {
  id?: string;
  summary?: string;
  start?: { dateTime?: string; date?: string };
};

function formatWhen(e: AgendaEvent): string {
  const dt = e?.start?.dateTime || e?.start?.date || '';
  if (!dt) return '';
  const d = new Date(dt);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function RightSidebarAgendaCard() {
  const [loading, setLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<AgendaEvent[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const status = await apiGet('/api/google/status', { skipCache: true });
      const connected = Boolean(status?.connected);
      setGoogleConnected(connected);
      if (!connected) {
        setEvents([]);
        return;
      }

      const now = new Date();
      const week = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        timeMin: now.toISOString(),
        timeMax: week.toISOString(),
        maxResults: '5',
      });
      const r = await apiGet(`/api/google/calendars/primary/events?${params.toString()}`, { skipCache: true });
      const list = Array.isArray(r?.events) ? (r.events as AgendaEvent[]) : [];
      setEvents(list);
    } catch {
      setGoogleConnected(false);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Calendar className="w-4 h-4 text-[#CBAA5A]" />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Agenda</h3>
        <button
          type="button"
          onClick={() => refresh()}
          className="ml-auto text-muted-foreground hover:text-foreground"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-3">
        {googleConnected === false ? (
          <div className="text-sm text-muted-foreground">Connect Google to see upcoming events.</div>
        ) : events.length === 0 ? (
          <div className="text-sm text-muted-foreground">{loading ? 'Loading…' : 'No upcoming events.'}</div>
        ) : (
          <div className="space-y-2">
            {events.map((e, idx) => (
              <div key={String(e.id || idx)} className="rounded-md border border-border bg-muted/30 px-3 py-2">
                <div className="text-sm font-medium text-foreground truncate">{String(e.summary || 'Untitled event')}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{formatWhen(e)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


