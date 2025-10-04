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
import LinkedInCallback from "./pages/LinkedInCallback";
import EmailConfirmed from "./pages/EmailConfirmed";
import About from "./pages/About";
import Legal from "./pages/Legal";
import Debug from "./pages/Debug";
import { useAuth } from "./hooks/useAuth";
import ErrorBoundary from "./components/ErrorBoundary";
import { errorTracker } from "./utils/errorTracker";
import { CoinAnimationManager } from "./components/CoinAnimation";

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
      <HelmetProvider>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <CoinAnimationManager>
                <Toaster />
                <Sonner />
              <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true,
              }}
            >
              <Routes>
                <Route path="/" element={<Feed />} />
                <Route path="/home" element={<Index />} />
                <Route path="/r/:linkId" element={<ChainInvites />} />
                <Route path="/chain-invite/:linkId" element={<ChainInvites />} />
                <Route path="/chain-invites" element={<ChainInvitesDashboard />} />
                <Route path="/auth" element={<AuthForm />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/create" element={<CreateRequest />} />
                <Route path="/request/:requestId" element={<RequestDetails />} />
                <Route path="/profile" element={<UserProfile />} />
                <Route path="/linkedin/callback" element={<LinkedInCallback />} />
                <Route path="/email-confirmed" element={<EmailConfirmed />} />
                <Route path="/about" element={<About />} />
                <Route path="/legal" element={<Legal />} />
                <Route path="/debug" element={<Debug />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
              </CoinAnimationManager>
          </TooltipProvider>
        </QueryClientProvider>
      </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
};

export default App;
