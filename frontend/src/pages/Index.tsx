import ChainHero from "@/components/ChainHero";
import CreateRequestForm from "@/components/CreateRequestForm";
import GuestRequestView from "@/components/GuestRequestView";
import SocialCapitalLeaderboard from "@/components/SocialCapitalLeaderboard";
import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRequests } from "@/hooks/useRequests";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Link, useParams, useNavigate } from "react-router-dom";
import { User, LogIn, BarChart3, Plus, ArrowRight, Users, Link as LinkIcon, Award, DollarSign, Target, CheckCircle, Video, Share2, Coins, Sparkles, TrendingUp, Building2, Scale, UserCheck, Megaphone, Calendar, Gift, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const Index = () => {
  const { user } = useAuth();
  const { getRequestByLink } = useRequests();
  const { linkId } = useParams();
  const navigate = useNavigate();
  const [requestData, setRequestData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const cyclingWords = ["Provide Access", "Attend Events", "Earn Rewards"];

  // Cycle through words every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prev) => (prev + 1) % cyclingWords.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Redirect authenticated users to dashboard (unless viewing a specific link)
  useEffect(() => {
    if (user && !linkId) {
      navigate('/');
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
                <span className="text-black font-bold text-lg" style={{ fontFamily: 'Riccione-DemiBold, ui-serif, serif' }}>Z</span>
            </div>
              <span className="text-2xl font-bold text-[#CBAA5A]">Zaurq</span>
          </div>
          
          {/* Auth buttons - White buttons on black */}
            <div className="flex items-center gap-2 md:gap-3">
              <Button 
                variant="ghost"
                className="text-[#CBAA5A] hover:text-black hover:bg-[#CBAA5A] text-xs md:text-sm"
                onClick={() => navigate('/invite')}
              >
                Have a code?
              </Button>
              <Button 
                variant="ghost"
                className="text-white/70 hover:text-black hover:bg-[#CBAA5A]"
                onClick={() => navigate('/auth')}
              >
                Sign In
                </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - Horizontal Scroll + Staggered Animation */}
      <section className="relative min-h-screen bg-black overflow-hidden">
        {/* Golden Glow Balls */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Top Right */}
          <motion.div
            className="absolute -top-[20%] -right-[10%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(203,170,90,0.6) 0%, rgba(203,170,90,0.2) 40%, rgba(203,170,90,0) 70%)',
              filter: 'blur(60px)',
            }}
            animate={{ opacity: [0.5, 0.8, 0.5], scale: [1, 1.1, 1] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
          {/* Top Left */}
          <motion.div
            className="absolute -top-[15%] -left-[10%] w-[350px] h-[350px] md:w-[500px] md:h-[500px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(203,170,90,0.5) 0%, rgba(203,170,90,0.15) 40%, rgba(203,170,90,0) 70%)',
              filter: 'blur(60px)',
            }}
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          />
          {/* Bottom Left */}
          <motion.div
            className="absolute -bottom-[20%] -left-[10%] w-[400px] h-[400px] md:w-[600px] md:h-[600px] rounded-full"
            style={{
              background: 'radial-gradient(circle, rgba(203,170,90,0.5) 0%, rgba(203,170,90,0.15) 40%, rgba(203,170,90,0) 70%)',
              filter: 'blur(60px)',
            }}
            animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
        </div>

        <div className="relative z-10 pt-12 md:pt-20">
          {/* Top Image Scroll */}
          <div className="w-full overflow-hidden mb-8">
            <div className="flex gap-3 animate-events-scroll">
              {[
                'soho-house-mumbai.jpg', 'private-hire.png', 'mumbai-mixer.jpg', 'soho-house-2.jpg', 'event-1.jpg',
                'event-2.jpg', 'event-3.jpg', 'event-4.jpg', 'event-5.jpg', 'private-dinner.jpg',
                'soho-house-mumbai.jpg', 'private-hire.png', 'mumbai-mixer.jpg', 'soho-house-2.jpg', 'event-1.jpg',
                'event-2.jpg', 'event-3.jpg', 'event-4.jpg', 'event-5.jpg', 'private-dinner.jpg',
              ].map((img, i) => (
                <div key={i} className="flex-shrink-0 w-48 md:w-64 h-32 md:h-44 rounded-xl overflow-hidden">
                  <img src={`https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/landing-images/${img}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>

          {/* Main CTA Content */}
          <div className="container mx-auto px-4 text-center max-w-3xl">
            {/* Cycling Animated Tagline */}
            <div className="h-28 md:h-36 lg:h-44 flex items-center justify-center mb-6">
              <AnimatePresence mode="wait">
                <motion.h1 
                  key={currentWordIndex}
                  className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-[#CBAA5A] leading-tight"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  {cyclingWords[currentWordIndex]}
                </motion.h1>
              </AnimatePresence>
            </div>

            {/* Sub-tagline */}
            <motion.p 
              className="text-lg md:text-xl text-white/60 mb-10 max-w-xl mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
            >
              Your network is your net worth. Turn connections into opportunities.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 justify-center mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <Button 
                size="lg" 
                className="text-base px-8 py-6 bg-[#CBAA5A] hover:bg-[#B8994A] text-black font-semibold shadow-lg shadow-[#CBAA5A]/20 transition-all duration-300 hover:scale-[1.02]"
                onClick={() => navigate('/auth')}
              >
                Start Networking
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-base px-8 py-6 border border-white/20 text-white hover:bg-white hover:text-black transition-all duration-300 hover:scale-[1.02]"
                onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
              >
                See How It Works
              </Button>
            </motion.div>

            <motion.div 
              className="flex items-center justify-center gap-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <span className="text-white/40 text-sm">Have an invite code?</span>
              <Button 
                variant="link"
                className="text-[#CBAA5A] hover:text-[#CBAA5A]/80 text-sm p-0 h-auto"
                onClick={() => navigate('/invite')}
              >
                Enter Code →
              </Button>
            </motion.div>
          </div>

          {/* Bottom Image Scroll - Reverse Direction */}
          <div className="w-full overflow-hidden mt-10">
            <div className="flex gap-3 animate-events-scroll-reverse">
              {[
                'event-5.jpg', 'private-dinner.jpg', 'soho-house-mumbai.jpg', 'event-3.jpg', 'mumbai-mixer.jpg',
                'event-4.jpg', 'soho-house-2.jpg', 'event-1.jpg', 'private-hire.png', 'event-2.jpg',
                'event-5.jpg', 'private-dinner.jpg', 'soho-house-mumbai.jpg', 'event-3.jpg', 'mumbai-mixer.jpg',
                'event-4.jpg', 'soho-house-2.jpg', 'event-1.jpg', 'private-hire.png', 'event-2.jpg',
              ].map((img, i) => (
                <div key={i} className="flex-shrink-0 w-48 md:w-64 h-32 md:h-44 rounded-xl overflow-hidden">
                  <img src={`https://tfbwfcnjdmbqmoyljeys.supabase.co/storage/v1/object/public/landing-images/${img}`} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What is Zaurq - Explanatory Section */}
      <section className="py-24 px-4 bg-black relative overflow-hidden">
        <div className="container mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Explanation */}
            <div>
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                What is <span className="text-[#CBAA5A]">Zaurq</span>?
              </h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Zaurq is a <span className="text-white font-semibold">relationship operating system</span> that helps you stay close to the people who matter.
              </p>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Build a weekly ritual, track moments that matter, and make warm introductions with context and consent.
              </p>
              <p className="text-lg text-gray-300 mb-8 leading-relaxed">
                <span className="text-[#CBAA5A] font-semibold">Build your SOCAP score</span> by being an active connector. The more valuable introductions you make, the higher you climb on the leaderboard.
              </p>

              {/* What You Get */}
              <div className="mb-8">
                <h3 className="text-white font-semibold mb-4 text-lg">What you get:</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#CBAA5A]/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-4 h-4 text-[#CBAA5A]" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Members-Only Events</span> — Curated dinners, mixers & experiences</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#CBAA5A]/20 rounded-lg flex items-center justify-center">
                      <Gift className="w-4 h-4 text-[#CBAA5A]" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Exclusive Perks</span> — Rewards from top brands & partners</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#CBAA5A]/20 rounded-lg flex items-center justify-center">
                      <Users className="w-4 h-4 text-[#CBAA5A]" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Private Forum</span> — Connect with founders & entrepreneurs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#CBAA5A]/20 rounded-lg flex items-center justify-center">
                      <DollarSign className="w-4 h-4 text-[#CBAA5A]" />
                    </div>
                    <span className="text-gray-300"><span className="text-white font-medium">Warm Introductions</span> — Ask the right person, with the right context</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                  <span className="text-[#CBAA5A] text-sm">✓</span>
                  <span className="text-white text-sm">Events</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                  <span className="text-[#CBAA5A] text-sm">✓</span>
                  <span className="text-white text-sm">Perks</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                  <span className="text-[#CBAA5A] text-sm">✓</span>
                  <span className="text-white text-sm">Forum</span>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full">
                  <span className="text-[#CBAA5A] text-sm">✓</span>
                  <span className="text-white text-sm">Rewards</span>
                </div>
              </div>
            </div>

            {/* Right: Ritual Preview */}
            <div className="relative h-[600px] overflow-hidden flex items-center justify-center">
              <div className="w-full max-w-sm border border-white/10 bg-white/5 rounded-2xl p-6">
                <div className="text-xs tracking-[0.18em] uppercase text-[#CBAA5A] font-bold">Thursday</div>
                <div className="text-white text-2xl font-semibold mt-2">Keep 3 relationships warm</div>
                <div className="text-gray-300 mt-3 text-sm leading-relaxed">
                  Get 3–5 suggestions each week: send a note, schedule a catch-up, or request an intro.
                </div>
                <div className="mt-5 flex flex-col gap-2">
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <div className="text-white text-sm font-medium">Send a note</div>
                    <div className="text-gray-400 text-xs mt-1">Work anniversary today</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <div className="text-white text-sm font-medium">Request an intro</div>
                    <div className="text-gray-400 text-xs mt-1">Ask a mutual for a warm bridge</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                    <div className="text-white text-sm font-medium">Moments this week</div>
                    <div className="text-gray-400 text-xs mt-1">Birthdays, promotions, anniversaries</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SOCAP Score & Leaderboard Section */}
      <section className="py-24 px-4 bg-black border-y border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-[#CBAA5A]/20 text-[#CBAA5A] border-[#CBAA5A]/30">
              <Star className="w-4 h-4 mr-2 inline" />
              Social Capital Score
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Your <span className="text-[#CBAA5A]">SOCAP</span> Score
            </h2>
            <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-8">
              Build reputation by making valuable connections. Top connectors earn exclusive rewards and event access.
            </p>
          </div>

          {/* Top 3 Leaderboard - Horizontal Row */}
          <div className="max-w-5xl mx-auto mb-12">
            <SocialCapitalLeaderboard limit={3} />
          </div>

          {/* How SOCAP Works */}
          <div className="grid md:grid-cols-4 gap-4 text-center">
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="w-10 h-10 bg-[#CBAA5A]/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Users className="w-5 h-5 text-[#CBAA5A]" />
              </div>
              <p className="text-white font-medium text-sm">Make Intros</p>
              <p className="text-[#CBAA5A] text-xs">+50 SOCAP</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="w-10 h-10 bg-[#CBAA5A]/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-5 h-5 text-[#CBAA5A]" />
              </div>
              <p className="text-white font-medium text-sm">Successful Deal</p>
              <p className="text-[#CBAA5A] text-xs">+100 SOCAP</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="w-10 h-10 bg-[#CBAA5A]/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Calendar className="w-5 h-5 text-[#CBAA5A]" />
              </div>
              <p className="text-white font-medium text-sm">Attend Events</p>
              <p className="text-[#CBAA5A] text-xs">+25 SOCAP</p>
            </div>
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="w-10 h-10 bg-[#CBAA5A]/20 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Star className="w-5 h-5 text-[#CBAA5A]" />
              </div>
              <p className="text-white font-medium text-sm">Get Rated</p>
              <p className="text-[#CBAA5A] text-xs">+10 SOCAP</p>
            </div>
          </div>
        </div>
      </section>

      {/* Horizontal Scrolling Offers Showcase - COMMENTED OUT
      <section className="py-20 border-y border-[#1F2937] bg-[#0f1419]/50 backdrop-blur-sm relative overflow-hidden">
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
                  ... offer cards ...
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 mt-8">
          <p className="text-center text-xs text-gray-500">
            Executives • Lawyers • Influencers • Startup Founders • Government Officials • Industry Leaders
          </p>
        </div>
      </section>
      */}

      {/* Two Core Features */}
      <section id="how-it-works" className="py-24 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Two Ways to Network
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Whether you want to help others connect or reach someone yourself, Zaurq makes it possible
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* Request an intro */}
            <Card className="bg-gradient-to-br from-[#CBAA5A]/20 to-[#B28A28]/10 border-white/20/30 overflow-hidden group hover:border-[#CBAA5A]/50 transition-all backdrop-blur-sm hover:shadow-2xl hover:shadow-[#CBAA5A]/20">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all"></div>
              {/* Glass shine overlay */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <CardContent className="p-8 relative z-10">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-sm border border-white/10 shadow-lg group-hover:scale-110 transition-transform">
                  <Users className="w-8 h-8 text-white" />
              </div>
                
                <h3 className="text-2xl font-bold text-white mb-4">
                  Request an Intro
                </h3>
                
                <p className="text-gray-300 mb-6 leading-relaxed">
                  Ask for a warm bridge to the right person, with context and consent. Your network helps you reach your target in a clean, human way.
                </p>

                <div className="space-y-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Add context</h4>
                      <p className="text-sm text-gray-400">Why you want the intro, and what you’re asking for</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Consent-first</h4>
                      <p className="text-sm text-gray-400">Connectors can accept, ask a question, or decline</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="text-white font-semibold mb-1">Get it done</h4>
                      <p className="text-sm text-gray-400">Turn weak ties into real conversations</p>
                    </div>
                  </div>
            </div>

                <Button 
                  className="w-full bg-white hover:bg-[#CBAA5A] text-black hover:text-black"
                  onClick={() => navigate('/auth')}
                >
                  Request an intro →
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
      <section className="py-24 px-4 bg-black border-y border-white/10">
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
              <div className="text-4xl md:text-5xl font-bold text-white mb-2" style={{ fontFamily: 'Riccione-DemiBold, ui-serif, serif' }}>Z</div>
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
      <section className="py-24 px-4 bg-black border-y border-white/10">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Who Uses Zaurq?
            </h2>
            <p className="text-xl text-gray-300">
              From startups to enterprises, professionals to influencers
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <Card className="bg-white/5 border-white/10 hover:border-[#CBAA5A]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#CBAA5A]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Building2 className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Entrepreneurs</h3>
                <p className="text-sm text-gray-400">Connect with investors, partners, and early customers</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#CBAA5A]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#CBAA5A]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <UserCheck className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Professionals</h3>
                <p className="text-sm text-gray-400">Find job opportunities through warm introductions</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#CBAA5A]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#CBAA5A]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Megaphone className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Influencers</h3>
                <p className="text-sm text-gray-400">Reach the right people through warm introductions</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#CBAA5A]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#CBAA5A]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <Scale className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Lawyers</h3>
                <p className="text-sm text-gray-400">Connect clients with specialized legal experts</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#CBAA5A]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#CBAA5A]/20 hover:scale-105 transform">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"></div>
              <CardContent className="p-6 relative z-10">
                <TrendingUp className="w-10 h-10 text-white mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-lg font-bold text-white mb-2">Sales Teams</h3>
                <p className="text-sm text-gray-400">Get warm intros to decision makers</p>
              </CardContent>
            </Card>

            <Card className="bg-white/5 border-white/10 hover:border-[#CBAA5A]/50 transition-all backdrop-blur-md hover:bg-white/10 group hover:shadow-lg hover:shadow-[#CBAA5A]/20 hover:scale-105 transform">
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
              className="text-lg px-10 py-6 border-2 border-white/20 text-white hover:bg-[#CBAA5A] hover:text-black hover:border-[#CBAA5A] transition-colors"
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
      <footer className="py-12 px-4 border-t border-white/10 bg-black">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-6 md:mb-0">
              <div className="w-8 h-8 bg-[#CBAA5A] rounded-lg flex items-center justify-center">
                <span className="text-black font-bold text-sm" style={{ fontFamily: 'Riccione-DemiBold, ui-serif, serif' }}>Z</span>
              </div>
              <span className="text-xl font-bold text-white">Zaurq</span>
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
        
        /* Hero background scroll - slow and smooth */
        @keyframes hero-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-hero-scroll {
          animation: hero-scroll 60s linear infinite;
        }

        /* Events infinite scroll */
        @keyframes events-scroll {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        
        .animate-events-scroll {
          animation: events-scroll 30s linear infinite;
        }
        
        .animate-events-scroll:hover {
          animation-play-state: paused;
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
          .animate-hero-scroll {
            animation: hero-scroll 40s linear infinite;
          }
        }
        
        .animate-scroll:hover {
          animation-play-state: paused;
        }

        /* Slow pulse for hero glow */
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: translate(-50%, 0) scale(1);
          }
          50% {
            opacity: 0.5;
            transform: translate(-50%, 0) scale(1.05);
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 6s ease-in-out infinite;
        }

        /* Border glow animation for cards */
        @keyframes border-glow {
          0%, 100% {
            background-position: 0% 50%;
            opacity: 0.3;
          }
          50% {
            background-position: 100% 50%;
            opacity: 0.6;
          }
        }
        
        .animate-border-glow {
          animation: border-glow 3s ease-in-out infinite;
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: xor;
          -webkit-mask-composite: xor;
          padding: 1px;
        }
      `}</style>
    </main>
  );
};

export default Index;
