import React from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface ChainDebuggerProps {
  requestId?: string;
}

export default function ChainDebugger({ requestId }: ChainDebuggerProps) {
  const { user } = useAuth();
  const [debugData, setDebugData] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);

  const fetchDebugData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch all chains
      const { data: chains, error: chainsError } = await supabase
        .from('chains')
        .select(`
          id,
          request_id,
          participants,
          status,
          total_reward,
          created_at,
          request:connection_requests!request_id (
            id,
            target,
            creator_id
          )
        `)
        .order('created_at', { ascending: false });

      if (chainsError) {
        console.error('Chains error:', chainsError);
        setDebugData({ error: chainsError });
        return;
      }

      // Fetch user's requests
      const { data: requests, error: requestsError } = await supabase
        .from('connection_requests')
        .select('*')
        .eq('creator_id', user.id);

      if (requestsError) {
        console.error('Requests error:', requestsError);
      }

      setDebugData({
        user: {
          id: user.id,
          email: user.email
        },
        chains: chains || [],
        requests: requests || [],
        chainsError,
        requestsError
      });
    } catch (error) {
      console.error('Debug fetch error:', error);
      setDebugData({ error });
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchDebugData();
  }, [user]);

  if (!user) return <div>Please log in to see debug data</div>;

  return (
    <div className="p-4 border rounded-lg bg-muted">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Chain Debugger</h3>
        <button 
          onClick={fetchDebugData}
          disabled={loading}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {debugData && (
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">User Info</h4>
            <pre className="text-xs bg-background p-2 rounded overflow-auto">
              {JSON.stringify(debugData.user, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">All Chains ({debugData.chains?.length || 0})</h4>
            <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-60">
              {JSON.stringify(debugData.chains, null, 2)}
            </pre>
          </div>

          <div>
            <h4 className="font-medium mb-2">User's Requests ({debugData.requests?.length || 0})</h4>
            <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-40">
              {JSON.stringify(debugData.requests, null, 2)}
            </pre>
          </div>

          {debugData.chainsError && (
            <div>
              <h4 className="font-medium mb-2 text-red-600">Chains Error</h4>
              <pre className="text-xs bg-red-50 p-2 rounded overflow-auto">
                {JSON.stringify(debugData.chainsError, null, 2)}
              </pre>
            </div>
          )}

          {debugData.requestsError && (
            <div>
              <h4 className="font-medium mb-2 text-red-600">Requests Error</h4>
              <pre className="text-xs bg-red-50 p-2 rounded overflow-auto">
                {JSON.stringify(debugData.requestsError, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
