import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
import ZaurqMyNetwork from "./pages/zaurq/MyNetwork";
import ZaurqPersonProfile from "./pages/zaurq/PersonProfile";
import ZaurqFeed from "./pages/zaurq/Feed";
import ZaurqEvents from "./pages/zaurq/Events";
import ZaurqMoments from "./pages/zaurq/Moments";
import ZaurqInsights from "./pages/zaurq/Insights";
import ZaurqGifts from "./pages/zaurq/Gifts";
import ZaurqTrips from "./pages/zaurq/Trips";
import ZaurqCalendar from "./pages/zaurq/Calendar";
import Messages from "./pages/Messages";
import UserProfile from "./pages/UserProfile";
import RedirectConnectionToPersonProfile from "./pages/zaurq/RedirectConnectionToPersonProfile";
import { useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { errorTracker } from "./utils/errorTracker";
import { CoinAnimationManager } from "./components/CoinAnimation";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { MaintenanceMode } from "./components/MaintenanceMode";
import { InteractionTrackerProvider } from "./hooks/useInteractionTracker";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();

  // Initialize error tracking with user ID when available
  // DISABLED: Error tracking is causing infinite loops
  // React.useEffect(() => {
  //   if (user?.id) {
  //     errorTracker.setUserId(user.id);
  //   }
  // }, [user?.id]);

  if (loading) {
    return (
      <div className="mobile-loading">
        <div className="text-center">
          <div className="mobile-loading-spinner mx-auto mb-4"></div>
          <p className="text-muted-foreground mobile-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <MaintenanceMode>
        <HelmetProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
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
                {/* Unauthed landing */}
                {!user ? <Route path="/" element={<Index />} /> : null}
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
                <Route path="/linkedin/callback" element={<LinkedInCallback />} />
                <Route path="/email-confirmed" element={<EmailConfirmed />} />
                <Route path="/about" element={<About />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/debug" element={<Debug />} />
                {/* Zaurq single authenticated experience */}
                {user ? (
                  <Route path="/" element={<ZaurqAppShell />}>
                    <Route index element={<ZaurqDashboard />} />
                    <Route path="network" element={<ZaurqMyNetwork />} />
                    <Route path="network/:connectionId" element={<ZaurqPersonProfile />} />
                    <Route path="feed" element={<ZaurqFeed />} />
                    <Route path="calendar" element={<ZaurqCalendar />} />
                    <Route path="events" element={<ZaurqEvents />} />
                    <Route path="moments" element={<ZaurqMoments />} />
                    <Route path="insights" element={<ZaurqInsights />} />
                    <Route path="gifts" element={<ZaurqGifts />} />
                    <Route path="trips" element={<ZaurqTrips />} />
                    <Route path="settings" element={<UserProfile />} />
                    <Route path="profile" element={<Navigate to="/settings" replace />} />
                    <Route path="messages" element={<Messages />} />
                    <Route path="connections/:connectionId" element={<RedirectConnectionToPersonProfile />} />
                    {/* Back-compat: keep /zaurq URLs working but point into the single experience */}
                    <Route path="zaurq" element={<Navigate to="/" replace />} />
                    <Route path="zaurq/*" element={<Navigate to="/" replace />} />
                  </Route>
                ) : null}
                <Route path="/forum/post/:postId" element={<ForumPostDetail />} />
                <Route path="/forum/research/:postId" element={<ResearchReportDetail />} />
                <Route path="/forum/market-gaps/:postId" element={<MarketGapsReportDetail />} />
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
