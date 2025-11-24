import ChainHero from "@/components/ChainHero";
import CreateRequestForm from "@/components/CreateRequestForm";
import GuestRequestView from "@/components/GuestRequestView";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams, useNavigate } from "react-router-dom";
import { User, LogIn, BarChart3, Plus, ArrowRight, Users, Link as LinkIcon, Award, DollarSign, Target, CheckCircle, Video, Share2, Coins, Sparkles, TrendingUp, Building2, Scale, UserCheck, Megaphone } from "lucide-react";

const Index = () => {
  const { user } = useAuth();
  const { getRequestByLink } = useRequests();
  const { linkId } = useParams();
  const navigate = useNavigate();
  const [requestData, setRequestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  // Redirect authenticated users to dashboard (unless viewing a specific link)
  useEffect(() => {
    if (user && !linkId) {
      navigate('/feed');
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

  // Demo offers for showcase - Indian-focused realistic offers with market-tested pricing
  const demoOffers = [
    { 
      company: "Google", 
      logo: "https://logo.clearbit.com/google.com",
      position: "SWE @ Google (Ex-IIT)",
      price: "₹4,999",
      name: "Rahul",
      relation: "College Friend",
      color: "from-[#8A8F99] to-[#666B72]"
    },
    { 
      company: "Amazon", 
      logo: "https://logo.clearbit.com/amazon.com",
      position: "ML Engineer @ Amazon",
      price: "₹3,999",
      name: "Priya",
      relation: "Cousin",
      color: "from-[#1A1D21] to-[#0B0E11]"
    },
    { 
      company: "BJP", 
      logo: "https://logo.clearbit.com/bjp.org",
      position: "State Campaign Manager",
      price: "₹7,999",
      name: "Rajesh",
      relation: "Friend",
      color: "from-[#666B72] to-[#1A1D21]"
    },
    { 
      company: "Y Combinator", 
      logo: "https://logo.clearbit.com/ycombinator.com",
      position: "Founder @ YC-backed SaaS",
      price: "₹6,499",
      name: "Arjun",
      relation: "Batchmate",
      color: "from-[#8A8F99] to-[#666B72]"
    },
    { 
      company: "Flipkart", 
      logo: "https://logo.clearbit.com/flipkart.com",
      position: "Product Manager @ Flipkart",
      price: "₹2,499",
      name: "Sneha",
      relation: "Friend",
      color: "from-[#D3D7DB] to-[#8A8F99]"
    },
    { 
      company: "Congress", 
      logo: "https://logo.clearbit.com/inc.in",
      position: "Youth Wing Leader",
      price: "₹6,499",
      name: "Manish",
      relation: "Colleague",
      color: "from-[#1A1D21] to-[#000000]"
    },
    { 
      company: "McKinsey", 
      logo: "https://logo.clearbit.com/mckinsey.com",
      position: "Strategy Consultant @ McKinsey",
      price: "₹5,499",
      name: "Aditya",
      relation: "Ex-Colleague",
      color: "from-[#D3D7DB] to-[#8A8F99]"
    },
    { 
      company: "Sequoia", 
      logo: "https://logo.clearbit.com/sequoiacap.com",
      position: "Associate @ Sequoia Surge",
      price: "₹6,999",
      name: "Kavya",
      relation: "Friend",
      color: "from-[#666B72] to-[#8A8F99]"
    },
    { 
      company: "Indian Oil", 
      logo: "https://logo.clearbit.com/iocl.com",
      position: "Petrol Pump & Store Owner",
      price: "₹2,999",
      name: "Amit",
      relation: "Family Friend",
      color: "from-[#8A8F99] to-[#D3D7DB]"
    },
    { 
      company: "DLF", 
      logo: "https://logo.clearbit.com/dlf.in",
      position: "Luxury Real Estate Broker",
      price: "₹3,999",
      name: "Rohan",
      relation: "Neighbor",
      color: "from-[#3B2A72] to-[#1A1D21]"
    },
    { 
      company: "Maersk", 
      logo: "https://logo.clearbit.com/maersk.com",
      position: "Import/Export Business Owner",
      price: "₹3,499",
      name: "Vikram",
      relation: "Cousin",
      color: "from-[#CBAA5A] to-[#B28A28]"
    },
    { 
      company: "Tata Steel", 
      logo: "https://logo.clearbit.com/tatasteel.com",
      position: "CNC Factory Owner",
      price: "₹4,499",
      name: "Suresh",
      relation: "Uncle",
      color: "from-[#1A1D21] to-[#0B0E11]"
    },
    { 
      company: "YouTube", 
      logo: "https://logo.clearbit.com/youtube.com",
      position: "Content Creator (100K+)",
      price: "₹2,499",
      name: "Nisha",
      relation: "Friend",
      color: "from-[#666B72] to-[#1A1D21]"
    },
    { 
      company: "Polygon", 
      logo: "https://logo.clearbit.com/polygon.technology",
      position: "Blockchain Dev @ Polygon",
      price: "₹3,999",
      name: "Karan",
      relation: "Classmate",
      color: "from-[#3AB795] to-[#3B2A72]"
    },
    { 
      company: "Swiggy", 
      logo: "https://logo.clearbit.com/swiggy.com",
      position: "Cloud Kitchen Chain Operator",
      price: "₹3,499",
      name: "Anjali",
      relation: "Friend",
      color: "from-orange-500 to-red-500"
    },
    { 
      company: "Stanford", 
      logo: "https://logo.clearbit.com/stanford.edu",
      position: "Stanford MSCS Graduate",
      price: "₹7,499",
      name: "Siddharth",
      relation: "Senior",
      color: "from-red-700 to-red-800"
    },
  ];

  // Default homepage - New comprehensive landing
  return (
    <main className="min-h-screen bg-black">
      {/* Navigation Bar - BLACK */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/95">
        <div className="container mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
          {/* Logo - Gold ONLY here */}
          <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#CBAA5A] to-[#B28A28] rounded-lg flex items-center justify-center shadow-lg shadow-[#CBAA5A]/20">
                <span className="text-white font-bold text-lg">6°</span>
            </div>
              <span className="text-2xl font-bold text-white">6Degree</span>
          </div>
          
          {/* Auth buttons - White buttons on black */}
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost"
                className="text-white/70 hover:text-black hover:bg-white/5"
                onClick={() => navigate('/auth')}
              >
                Sign In
                </Button>
              <Button 
                className="bg-white hover:bg-[#CBAA5A] text-black hover:text-black font-semibold shadow-lg transition-all duration-300"
                onClick={() => navigate('/auth')}
              >
                Get Started Free
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - BLACK background */}
      <section className="relative py-20 md:py-32 px-4 overflow-hidden bg-black">
        {/* Minimal ambient effects - VERY subtle */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent"></div>
        
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-6 bg-white/10 text-white border-white/20 px-4 py-2 text-sm backdrop-blur-sm">
              <Sparkles className="w-4 h-4 mr-2 inline" />
              Professional Networking Platform
            </Badge>
            
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">
              Connect People.
              <span className="block text-white">
                Get Paid.
              </span>
            </h1>
            
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
              Monetize your network by creating <span className="text-white font-semibold">introduction offers</span>.
              <br />
              Or find the connections you need through <span className="text-white font-semibold">introduction chains</span>.
              <br /><br />
              <span className="text-white font-semibold">Your network is your net-worth.</span>
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
              className="text-lg px-8 py-6 bg-white hover:bg-[#CBAA5A] text-black hover:text-black font-bold shadow-xl transition-all duration-300"
                onClick={() => navigate('/auth')}
              >
              Start Networking
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
              className="text-lg px-8 py-6 border-2 border-white/20 text-white hover:bg-white/10 backdrop-blur-sm shadow-lg"
              onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </div>
        </div>
      </section>

      {/* Horizontal Scrolling Offers Showcase */}
      <section className="py-20 border-y border-[#1F2937] bg-[#0f1419]/50 backdrop-blur-sm relative overflow-hidden">
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
        
        {/* Auto-scrolling + Manual horizontal scroll of offers */}
        <div className="relative">
          <div 
            ref={scrollContainerRef}
            className="overflow-x-auto overflow-y-hidden pb-4 scrollbar-hide"
            onMouseEnter={() => setIsScrolling(true)}
            onMouseLeave={() => setIsScrolling(false)}
            onTouchStart={() => setIsScrolling(true)}
            onTouchEnd={() => setTimeout(() => setIsScrolling(false), 2000)}
          >
            <div className={`flex gap-4 md:gap-6 px-4 ${!isScrolling ? 'animate-scroll' : ''}`}>
              {[...demoOffers, ...demoOffers].map((offer, index) => (
                <div key={index} className="flex-shrink-0">
                  <Card className="w-64 md:w-72 hover:shadow-lg transition-shadow cursor-pointer">
                    <CardContent className="p-0 space-y-0">
                      {/* Target Organization Logo - Large at Top with Glass Effect - EXACT MATCH FROM FEED */}
                      <div className="relative w-full h-40 md:h-48 flex flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 overflow-hidden">
                        {/* Ambient glow */}
                        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10"></div>
                        
                        {/* Company Name */}
                        <h3 className="relative z-20 text-sm md:text-base font-bold text-foreground mb-2 text-center px-4">
                          {offer.company}
                        </h3>
                        
                        {/* Glass card for logo - EXACT MATCH FROM FEED */}
                        <div className="relative backdrop-blur-sm bg-white/60 dark:bg-slate-900/60 p-4 md:p-5 rounded-2xl shadow-2xl border border-white/20 dark:border-slate-700/30 max-w-[60%] flex items-center justify-center">
                          {/* Shine effect */}
                          <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>
                          
                          {offer.logo ? (
                            <img 
                              src={offer.logo} 
                              alt={offer.company}
                              className="relative z-10 w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-lg"
                              onError={(e) => {
                                // Fallback to initial if logo fails
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  parent.innerHTML = `<div class="text-3xl font-bold text-foreground">${offer.company.charAt(0)}</div>`;
                                }
                              }}
                            />
                          ) : (
                            <div className="text-3xl font-bold text-foreground">{offer.company.charAt(0)}</div>
                          )}
                        </div>
            </div>

                      {/* Content Section */}
                      <div className="p-4">
                        <p className="text-muted-foreground text-xs md:text-sm mb-3 line-clamp-2">{offer.position}</p>
                        <div className="flex items-center justify-between mb-3 pb-3 border-b">
                          <span className="text-white font-bold text-lg md:text-xl">{offer.price}</span>
                          <Button className="bg-white hover:bg-[#CBAA5A] text-black hover:text-black font-semibold text-xs px-3 py-1.5 rounded-lg transition-all duration-300">
                            Book Now
                          </Button>
                        </div>
                        {/* Name and Relation */}
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground text-xs">{offer.name}</span>
                          <span className="text-muted-foreground text-xs italic">{offer.relation}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
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
            <Card className="bg-gradient-to-br from-[#CBAA5A]/20 to-[#B28A28]/10 border-white/20/30 overflow-hidden group hover:border-white/20/50 transition-all backdrop-blur-sm hover:shadow-2xl hover:shadow-[#CBAA5A]/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
              {/* Glass shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-8 relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                  <DollarSign className="w-8 h-8 text-white" />
              </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  Create Offers
                  <Badge className="ml-3 bg-white/20 text-white border-white/20/30">
                    Online Pehchaan
                  </Badge>
                </h3>
                
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Monetize your network by creating introduction offers. Set your price, choose whom you can connect, and publish offers on the marketplace.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Set Your Terms</h4>
                      <p className="text-sm text-gray-400">Choose connections, set prices, publish offers</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Approval System</h4>
                      <p className="text-sm text-gray-400">Review and approve bids before connecting</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
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
            <Card className="bg-gradient-to-br from-white/5 to-white/[0.02] border-white/10 overflow-hidden group hover:border-white/20/30 transition-all backdrop-blur-sm hover:shadow-2xl hover:shadow-[#CBAA5A]/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
              {/* Glass shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-8 relative z-10">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/20/20 shadow-lg group-hover:scale-110 transition-transform">
                  <LinkIcon className="w-8 h-8 text-white" />
              </div>

                <h3 className="text-2xl font-bold text-white mb-4">
                  Create Chains
                  <Badge className="ml-3 bg-white/20 text-white border-white/20/30">
                    Share & Connect
                  </Badge>
                </h3>
                
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Need to reach someone? Create a chain request with video, share it with your network, and let connections lead you to your target.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Video Requests</h4>
                      <p className="text-sm text-gray-400">Create personalized video intros to your target</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Share Your Need</h4>
                      <p className="text-sm text-gray-400">Friends share with their connections, creating chains</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Reward Winners</h4>
                      <p className="text-sm text-gray-400">Winning chain members split the reward</p>
            </div>
              </div>
            </div>

                <Button 
                  className="w-full bg-white hover:bg-[#CBAA5A] text-black hover:text-black font-semibold transition-all duration-300"
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
            <Badge className="mb-4 bg-white/20 text-white border-white/20/30">
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
              <div className="relative w-20 h-20 bg-gradient-to-br from-[#CBAA5A] to-[#B28A28] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#CBAA5A]/30 backdrop-blur-sm border border-white/20/20 group-hover:scale-110 transition-transform">
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
              <div className="relative w-20 h-20 bg-gradient-to-br from-[#CBAA5A] to-[#B28A28] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#CBAA5A]/50 backdrop-blur-sm border border-white/20/20 group-hover:scale-110 transition-transform">
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
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">6°</div>
              <p className="text-gray-400">Degrees of Separation</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">∞</div>
              <p className="text-gray-400">Potential Connections</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">100%</div>
              <p className="text-gray-400">Your Network Value</p>
            </div>
            <div className="text-center">
              <div className="text-4xl md:text-5xl font-bold text-white mb-2">1</div>
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
            <Card className="bg-white/5 border-white/10 hover:border-white/20/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Building2 className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Entrepreneurs</h3>
                <p className="text-sm text-gray-400">Connect with investors, partners, and early customers</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-white/20/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <UserCheck className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Professionals</h3>
                <p className="text-sm text-gray-400">Find job opportunities through warm introductions</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-white/20/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Megaphone className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Influencers</h3>
                <p className="text-sm text-gray-400">Monetize your network with introduction offers</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-white/20/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Scale className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Lawyers</h3>
                <p className="text-sm text-gray-400">Connect clients with specialized legal experts</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-white/20/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <TrendingUp className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Sales Teams</h3>
                <p className="text-sm text-gray-400">Get warm intros to decision makers</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-white/20/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#37D5A3]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Users className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
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
              className="text-lg px-10 py-6 bg-white hover:bg-[#CBAA5A] text-black hover:text-black font-bold shadow-lg transition-all duration-300"
              onClick={() => navigate('/auth')}
            >
              <Sparkles className="mr-2 w-5 h-5" />
              Get Started Free
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="text-lg px-10 py-6 border-2 border-white/20 text-white hover:bg-white/10"
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
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">6°</span>
              </div>
              <span className="text-xl font-bold text-white">6Degree</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/about" className="text-gray-400 hover:text-black transition-colors">About</Link>
              <Link to="/legal" className="text-gray-400 hover:text-black transition-colors">Legal</Link>
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
        
        /* Desktop: Slower scroll (30s) */
        .animate-scroll {
          animation: scroll 30s linear infinite;
        }
        
        /* Mobile: Faster scroll (15s) */
        @media (max-width: 768px) {
          .animate-scroll {
            animation: scroll 15s linear infinite;
          }
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </main>
  );
};

export default Index;
