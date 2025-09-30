import { useEffect, useState } from 'react';
import { Snowflake, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface DashboardRewardTimerProps {
  chainId: string;
  userId: string;
}

export default function DashboardRewardTimer({ chainId, userId }: DashboardRewardTimerProps) {
  const [rewardData, setRewardData] = useState<{
    currentReward: number;
    isFrozen: boolean;
    freezeEndsAt: string | null;
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
            currentReward: userReward.currentReward,
            isFrozen: userReward.isFrozen,
            freezeEndsAt: userReward.freezeEndsAt
          });
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
        <DollarSign className="h-3 w-3" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="flex items-center gap-1 font-medium">
        <DollarSign className="h-3 w-3" />
        ${rewardData.currentReward.toFixed(2)}
      </div>
      {rewardData.isFrozen ? (
        <div className="flex items-center gap-1 text-blue-500">
          <Snowflake className="h-3 w-3" />
          <span>Frozen</span>
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

function DollarSign({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}