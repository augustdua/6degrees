import ChainHero from "@/components/ChainHero";
import CreateRequestForm from "@/components/CreateRequestForm";
import GuestRequestView from "@/components/GuestRequestView";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams, useNavigate } from "react-router-dom";
import { User, LogIn, BarChart3, Plus, ArrowRight, Users, Link as LinkIcon, Award, DollarSign, Target, CheckCircle, Video, Share2, Coins, Sparkles, TrendingUp, Building2, Scale, UserCheck, Megaphone } from "lucide-react";
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
  }, [linkId]);

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

  // Demo offers for showcase
  const demoOffers = [
    { 
      company: "Google", 
      position: "Senior Product Manager",
      price: "₹15,000",
      color: "from-blue-500 to-blue-600"
    },
    { 
      company: "Microsoft", 
      position: "Principal Engineer",
      price: "₹12,000",
      color: "from-green-500 to-emerald-600"
    },
    { 
      company: "Tiger Analytics", 
      position: "Senior Data Scientist",
      price: "₹8,000",
      color: "from-purple-500 to-purple-600"
    },
    { 
      company: "Philip Morris", 
      position: "Regional Director",
      price: "₹10,000",
      color: "from-orange-500 to-orange-600"
    },
    { 
      company: "Goldman Sachs", 
      position: "Investment Banker",
      price: "₹20,000",
      color: "from-yellow-500 to-yellow-600"
    },
    { 
      company: "McKinsey & Co", 
      position: "Senior Consultant",
      price: "₹18,000",
      color: "from-indigo-500 to-indigo-600"
    },
    { 
      company: "Y Combinator", 
      position: "Startup Partner",
      price: "₹25,000",
      color: "from-red-500 to-red-600"
    },
    { 
      company: "Amazon", 
      position: "Senior SDE",
      price: "₹14,000",
      color: "from-cyan-500 to-cyan-600"
    },
    { 
      company: "Meta", 
      position: "ML Engineer",
      price: "₹16,000",
      color: "from-pink-500 to-pink-600"
    },
    { 
      company: "Sequoia Capital", 
      position: "Venture Partner",
      price: "₹22,000",
      color: "from-teal-500 to-teal-600"
    },
    { 
      company: "IIM Bangalore", 
      position: "Faculty Member",
      price: "₹6,000",
      color: "from-violet-500 to-violet-600"
    },
    { 
      company: "EPFL", 
      position: "Research Scientist",
      price: "€150",
      color: "from-blue-500 to-purple-600"
    },
  ];

  // Default homepage - New comprehensive landing
  return (
    <main className="min-h-screen bg-[#0f1419]">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-[#1F2937] bg-[#0f1419]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0f1419]/95">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[#37D5A3] rounded-lg flex items-center justify-center">
                <span className="text-[#0f1419] font-bold text-lg">6°</span>
            </div>
              <span className="text-2xl font-bold text-white">6Degree</span>
          </div>
          
          {/* Auth buttons */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost"
                className="text-white hover:bg-[#1F2937]"
                onClick={() => navigate('/auth')}
              >
                Sign In
                </Button>
              <Button 
                className="bg-[#37D5A3] hover:bg-[#2BC090] text-[#0f1419] font-semibold"
                onClick={() => navigate('/auth')}
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - The Origin Story */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden">
        {/* Ambient background effects with animated orbs */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#37D5A3]/5 via-transparent to-purple-500/5"></div>
        <div className="absolute top-20 left-20 w-96 h-96 bg-[#37D5A3]/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-3xl"></div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-[#37D5A3]/20 text-[#37D5A3] border-[#37D5A3]/30 px-4 py-2 text-sm backdrop-blur-sm shadow-lg">
              <Sparkles className="w-4 h-4 mr-2 inline animate-pulse" />
              The Idea Behind 6Degree
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
                Your Network is Your
              <span className="block bg-gradient-to-r from-[#37D5A3] to-emerald-400 bg-clip-text text-transparent">
                Net-Worth
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              I built <span className="text-[#37D5A3] font-semibold">Komeant.ai</span>, an AI tool for influencers.
              Despite having a ready product, <span className="text-white font-semibold">not a single influencer responded</span>.
              <br /><br />
              I didn't need funding. I needed <span className="text-[#37D5A3] font-semibold">one introduction</span>.
              <br /><br />
              That's when I realized: <span className="text-white font-semibold">Access to connections matters more than effort</span>.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-20">
              <Button 
                size="lg" 
              className="text-lg px-8 py-6 bg-[#37D5A3] hover:bg-[#2BC090] text-[#0f1419] font-bold shadow-lg hover:shadow-[#37D5A3]/50 transition-all"
                onClick={() => navigate('/auth')}
              >
              Start Networking
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
              className="text-lg px-8 py-6 border-2 border-[#37D5A3] text-[#37D5A3] hover:bg-[#37D5A3]/10"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </div>
        </div>
      </section>

      {/* Horizontal Scrolling Offers Showcase */}
      <section className="py-16 border-y border-[#1F2937] bg-[#0f1419]/50 backdrop-blur-sm relative overflow-hidden">
        {/* Gradient overlay for fade effect */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-[#0f1419] to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-[#0f1419] to-transparent z-10 pointer-events-none"></div>
        
        <div className="container mx-auto px-4 mb-8">
          <h3 className="text-center text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Live Offers on PayNet Marketplace
          </h3>
          <p className="text-center text-xs text-gray-500">
            Browse real introduction offers • Set your price • Connect instantly
          </p>
        </div>
        
        {/* Infinite horizontal scroll of offers */}
        <div className="relative overflow-hidden">
          <div className="flex animate-scroll gap-4">
            {[...demoOffers, ...demoOffers].map((offer, index) => (
              <div key={index} className="flex-shrink-0">
                <div className="w-64 backdrop-blur-md bg-white/5 rounded-xl border border-white/10 hover:border-[#37D5A3]/50 hover:bg-white/10 transition-all shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform overflow-hidden group cursor-pointer">
                  {/* Glass shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/10 to-white/0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  
                  {/* Company Logo Section */}
                  <div className={`relative h-24 bg-gradient-to-br ${offer.color} flex items-center justify-center`}>
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/10 to-transparent"></div>
                    <div className="relative z-10 text-3xl font-bold text-white drop-shadow-lg">
                      {offer.company.charAt(0)}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <div className="p-4 relative z-10">
                    <h4 className="text-white font-bold text-sm mb-1 truncate">{offer.company}</h4>
                    <p className="text-gray-400 text-xs mb-3 truncate">{offer.position}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-[#37D5A3] font-bold text-lg">{offer.price}</span>
                      <Badge className="bg-[#37D5A3]/20 text-[#37D5A3] border-[#37D5A3]/30 text-xs">
                        Book Now
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="container mx-auto px-4 mt-8">
          <p className="text-center text-xs text-gray-500">
            💼 Executives • 👨‍⚖️ Lawyers • 📱 Influencers • 🚀 Startup Founders • 🏛️ Government Officials • 📊 Industry Leaders
          </p>
        </div>
      </section>

      {/* Two Core Features */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Two Ways to Network
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Whether you want to help others connect or reach someone yourself, 6Degree makes it possible
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Online Pehchaan - Offers */}
            <Card className="bg-gradient-to-br from-purple-900/20 to-purple-600/10 border-purple-500/30 overflow-hidden group hover:border-purple-500/50 transition-all backdrop-blur-sm hover:shadow-2xl hover:shadow-purple-500/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition-all"></div>
              {/* Glass shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-8 relative z-10">
                <div className="w-16 h-16 bg-purple-500/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-purple-500/20 shadow-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="w-8 h-8 text-purple-400" />
              </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  Create Offers
                  <Badge className="ml-3 bg-purple-500/20 text-purple-300 border-purple-500/30">
                    Online Pehchaan
                  </Badge>
                </h3>
                
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Monetize your network by creating introduction offers. Set your price, choose whom you can connect, and publish offers on the marketplace.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Set Your Terms</h4>
                      <p className="text-sm text-gray-400">Choose connections, set prices, publish offers</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Approval System</h4>
                      <p className="text-sm text-gray-400">Review and approve bids before connecting</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-purple-400" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Earn Money</h4>
                      <p className="text-sm text-gray-400">Turn your valuable connections into income</p>
                    </div>
                  </div>
            </div>

                <Button 
                  className="w-full bg-purple-600 hover:bg-purple-500 text-white"
                  onClick={() => navigate('/auth')}
                >
                  Browse Offers →
                </Button>
              </CardContent>
            </Card>

            {/* Chain Creation */}
            <Card className="bg-gradient-to-br from-[#37D5A3]/20 to-emerald-600/10 border-[#37D5A3]/30 overflow-hidden group hover:border-[#37D5A3]/50 transition-all backdrop-blur-sm hover:shadow-2xl hover:shadow-[#37D5A3]/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#37D5A3]/10 rounded-full blur-3xl group-hover:bg-[#37D5A3]/20 transition-all"></div>
              {/* Glass shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-8 relative z-10">
                <div className="w-16 h-16 bg-[#37D5A3]/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-[#37D5A3]/20 shadow-lg group-hover:scale-110 transition-transform">
                  <LinkIcon className="w-8 h-8 text-[#37D5A3]" />
              </div>

                <h3 className="text-2xl font-bold text-white mb-4">
                  Create Chains
                  <Badge className="ml-3 bg-[#37D5A3]/20 text-[#37D5A3] border-[#37D5A3]/30">
                    Share & Connect
                  </Badge>
                </h3>
                
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Need to reach someone? Create a chain request with video, share it with your network, and let connections lead you to your target.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#37D5A3]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-[#37D5A3]" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Video Requests</h4>
                      <p className="text-sm text-gray-400">Create personalized video intros to your target</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#37D5A3]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-[#37D5A3]" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Share Your Need</h4>
                      <p className="text-sm text-gray-400">Friends share with their connections, creating chains</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-[#37D5A3]/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-[#37D5A3]" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Reward Winners</h4>
                      <p className="text-sm text-gray-400">Winning chain members split the reward</p>
            </div>
              </div>
            </div>

                <Button 
                  className="w-full bg-[#37D5A3] hover:bg-[#2BC090] text-[#0f1419] font-semibold"
                  onClick={() => navigate('/auth')}
                >
                  Create a Chain →
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How Chains Work - Detailed */}
      <section className="py-24 px-4 bg-[#0f1419]/50 border-y border-[#1F2937]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-[#37D5A3]/20 text-[#37D5A3] border-[#37D5A3]/30">
              <Video className="w-4 h-4 mr-2 inline" />
              The Chain Concept
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Network by Sharing Video
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Create a video introducing yourself and your need. Share it with prospects. They share again. Everyone in the winning chain gets credits.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center group">
              <div className="relative w-20 h-20 bg-gradient-to-br from-[#37D5A3] to-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#37D5A3]/50 backdrop-blur-sm border border-[#37D5A3]/20 group-hover:scale-110 transition-transform">
                {/* Glass shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/40 to-white/0 rounded-2xl opacity-50"></div>
                <Video className="w-10 h-10 text-white relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">1. Create Video Request</h3>
              <p className="text-gray-400">
                Record a personal video explaining who you want to connect with and why
              </p>
            </div>

            <div className="text-center group">
              <div className="relative w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/50 backdrop-blur-sm border border-blue-500/20 group-hover:scale-110 transition-transform">
                {/* Glass shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/40 to-white/0 rounded-2xl opacity-50"></div>
                <Share2 className="w-10 h-10 text-white relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">2. Share & Build Chains</h3>
              <p className="text-gray-400">
                Your network forwards it to their connections, creating parallel chains competing to reach your target
              </p>
            </div>

            <div className="text-center group">
              <div className="relative w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-purple-500/50 backdrop-blur-sm border border-purple-500/20 group-hover:scale-110 transition-transform">
                {/* Glass shine */}
                <div className="absolute inset-0 bg-gradient-to-tr from-white/20 via-white/40 to-white/0 rounded-2xl opacity-50"></div>
                <Coins className="w-10 h-10 text-white relative z-10" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">3. Reward the Chain</h3>
              <p className="text-gray-400">
                When connected, everyone in the winning chain splits the reward and earns credits
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#37D5A3] mb-2">6°</div>
              <p className="text-gray-400">Degrees of Separation</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#37D5A3] mb-2">∞</div>
              <p className="text-gray-400">Potential Connections</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#37D5A3] mb-2">100%</div>
              <p className="text-gray-400">Your Network Value</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-[#37D5A3] mb-2">1</div>
              <p className="text-gray-400">Intro Can Change Everything</p>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section className="py-24 px-4 bg-[#0f1419]/50 border-y border-[#1F2937]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Who Uses 6Degree?
            </h2>
            <p className="text-xl text-gray-300">
              From startups to enterprises, professionals to influencers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/5 border-white/10 hover:border-[#37D5A3]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Building2 className="w-10 h-10 text-[#37D5A3] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Entrepreneurs</h3>
                <p className="text-sm text-gray-400">Connect with investors, partners, and early customers</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#37D5A3]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <UserCheck className="w-10 h-10 text-[#37D5A3] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Professionals</h3>
                <p className="text-sm text-gray-400">Find job opportunities through warm introductions</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#37D5A3]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Megaphone className="w-10 h-10 text-[#37D5A3] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Influencers</h3>
                <p className="text-sm text-gray-400">Monetize your network with introduction offers</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#37D5A3]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Scale className="w-10 h-10 text-[#37D5A3] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Lawyers</h3>
                <p className="text-sm text-gray-400">Connect clients with specialized legal experts</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#37D5A3]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <TrendingUp className="w-10 h-10 text-[#37D5A3] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Sales Teams</h3>
                <p className="text-sm text-gray-400">Get warm intros to decision makers</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#37D5A3]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Users className="w-10 h-10 text-[#37D5A3] mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Anyone</h3>
                <p className="text-sm text-gray-400">Everyone has valuable connections to share</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Unlock Your Network?
          </h2>
          <p className="text-xl text-gray-300 mb-12 max-w-2xl mx-auto">
            Join thousands of professionals monetizing their connections and reaching their goals through the power of networking
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button 
              size="lg" 
              className="text-lg px-10 py-6 bg-[#37D5A3] hover:bg-[#2BC090] text-[#0f1419] font-bold shadow-lg hover:shadow-[#37D5A3]/50 transition-all"
              onClick={() => navigate('/auth')}
            >
              <Sparkles className="mr-2 w-5 h-5" />
              Get Started Free
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-10 py-6 border-2 border-[#37D5A3] text-[#37D5A3] hover:bg-[#37D5A3]/10"
              onClick={() => navigate('/auth')}
            >
              View Dashboard
            </Button>
          </div>

          <p className="text-sm text-gray-500">
            No credit card required • Free to start • Earn as you connect
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-[#1F2937]">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-[#37D5A3] rounded-lg flex items-center justify-center">
                <span className="text-[#0f1419] font-bold text-sm">6°</span>
              </div>
              <span className="text-xl font-bold text-white">6Degree</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/about" className="text-gray-400 hover:text-[#37D5A3] transition-colors">About</Link>
              <Link to="/legal" className="text-gray-400 hover:text-[#37D5A3] transition-colors">Legal</Link>
              <span className="text-gray-500">© 2024 Grapherly OÜ</span>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </main>
  );
};

export default Index;
