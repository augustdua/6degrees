import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
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
import { useAuth } from "./hooks/useAuth";

const queryClient = new QueryClient();

const App = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <HelmetProvider>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
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
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
    </HelmetProvider>
  );
};

export default App;
