import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
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

  // Still loading
  if (authLoading) {
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

  // Partner concept removed: logged-in users always have access.
  void feature;
  void showOverlay;
  void redirectTo;
  return <>{children}</>;
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
  void showBanner;

  return (
    <>
      {children}
    </>
  );
}


