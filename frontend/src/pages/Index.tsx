import ChainHero from "@/components/ChainHero";
import CreateRequestForm from "@/components/CreateRequestForm";
import GuestRequestView from "@/components/GuestRequestView";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, useParams, useNavigate } from "react-router-dom";
import { User, LogIn, BarChart3, Plus, ArrowRight, Users, Link as LinkIcon, Award, DollarSign, Target, CheckCircle } from "lucide-react";
import { useState, useEffect } from "react";

const Index = () => {
  const { user } = useAuth();
  const { getRequestByLink } = useRequests();
  const { linkId } = useParams();
  const navigate = useNavigate();
  const [requestData, setRequestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Redirect authenticated users to dashboard (unless viewing a specific link)
  useEffect(() => {
    if (user && !linkId) {
      navigate('/dashboard');
    }
  }, [user, linkId, navigate]);

  useEffect(() => {
    if (linkId) {
      setLoading(true);
      getRequestByLink(linkId)
        .then((data) => {
          setRequestData(data);
        })
        .catch((error) => {
          console.error('Error fetching request:', error);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [linkId]); // Remove getRequestByLink from dependencies to prevent infinite loops

  // If we're viewing a specific request link
  if (linkId) {
    if (loading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading request...</p>
          </div>
        </div>
      );
    }

    if (!requestData) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Request Not Found</h1>
            <p className="text-muted-foreground mb-6">This connection request could not be found or has expired.</p>
            <Button asChild>
              <Link to="/">Go Home</Link>
            </Button>
          </div>
        </div>
      );
    }

    return (
      <main className="min-h-screen py-20 px-4">
        {/* Header with auth buttons */}
        <header className="absolute top-0 left-0 right-0 z-50 p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Button variant="ghost" asChild>
              <Link to="/">← Back to Home</Link>
            </Button>
            <div className="flex gap-4">
              {user ? (
                <>
                  <Button asChild>
                    <Link to="/create">
                      <Plus className="w-4 h-4 mr-2" />
                      Create Request
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Dashboard
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/profile">
                      <User className="w-4 h-4 mr-2" />
                      Profile
                    </Link>
                  </Button>
                </>
              ) : (
                <Button variant="outline" asChild>
                  <Link to="/auth">
                    <LogIn className="w-4 h-4 mr-2" />
                    Sign In
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </header>

        <GuestRequestView 
          request={requestData.request} 
          chain={requestData.chain} 
          linkId={linkId} 
        />
      </main>
    );
  }

  // Default homepage
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-900">
      {/* Modern Header */}
      <header className="absolute top-0 left-0 right-0 z-50 p-6">
        <div className="container mx-auto flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
              <span className="text-white font-bold text-lg">6°</span>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              6Degree
            </span>
          </div>
          
          {/* Auth buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Button asChild className="bg-emerald-600 hover:bg-emerald-700">
                  <Link to="/create">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Request
                  </Link>
                </Button>
                <Button variant="outline" asChild className="border-emerald-200 hover:bg-emerald-50">
                  <Link to="/dashboard">
                    <BarChart3 className="w-4 h-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="ghost" asChild>
                  <Link to="/profile">
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </Link>
                </Button>
              </>
            ) : (
              <Button 
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => navigate('/auth')}
              >
                <LogIn className="w-4 h-4 mr-2" />
                Get Started
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-20 left-20 w-72 h-72 bg-emerald-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
          <div className="absolute top-40 right-20 w-72 h-72 bg-teal-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-8 left-40 w-72 h-72 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium mb-8">
              <span className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
              Beta - Join the Future of Networking
            </div>

            {/* Main Headline */}
            <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                Your Network is Your
              </span>
              <br />
              <span className="text-slate-800 dark:text-slate-200">
                Networth
              </span>
            </h1>
            
            {/* Subheadline */}
            <p className="text-xl md:text-2xl text-slate-600 dark:text-slate-300 mb-12 max-w-4xl mx-auto leading-relaxed">
              Professional networking platform powered by the 6 degrees of separation principle. Create connection requests, build introduction chains through your network, and reward everyone who helps connect you to your target.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-6 justify-center mb-20">
              <Button 
                size="lg" 
                className="text-lg px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg hover:shadow-xl transition-all"
                onClick={() => navigate('/auth')}
              >
                Start Your First Chain
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 py-4 border-2 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50"
                onClick={() => navigate('/auth')}
              >
                See How It Works
              </Button>
            </div>

          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-6 bg-white dark:bg-slate-800">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800 dark:text-slate-200">
              How 6Degree Works
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Leverage the 6 degrees of separation to reach anyone through introduction chains. Three simple steps to unlock the power of your professional network.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-12 max-w-6xl mx-auto">
            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
                <Users className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">1. Create Connection Request</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Specify your target connection (person, role, or company), add a personalized video message, set a reward, and get a shareable link to spread through your network.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
                <LinkIcon className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">2. Build Introduction Chains</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Share your request with your network. Each person can forward it, suggest connections, or directly introduce you to the target, creating parallel introduction chains competing to connect you.
              </p>
            </div>

            <div className="text-center group">
              <div className="w-20 h-20 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 group-hover:scale-110 transition-transform">
                <Award className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">3. Reward the Chain</h3>
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                When someone successfully introduces you to your target, everyone in the winning introduction chain gets rewarded. Track progress in real-time and message participants through the platform.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* PayNet Marketplace Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <Badge variant="secondary" className="mb-4 text-sm">
              PayNet Marketplace
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800 dark:text-slate-200">
              Monetize Your Network with Connection Offers
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              Create verified offers for intro calls with your high-value connections and earn money from your professional network
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto mb-12">
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">For Connection Creators</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <DollarSign className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Create Verified Offers</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      List your valuable connections and set your price for intro calls
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Approval System</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Review and approve bids before scheduling intro calls
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Award className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Premium Positioning</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Showcase roles, companies, and organization logos to attract quality bidders
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-semibold mb-4 text-slate-800 dark:text-slate-200">For Connection Seekers</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Target className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Browse Verified Offers</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Find intro calls to executives, investors, and industry leaders
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <DollarSign className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Place Competitive Bids</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Bid on offers or book calls at the asking price
                    </p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircle className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold mb-1">Secure Transactions</h4>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      Pay only when the creator approves your bid and schedules the intro call
                    </p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          <div className="text-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
              onClick={() => navigate('/auth')}
            >
              Explore Offers Marketplace
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-800 dark:text-slate-200">
              Why Choose 6Degree?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto">
              The most powerful networking platform built for the modern professional
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-xl flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Video-Powered Intros</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Create personalized video messages for your connection requests. Make a lasting impression with authentic, face-to-face introductions.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900/30 rounded-xl flex items-center justify-center mb-6">
                <Award className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">Chain Competition</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Multiple chains compete to connect you. The winning chain splits the reward, incentivizing your network to help you succeed.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg hover:shadow-xl transition-shadow">
              <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900/30 rounded-xl flex items-center justify-center mb-6">
                <LinkIcon className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-xl font-semibold mb-4 text-slate-800 dark:text-slate-200">PayNet Marketplace</h3>
              <p className="text-slate-600 dark:text-slate-300">
                Browse and bid on verified connection offers. Monetize your network by creating offers for intro calls with your high-value connections.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-emerald-600 to-teal-600">
        <div className="container mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">
            Ready to Start Networking?
          </h2>
          <p className="text-xl text-emerald-100 mb-12 max-w-3xl mx-auto">
            Join the future of professional networking and unlock new opportunities through your network.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Button 
              size="lg" 
              className="text-lg px-8 py-4 bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg"
              onClick={() => navigate('/auth')}
            >
              Get Started Free
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-8 py-4 border-2 border-white text-white hover:bg-white hover:text-emerald-600"
              onClick={() => navigate('/about')}
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-slate-900 text-slate-300">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">6°</span>
              </div>
              <span className="text-xl font-bold text-white">6Degree</span>
            </div>
            <div className="flex items-center gap-6">
              <Link to="/about" className="hover:text-emerald-400 transition-colors">About</Link>
              <Link to="/legal" className="hover:text-emerald-400 transition-colors">Legal</Link>
              <span className="text-sm">© 2024 Grapherly OÜ. All rights reserved.</span>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
