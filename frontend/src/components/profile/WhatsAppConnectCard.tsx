import React, { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, RefreshCw, Link2, LogOut, Phone } from 'lucide-react';

type WhatsAppContact = {
  jid: string;
  name?: string | null;
  notify?: string | null;
  verifiedName?: string | null;
  phone?: string | null;
};

export default function WhatsAppConnectCard() {
  const [status, setStatus] = useState<{
    connected: boolean;
    hasAuth: boolean;
    sessionStatus: string;
    hasQr: boolean;
    lastError: string | null;
  } | null>(null);
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

  const refreshStatus = async () => {
    const s = await apiGet('/api/whatsapp/status', { skipCache: true });
    setStatus({
      connected: !!s?.connected,
      hasAuth: !!s?.hasAuth,
      sessionStatus: String(s?.sessionStatus || 'none'),
      hasQr: !!s?.hasQr,
      lastError: s?.lastError || null,
    });
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
    return () => stopPolling();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleSync = async () => {
    setSyncing(true);
    try {
      const r = await apiPost('/api/whatsapp/sync-contacts', {});
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

  return (
    <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">WHATSAPP</h3>
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

      {!status?.connected ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-[#666] font-gilroy text-sm mb-3">
              Connect your WhatsApp to sync contacts and send invites.
            </div>
            <Button
              type="button"
              onClick={handleConnect}
              disabled={connecting}
              className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-10"
            >
              <Link2 className="w-4 h-4 mr-2" />
              {connecting ? 'Starting…' : 'Connect WhatsApp'}
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
                      <div className="min-w-0 flex-1">
                        <div className="text-white font-gilroy text-sm truncate">{label}</div>
                        <div className="text-[#666] font-gilroy text-[10px] tracking-[0.12em] uppercase truncate">
                          {c.phone ? `+${c.phone}` : c.jid}
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


