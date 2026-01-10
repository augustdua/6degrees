import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ExternalLink, RefreshCw, Unlink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type GoogleStatus = {
  connected: boolean;
  hasRefreshToken?: boolean;
  hasAccessToken?: boolean;
};

type CalendarItem = {
  id: string;
  summary?: string | null;
  primary?: boolean;
  accessRole?: string | null;
  timeZone?: string | null;
};

type EventItem = {
  id?: string;
  summary?: string | null;
  htmlLink?: string | null;
  start?: any;
  end?: any;
};

export default function GoogleCalendarConnectCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [calendarsLoading, setCalendarsLoading] = useState(false);
  const [calendars, setCalendars] = useState<CalendarItem[]>([]);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');

  const [eventsLoading, setEventsLoading] = useState(false);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [creating, setCreating] = useState(false);

  const connected = !!status?.connected;

  const primaryCalendar = useMemo(() => calendars.find((c) => c.primary) || null, [calendars]);

  const refreshStatus = async () => {
    setLoadingStatus(true);
    try {
      const s = await apiGet('/api/google/status', { skipCache: true });
      setStatus({
        connected: !!s?.connected,
        hasRefreshToken: !!s?.hasRefreshToken,
        hasAccessToken: !!s?.hasAccessToken,
      });
    } catch (e: any) {
      setStatus({ connected: false });
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    // toast on callback redirect
    const url = new URL(window.location.href);
    const flag = url.searchParams.get('google');
    if (flag === 'connected') {
      toast({ title: 'Google connected', description: 'Calendar access enabled.' });
      url.searchParams.delete('google');
      window.history.replaceState({}, '', url.toString());
    } else if (flag === 'error') {
      const reason = url.searchParams.get('reason');
      toast({ title: 'Google connect failed', description: reason || 'Please try again.', variant: 'destructive' });
      url.searchParams.delete('google');
      url.searchParams.delete('reason');
      window.history.replaceState({}, '', url.toString());
    }
    refreshStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const returnTo = '/profile';
      const r = await apiGet(`/api/google/connect?returnTo=${encodeURIComponent(returnTo)}`, { skipCache: true });
      const url = r?.url;
      if (!url) throw new Error('Missing Google auth URL');
      window.location.href = url;
    } catch (e: any) {
      toast({ title: 'Could not connect Google', description: e?.message || 'Please try again.', variant: 'destructive' });
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await apiPost('/api/google/disconnect', {});
      setCalendars([]);
      setEvents([]);
      setSelectedCalendarId('primary');
      await refreshStatus();
      toast({ title: 'Disconnected', description: 'Google Calendar access removed.' });
    } catch (e: any) {
      toast({ title: 'Could not disconnect', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setDisconnecting(false);
    }
  };

  const loadCalendars = async () => {
    setCalendarsLoading(true);
    try {
      const r = await apiGet('/api/google/calendars', { skipCache: true });
      const list = Array.isArray(r?.calendars) ? (r.calendars as CalendarItem[]) : [];
      setCalendars(list);
      if (primaryCalendar?.id) setSelectedCalendarId(primaryCalendar.id);
    } catch (e: any) {
      toast({ title: 'Could not load calendars', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setCalendarsLoading(false);
    }
  };

  const loadEvents = async () => {
    setEventsLoading(true);
    try {
      const calId = selectedCalendarId || 'primary';
      const r = await apiGet(`/api/google/calendars/${encodeURIComponent(calId)}/events?maxResults=5`, { skipCache: true });
      setEvents(Array.isArray(r?.events) ? (r.events as EventItem[]) : []);
    } catch (e: any) {
      toast({ title: 'Could not load events', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setEventsLoading(false);
    }
  };

  const createTestEvent = async () => {
    setCreating(true);
    try {
      const start = new Date(Date.now() + 5 * 60 * 1000);
      const end = new Date(start.getTime() + 30 * 60 * 1000);
      const r = await apiPost('/api/google/calendars/primary/events', {
        summary: 'Zaurq – Test Event',
        description: 'Created from your Zaurq profile (Google Calendar integration).',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      });
      const link = r?.event?.htmlLink;
      toast({ title: 'Event created', description: link ? 'Open it in Google Calendar.' : 'Created successfully.' });
      await loadEvents();
    } catch (e: any) {
      toast({ title: 'Could not create event', description: e?.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="mb-4 break-inside-avoid rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-[#CBAA5A]" />
          <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">GOOGLE CALENDAR</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="border-[#333] text-white hover:bg-[#1a1a1a] h-8 px-3"
            onClick={refreshStatus}
            disabled={loadingStatus}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            {loadingStatus ? 'Refreshing…' : 'Refresh'}
          </Button>
          {connected ? (
            <Button
              type="button"
              variant="outline"
              className="border-[#333] text-white hover:bg-[#1a1a1a] h-8 px-3"
              onClick={handleDisconnect}
              disabled={disconnecting}
            >
              <Unlink className="w-3.5 h-3.5 mr-2" />
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
            </Button>
          ) : (
            <Button
              type="button"
              className="h-8 px-3 bg-white text-black hover:bg-[#CBAA5A] hover:text-black"
              onClick={handleConnect}
              disabled={connecting}
            >
              {connecting ? 'Connecting…' : 'Connect'}
            </Button>
          )}
        </div>
      </div>

      {!connected ? (
        <div className="rounded-xl border border-[#333] bg-black/40 p-3 text-[#888] font-gilroy text-sm">
          Connect Google to enable calendar scheduling (list calendars, show upcoming events, and create events).
        </div>
      ) : (
        <div className="rounded-xl border border-[#333] bg-black/40 p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-[#333] text-white hover:bg-[#1a1a1a] h-8 px-3"
              onClick={loadCalendars}
              disabled={calendarsLoading}
            >
              {calendarsLoading ? 'Loading calendars…' : 'Load calendars'}
            </Button>

            <div className="min-w-[220px]">
              <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                <SelectTrigger className="h-8 border-[#333] bg-black/40 text-white">
                  <SelectValue placeholder="Select a calendar" />
                </SelectTrigger>
                <SelectContent className="bg-black border-[#333] text-white">
                  <SelectItem value="primary">Primary calendar</SelectItem>
                  {calendars
                    .filter((c) => c.id && c.id !== 'primary')
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.summary || c.id}{c.primary ? ' (primary)' : ''}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              type="button"
              variant="outline"
              className="border-[#333] text-white hover:bg-[#1a1a1a] h-8 px-3"
              onClick={loadEvents}
              disabled={eventsLoading}
            >
              {eventsLoading ? 'Loading…' : 'Upcoming events'}
            </Button>

            <Button
              type="button"
              className="h-8 px-3 bg-white text-black hover:bg-[#CBAA5A] hover:text-black"
              onClick={createTestEvent}
              disabled={creating}
            >
              {creating ? 'Creating…' : 'Create test event'}
            </Button>
          </div>

          {events.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Next events</div>
              {events.map((e) => (
                <div key={e.id || e.htmlLink || Math.random()} className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-white text-[11px] font-gilroy truncate">{e.summary || 'Untitled'}</div>
                    <div className="text-[#666] text-[10px] font-gilroy truncate">
                      {(e.start?.dateTime || e.start?.date || '').toString()}
                    </div>
                  </div>
                  {e.htmlLink && (
                    <a
                      href={String(e.htmlLink)}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#CBAA5A] hover:underline inline-flex items-center gap-1 shrink-0 text-[10px] font-gilroy tracking-[0.05em]"
                    >
                      Open <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


