import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import ThursdayRitual from "./pages/ThursdayRitual";
import NotFound from "./pages/NotFound";
import CreateRequest from "./pages/CreateRequest";
import RequestDetails from "./pages/RequestDetails";
import ChainInvites from "./pages/ChainInvites";
import ChainInvitesDashboard from "./pages/ChainInvitesDashboard";
import AuthForm from "./components/AuthForm";
import PublicProfile from "./pages/PublicProfile";
import SeedPublicProfile from "./pages/SeedPublicProfile";
import LinkedInCallback from "./pages/LinkedInCallback";
import EmailConfirmed from "./pages/EmailConfirmed";
import About from "./pages/About";
import Legal from "./pages/Legal";
import Debug from "./pages/Debug";
import VideoStudio from "./pages/VideoStudio";
import VideoShare from "./pages/VideoShare";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ForumPostDetail from "./pages/ForumPostDetail";
import ResearchReportDetail from "./pages/ResearchReportDetail";
import MarketGapsReportDetail from "./pages/MarketGapsReportDetail";
import InviteOnboarding from "./pages/InviteOnboarding";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import AuthCallback from "./pages/AuthCallback";
import ZaurqAppShell from "./components/zaurq/ZaurqAppShell";
import ZaurqDashboard from "./pages/zaurq/ZaurqDashboard";
import ZaurqMyTribe from "./pages/zaurq/MyTribe";
import ZaurqPersonProfile from "./pages/zaurq/PersonProfile";
import ZaurqFeed from "./pages/zaurq/Feed";
import ZaurqEvents from "./pages/zaurq/Events";
import ZaurqCalendar from "./pages/zaurq/Calendar";
import ZaurqDiscoverPeople from "./pages/zaurq/DiscoverPeople";
import Messages from "./pages/Messages";
import UserProfile from "./pages/UserProfile";
import CrossLunchSettings from "./pages/CrossLunchSettings";
import CrossLunchMyProfile from "./pages/CrossLunchMyProfile";
import RedirectConnectionToPersonProfile from "./pages/zaurq/RedirectConnectionToPersonProfile";
import { useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { errorTracker } from "./utils/errorTracker";
import { CoinAnimationManager } from "./components/CoinAnimation";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { MaintenanceMode } from "./components/MaintenanceMode";
import { InteractionTrackerProvider } from "./hooks/useInteractionTracker";
import { setPostAuthRedirect } from "./lib/oauthRedirect";
import { currentPathWithSearchHash, isLandingHost, toAppUrl } from "./lib/domain";

const queryClient = new QueryClient();

function AppLoadingScreen() {
  return (
    <div className="mobile-loading">
      <div className="text-center">
        <div className="mobile-loading-spinner mx-auto mb-4"></div>
        <p className="text-muted-foreground mobile-text">Loading...</p>
      </div>
    </div>
  );
}

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, session, loading } = useAuth();
  const location = useLocation();

  // If we have a Supabase session but haven't hydrated the app user yet, avoid bouncing to /auth.
  if (loading || (session?.user && !user)) return <AppLoadingScreen />;
  if (user) return <>{children}</>;

  const returnUrl = `${location.pathname}${location.search}${location.hash}`;
  setPostAuthRedirect(returnUrl);
  return <Navigate to={`/auth?returnUrl=${encodeURIComponent(returnUrl)}`} replace />;
}

function AppRootLayout() {
  const { user, session, loading } = useAuth();
  const shouldRedirectToApp = !!user && isLandingHost();

  React.useEffect(() => {
    if (!shouldRedirectToApp) return;
    const target = toAppUrl(currentPathWithSearchHash());
    window.location.replace(target);
  }, [shouldRedirectToApp]);

  if (shouldRedirectToApp) return <AppLoadingScreen />;
  if (loading || (session?.user && !user)) return <AppLoadingScreen />;
  if (user) return <ZaurqAppShell />;
  return <Outlet />;
}

function HomeRoute() {
  const { user } = useAuth();
  return user ? <ZaurqDashboard /> : <Index />;
}

