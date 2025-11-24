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

// Minimal metallic tiers - Gold ONLY for Elite+ scores
const getScoreColor = (score: number): string => {
  if (score === 0) return 'bg-gray-100 text-gray-600 border-gray-200';
  if (score <= 100) return 'bg-gray-100 text-gray-700 border-gray-200'; // Emerging
  if (score <= 200) return 'bg-gray-100 text-gray-800 border-gray-200'; // Growing
  if (score <= 300) return 'bg-gray-100 text-gray-900 border-gray-300'; // Strong
  if (score <= 400) return 'bg-gradient-to-r from-[#CBAA5A]/20 to-[#B28A28]/15 text-[#B28A28] border-[#CBAA5A]/30'; // Elite - GOLD starts here
  if (score <= 500) return 'bg-gradient-to-r from-[#CBAA5A]/25 to-[#B28A28]/20 text-[#B28A28] border-[#CBAA5A]/40'; // Platinum - Rich Gold
  return 'bg-black text-[#CBAA5A] border-[#CBAA5A]'; // Black Tier - Ultimate prestige
};

const getScoreTier = (score: number): string => {
  if (score === 0) return 'Not Calculated';
  if (score <= 100) return 'Emerging';
  if (score <= 200) return 'Growing';
  if (score <= 300) return 'Strong';
  if (score <= 400) return 'Elite';
  if (score <= 500) return 'Platinum';
  return 'Black Tier';
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







