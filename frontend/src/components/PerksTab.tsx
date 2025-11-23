import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Gift, TrendingUp } from 'lucide-react';

interface PerksTabProps {
  user: any; // Using any for now to match AuthUser roughly
  onCheckScore: () => void;
}

interface Perk {
  id: string;
  title: string;
  brand: string;
  brandUrl: string;
  logoUrl: string;
  description: string;
  minScore: number; // Social capital score required (mock logic for now based on "top 10")
  tier: 'Elite' | 'Strong' | 'Growing' | 'Emerging';
  // Using hex for proper arbitrary values in Tailwind if needed, but relying on classes for now
  // We will use these specific colors for borders/shadows to make them pop
  color: string; 
  hex: string;
}

// Helper function to get clean logo for background
const getRefinedLogo = (filename: string) => {
  return `/perks/${filename}`;
};

const PERKS: Perk[] = [
  {
    id: 'linkedin-premium',
    title: '3 Months Premium',
    brand: 'LinkedIn',
    brandUrl: 'linkedin.com',
    logoUrl: getRefinedLogo('linkedin.svg'),
    description: 'Unlock advanced networking insights and InMail credits.',
    minScore: 300, // Elite
    tier: 'Elite',
    color: 'text-[#0077B5] bg-[#0077B5]/10 border-[#0077B5]/30',
    hex: '#0077B5',
  },
  {
    id: 'notion-plus',
    title: '6 Months Plus Plan',
    brand: 'Notion',
    brandUrl: 'notion.so',
    logoUrl: getRefinedLogo('notion.png'),
    description: 'Organize your entire life and work with unlimited blocks.',
    minScore: 250, // Strong
    tier: 'Strong',
    color: 'text-black dark:text-white bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-600',
    hex: '#000000',
  },
  {
    id: 'starbucks-gift',
    title: '$50 Gift Card',
    brand: 'Starbucks',
    brandUrl: 'starbucks.com',
    logoUrl: getRefinedLogo('starbucks.svg'),
    description: 'Fuel your next networking coffee chat on us.',
    minScore: 200, // Growing
    tier: 'Growing',
    color: 'text-[#00704A] bg-[#00704A]/10 border-[#00704A]/30',
    hex: '#00704A',
  },
  {
    id: 'amazon-gift',
    title: '$100 Gift Card',
    brand: 'Amazon',
    brandUrl: 'amazon.com',
    logoUrl: getRefinedLogo('amazon.png'),
    description: 'Everything you need, delivered to your door.',
    minScore: 400, // Top Elite
    tier: 'Elite',
    color: 'text-[#FF9900] bg-[#FF9900]/10 border-[#FF9900]/30',
    hex: '#FF9900',
  }
];

