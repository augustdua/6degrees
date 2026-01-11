import React, { useEffect, useState, useRef } from 'react';
import { Plus, RefreshCw, Calendar } from 'lucide-react';
import { apiGet, apiPost } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

// Integration logos as inline SVGs
const WhatsAppLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#25D366">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const GoogleLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

const GoogleCalendarLogo = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5">
    <path fill="#4285F4" d="M19.5 4h-3V2.5a.5.5 0 00-1 0V4h-7V2.5a.5.5 0 00-1 0V4h-3A1.5 1.5 0 003 5.5v13A1.5 1.5 0 004.5 20h15a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0019.5 4z"/>
    <path fill="#fff" d="M19 18.5a.5.5 0 01-.5.5h-13a.5.5 0 01-.5-.5V9h14v9.5z"/>
    <path fill="#EA4335" d="M8 12h2v2H8zM8 15h2v2H8z"/>
    <path fill="#FBBC05" d="M11 12h2v2h-2zM11 15h2v2h-2z"/>
    <path fill="#34A853" d="M14 12h2v2h-2zM14 15h2v2h-2z"/>
  </svg>
);

export function RightSidebarIntegrationsCard(props: { onAddContact: () => void }) {
  const { user, isReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wa, setWa] = useState<{ connected: boolean; hasAuth?: boolean; sessionStatus?: string } | null>(null);
  const [google, setGoogle] = useState<{ connected: boolean; hasRefreshToken?: boolean } | null>(null);
  const [calendar, setCalendar] = useState<{ connected: boolean; eventCount?: number } | null>(null);
  const autoReconnectAttempted = useRef(false);

  const refresh = async (autoReconnect = false) => {
    if (!user) {
      setWa(null);
      setGoogle(null);
      setCalendar(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      console.log('[Integrations] Fetching status...');
      const [w, g, cal] = await Promise.all([
        apiGet('/api/whatsapp/status', { skipCache: true }).catch((e) => { console.error('[Integrations] WhatsApp status error:', e); return null; }),
        apiGet('/api/google/status', { skipCache: true }).catch((e) => { console.error('[Integrations] Google status error:', e); return null; }),
        apiGet('/api/google/calendar/events?days=7', { skipCache: true }).catch((e) => { console.error('[Integrations] Calendar error:', e); return null; }),
      ]);
      console.log('[Integrations] Status results:', { whatsapp: w, google: g, calendar: cal });

      // Auto-reconnect WhatsApp if credentials exist but session isn't active
      if (autoReconnect && w && w.hasAuth && !w.connected && !autoReconnectAttempted.current) {
        autoReconnectAttempted.current = true;
        console.log('[Integrations] Auto-reconnecting WhatsApp...');
        try {
          await apiPost('/api/whatsapp/connect', {});
          const updatedW = await apiGet('/api/whatsapp/status', { skipCache: true }).catch(() => null);
          console.log('[Integrations] WhatsApp status after reconnect:', updatedW);
          setWa(updatedW ? { connected: Boolean(updatedW?.connected), hasAuth: Boolean(updatedW?.hasAuth), sessionStatus: String(updatedW?.sessionStatus || '') } : null);
        } catch (reconnectErr) {
          console.error('[Integrations] WhatsApp auto-reconnect failed:', reconnectErr);
          setWa(w ? { connected: Boolean(w?.connected), hasAuth: Boolean(w?.hasAuth), sessionStatus: String(w?.sessionStatus || '') } : null);
        }
      } else {
        setWa(w ? { connected: Boolean(w?.connected), hasAuth: Boolean(w?.hasAuth), sessionStatus: String(w?.sessionStatus || '') } : null);
      }

      setGoogle(g ? { connected: Boolean(g?.connected), hasRefreshToken: Boolean(g?.hasRefreshToken) } : null);
      
      // Calendar is connected if we got events or if Google is connected
      const calEvents = Array.isArray(cal?.events) ? cal.events : [];
      setCalendar({ 
        connected: Boolean(g?.connected) || calEvents.length > 0, 
        eventCount: calEvents.length 
      });
    } catch (e) {
      console.error('[Integrations] Refresh error:', e);
      setWa(null);
      setGoogle(null);
      setCalendar(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isReady && user) {
      // Small delay to ensure auth token is fully propagated
      const timer = setTimeout(() => {
        refresh(true).catch(() => {});
      }, 100);
      return () => clearTimeout(timer);
    } else if (isReady && !user) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, user?.id]);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center justify-between">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Integrations</h3>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => refresh()}
            className="p-1.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors"
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={props.onAddContact}
            className="p-1.5 rounded-md bg-[#CBAA5A]/10 hover:bg-[#CBAA5A]/20 transition-colors"
            title="Add contact"
          >
            <Plus className="w-3.5 h-3.5 text-[#CBAA5A]" />
          </button>
        </div>
      </div>

      <div className="p-2 space-y-1.5">
        {/* WhatsApp */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
          <WhatsAppLogo />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">WhatsApp</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {wa === null ? 'Checking…' : wa.connected ? 'Connected' : 'Not connected'}
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${wa?.connected ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
        </div>

        {/* Google Contacts */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
          <GoogleLogo />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">Google</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {google === null ? 'Checking…' : google.connected ? 'Contacts synced' : 'Not connected'}
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${google?.connected ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
        </div>

        {/* Google Calendar */}
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-2.5 py-2">
          <GoogleCalendarLogo />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-foreground">Calendar</div>
            <div className="text-[10px] text-muted-foreground truncate">
              {calendar === null ? 'Checking…' : calendar.connected ? `${calendar.eventCount || 0} events this week` : 'Not connected'}
            </div>
          </div>
          <div className={`w-2 h-2 rounded-full ${calendar?.connected ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
        </div>
      </div>
    </div>
  );
}
