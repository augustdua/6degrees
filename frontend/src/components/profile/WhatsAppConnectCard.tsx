import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Copy, MessageSquare, RefreshCw, Link2, LogOut, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLogoDevUrl } from '@/utils/logoDev.ts';
import { getCurrentPathWithSearchAndHash } from '@/lib/oauthRedirect';
import { useAuth } from '@/hooks/useAuth';

type InviteContact = {
  id: string; // phone digits
  name?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  emails?: string[] | null;
};

export default function WhatsAppConnectCard() {
  const { providerToken, session, isReady, user } = useAuth();
  const [status, setStatus] = useState<{
    connected: boolean;
    hasAuth: boolean;
    sessionStatus: string;
    hasQr: boolean;
    lastError: string | null;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [qrText, setQrText] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const lastQrTextRef = useRef<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [contacts, setContacts] = useState<InviteContact[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [inviteMessage, setInviteMessage] = useState(() => `Hey — join me on Zaurq: ${window.location.origin}`);
  const [sending, setSending] = useState(false);
  const inviteLink = useMemo(() => {
    if (!user?.id) return `${window.location.origin}/auth`;
    const u = new URL(`${window.location.origin}/auth`);
    u.searchParams.set('ref', user.id);
    return u.toString();
  }, [user?.id]);

  const inviteText = useMemo(() => {
    const base = String(inviteMessage || '').trim();
    if (!base) return inviteLink;
    // Avoid duplicating the link if user already pasted it.
    if (base.includes(inviteLink)) return base;
    return `${base} ${inviteLink}`;
  }, [inviteLink, inviteMessage]);
  const [google, setGoogle] = useState<{
    connected: boolean;
    source: 'cache' | 'session' | 'hook' | 'none';
    expiresAt: number | null;
  }>({ connected: false, source: 'none', expiresAt: null });
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const pollTimer = useRef<number | null>(null);
  const autoReconnectAttempted = useRef(false);

  const filteredContacts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = `${c.name || ''}`.toLowerCase();
      const phone = String(c.phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [contacts, filter]);

  const selectedPhones = useMemo(() => {
    const out: string[] = [];
    for (const c of contacts) {
      if (selected[c.id] && c.phone) out.push(c.phone);
    }
    return out;
  }, [contacts, selected]);

  const refreshStatus = async (autoReconnect = false, silent = false): Promise<{ connected: boolean; hasAuth: boolean; sessionStatus: string; hasQr: boolean } | null> => {
    // Avoid showing a false "disconnected" flash while auth is still initializing.
    if (!isReady || !session?.access_token) {
      console.log('[WhatsApp] Waiting for auth...', { isReady, hasToken: !!session?.access_token });
      if (!silent) setStatusLoading(true);
      return null;
    }
    // Only show loading indicator for manual refreshes, not background polling
    if (!silent) setStatusLoading(true);
    try {
      console.log('[WhatsApp] Fetching status...');
      const s = await apiGet('/api/whatsapp/status', { skipCache: true });
      console.log('[WhatsApp] Status response:', s);

      // Auto-reconnect if credentials exist but session isn't active
      if (autoReconnect && s?.hasAuth && !s?.connected && !autoReconnectAttempted.current) {
        autoReconnectAttempted.current = true;
        console.log('[WhatsApp] Auto-reconnecting...');
        try {
          await apiPost('/api/whatsapp/connect', {});
          // Re-fetch status after reconnect
          const updatedS = await apiGet('/api/whatsapp/status', { skipCache: true });
          console.log('[WhatsApp] Status after reconnect:', updatedS);
          const newStatus = {
            connected: !!updatedS?.connected,
            hasAuth: !!updatedS?.hasAuth,
            sessionStatus: String(updatedS?.sessionStatus || 'none'),
            hasQr: !!updatedS?.hasQr,
            lastError: updatedS?.lastError || null,
          };
          setStatus(newStatus);
          return newStatus;
        } catch (reconnectErr) {
          console.error('[WhatsApp] Auto-reconnect failed:', reconnectErr);
        }
      }

      const newStatus = {
        connected: !!s?.connected,
        hasAuth: !!s?.hasAuth,
        sessionStatus: String(s?.sessionStatus || 'none'),
        hasQr: !!s?.hasQr,
        lastError: s?.lastError || null,
      };
      setStatus(newStatus);
      return newStatus;
    } catch (e: any) {
      console.error('[WhatsApp] Status fetch error:', e);
      // Keep previous status if we have one; otherwise show a safe disconnected state.
      setStatus((prev) =>
        prev || {
          connected: false,
          hasAuth: false,
          sessionStatus: 'none',
          hasQr: false,
          lastError: e?.message || 'Failed to load WhatsApp status',
        }
      );
      return null;
    } finally {
      if (!silent) setStatusLoading(false);
    }
  };

  const getGoogleAccessToken = async (): Promise<{ token: string | null; source: 'cache' | 'session' | 'hook' | 'none'; expiresAt: number | null }> => {
    // Best signal: global auth hook already captured provider_token from Supabase session updates.
    if (providerToken) {
      const exp = Date.now() + 55 * 60 * 1000;
      return { token: providerToken, source: 'hook', expiresAt: exp };
    }

    const cachedToken = localStorage.getItem('google_contacts_token');
    const cachedExpiryRaw = localStorage.getItem('google_contacts_token_expiry');
    const cachedExpiry = cachedExpiryRaw ? Number.parseInt(cachedExpiryRaw, 10) : NaN;

    if (cachedToken && Number.isFinite(cachedExpiry) && Date.now() < cachedExpiry) {
      return { token: cachedToken, source: 'cache', expiresAt: cachedExpiry };
    }

    const { data } = await supabase.auth.getSession();
    const t = data?.session?.provider_token || null;
    if (t) {
      const exp = Date.now() + 55 * 60 * 1000;
      localStorage.setItem('google_contacts_token', t);
      localStorage.setItem('google_contacts_token_expiry', exp.toString());
      return { token: t, source: 'session', expiresAt: exp };
    }

    return { token: null, source: 'none', expiresAt: null };
  };

  const refreshGoogleStatus = async (): Promise<boolean> => {
    try {
      const s = await apiGet('/api/google/status', { skipCache: true });
      const connected = Boolean(s?.connected);
      // Keep the existing shape even though "source" is now backend-driven.
      setGoogle({ connected, source: connected ? 'session' : 'none', expiresAt: null });
      return connected;
    } catch {
      setGoogle({ connected: false, source: 'none', expiresAt: null });
      return false;
    }
  };

  const ensureQrDataUrl = async (qr: string) => {
    try {
      const url = await QRCode.toDataURL(qr, { margin: 1, width: 240 });
      setQrDataUrl(url);
    } catch {
      setQrDataUrl(null);
    }
  };

  const fetchQr = async () => {
    try {
      const q = await apiGet('/api/whatsapp/qr', { skipCache: true });
      
      // If connected, stop polling
      if (q?.connected || q?.sessionStatus === 'connected') {
        stopPolling();
        setQrText(null);
        setQrDataUrl(null);
        lastQrTextRef.current = null;
        // Keep status in sync without flashing loading state.
        void refreshStatus(false, true);
        return;
      }
      
      const nextQr = typeof q?.qr === 'string' ? q.qr : null;
      if (nextQr && nextQr !== lastQrTextRef.current) {
        lastQrTextRef.current = nextQr;
        setQrText(nextQr);
        void ensureQrDataUrl(nextQr);
      } else if (!nextQr && lastQrTextRef.current) {
        // QR expired/cleared server-side; keep a stable UI but remove the QR image.
        lastQrTextRef.current = null;
        setQrText(null);
        setQrDataUrl(null);
      }
    } catch (e: any) {
      const msg = String(e?.message || '');
      if (msg.includes('→ 429') || msg.includes(' 429 ')) {
        stopPolling();
      }
    }
  };

  const startPolling = () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    // Fetch QR immediately, then poll every 10 seconds (QR codes last ~20 seconds)
    void fetchQr();
    pollTimer.current = window.setInterval(fetchQr, 10000);
  };

  const stopPolling = () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = null;
  };

  useEffect(() => {
    // Pass autoReconnect=true on initial load to auto-reconnect WhatsApp if credentials exist
    // Small delay to ensure auth token is fully propagated
    const timer = setTimeout(() => {
      refreshStatus(true).catch(() => {});
      refreshGoogleStatus().catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, session?.access_token]);

  // When Supabase session updates after OAuth redirect, providerToken will populate via useAuth.
  useEffect(() => {
    refreshGoogleStatus().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerToken]);

  useEffect(() => {
    if (status?.connected) {
      stopPolling();
      setQrText(null);
      setQrDataUrl(null);
      lastQrTextRef.current = null;
    } else if (status?.sessionStatus === 'qr' || status?.hasQr) {
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.sessionStatus, status?.hasQr]);

  // While the backend is reconnecting (hasAuth but sessionStatus is connecting),
  // silently poll status so the UI flips to "Connected" without requiring a manual refresh.
  useEffect(() => {
    if (!status?.hasAuth) return;
    if (status?.connected) return;
    if (status?.sessionStatus !== 'connecting') return;

    const t = window.setInterval(() => {
      void refreshStatus(false, true);
    }, 2000);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.hasAuth, status?.connected, status?.sessionStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      await apiPost('/api/whatsapp/connect', {});
      await refreshStatus();
      startPolling();
    } finally {
      setConnecting(false);
    }
  };

  const handleConnectGoogle = async () => {
    setConnectingGoogle(true);
    try {
      // Use the backend Google connect flow so refresh tokens are stored server-side.
      const returnTo = getCurrentPathWithSearchAndHash();
      const r = await apiGet(`/api/google/connect?returnTo=${encodeURIComponent(returnTo)}`, { skipCache: true });
      const url = r?.url;
      if (!url || typeof url !== 'string') throw new Error('Missing Google auth URL');
      window.location.assign(url);
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleSync = async (force = false) => {
    setSyncing(true);
    try {
      const googleConnected = await refreshGoogleStatus();
      if (!googleConnected) {
        setStatus((prev) => (prev ? { ...prev, lastError: 'Connect Google to load contacts.' } : prev));
        return;
      }
      const r = await apiGet(`/api/google/contacts${force ? '?force=1' : ''}`, { skipCache: true });
      const entries = Array.isArray(r?.entries) ? (r.entries as any[]) : [];

      const byPhone = new Map<string, InviteContact>();
      for (const e of entries) {
        const phone = typeof e?.digits === 'string' ? String(e.digits) : '';
        if (!phone) continue;
        if (byPhone.has(phone)) continue;
        byPhone.set(phone, {
          id: phone,
          phone,
          name: typeof e?.displayName === 'string' ? String(e.displayName) : null,
          photoUrl: typeof e?.photoUrl === 'string' ? String(e.photoUrl) : null,
          emails: Array.isArray(e?.emails) ? (e.emails as string[]) : null,
        });
      }

      const list = Array.from(byPhone.values()).sort((a, b) =>
        String(a.name || a.phone || '').localeCompare(String(b.name || b.phone || ''))
      );

      setContacts(list);
      setSelected({});
      if (list.length === 0) {
        setStatus((prev) =>
          prev
            ? { ...prev, lastError: 'No phone numbers found in Google Contacts.' }
            : prev
        );
      } else {
        setStatus((prev) => prev ? { ...prev, lastError: null } : prev);
      }
    } catch (e: any) {
      console.error('[WhatsApp Sync] Error:', e);
      const msg = e?.message || String(e);
      setStatus((prev) => prev ? { ...prev, lastError: `Sync failed: ${msg}` } : prev);
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    await apiPost('/api/whatsapp/disconnect', {});
    setContacts([]);
    setSelected({});
    setQrText(null);
    setQrDataUrl(null);
    lastQrTextRef.current = null;
    await refreshStatus();
  };

  const toggleAllFiltered = (value: boolean) => {
    const next = { ...selected };
    for (const c of filteredContacts) next[c.id] = value;
    setSelected(next);
  };

  const handleSendInvites = async () => {
    setSending(true);
    try {
      await apiPost('/api/whatsapp/send-invites', {
        phones: selectedPhones,
        message: inviteMessage,
      });
    } finally {
      setSending(false);
    }
  };

  // WhatsApp enrichment removed: contacts come from Google.

  return (
    <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <img
            src={getLogoDevUrl('whatsapp.com')}
            alt="WhatsApp"
            className="w-4 h-4 rounded-sm bg-black"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">WHATSAPP</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => refreshStatus()}
            className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-8"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Google status (always visible) */}
      <div className="flex items-center justify-between gap-3 mb-3 rounded-xl border border-[#222] bg-black/40 px-3 py-2">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={getLogoDevUrl('google.com')}
            alt="Google"
            className="w-4 h-4 rounded-sm bg-black"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0">
            <div className="text-white font-gilroy tracking-[0.12em] uppercase text-[10px]">Google Contacts</div>
            <div className="text-[#666] font-gilroy text-[11px] truncate">
              {google.connected ? `Connected (names will show) • ${google.source}` : 'Not connected (names may be phone-only)'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {!google.connected && (
            <Button
              type="button"
              onClick={handleConnectGoogle}
              disabled={connectingGoogle}
              className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
            >
              <Link2 className="w-4 h-4 mr-2" />
              {connectingGoogle ? 'Connecting…' : 'Connect Google'}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => refreshGoogleStatus()}
            className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
            title={google.connected && google.expiresAt ? `Token expires ~${new Date(google.expiresAt).toLocaleTimeString()}` : undefined}
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Invite link (privacy-friendly) */}
      <div className="mb-3 rounded-xl border border-[#222] bg-black/40 p-3">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="text-white font-gilroy tracking-[0.12em] uppercase text-[10px]">Invite link</div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              className="bg-[#25D366] text-black hover:bg-[#25D366]/90 font-gilroy tracking-[0.15em] uppercase text-[10px] h-8"
              onClick={() => {
                const url = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
              title="Open WhatsApp with your invite message"
            >
              <MessageSquare className="w-3 h-3 mr-2" />
              WhatsApp
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-8"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(inviteLink);
                  setStatus((prev) => (prev ? { ...prev, lastError: null } : prev));
                } catch {
                  setStatus((prev) => (prev ? { ...prev, lastError: 'Copy failed. Please copy manually.' } : prev));
                }
              }}
            >
              <Copy className="w-3 h-3 mr-2" />
              Copy
            </Button>
          </div>
        </div>
        <Input value={inviteLink} readOnly className="bg-black border-[#333] text-white font-gilroy text-sm h-9" />
        <div className="text-[#666] font-gilroy text-[11px] mt-2">
          Sharing this link preserves privacy (we don’t need to read your contacts). When someone signs up with it, you’ll be connected automatically.
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
          {status?.connected ? 'Connected' : 'Not connected'}
        </span>
        <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#666]">
          Session {status?.sessionStatus || '—'}
        </span>
      </div>

      {status?.lastError && (
        <div className="text-[#a66] font-gilroy text-xs mb-3">
          {status.lastError}
        </div>
      )}

      {statusLoading ? (
        <div className="text-[#666] font-gilroy text-sm">Checking WhatsApp connection…</div>
      ) : !status?.connected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[#666] font-gilroy text-sm mb-3">
              Connect WhatsApp to send invites. Contacts are imported from Google Contacts.
            </div>
            <Button
              type="button"
              onClick={handleConnect}
              disabled={connecting || !session?.access_token}
              className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-10"
            >
              <Link2 className="w-4 h-4 mr-2" />
              {!session?.access_token ? 'Sign in required' : connecting ? 'Starting…' : 'Connect WhatsApp'}
            </Button>
          </div>
          <div className="flex items-center justify-center rounded-xl border border-[#222] bg-black/40 p-4 min-h-[280px]">
            {qrDataUrl ? (
              <img 
                key="whatsapp-qr"
                src={qrDataUrl} 
                alt="WhatsApp QR" 
                className="w-[240px] h-[240px] rounded-lg bg-white p-2 transition-opacity duration-200" 
              />
            ) : (
              <div className="text-center">
                <div className="text-white font-gilroy tracking-[0.12em] uppercase text-[10px]">QR will appear here</div>
                <div className="text-[#666] font-gilroy text-sm mt-2">
                  Tap "Connect WhatsApp", then scan using WhatsApp → Linked Devices.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="flex flex-col md:flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSync(false)}
              disabled={syncing}
              className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
            >
              <Users className="w-4 h-4 mr-2" />
              {syncing ? 'Loading…' : 'Load Google Contacts'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleSync(true)}
              disabled={syncing}
              className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
              title="Force refresh Google Contacts cache"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Force refresh
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleDisconnect}
              className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Disconnect
            </Button>
          </div>

          {contacts.length === 0 && (
            <div className="mt-4 rounded-xl border border-[#222] bg-black/40 p-4 text-[#666] font-gilroy text-sm">
              {google.connected ? 'Click “Load Google Contacts” to import, then invite via WhatsApp.' : 'Connect Google to load contacts.'}
            </div>
          )}

          {contacts.length > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <Input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="Search contacts…"
                  className="bg-black border-[#333] text-white font-gilroy text-sm h-9"
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toggleAllFiltered(true)}
                    className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
                  >
                    All
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toggleAllFiltered(false)}
                    className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
                  >
                    None
                  </Button>
                </div>
              </div>

              <div className="max-h-[320px] overflow-y-auto rounded-xl border border-[#222] bg-black/40">
                {filteredContacts.slice(0, 200).map((c) => {
                  const label = c.name || c.phone || c.id;
                  return (
                    <label
                      key={c.id}
                      className="flex items-center gap-3 px-3 py-2 border-b border-[#1a1a1a] hover:bg-black/60 cursor-pointer"
                    >
                      <Checkbox
                        checked={!!selected[c.id]}
                        onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [c.id]: Boolean(v) }))}
                      />
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#111] border border-[#222] flex items-center justify-center flex-shrink-0">
                        {c.photoUrl ? (
                          <img
                            src={c.photoUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="text-[#666] font-gilroy text-[10px] tracking-[0.12em] uppercase">
                            {(label || '').trim().slice(0, 1) || '?'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-gilroy text-sm truncate">{label}</div>
                        <div className="text-[#666] font-gilroy text-[10px] tracking-[0.12em] uppercase truncate">
                          {c.phone ? `+${c.phone}` : 'No phone'}
                        </div>
                      </div>
                    </label>
                  );
                })}
                {filteredContacts.length === 0 && (
                  <div className="p-4 text-[#666] font-gilroy text-sm">No contacts found.</div>
                )}
              </div>

              <div className="mt-3">
                <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666] mb-2">
                  Invite message
                </div>
                <Input
                  value={inviteMessage}
                  onChange={(e) => setInviteMessage(e.target.value)}
                  className="bg-black border-[#333] text-white font-gilroy text-sm h-9"
                  placeholder={`Hey — join me on Zaurq: ${inviteLink}`}
                />
                <Button
                  type="button"
                  onClick={handleSendInvites}
                  disabled={sending || selectedPhones.length === 0}
                  className="mt-2 bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-10"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  {sending ? 'Sending…' : `Send invites (${selectedPhones.length})`}
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}


