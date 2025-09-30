import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Snowflake, Flame } from 'lucide-react';
import { ChainParticipant, calculateCurrentReward, getRemainingFreezeTime, isRewardFrozen } from '@/lib/chainsApi';
import { convertAndFormatINR } from '@/lib/currency';

interface RewardDecayTimerProps {
  participant: ChainParticipant;
  baseReward: number;
  className?: string;
}

export default function RewardDecayTimer({ participant, baseReward, className = '' }: RewardDecayTimerProps) {
  const [currentReward, setCurrentReward] = useState(0);
  const [isFrozen, setIsFrozen] = useState(false);
  const [freezeTimeRemaining, setFreezeTimeRemaining] = useState(0);

  useEffect(() => {
    // Update rewards and freeze status every 60 seconds
    const updateReward = () => {
      const reward = calculateCurrentReward(participant, baseReward);
      setCurrentReward(reward);
      setIsFrozen(isRewardFrozen(participant));
      setFreezeTimeRemaining(getRemainingFreezeTime(participant));
    };

    // Initial update
    updateReward();

    // Set up interval for updates
    const interval = setInterval(updateReward, 60000); // Update every 60 seconds

    return () => clearInterval(interval);
  }, [participant, baseReward]);

  const formatFreezeTime = (milliseconds: number): string => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  return (
    <Card className={`p-3 sm:p-4 ${className}`}>
      <div className="space-y-2">
        {/* Reward Display */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs sm:text-sm text-muted-foreground">Current Reward:</span>
          <span className="text-base sm:text-lg font-bold tabular-nums">
            {convertAndFormatINR(currentReward)}
          </span>
        </div>

        {/* Status Display */}
        <div className="flex items-start gap-2 pt-2 border-t">
          {isFrozen ? (
            <>
              <Snowflake className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-blue-500">
                  ❄️ FROZEN
                </p>
                <p className="text-xs text-muted-foreground break-words">
                  {formatFreezeTime(freezeTimeRemaining)} remaining
                </p>
              </div>
            </>
          ) : (
            <>
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-orange-500">
                  🔥 Decaying
                </p>
                <p className="text-xs text-muted-foreground break-words">
                  -₹{(0.01 * 83).toFixed(2)}/hr • Add a child to freeze!
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}