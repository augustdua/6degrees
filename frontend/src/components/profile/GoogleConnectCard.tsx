import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Link2, LogOut, RefreshCw } from 'lucide-react';

export default function GoogleConnectCard() {
  const [status, setStatus] = useState<{
    connected: boolean;
    hasRefreshToken: boolean;
    hasAccessToken: boolean;
    cacheFetchedAt: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    const s = await apiGet('/api/google/status', { skipCache: true });
    setStatus({
      connected: !!s?.connected,
      hasRefreshToken: !!s?.hasRefreshToken,
      hasAccessToken: !!s?.hasAccessToken,
      cacheFetchedAt: s?.cacheFetchedAt || null,
    });
  };

  useEffect(() => {
    refresh().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const r = await apiGet('/api/google/connect', { skipCache: true });
      const url = typeof r?.url === 'string' ? r.url : null;
      if (!url) throw new Error('Missing Google auth URL');
      window.location.assign(url);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await apiPost('/api/google/disconnect', {});
      await refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-[#222] bg-gradient-to-br from-[#111] to-black p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">GOOGLE CONTACTS</h3>
        <Button
          type="button"
          variant="outline"
          onClick={() => refresh()}
          className="border-[#333] text-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-8"
        >
          <RefreshCw className="w-3 h-3 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#888]">
          {status?.connected ? 'Connected' : 'Not connected'}
        </span>
        <span className="px-2 py-1 rounded-full text-[9px] font-gilroy tracking-[0.15em] uppercase border border-[#333] bg-black/40 text-[#666]">
          Names source: your saved contacts
        </span>
      </div>

      <div className="text-[#666] font-gilroy text-sm mb-3">
        Connect Google first so WhatsApp invites show the names you saved (not just phone numbers).
      </div>

      <div className="flex gap-2">
        {!status?.connected ? (
          <Button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-10 flex-1"
          >
            <Link2 className="w-4 h-4 mr-2" />
            {loading ? 'Connecting…' : 'Connect Google'}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleDisconnect}
            disabled={loading}
            variant="outline"
            className="border-[#333] text-white hover:bg-[#1a1a1a] font-gilroy tracking-[0.15em] uppercase text-[10px] h-10 flex-1"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect
          </Button>
        )}
      </div>

      {status?.cacheFetchedAt && (
        <div className="mt-3 text-[#666] font-gilroy text-[10px] tracking-[0.12em] uppercase">
          Cache: {new Date(status.cacheFetchedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}