const App = () => {
  const { user } = useAuth();

  // Initialize error tracking with user ID when available
  // DISABLED: Error tracking is causing infinite loops
  // React.useEffect(() => {
  //   if (user?.id) {
  //     errorTracker.setUserId(user.id);
  //   }
  // }, [user?.id]);

  return (
    <ErrorBoundary>
      <MaintenanceMode>
        <HelmetProvider>
          {/* CrossLunch: force light theme so the pastel palette is always used */}
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} forcedTheme="light">
            <QueryClientProvider client={queryClient}>
              <CurrencyProvider>
                <TooltipProvider>
                  <CoinAnimationManager>
                    <InteractionTrackerProvider>
                    <Toaster />
                    <Sonner />
                  <BrowserRouter
                  future={{
                    v7_startTransition: true,
                    v7_relativeSplatPath: true,
                  }}
                >
                  <Routes>
                    {/* Public / misc routes */}
                    <Route path="/thursday" element={user ? <ThursdayRitual /> : <Navigate to="/" replace />} />
                    {/* Backward-compatible forum route */}
                    <Route path="/forum" element={<Navigate to="/feed" replace />} />
                    {/* Backward-compatible alias */}
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    <Route path="/r/:linkId" element={<ChainInvites />} />
                    <Route path="/chain-invite/:linkId" element={<ChainInvites />} />
                    <Route path="/chain-invites" element={<ChainInvitesDashboard />} />
                    <Route path="/auth" element={<AuthForm />} />
                    <Route path="/auth/callback" element={<AuthCallback />} />
                    <Route path="/invite" element={<InviteOnboarding />} />
                    <Route path="/forgot-password" element={<ForgotPassword />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/dashboard" element={<Navigate to="/" replace />} />
                    <Route path="/create" element={<CreateRequest />} />
                    <Route path="/request/:requestId" element={<RequestDetails />} />
                    <Route path="/video-studio" element={<VideoStudio />} />
                    <Route path="/video" element={<VideoShare />} />
                    <Route path="/video-share" element={<VideoShare />} />
                    <Route path="/profile/:userId" element={<PublicProfile />} />
                    <Route path="/p/:slug" element={<SeedPublicProfile />} />
                    <Route path="/linkedin/callback" element={<LinkedInCallback />} />
                    <Route path="/email-confirmed" element={<EmailConfirmed />} />
                    <Route path="/about" element={<About />} />
                    <Route path="/legal" element={<Legal />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/debug" element={<Debug />} />
                    <Route path="/forum/post/:postId" element={<ForumPostDetail />} />
                    <Route path="/forum/research/:postId" element={<ResearchReportDetail />} />
                    <Route path="/forum/market-gaps/:postId" element={<MarketGapsReportDetail />} />

                    {/* Root: shows landing for logged-out users, and the Zaurq app for logged-in users */}
                    <Route path="/" element={<AppRootLayout />}>
                      <Route index element={<HomeRoute />} />

                      {/* Zaurq authenticated routes (never 404 just because auth isn't ready) */}
                      <Route path="network" element={<RequireAuth><ZaurqMyTribe /></RequireAuth>} />
                      <Route path="network/:connectionId" element={<RequireAuth><ZaurqPersonProfile /></RequireAuth>} />
                      <Route path="discover" element={<RequireAuth><ZaurqDiscoverPeople /></RequireAuth>} />
                      <Route path="feed" element={<RequireAuth><ZaurqFeed /></RequireAuth>} />
                      <Route path="calendar" element={<RequireAuth><ZaurqCalendar /></RequireAuth>} />
                      <Route path="events" element={<RequireAuth><ZaurqEvents /></RequireAuth>} />
                      <Route path="profile" element={<RequireAuth><CrossLunchMyProfile /></RequireAuth>} />
                      <Route path="settings" element={<RequireAuth><Navigate to="/profile?tab=settings" replace /></RequireAuth>} />
                      <Route path="messages" element={<RequireAuth><Messages /></RequireAuth>} />
                      <Route path="connections/:connectionId" element={<RequireAuth><RedirectConnectionToPersonProfile /></RequireAuth>} />
                      {/* Back-compat: keep /zaurq URLs working but point into the single experience */}
                      <Route path="zaurq" element={<Navigate to="/" replace />} />
                      <Route path="zaurq/*" element={<Navigate to="/" replace />} />
                    </Route>

                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                </Routes>

                </BrowserRouter>
                    </InteractionTrackerProvider>
                  </CoinAnimationManager>
              </TooltipProvider>
              </CurrencyProvider>
            </QueryClientProvider>
          </ThemeProvider>
        </HelmetProvider>
      </MaintenanceMode>
    </ErrorBoundary>
  );
};

export default App;
