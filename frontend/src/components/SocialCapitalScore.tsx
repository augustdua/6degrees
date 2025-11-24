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

// Premium tier-based color system inspired by CRED
const getScoreColor = (score: number): string => {
  if (score === 0) return 'bg-muted/50 text-muted-foreground border-muted';
  if (score <= 100) return 'bg-[#666B72]/10 text-[#666B72] border-[#666B72]/30'; // Tier 1 - Emerging (Steel Grey)
  if (score <= 200) return 'bg-[#8A8F99]/10 text-[#8A8F99] border-[#8A8F99]/30'; // Tier 2 - Growing (Slate Grey)
  if (score <= 300) return 'bg-[#D3D7DB]/20 text-[#666B72] border-[#D3D7DB]/50'; // Tier 3 - Strong (Platinum)
  if (score <= 400) return 'bg-[#CBAA5A]/15 text-[#B28A28] border-[#CBAA5A]/40'; // Tier 4 - Elite (Gold)
  if (score <= 500) return 'bg-gradient-to-r from-[#B28A28]/20 to-[#CBAA5A]/20 text-[#B28A28] border-[#B28A28]/40'; // Tier 5 - Platinum (Rich Gold)
  return 'bg-black text-[#CBAA5A] border-[#CBAA5A] shadow-[0_0_20px_rgba(203,170,90,0.3)]'; // Tier 6 - Black Tier (Amex Black)
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