export const PerksTab: React.FC<PerksTabProps> = ({ user, onCheckScore }) => {
  const userScore = user?.socialCapitalScore || 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-amber-100 to-yellow-100 rounded-full mb-2 shadow-lg shadow-amber-100/50 ring-4 ring-white dark:ring-background">
          <Gift className="w-8 h-8 text-amber-600" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-amber-600 to-yellow-500 bg-clip-text text-transparent">
          Exclusive Perks
        </h1>
        <p className="text-muted-foreground max-w-xl mx-auto text-lg">
          Premium rewards for our top networkers. Increase your social capital to unlock these exclusive benefits.
        </p>
        
        {/* Score Status */}
        <div className="flex justify-center mt-4">
          {userScore > 0 ? (
            <Badge variant="outline" className="text-base px-4 py-1.5 bg-background backdrop-blur-sm border-amber-200/50 shadow-sm">
              Your Score: <span className="font-bold ml-1 text-amber-600">{userScore}</span>
            </Badge>
          ) : (
            <Button 
              onClick={onCheckScore} 
              variant="outline" 
              className="gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 shadow-sm"
            >
              <TrendingUp className="w-4 h-4" />
              Check Your Score
            </Button>
          )}
        </div>
      </div>

      {/* Perks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {PERKS.map((perk) => {
          const isUnlocked = userScore >= perk.minScore;
          
          return (
            <div
              key={perk.id}
              className={`
                relative overflow-hidden rounded-[2rem] 
                transition-all duration-500 
                hover:scale-[1.02]
                h-[400px] group
              `}
              style={{
                backgroundColor: perk.hex, // Brand color as base background
                boxShadow: isUnlocked ? `0 20px 60px -15px ${perk.hex}80` : '0 10px 30px rgba(0,0,0,0.2)',
              }}
            >
              {/* HUGE Logo Background - Bleeding off edges */}
              <div className="absolute inset-0 z-0 flex items-center justify-center overflow-hidden pointer-events-none">
                {/* Using a simple div with background-image for better control over sizing and position */}
                <div 
                  className="w-[150%] h-[150%] opacity-10 rotate-12 transform origin-center translate-x-8 translate-y-4"
                  style={{
                    backgroundImage: `url(${perk.logoUrl})`,
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat',
                    filter: 'brightness(0) invert(1)', // Force white
                  }}
                />
              </div>

              {/* Gradient Overlay for Readability */}
              <div 
                className="absolute inset-0 z-10"
                style={{
                  background: 'linear-gradient(to bottom, rgba(0,0,0,0.1) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.9) 100%)'
                }}
              />

              {/* Lock Badge Overlay */}
              {!isUnlocked && (
                <div className="absolute top-4 right-4 z-30 bg-white text-black p-3 rounded-full shadow-xl border-4 border-white/20">
                  <Lock className="w-6 h-6" />
                </div>
              )}

              {/* Content Overlay */}
              <div className="relative z-20 h-full flex flex-col justify-between p-8 text-white">
                {/* Top Section: Brand & Title */}
                <div className="space-y-3">
                  <h3 className="font-black text-4xl tracking-tight drop-shadow-2xl">
                    {perk.brand}
                  </h3>
                  <Badge 
                    variant="secondary" 
                    className="bg-white/20 backdrop-blur-md text-white border-white/40 px-4 py-2 text-base font-semibold"
                  >
                    {perk.title}
                  </Badge>
                </div>

                {/* Middle Section: Description */}
                <div className="flex-1 flex items-center">
                  <p className="text-white/90 text-lg leading-relaxed font-medium drop-shadow-lg">
                    {perk.description}
                  </p>
                </div>

                {/* Bottom Section: Score & CTA */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white/60 block text-xs uppercase tracking-wider font-bold mb-1">
                        Required Score
                      </span>
                      <div className="text-2xl font-black text-white drop-shadow-lg">
                        {perk.minScore}+
                      </div>
                    </div>

                    <Button 
                      disabled={!isUnlocked}
                      size="lg"
                      className={`
                        font-bold text-lg px-6 py-6 rounded-xl
                        transition-all duration-300
                        ${isUnlocked 
                          ? 'bg-white text-black hover:bg-white/90 hover:scale-105 shadow-2xl' 
                          : 'bg-white/10 text-white/50 border-2 border-white/20 cursor-not-allowed'
                        }
                      `}
                    >
                      {isUnlocked ? (
                        <span className="flex items-center gap-2">
                          Claim Now <Gift className="w-5 h-5" />
                        </span>
                      ) : (
                        <span>Locked</span>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA for Low Score */}
      {(!userScore || userScore < 200) && (
        <div className="mt-12 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-[2rem] p-8 md:p-16 text-center text-white shadow-2xl shadow-indigo-500/30 overflow-hidden relative border border-indigo-400/30">
          {/* Decorative Elements */}
          <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
            <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] rounded-full bg-white blur-3xl animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-amber-400 blur-[100px]"></div>
          </div>

          <div className="relative z-10 max-w-2xl mx-auto space-y-8">
            <div className="inline-flex items-center justify-center p-4 bg-white/10 backdrop-blur-md rounded-2xl mb-2 border border-white/20">
              <Gift className="w-10 h-10 text-amber-300" />
            </div>
            
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Want these exclusive rewards?</h2>
              <p className="text-indigo-100 text-lg md:text-xl leading-relaxed max-w-xl mx-auto">
                Boost your social capital by connecting with others and completing requests to unlock premium gifts from top brands.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={onCheckScore}
                className="font-bold text-indigo-700 h-12 px-8 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 text-base"
              >
                Check My Score
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-transparent border-white/30 text-white hover:bg-white/10 h-12 px-8 backdrop-blur-sm text-base"
                onClick={() => window.location.href = '/dashboard?tab=requests'}
              >
                Start Networking
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
