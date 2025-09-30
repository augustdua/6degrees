import { Card } from '@/components/ui/card';
import { Snowflake, Flame } from 'lucide-react';
import { useEffect, useState } from 'react';

interface RewardDecayDisplayProps {
  isFrozen: boolean;
  freezeEndsAt: string | null;
  graceEndsAt?: string | null;
  hoursOfDecay?: number;
  className?: string;
}

export default function RewardDecayDisplay({
  isFrozen,
  freezeEndsAt,
  graceEndsAt,
  hoursOfDecay,
  className = ''
}: RewardDecayDisplayProps) {
  const [freezeTimeRemaining, setFreezeTimeRemaining] = useState('');

  useEffect(() => {
    if (!freezeEndsAt || !isFrozen) {
      setFreezeTimeRemaining('');
      return;
    }

    const updateFreezeTime = () => {
      const now = new Date();
      const endTime = new Date(freezeEndsAt);
      const diff = endTime.getTime() - now.getTime();

      if (diff <= 0) {
        setFreezeTimeRemaining('Expired');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setFreezeTimeRemaining(`${hours}h ${minutes}m`);
    };

    updateFreezeTime();
    const interval = setInterval(updateFreezeTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [freezeEndsAt, isFrozen]);

  return (
    <Card className={`p-3 sm:p-4 ${className}`}>
      <div className="space-y-2">
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
                  {freezeTimeRemaining} remaining
                </p>
              </div>
            </>
          ) : graceEndsAt && new Date(graceEndsAt) > new Date() ? (
            <>
              <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-amber-500">
                  ⏳ GRACE PERIOD
                </p>
                <p className="text-xs text-muted-foreground break-words">
                  Ends at {new Date(graceEndsAt).toLocaleString()}
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
                  {hoursOfDecay ? `${hoursOfDecay.toFixed(1)}h ` : ''}- $0.01/hr • Add a child to freeze!
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}