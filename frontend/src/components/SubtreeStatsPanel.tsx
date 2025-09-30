import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Snowflake, Flame, TrendingUp, Users, Award, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface SubtreeStats {
  subtree_root_id: string;
  subtree_root_name: string;
  path_count: number;
  avg_path_length: number;
  is_frozen: boolean;
  freeze_ends_at: string | null;
  leaf_count: number;
  deepest_path_length: number;
  current_potential_usd?: number;
}

interface SubtreeStatsPanelProps {
  chainId: string;
  isCreator: boolean;
  userId?: string;
  participants?: Array<{ userid: string; parentUserId?: string | null; firstName?: string; lastName?: string }>;
  className?: string;
}

export default function SubtreeStatsPanel({ chainId, isCreator, userId, participants = [], className = '' }: SubtreeStatsPanelProps) {
  const [stats, setStats] = useState<SubtreeStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalStats, setTotalStats] = useState({
    totalPaths: 0,
    totalPotentialUsd: 0,
    totalSubtrees: 0,
    frozenSubtrees: 0
  });

  useEffect(() => {

    fetchSubtreeStats();
    // Refresh every 60 seconds
    const interval = setInterval(fetchSubtreeStats, 60000);
    return () => clearInterval(interval);
  }, [chainId, isCreator]);

  const fetchSubtreeStats = async () => {
    try {
      const apiUrl =
        import.meta.env.VITE_BACKEND_URL ||
        import.meta.env.VITE_API_URL ||
        window.location.origin.replace(/\/$/, '');
      const url = `${apiUrl}/api/paths/${chainId}/subtree-stats`;

      console.log('[SubtreeStats] Fetching from:', url);
      console.log('[SubtreeStats] isCreator:', isCreator);

      // Get current Supabase access token for Authorization header
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || '';

      const response = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      console.log('[SubtreeStats] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SubtreeStats] Error response:', errorText);
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      console.log('[SubtreeStats] Received data:', data);
      let subtrees = data.data?.subtrees || data.subtrees || [];

      // Filter for non-creators: only show the subtree they belong to
      if (!isCreator && userId) {
        // Find the user's subtree root: if user has a parentUserId, their subtree root is that parent; else themselves
        const me = participants.find(p => p.userid === userId);
        // Heuristic: use parentUserId if present, otherwise the user's own id
        const subtreeRootId = me?.parentUserId || me?.userid;
        if (subtreeRootId) {
          subtrees = subtrees.filter((s: any) => s.subtree_root_id === subtreeRootId);
        }
      }
      setStats(subtrees);

      // Calculate totals
      const totals = {
        totalPaths: subtrees.reduce((sum: number, s: any) => sum + (s.path_count || 0), 0),
        totalPotentialUsd: subtrees.reduce((sum: number, s: any) => sum + (s.current_potential_usd || 0), 0),
        totalSubtrees: subtrees.length,
        frozenSubtrees: subtrees.filter((s: any) => s.is_frozen).length
      };
      setTotalStats(totals);
    } catch (error) {
      console.error('Error fetching subtree stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = (freezeEndsAt: string | null): string => {
    if (!freezeEndsAt) return '';

    const now = new Date();
    const endTime = new Date(freezeEndsAt);
    const diff = endTime.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m`;
  };

  if (!isCreator) return null;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Subtree Statistics</CardTitle>
          <CardDescription>Loading stats...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (stats.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Subtree Statistics</CardTitle>
          <CardDescription>No subtrees found. Participants will appear here as they join your chain.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Subtrees</p>
                <p className="text-2xl font-bold">{totalStats.totalSubtrees}</p>
              </div>
              <Users className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Paths</p>
                <p className="text-2xl font-bold">{totalStats.totalPaths}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Frozen Subtrees</p>
                <p className="text-2xl font-bold">{totalStats.frozenSubtrees}</p>
              </div>
              <Snowflake className="h-8 w-8 text-blue-500 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Subtree Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Subtree Details
          </CardTitle>
          <CardDescription>
            Performance breakdown by subtree. Each direct child of yours creates an independent subtree.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.map((subtree, index) => (
              <Card key={subtree.subtree_root_id} className="border-l-4" style={{
                borderLeftColor: subtree.is_frozen ? '#3b82f6' : '#f97316'
              }}>
                <CardContent className="pt-4 pb-4">
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-base truncate">
                            {subtree.subtree_root_name || `Subtree ${index + 1}`}
                          </h4>
                          {subtree.is_frozen ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 flex items-center gap-1">
                              <Snowflake className="h-3 w-3" />
                              Frozen
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 flex items-center gap-1">
                              <Flame className="h-3 w-3" />
                              Decaying
                            </Badge>
                          )}
                        </div>
                        {subtree.is_frozen && subtree.freeze_ends_at && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            Unfreezes in {formatTimeRemaining(subtree.freeze_ends_at)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Paths</p>
                        <p className="font-semibold">{subtree.path_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Leaf Nodes</p>
                        <p className="font-semibold">{subtree.leaf_count}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Depth</p>
                        <p className="font-semibold">{subtree.avg_path_length.toFixed(1)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Max Depth</p>
                        <p className="font-semibold">{subtree.deepest_path_length}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Potential (USD)</p>
                        <p className="font-semibold">${(subtree.current_potential_usd ?? 0).toFixed(2)}</p>
                      </div>
                    </div>

                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}