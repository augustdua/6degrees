import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Home from "./pages/Home";
import ThursdayRitual from "./pages/ThursdayRitual";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import CreateRequest from "./pages/CreateRequest";
import RequestDetails from "./pages/RequestDetails";
import ChainInvites from "./pages/ChainInvites";
import ChainInvitesDashboard from "./pages/ChainInvitesDashboard";
import AuthForm from "./components/AuthForm";
import UserProfile from "./pages/UserProfile";
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
import Messages from "./pages/Messages";
import ForumPostDetail from "./pages/ForumPostDetail";
import ResearchReportDetail from "./pages/ResearchReportDetail";
import MarketGapsReportDetail from "./pages/MarketGapsReportDetail";
import InviteOnboarding from "./pages/InviteOnboarding";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
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
          <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
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
                <Route path="/" element={user ? <ThursdayRitual /> : <Index />} />
                {/* Forum / main feed */}
                <Route path="/forum" element={user ? <Home /> : <Navigate to="/" replace />} />
                {/* Backward-compatible alias */}
                <Route path="/home" element={<Navigate to="/forum" replace />} />
                <Route path="/feed" element={<Navigate to="/" replace />} />
                <Route path="/r/:linkId" element={<ChainInvites />} />
                <Route path="/chain-invite/:linkId" element={<ChainInvites />} />
                <Route path="/chain-invites" element={<ChainInvitesDashboard />} />
                <Route path="/auth" element={<AuthForm />} />
                <Route path="/invite" element={<InviteOnboarding />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create" element={<CreateRequest />} />
                <Route path="/request/:requestId" element={<RequestDetails />} />
                <Route path="/video-studio" element={<VideoStudio />} />
                <Route path="/video" element={<VideoShare />} />
                <Route path="/video-share" element={<VideoShare />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/profile/:userId" element={<PublicProfile />} />
                <Route path="/linkedin/callback" element={<LinkedInCallback />} />
                <Route path="/email-confirmed" element={<EmailConfirmed />} />
                <Route path="/about" element={<About />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/debug" element={<Debug />} />
                <Route path="/messages" element={<Messages />} />
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
