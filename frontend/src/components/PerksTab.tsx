import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Gift, TrendingUp, ArrowRight } from 'lucide-react';
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
  color: string;
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
    color: 'bg-[#0077B5]/10 text-[#0077B5] border-[#0077B5]/20',
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
    color: 'bg-black/5 text-black border-black/20 dark:bg-white/10 dark:text-white',
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
    color: 'bg-[#00704A]/10 text-[#00704A] border-[#00704A]/20',
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
    color: 'bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20',
  }
];

export const PerksTab: React.FC<PerksTabProps> = ({ user, onCheckScore }) => {
  const userScore = user?.socialCapitalScore || 0;
  const isElite = userScore >= 300;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-8">
      {/* Header Section */}
      <div className="text-center space-y-4 mb-8">
        <div className="inline-flex items-center justify-center p-3 bg-amber-100 rounded-full mb-2">
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
            <Badge variant="outline" className="text-base px-4 py-1.5 bg-background backdrop-blur-sm">
              Your Score: <span className="font-bold ml-1">{userScore}</span>
            </Badge>
          ) : (
            <Button 
              onClick={onCheckScore} 
              variant="outline" 
              className="gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
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
              className={`overflow-hidden transition-all duration-300 border-2 ${
                isUnlocked 
                  ? 'hover:shadow-xl hover:border-amber-400/50 border-transparent bg-gradient-to-br from-white to-amber-50/30 dark:from-background dark:to-amber-950/10' 
                  : 'opacity-80 hover:opacity-100 border-muted bg-muted/20 grayscale-[0.5] hover:grayscale-0'
              }`}
            >
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center mb-6">
                  {/* Big, Bright, Rounded Logo Gift */}
                  <div className={`w-24 h-24 rounded-3xl mb-4 flex items-center justify-center shadow-lg ${isUnlocked ? 'shadow-amber-200/50 ring-4 ring-amber-100' : 'grayscale opacity-70'} bg-white transition-all duration-500 transform hover:scale-110`}>
                    <img 
                      src={getCloudinaryLogoUrlPremium(perk.logoUrl)} 
                      alt={perk.brand}
                      className="w-16 h-16 object-contain drop-shadow-md"
                    />
                  </div>
                  
                  <h3 className="font-bold text-2xl">{perk.brand}</h3>
                  <Badge variant="secondary" className={`mt-2 text-sm px-3 py-1 ${perk.color}`}>
                    {perk.title}
                  </Badge>
                </div>

                <p className="text-muted-foreground mb-6 leading-relaxed text-center">
                  {perk.description}
                </p>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm">
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider font-medium mb-0.5">Required Score</span>
                    <div className={`flex items-center gap-1.5 font-bold text-lg ${isUnlocked ? 'text-green-600' : 'text-amber-600'}`}>
                      {isUnlocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                      {perk.minScore}+
                    </div>
                  </div>
                  
                  <Button 
                    disabled={!isUnlocked}
                    className={isUnlocked ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white border-0 shadow-md hover:shadow-lg transition-all' : ''}
                  >
                    {isUnlocked ? 'Claim Gift' : 'Locked'}
                    {isUnlocked && <Gift className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CTA for Low Score */}
      {(!userScore || userScore < 200) && (
        <div className="mt-12 bg-gradient-to-br from-indigo-600 to-violet-700 rounded-2xl p-8 md:p-12 text-center text-white shadow-xl overflow-hidden relative">
          {/* Background Pattern */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-[-50%] left-[-20%] w-[800px] h-[800px] rounded-full bg-white blur-3xl"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[600px] h-[600px] rounded-full bg-amber-400 blur-3xl"></div>
          </div>

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold">Want to unlock these perks?</h2>
            <p className="text-indigo-100 text-lg">
              Boost your social capital by connecting with others, completing requests, and being an active member of the 6Degrees community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button 
                size="lg" 
                variant="secondary"
                onClick={onCheckScore}
                className="font-semibold text-indigo-700"
              >
                Check My Score
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="bg-transparent border-white text-white hover:bg-white/10"
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

