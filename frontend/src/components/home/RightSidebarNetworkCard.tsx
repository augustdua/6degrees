import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { useConnections } from '@/hooks/useConnections';

type DemoConn = { id: string; name: string };

export function RightSidebarNetworkCard(props: { onAddContacts?: () => void } = {}) {
  const navigate = useNavigate();
  const { connections, loading, error } = useConnections();

  const demo: DemoConn[] = useMemo(
    () => [
      { id: 'demo-1', name: 'Aarav Mehta' },
      { id: 'demo-2', name: 'Sana Kapoor' },
      { id: 'demo-3', name: 'Rohan Gupta' },
    ],
    []
  );

  const items = connections.slice(0, 6).map((c) => ({
    id: c.connectedUserId,
    name: `${c.firstName} ${c.lastName}`.trim(),
    avatarUrl: c.avatarUrl || null,
  }));

  const showDemo = !loading && (items.length === 0 || !!error);

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b border-border flex items-center gap-2">
        <Users className="w-4 h-4 text-[#CBAA5A]" />
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">My Network</h3>
        <button
          type="button"
          onClick={() => navigate('/network')}
          className="ml-auto text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A] hover:underline"
        >
          View all
        </button>
      </div>

      <div className="p-3">
        {loading ? (
          <div className="space-y-2">
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
            <div className="h-8 bg-muted rounded" />
          </div>
        ) : showDemo ? (
          <div>
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A]">Demo</div>
              <button
                type="button"
                onClick={() => (props.onAddContacts ? props.onAddContacts() : navigate('/network'))}
                className="text-[10px] font-bold tracking-[0.18em] uppercase text-[#CBAA5A] hover:underline"
              >
                Add contacts
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {demo.map((d) => (
                <div key={d.id} className="flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-2">
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                    {d.name.slice(0, 1)}
                  </div>
                  <div className="text-sm text-foreground truncate">{d.name}</div>
                </div>
              ))}
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Your real network will appear here once you add connections.
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => navigate('/network')}
                className="w-full flex items-center gap-2 rounded-md border border-border bg-muted/30 px-2 py-2 hover:bg-muted transition-colors"
                title={c.name}
              >
                <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                  {c.avatarUrl ? (
                    <img src={c.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    c.name.slice(0, 1) || '?'
                  )}
                </div>
                <div className="text-sm text-foreground truncate">{c.name}</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


