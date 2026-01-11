import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, RefreshCw, Link2, LogOut, Phone, Sparkles } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { getLogoDevUrl } from '@/utils/logoDev.ts';
import { getCurrentPathWithSearchAndHash, getOAuthCallbackUrl, setPostAuthRedirect } from '@/lib/oauthRedirect';
import { useAuth } from '@/hooks/useAuth';

type WhatsAppContact = {
  jid: string;
  name?: string | null;
  notify?: string | null;
  verifiedName?: string | null;
  phone?: string | null;
  profilePictureUrl?: string | null;
  about?: string | null;
  aboutSetAt?: string | null;
  lastEnrichedAt?: string | null;
};

export default function WhatsAppConnectCard() {
  const { providerToken, session, isReady } = useAuth();
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
  const [syncing, setSyncing] = useState(false);
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [inviteMessage, setInviteMessage] = useState(() => {
    const base = window.location.origin;
    return `Hey — join me on Zaurq: ${base}`;
  });
  const [sending, setSending] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [google, setGoogle] = useState<{
    connected: boolean;
    source: 'cache' | 'session' | 'hook' | 'none';
    expiresAt: number | null;
  }>({ connected: false, source: 'none', expiresAt: null });
  const [connectingGoogle, setConnectingGoogle] = useState(false);
  const pollTimer = useRef<number | null>(null);

  const filteredContacts = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return contacts;
    return contacts.filter((c) => {
      const name = `${c.name || ''} ${c.notify || ''} ${c.verifiedName || ''}`.toLowerCase();
      const phone = String(c.phone || '').toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [contacts, filter]);

  const selectedPhones = useMemo(() => {
    const out: string[] = [];
    for (const c of contacts) {
      if (selected[c.jid] && c.phone) out.push(c.phone);
    }
    return out;
  }, [contacts, selected]);

  const selectedJids = useMemo(() => {
    const out: string[] = [];
    for (const c of contacts) {
      if (selected[c.jid]) out.push(c.jid);
    }
    return out;
  }, [contacts, selected]);

  const refreshStatus = async () => {
    // Avoid showing a false "disconnected" flash while auth is still initializing.
    if (!isReady || !session?.access_token) {
      setStatusLoading(true);
      return;
    }
    setStatusLoading(true);
    try {
      const s = await apiGet('/api/whatsapp/status', { skipCache: true });
      setStatus({
        connected: !!s?.connected,
        hasAuth: !!s?.hasAuth,
        sessionStatus: String(s?.sessionStatus || 'none'),
        hasQr: !!s?.hasQr,
        lastError: s?.lastError || null,
      });
    } catch (e: any) {
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
    } finally {
      setStatusLoading(false);
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

  const refreshGoogleStatus = async () => {
    try {
      const { token, source, expiresAt } = await getGoogleAccessToken();
      setGoogle({ connected: Boolean(token), source, expiresAt });
    } catch {
      setGoogle({ connected: false, source: 'none', expiresAt: null });
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

  const startPolling = () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = window.setInterval(async () => {
      try {
        // Keep polling lightweight to avoid rate limits: refresh status, fetch QR only when needed.
        await refreshStatus();
        if (status?.connected) return;
        const q = await apiGet('/api/whatsapp/qr', { skipCache: true });
        const nextQr = typeof q?.qr === 'string' ? q.qr : null;
        if (nextQr && nextQr !== qrText) {
          setQrText(nextQr);
          void ensureQrDataUrl(nextQr);
        }
      } catch (e: any) {
        // If we're being rate-limited, stop polling; user can hit Refresh or reconnect.
        const msg = String(e?.message || '');
        if (msg.includes('→ 429') || msg.includes(' 429 ')) {
          stopPolling();
        }
      }
    }, 5000);
  };

  const stopPolling = () => {
    if (pollTimer.current) window.clearInterval(pollTimer.current);
    pollTimer.current = null;
  };

  useEffect(() => {
    refreshStatus().catch(() => {});
    refreshGoogleStatus().catch(() => {});
    return () => stopPolling();
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
    } else if (status?.sessionStatus === 'qr' || status?.hasQr) {
      startPolling();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.connected, status?.sessionStatus, status?.hasQr]);

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
      // Persist current screen so we can return here after OAuth completes.
      setPostAuthRedirect(getCurrentPathWithSearchAndHash());

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/contacts.readonly https://www.googleapis.com/auth/contacts.other.readonly',
          redirectTo: getOAuthCallbackUrl(),
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } finally {
      setConnectingGoogle(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      // If Google People API is already set up via Supabase (provider_token),
      // send that token so backend can merge your saved contact names.
      const { token: googleAccessToken } = await getGoogleAccessToken();
      await refreshGoogleStatus();

      const r = await apiPost('/api/whatsapp/sync-contacts', {
        ...(googleAccessToken ? { googleAccessToken } : {}),
      });
      const list = Array.isArray(r?.contacts) ? (r.contacts as WhatsAppContact[]) : [];
      setContacts(list);
      setSelected({});
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
    await refreshStatus();
  };

  const toggleAllFiltered = (value: boolean) => {
    const next = { ...selected };
    for (const c of filteredContacts) next[c.jid] = value;
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

  const handleEnrichSelected = async () => {
    if (selectedJids.length === 0) return;
    setEnriching(true);
    try {
      const r = await apiPost('/api/whatsapp/contact-details', {
        jids: selectedJids.slice(0, 60),
        includePhoto: true,
        includeAbout: true,
        includeBusiness: true,
        limit: 60,
      });
      const details = Array.isArray(r?.details) ? (r.details as Partial<WhatsAppContact>[]) : [];
      const byJid = new Map<string, Partial<WhatsAppContact>>();
      for (const d of details) {
        if (d && typeof d.jid === 'string') byJid.set(d.jid, d);
      }
      if (byJid.size === 0) return;
      setContacts((prev) =>
        prev.map((c) => {
          const d = byJid.get(c.jid);
          return d ? { ...c, ...d } : c;
        })
      );
    } finally {
      setEnriching(false);
    }
  };

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
              Connect your WhatsApp to sync contacts and send invites.
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
          <div className="flex items-center justify-center rounded-xl border border-[#222] bg-black/40 p-4">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="WhatsApp QR" className="w-[240px] h-[240px] rounded-lg bg-white p-2" />
            ) : (
              <div className="text-center">
                <div className="text-white font-gilroy tracking-[0.12em] uppercase text-[10px]">QR will appear here</div>
                <div className="text-[#666] font-gilroy text-sm mt-2">
                  Tap “Connect WhatsApp”, then scan using WhatsApp → Linked Devices.
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
              onClick={handleSync}
              disabled={syncing}
              className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
            >
              <Phone className="w-4 h-4 mr-2" />
              {syncing ? 'Syncing…' : 'Sync Contacts'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleEnrichSelected}
              disabled={enriching || selectedJids.length === 0}
              className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-9"
              title="Fetch profile photos + about/status (best-effort) for selected contacts"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {enriching ? 'Enriching…' : `Enrich (${selectedJids.length})`}
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
                  const label = c.name || c.notify || c.verifiedName || c.phone || c.jid;
                  return (
                    <label
                      key={c.jid}
                      className="flex items-center gap-3 px-3 py-2 border-b border-[#1a1a1a] hover:bg-black/60 cursor-pointer"
                    >
                      <Checkbox
                        checked={!!selected[c.jid]}
                        onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [c.jid]: Boolean(v) }))}
                      />
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[#111] border border-[#222] flex items-center justify-center flex-shrink-0">
                        {c.profilePictureUrl ? (
                          <img
                            src={c.profilePictureUrl}
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
                          {c.phone ? `+${c.phone}` : c.jid}
                        </div>
                        {c.about && (
                          <div className="text-[#888] font-gilroy text-[11px] truncate mt-0.5">
                            {c.about}
                          </div>
                        )}
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


