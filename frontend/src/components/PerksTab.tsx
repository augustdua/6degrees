import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Gift, TrendingUp } from 'lucide-react';
import { getCloudinaryLogoUrlPremium } from '@/utils/cloudinary';

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

const PERKS: Perk[] = [
  {
    id: 'linkedin-premium',
    title: '3 Months Premium',
    brand: 'LinkedIn',
    brandUrl: 'linkedin.com',
    logoUrl: 'https://img.logo.dev/linkedin.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
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
    logoUrl: 'https://img.logo.dev/notion.so?token=pk_dvr547hlTjGTLwg7G9xcbQ',
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
    logoUrl: 'https://img.logo.dev/starbucks.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
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
    logoUrl: 'https://img.logo.dev/amazon.com?token=pk_dvr547hlTjGTLwg7G9xcbQ',
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
            <Card 
              key={perk.id} 
              // Dynamic style for border color to match brand
              style={{ 
                borderColor: isUnlocked ? perk.hex : undefined,
                // Add a subtle glow matching the brand color if unlocked
                boxShadow: isUnlocked ? `0 10px 40px -10px ${perk.hex}30` : undefined
              }}
              className={`overflow-hidden transition-all duration-500 border-2 relative group ${
                isUnlocked 
                  ? 'hover:scale-[1.02] bg-white dark:bg-card' 
                  : 'bg-muted/10 border-dashed border-muted-foreground/20'
              }`}
            >
              {/* Background Gradient Mesh for Unlocked State */}
              {isUnlocked && (
                <div 
                  className="absolute inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))]"
                  style={{ 
                    backgroundImage: `radial-gradient(circle at top right, ${perk.hex}, transparent 70%)`
                  }}
                />
              )}

              <CardContent className="p-8 relative z-10">
                <div className="flex flex-col items-center text-center mb-6">
                  {/* Logo Container - Gift Box Style */}
                  <div 
                    className={`w-48 h-48 rounded-[2rem] mb-6 flex items-center justify-center shadow-2xl bg-white transition-all duration-500 transform group-hover:rotate-3 group-hover:scale-110 relative z-20`}
                    style={{
                      // Always show a nice shadow, colored if unlocked
                      boxShadow: `0 20px 40px -10px ${perk.hex}40`,
                      border: `1px solid ${perk.hex}20`
                    }}
                  >
                    <img 
                      src={getCloudinaryLogoUrlPremium(perk.logoUrl)} 
                      alt={perk.brand}
                      className="w-32 h-32 object-contain drop-shadow-lg"
                    />
                    
                    {/* Lock Badge Overlay */}
                    {!isUnlocked && (
                      <div className="absolute -right-2 -top-2 bg-gray-900 text-white p-2 rounded-full shadow-lg border-2 border-white">
                        <Lock className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                  
                  <h3 className="font-bold text-3xl tracking-tight mb-2">{perk.brand}</h3>
                  
                  <Badge 
                    variant="secondary" 
                    className={`text-sm px-4 py-1.5 font-medium ${perk.color}`}
                  >
                    {perk.title}
                  </Badge>
                </div>

                <p className="text-muted-foreground mb-8 leading-relaxed text-center text-base max-w-sm mx-auto">
                  {perk.description}
                </p>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-6 border-t border-border/50">
                  <div className="text-left">
                    <span className="text-muted-foreground block text-[10px] uppercase tracking-wider font-bold mb-1 opacity-70">Required Score</span>
                    <div className={`flex items-center gap-1.5 font-bold text-xl ${isUnlocked ? 'text-green-600' : 'text-muted-foreground'}`}>
                      <span>{perk.minScore}+</span>
                    </div>
                  </div>
                  
                  <Button 
                    disabled={!isUnlocked}
                    size="lg"
                    className={`
                      relative overflow-hidden transition-all duration-300
                      ${isUnlocked 
                        ? 'text-white shadow-lg hover:shadow-xl hover:-translate-y-0.5' 
                        : 'bg-muted text-muted-foreground border border-border/50 cursor-not-allowed opacity-70'
                      }
                    `}
                    style={{
                      background: isUnlocked ? `linear-gradient(135deg, ${perk.hex}, ${perk.hex}DD)` : undefined,
                      borderColor: isUnlocked ? 'transparent' : undefined
                    }}
                  >
                    {isUnlocked ? (
                      <span className="flex items-center gap-2">
                        Claim Gift <Gift className="w-4 h-4" />
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        Locked
                      </span>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
