import React, { useEffect, useState } from 'react';
import { Plus, Link2, RefreshCw, Loader2 } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function RightSidebarIntegrationsCard(props: { onAddContact: () => void }) {
  const { user, isReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [wa, setWa] = useState<{ connected: boolean; sessionStatus?: string } | null>(null);
  const [google, setGoogle] = useState<{ connected: boolean; hasRefreshToken?: boolean } | null>(null);

  const refresh = async () => {
    if (!user) {
      setWa(null);
      setGoogle(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [w, g] = await Promise.all([
        apiGet('/api/whatsapp/status', { skipCache: true }).catch(() => null),
        apiGet('/api/google/status', { skipCache: true }).catch(() => null),
      ]);
      setWa(w ? { connected: Boolean(w?.connected), sessionStatus: String(w?.sessionStatus || '') } : null);
      setGoogle(g ? { connected: Boolean(g?.connected), hasRefreshToken: Boolean(g?.hasRefreshToken) } : null);
    } catch {
      // best-effort: leave as unknown (avoid false "disconnected" flashes)
      setWa(null);
      setGoogle(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch status once auth is ready and user is logged in
    if (isReady && user) {
      refresh().catch(() => {});
    } else if (isReady && !user) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, user?.id]);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Link2 className="w-4 h-4 text-[#CBAA5A]" />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Integrations</h3>
        <button
          type="button"
          onClick={() => refresh()}
          className="ml-auto text-muted-foreground hover:text-foreground"
          title="Refresh"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
        <button
          type="button"
          onClick={props.onAddContact}
          className="ml-1 w-8 h-8 rounded-full bg-muted hover:bg-accent border border-border flex items-center justify-center"
          title="Add contact"
        >
          <Plus className="w-4 h-4 text-[#CBAA5A]" />
        </button>
      </div>

      <div className="p-3 space-y-2">
        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">WhatsApp</div>
            <div className="text-xs text-muted-foreground truncate">
              {wa === null ? 'Checking…' : wa.connected ? `Connected${wa.sessionStatus ? ` • ${wa.sessionStatus}` : ''}` : 'Not connected'}
            </div>
          </div>
          <span
            className={`text-[10px] font-bold tracking-[0.18em] uppercase px-2 py-1 rounded-full border ${
              wa === null
                ? 'border-border text-muted-foreground bg-background'
                : wa.connected
                  ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : 'border-border text-muted-foreground bg-background'
            }`}
          >
            {wa === null ? '—' : wa.connected ? 'On' : 'Off'}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground">Google</div>
            <div className="text-xs text-muted-foreground truncate">
              {google === null ? 'Checking…' : google.connected ? (google.hasRefreshToken ? 'Connected' : 'Connected (limited)') : 'Not connected'}
            </div>
          </div>
          <span
            className={`text-[10px] font-bold tracking-[0.18em] uppercase px-2 py-1 rounded-full border ${
              google === null
                ? 'border-border text-muted-foreground bg-background'
                : google.connected
                  ? 'border-green-500/30 text-green-400 bg-green-500/10'
                  : 'border-border text-muted-foreground bg-background'
            }`}
          >
            {google === null ? '—' : google.connected ? 'On' : 'Off'}
          </span>
        </div>

        <div className="text-xs text-muted-foreground">
          Tip: Connect Google to enrich names/photos; use WhatsApp to import recents and invite.
        </div>
      </div>
    </div>
  );
}


