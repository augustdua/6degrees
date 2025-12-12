import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import Feed from "./pages/Feed";
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
import InviteOnboarding from "./pages/InviteOnboarding";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import { useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { errorTracker } from "./utils/errorTracker";
import { CoinAnimationManager } from "./components/CoinAnimation";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import AIChatButton from "./components/AIChatButton";
import AIChatOverlay from "./components/AIChatOverlay";
import { MaintenanceMode } from "./components/MaintenanceMode";
import { InteractionTrackerProvider } from "./hooks/useInteractionTracker";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();
  const [isAIChatOpen, setIsAIChatOpen] = React.useState(false);

  // Keyboard shortcut for AI assistant (Cmd/Ctrl + K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsAIChatOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
                <Route path="/" element={<Index />} />
                <Route path="/feed" element={<Feed />} />
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
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
                </Routes>

                {/* AI Assistant - Only show for logged-in users */}
                {user && (
                  <>
                    <AIChatButton
                      onClick={() => setIsAIChatOpen(true)}
                      isOpen={isAIChatOpen}
                    />
                    <AIChatOverlay
                      isOpen={isAIChatOpen}
                      onClose={() => setIsAIChatOpen(false)}
                      onMinimize={() => setIsAIChatOpen(false)}
                    />
                  </>
                )}
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
