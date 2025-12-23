import { useMemo } from 'react';
import { useAuth } from './useAuth';

export type ZaurqRole = 'ZAURQ_USER' | 'ZAURQ_PARTNER';

export interface ZaurqRoleInfo {
  role: ZaurqRole;
  isPartner: boolean;
  isUser: boolean;
  isLoading: boolean;
}

/**
 * Zaurq role hook.
 *
 * - ZAURQ_USER: standard access
 * - ZAURQ_PARTNER: invite/review-approved partner access (extra communities + club)
 */
export function useMembership(): ZaurqRoleInfo {
  const { user, loading } = useAuth();

  return useMemo(() => {
    const role: ZaurqRole = ((user as any)?.role as ZaurqRole) || 'ZAURQ_USER';
    const isRoleLoading = loading || (!!user && !(user as any).role);

    return {
      role,
      isPartner: role === 'ZAURQ_PARTNER',
      isUser: role === 'ZAURQ_USER',
      isLoading: isRoleLoading,
    };
  }, [user, (user as any)?.role, loading]);
}

export function useFeatureAccess(feature: string): { hasAccess: boolean; isLoading: boolean } {
  const { isPartner, isLoading } = useMembership();

  return useMemo(() => {
    // Partner-only features
    const partnerOnly = ['partners_feed', 'market_research', 'events', 'your_club'];
    if (partnerOnly.includes(feature)) {
      return { hasAccess: isPartner, isLoading };
    }
    return { hasAccess: true, isLoading };
  }, [feature, isPartner, isLoading]);
}


