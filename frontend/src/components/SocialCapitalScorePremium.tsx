import React from 'react';
import { TrendingUp, Sparkles, Crown, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SocialCapitalScorePremiumProps {
  score: number;
  onCalculate?: () => void;
  onViewBreakdown?: () => void;
  onInvite?: () => void;
  calculating?: boolean;
}

// Get tier info based on score
const getTierInfo = (score: number) => {
  if (score === 0) return { 
    name: 'UNRANKED', 
    color: 'text-[#666]',
    bgGradient: 'from-[#1a1a1a] to-[#0a0a0a]',
    borderColor: 'border-[#333]',
    glowColor: '',
    icon: null
  };
  if (score <= 100) return { 
    name: 'EMERGING', 
    color: 'text-[#888]',
    bgGradient: 'from-[#1a1a1a] to-[#0a0a0a]',
    borderColor: 'border-[#444]',
    glowColor: '',
    icon: null
  };
  if (score <= 200) return { 
    name: 'GROWING', 
    color: 'text-[#aaa]',
    bgGradient: 'from-[#1a1a1a] to-[#0a0a0a]',
    borderColor: 'border-[#555]',
    glowColor: '',
    icon: null
  };
  if (score <= 300) return { 
    name: 'STRONG', 
    color: 'text-white',
    bgGradient: 'from-[#1a1a1a] to-[#0a0a0a]',
    borderColor: 'border-[#666]',
    glowColor: '',
    icon: null
  };
  if (score <= 400) return { 
    name: 'ELITE', 
    color: 'text-[#CBAA5A]',
    bgGradient: 'from-[#1a1a1a] via-[#2a2418] to-[#0a0a0a]',
    borderColor: 'border-[#CBAA5A]/50',
    glowColor: 'shadow-[0_0_30px_rgba(203,170,90,0.15)]',
    icon: Sparkles
  };
  if (score <= 500) return { 
    name: 'PLATINUM', 
    color: 'text-[#E5E4E2]',
    bgGradient: 'from-[#2a2a2a] via-[#1a1a1a] to-[#0a0a0a]',
    borderColor: 'border-[#E5E4E2]/40',
    glowColor: 'shadow-[0_0_40px_rgba(229,228,226,0.2)]',
    icon: Crown
  };
  return { 
    name: 'BLACK TIER', 
    color: 'text-[#CBAA5A]',
    bgGradient: 'from-black via-[#0a0a0a] to-black',
    borderColor: 'border-[#CBAA5A]',
    glowColor: 'shadow-[0_0_50px_rgba(203,170,90,0.3)]',
    icon: Crown
  };
};

export const SocialCapitalScorePremium: React.FC<SocialCapitalScorePremiumProps> = ({
  score,
  onCalculate,
  onViewBreakdown,
  onInvite,
  calculating = false
}) => {
  const tier = getTierInfo(score);
  const TierIcon = tier.icon;

  return (
    <div className={cn(
      "relative overflow-hidden rounded-[24px] p-8 bg-gradient-to-br border-2",
      tier.bgGradient,
      tier.borderColor,
      tier.glowColor
    )}>
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#888]" />
            <span className="text-[11px] font-gilroy font-bold tracking-[0.2em] text-[#888] uppercase">
              SOCIAL CAPITAL SCORE
            </span>
          </div>
          {TierIcon && (
            <TierIcon className={cn("w-6 h-6", tier.color)} />
          )}
        </div>

        {/* Score Display */}
        <div className="text-center mb-6">
          {score > 0 ? (
            <>
              <div className={cn(
                "font-riccione text-[72px] md:text-[96px] leading-none tracking-tight",
                tier.color
              )}>
                {score}
              </div>
              <div className={cn(
                "font-gilroy font-bold text-[13px] tracking-[0.3em] mt-2",
                tier.color
              )}>
                {tier.name}
              </div>
            </>
          ) : (
            <>
              <div className="font-riccione text-[48px] md:text-[64px] leading-none text-[#444]">
                ---
              </div>
              <div className="font-gilroy font-bold text-[13px] tracking-[0.3em] mt-2 text-[#666]">
                NOT CALCULATED
              </div>
            </>
          )}
        </div>

        {/* Progress bar for tier */}
        {score > 0 && (
          <div className="mb-6">
            <div className="h-1 bg-[#222] rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  score > 400 ? "bg-gradient-to-r from-[#CBAA5A] to-[#E5E4E2]" : 
                  score > 300 ? "bg-[#CBAA5A]" : "bg-white/50"
                )}
                style={{ width: `${Math.min((score / 500) * 100, 100)}%` }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] font-gilroy tracking-[0.15em] text-[#555]">
              <span>0</span>
              <span>100</span>
              <span>200</span>
              <span>300</span>
              <span>400</span>
              <span>500+</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {score === 0 && onInvite ? (
            <>
              {/* When no score, show Invite button prominently */}
              <button
                onClick={onInvite}
                className={cn(
                  "flex-1 py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase transition-all",
                  "bg-gradient-to-r from-[#CBAA5A] to-[#E5D9B6] text-black hover:from-[#E5D9B6] hover:to-[#CBAA5A]",
                  "flex items-center justify-center gap-2"
                )}
              >
                <UserPlus className="w-4 h-4" />
                INVITE GREAT PEOPLE
              </button>
              <button
                onClick={onCalculate}
                disabled={calculating}
                className={cn(
                  "flex-1 py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase transition-all",
                  "border-2 border-[#444] text-white hover:border-[#CBAA5A] hover:text-[#CBAA5A]",
                  calculating && "opacity-50 cursor-not-allowed"
                )}
              >
                {calculating ? 'CALCULATING...' : 'CALCULATE SCORE'}
              </button>
            </>
          ) : (
            <>
              {/* When has score, show recalculate and breakdown */}
              <button
                onClick={onCalculate}
                disabled={calculating}
                className={cn(
                  "flex-1 py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase transition-all",
                  "bg-white text-black hover:bg-[#CBAA5A] hover:text-black",
                  calculating && "opacity-50 cursor-not-allowed"
                )}
              >
                {calculating ? 'CALCULATING...' : 'RECALCULATE'}
              </button>
              {onViewBreakdown && (
                <button
                  onClick={onViewBreakdown}
                  className="flex-1 py-3 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase transition-all border-2 border-[#444] text-white hover:border-[#CBAA5A] hover:text-[#CBAA5A]"
                >
                  VIEW BREAKDOWN
                </button>
              )}
              {onInvite && (
                <button
                  onClick={onInvite}
                  className={cn(
                    "py-3 px-4 rounded-full font-gilroy font-bold text-[11px] tracking-[0.15em] uppercase transition-all",
                    "border-2 border-[#CBAA5A]/50 text-[#CBAA5A] hover:bg-[#CBAA5A]/10",
                    "flex items-center justify-center gap-2"
                  )}
                >
                  <UserPlus className="w-4 h-4" />
                  INVITE
                </button>
              )}
            </>
          )}
        </div>

        {/* Info text */}
        <p className="text-center text-[10px] font-gilroy tracking-[0.1em] text-[#666] mt-4 uppercase">
          Based on your featured connections' organizations and roles
        </p>
      </div>
    </div>
  );
};




