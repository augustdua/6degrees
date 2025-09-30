import { useEffect, useState } from 'react';
import { Snowflake, Flame, Hourglass } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DashboardRewardTimerProps {
  chainId: string;
  userId: string;
}

export default function DashboardRewardTimer({ chainId, userId }: DashboardRewardTimerProps) {
  const [rewardData, setRewardData] = useState<{
    isFrozen: boolean;
    freezeEndsAt: string | null;
    graceEndsAt: string | null;
    hoursOfDecay: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReward = async () => {
      try {
        const apiUrl =
          import.meta.env.VITE_BACKEND_URL ||
          import.meta.env.VITE_API_URL ||
          window.location.origin.replace(/\/$/, '');
        const url = `${apiUrl}/api/paths/${chainId}/participant-rewards`;

        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || '';

        const response = await fetch(url, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });

        if (!response.ok) return;

        const data = await response.json();
        const userReward = (data.data || []).find((pr: any) => pr.userid === userId);

        if (userReward) {
          setRewardData({
            isFrozen: !!userReward.isFrozen,
            freezeEndsAt: userReward.freezeEndsAt || null,
            graceEndsAt: userReward.graceEndsAt || null,
            hoursOfDecay: Number(userReward.hoursOfDecay) || 0,
          });
        } else {
          setRewardData(null);
        }
      } catch (error) {
        console.error('Error fetching reward:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReward();
    const interval = setInterval(fetchReward, 60000);
    return () => clearInterval(interval);
  }, [chainId, userId]);

  if (loading || !rewardData) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground">
        <Hourglass className="h-3 w-3" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      {rewardData.isFrozen ? (
        <div className="flex items-center gap-1 text-blue-500">
          <Snowflake className="h-3 w-3" />
          <span>Frozen</span>
        </div>
      ) : rewardData.graceEndsAt && new Date(rewardData.graceEndsAt) > new Date() ? (
        <div className="flex items-center gap-1 text-amber-500">
          <Hourglass className="h-3 w-3" />
          <span>Grace</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-orange-500">
          <Flame className="h-3 w-3" />
          <span>Decaying</span>
        </div>
      )}
    </div>
  );
}