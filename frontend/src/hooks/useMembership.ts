import { useMemo } from 'react';
import { useAuth } from './useAuth';

export type MembershipStatus = 'member' | 'waitlist' | 'rejected';

export interface MembershipInfo {
  /** Current membership status */
  status: MembershipStatus;
  /** Whether user has full member access */
  isMember: boolean;
  /** Whether user is on the waitlist (limited access) */
  isWaitlist: boolean;
  /** Whether user's application was rejected */
  isRejected: boolean;
  /** Whether membership data is still loading */
  isLoading: boolean;
}

/**
 * Hook to check user's membership status and access level.
 * 
 * Access levels:
 * - member: Full access to all features (forum, offers, invites, etc.)
 * - waitlist: Limited access (profile editing + browse offers only)
 * - rejected: No access (should be redirected to rejection page)
 */
export function useMembership(): MembershipInfo {
  const { user, loading } = useAuth();

  return useMemo(() => {
    // Important: `useAuth` does an optimistic user set before the DB profile fetch completes.
    // During that window, `membershipStatus` can be undefined; treating that as "waitlist"
    // causes confusing UI (banner / restrictions) even for real members.
    //
    // We treat missing status as "loading" and avoid showing waitlist UI until confirmed.
    const status: MembershipStatus = (user?.membershipStatus as MembershipStatus) || 'member';
    const isMembershipLoading = loading || (!!user && !user.membershipStatus);
    
    return {
      status,
      isMember: status === 'member',
      isWaitlist: status === 'waitlist',
      isRejected: status === 'rejected',
      isLoading: isMembershipLoading,
    };
  }, [user, user?.membershipStatus, loading]);
}

/**
 * Check if a specific feature is accessible based on membership status.
 * 
 * Features:
 * - forum: View and post in forum (member only)
 * - offers_browse: Browse offers list (waitlist + member)
 * - offers_interact: Bid on offers, book calls (member only)
 * - invites: Create and manage invites (member only)
 * - profile: Edit own profile (waitlist + member)
 * - people: View people discovery (member only)
 * - messages: Send and receive messages (member only)
 */
export function useFeatureAccess(feature: string): { hasAccess: boolean; isLoading: boolean } {
  const { isMember, isWaitlist, isLoading } = useMembership();

  return useMemo(() => {
    // Features accessible to both members and waitlisters
    const waitlistFeatures = ['profile', 'offers_browse'];
    
    // Member-only features
    const memberFeatures = [
      'forum',
      'offers_interact',
      'invites',
      'people',
      'messages',
    ];

    if (waitlistFeatures.includes(feature)) {
      return { hasAccess: isMember || isWaitlist, isLoading };
    }

    if (memberFeatures.includes(feature)) {
      return { hasAccess: isMember, isLoading };
    }

    // Unknown feature - default to member-only
    return { hasAccess: isMember, isLoading };
  }, [feature, isMember, isWaitlist, isLoading]);
}


