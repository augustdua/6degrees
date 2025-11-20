import { TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface SocialCapitalScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showBreakdown?: boolean;
  onClick?: () => void;
}

const getScoreColor = (score: number): string => {
  if (score === 0) return 'bg-gray-100 text-gray-600 border-gray-200';
  if (score <= 100) return 'bg-blue-100 text-blue-700 border-blue-200';
  if (score <= 200) return 'bg-purple-100 text-purple-700 border-purple-200';
  if (score <= 300) return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  return 'bg-gradient-to-r from-yellow-100 to-amber-100 text-amber-700 border-amber-200';
};

const getScoreTier = (score: number): string => {
  if (score === 0) return 'Not Calculated';
  if (score <= 100) return 'Emerging';
  if (score <= 200) return 'Growing';
  if (score <= 300) return 'Strong';
  return 'Elite';
};

const getSizeClasses = (size: 'sm' | 'md' | 'lg'): { badge: string; icon: number; text: string } => {
  switch (size) {
    case 'sm':
      return { badge: 'text-xs px-2 py-0.5', icon: 12, text: 'text-[10px]' };
    case 'lg':
      return { badge: 'text-lg px-4 py-2', icon: 20, text: 'text-xs' };
    default:
      return { badge: 'text-sm px-3 py-1', icon: 16, text: 'text-[11px]' };
  }
};

export function SocialCapitalScore({
  score,
  size = 'md',
  showLabel = false,
  showBreakdown = false,
  onClick
}: SocialCapitalScoreProps) {
  const sizeClasses = getSizeClasses(size);
  const colorClasses = getScoreColor(score);
  const tier = getScoreTier(score);
  const isClickable = showBreakdown && onClick;

  return (
    <div className="flex flex-col gap-1">
      {showLabel && (
        <span className={cn('text-gray-600 font-medium', sizeClasses.text)}>
          Social Capital
        </span>
      )}
      <Badge
        variant="outline"
        className={cn(
          colorClasses,
          sizeClasses.badge,
          'font-semibold flex items-center gap-1.5 border transition-all',
          isClickable && 'cursor-pointer hover:scale-105 hover:shadow-sm'
        )}
        onClick={isClickable ? onClick : undefined}
      >
        <TrendingUp size={sizeClasses.icon} strokeWidth={2.5} />
        <span>{score}</span>
        {size !== 'sm' && <span className="font-normal opacity-80">• {tier}</span>}
      </Badge>
    </div>
  );
}

