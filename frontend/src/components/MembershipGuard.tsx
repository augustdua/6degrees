import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useMembership } from '@/hooks/useMembership';
import { WaitlistOverlay } from './WaitlistOverlay';
import { Navigate } from 'react-router-dom';

interface MembershipGuardProps {
  children: ReactNode;
  /** Feature name for the overlay message */
  feature?: string;
  /** If true, shows overlay instead of redirecting */
  showOverlay?: boolean;
  /** Redirect path for non-members (default: /profile) */
  redirectTo?: string;
}

/**
 * Guards routes that require full membership.
 * Waitlisted users see an overlay or get redirected.
 */
export function MembershipGuard({
  children,
  feature,
  showOverlay = true,
  redirectTo = '/profile',
}: MembershipGuardProps) {
  const { user, loading: authLoading } = useAuth();
  const { isMember, isWaitlist, isLoading: membershipLoading } = useMembership();

  // Still loading
  if (authLoading || membershipLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#CBAA5A]" />
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Full member - allow access
  if (isMember) {
    return <>{children}</>;
  }

  // Waitlisted user
  if (isWaitlist) {
    if (showOverlay) {
      return (
        <div className="relative min-h-screen">
          {/* Show blurred/dimmed content behind overlay */}
          <div className="filter blur-sm opacity-30 pointer-events-none">
            {children}
          </div>
          <WaitlistOverlay feature={feature} fullPage />
        </div>
      );
    }
    return <Navigate to={redirectTo} replace />;
  }

  // Rejected user - redirect to profile with message
  return <Navigate to="/profile?status=rejected" replace />;
}

/**
 * Wrapper for pages where waitlisters have partial access.
 * Shows a banner but allows browsing.
 */
export function WaitlistAwarePage({
  children,
  showBanner = true,
}: {
  children: ReactNode;
  showBanner?: boolean;
}) {
  const { isWaitlist, isLoading } = useMembership();

  return (
    <>
      {showBanner && !isLoading && isWaitlist && (
        <div className="bg-[#1a1500] border-b border-[#CBAA5A]/30 px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#CBAA5A] animate-pulse" />
            <p className="text-sm text-[#CBAA5A]">
              Your membership is under review. Some features are limited.
            </p>
          </div>
        </div>
      )}
      {children}
    </>
  );
}


