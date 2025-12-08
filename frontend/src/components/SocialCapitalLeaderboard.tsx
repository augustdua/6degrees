import { useEffect, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';

interface LeaderboardUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  social_capital_score: number;
  position?: string;
  featured_organizations?: Array<{
    name: string;
    domain: string;
  }>;
}

// Impressive fake profiles with Indian faces and prestigious organizations
const FAKE_PROFILES: LeaderboardUser[] = [
  {
    id: 'fake-1',
    first_name: 'Arjun',
    last_name: 'Mehta',
    profile_picture_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 847,
    position: 'Partner',
    featured_organizations: [
      { name: 'Sequoia', domain: 'sequoiacap.com' },
      { name: 'Google', domain: 'google.com' },
      { name: 'Stanford', domain: 'stanford.edu' },
    ]
  },
  {
    id: 'fake-2',
    first_name: 'Priya',
    last_name: 'Sharma',
    profile_picture_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 792,
    position: 'Managing Director',
    featured_organizations: [
      { name: 'Accel', domain: 'accel.com' },
      { name: 'McKinsey', domain: 'mckinsey.com' },
      { name: 'IIT Bombay', domain: 'iitb.ac.in' },
    ]
  },
  {
    id: 'fake-3',
    first_name: 'Vikram',
    last_name: 'Kapoor',
    profile_picture_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 724,
    position: 'Founder & CEO',
    featured_organizations: [
      { name: 'Matrix Partners', domain: 'matrixpartners.com' },
      { name: 'Amazon', domain: 'amazon.com' },
      { name: 'Y Combinator', domain: 'ycombinator.com' },
    ]
  },
  {
    id: 'fake-4',
    first_name: 'Ananya',
    last_name: 'Reddy',
    profile_picture_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 689,
    position: 'General Partner',
    featured_organizations: [
      { name: 'Lightspeed', domain: 'lsvp.com' },
      { name: 'Goldman Sachs', domain: 'goldmansachs.com' },
      { name: 'Harvard', domain: 'harvard.edu' },
    ]
  },
  {
    id: 'fake-5',
    first_name: 'Rohan',
    last_name: 'Agarwal',
    profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 651,
    position: 'Investment Director',
    featured_organizations: [
      { name: 'Tiger Global', domain: 'tigerglobal.com' },
      { name: 'Meta', domain: 'meta.com' },
      { name: 'IIM Ahmedabad', domain: 'iima.ac.in' },
    ]
  },
  {
    id: 'fake-6',
    first_name: 'Kavitha',
    last_name: 'Nair',
    profile_picture_url: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 598,
    position: 'Principal',
    featured_organizations: [
      { name: 'Andreessen Horowitz', domain: 'a16z.com' },
      { name: 'Microsoft', domain: 'microsoft.com' },
      { name: 'Wharton', domain: 'wharton.upenn.edu' },
    ]
  },
  {
    id: 'fake-7',
    first_name: 'Aditya',
    last_name: 'Iyer',
    profile_picture_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 542,
    position: 'Venture Partner',
    featured_organizations: [
      { name: 'Nexus VP', domain: 'nexusvp.com' },
      { name: 'Apple', domain: 'apple.com' },
      { name: 'MIT', domain: 'mit.edu' },
    ]
  },
  {
    id: 'fake-8',
    first_name: 'Sneha',
    last_name: 'Gupta',
    profile_picture_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 487,
    position: 'Operating Partner',
    featured_organizations: [
      { name: 'Peak XV', domain: 'peakxv.com' },
      { name: 'Bain', domain: 'bain.com' },
      { name: 'ISB', domain: 'isb.edu' },
    ]
  },
  {
    id: 'fake-9',
    first_name: 'Karthik',
    last_name: 'Subramanian',
    profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=800&q=80',
    social_capital_score: 423,
    position: 'Portfolio Advisor',
    featured_organizations: [
      { name: 'Elevation Capital', domain: 'elevationcapital.com' },
      { name: 'Flipkart', domain: 'flipkart.com' },
      { name: 'IIT Delhi', domain: 'iitd.ac.in' },
    ]
  },
];

// Get tier info based on score (aluminum styling like profile page)
const getTierInfo = (score: number) => {
  if (score > 500) return { name: 'BLACK TIER', color: 'text-white' };
  if (score >= 400) return { name: 'PLATINUM', color: 'text-[#E5E4E2]' };
  if (score >= 300) return { name: 'ELITE', color: 'text-white' };
  if (score >= 200) return { name: 'STRONG', color: 'text-[#ccc]' };
  if (score >= 100) return { name: 'GROWING', color: 'text-[#aaa]' };
  return { name: 'EMERGING', color: 'text-[#888]' };
};

// Leaderboard User Card - EXACTLY like OfferCard structure
const LeaderboardCard = ({ 
  user, 
  rank, 
  isCurrentUser 
}: { 
  user: LeaderboardUser; 
  rank: number; 
  isCurrentUser: boolean;
}) => {
  const tier = getTierInfo(user.social_capital_score);

  return (
    <div 
      className={cn(
        "group relative bg-black rounded-[20px] md:rounded-[24px] border border-[#1a1a1a] hover:border-[#CBAA5A] overflow-hidden flex shadow-2xl transition-all duration-300 cursor-pointer snap-center flex-shrink-0 mx-auto",
        // Fixed width and height - narrower card to fit content properly
        "w-full max-w-[500px] h-[280px] sm:h-[300px] md:h-[320px]"
      )}
    >
      {/* Left Side - Content */}
      <div className="relative z-10 flex flex-col h-full p-4 sm:p-5 w-[55%] sm:w-[50%]">
        {/* Score Badge */}
        <div className="bg-gradient-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0f0f0f] rounded-xl p-3 border border-[#333] group-hover:border-[#CBAA5A]/50 w-fit mb-auto transition-colors duration-300">
          <div className="flex items-center gap-1 mb-0.5">
            <TrendingUp className="w-3 h-3 text-[#888] group-hover:text-[#CBAA5A] transition-colors duration-300" strokeWidth={2.5} />
            <span className="text-[8px] font-gilroy font-bold tracking-[0.15em] text-[#666] group-hover:text-[#CBAA5A]/70 uppercase transition-colors duration-300">
              SOCAP
            </span>
          </div>
          <div className={cn(
            "font-riccione text-[32px] sm:text-[38px] md:text-[44px] leading-none tracking-tight group-hover:text-[#CBAA5A] transition-colors duration-300",
            tier.color
          )}>
            {user.social_capital_score}
          </div>
          <div className="text-[8px] font-gilroy font-bold tracking-[0.2em] text-[#555] group-hover:text-[#CBAA5A]/70 uppercase mt-0.5 transition-colors duration-300">
            {tier.name}
          </div>
        </div>

        {/* Name and Position as Tags */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3">
          <span className="text-[10px] sm:text-[11px] text-[#aaa] group-hover:text-[#CBAA5A] border border-[#444] group-hover:border-[#CBAA5A]/50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full tracking-[0.1em] bg-black/50 backdrop-blur-sm font-gilroy font-medium transition-colors duration-300">
            {user.first_name} {user.last_name}
            {isCurrentUser && <span className="text-[#888] group-hover:text-[#CBAA5A]/70 ml-1 transition-colors duration-300">(You)</span>}
          </span>
          {user.position && (
            <span className="text-[9px] sm:text-[10px] text-[#777] group-hover:text-[#CBAA5A] border border-[#333] group-hover:border-[#CBAA5A]/50 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-full tracking-[0.15em] uppercase bg-black/50 backdrop-blur-sm font-gilroy font-medium transition-colors duration-300">
              {user.position}
            </span>
          )}
        </div>

        {/* Organization Logos - Colored */}
        {user.featured_organizations && user.featured_organizations.length > 0 && (
          <div>
            <div className="text-[7px] text-[#555] group-hover:text-[#CBAA5A]/70 uppercase tracking-[0.3em] font-gilroy font-bold mb-1.5 transition-colors duration-300">
              NETWORK
            </div>
            <div className="flex gap-2">
              {user.featured_organizations.slice(0, 3).map((org, orgIndex) => (
                <div
                  key={orgIndex}
                  className="w-9 h-9 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-lg bg-white/10 p-1.5 border border-[#333] group-hover:border-[#CBAA5A]/50 transition-colors duration-300 flex items-center justify-center"
                  title={org.name}
                >
                  <img
                    src={`https://img.logo.dev/${org.domain}?token=pk_VAZ6tvAVQHCDwKeaNRVyjQ`}
                    alt={org.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      // Fallback to first letter if logo fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = `<span class="text-[#666] font-gilroy font-bold text-sm">${org.name[0]}</span>`;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Side - Profile Photo (Full) */}
      <div className="relative w-[45%] sm:w-[50%] h-full">
        {/* Rank Badge - Top Right */}
        <div className="absolute top-3 right-3 z-30">
          <div className="bg-[#1a1a1a]/90 backdrop-blur-sm rounded-full px-2.5 py-1 border border-[#333] group-hover:border-[#CBAA5A]/50 transition-colors duration-300">
            <span className="text-[10px] text-[#888] group-hover:text-[#CBAA5A] uppercase tracking-[0.2em] font-gilroy font-bold transition-colors duration-300">
              #{rank}
            </span>
          </div>
        </div>
        
        {/* Gradient overlay */}
        <div className="absolute inset-0 z-10 pointer-events-none" 
          style={{
            background: `linear-gradient(to right, #000 0%, transparent 30%)`
          }}
        ></div>
        
        {user.profile_picture_url && (
          <img 
            src={user.profile_picture_url} 
            alt={`${user.first_name} ${user.last_name}`}
            className="w-full h-full object-cover object-center"
            style={{ filter: 'grayscale(1) contrast(1.1) brightness(0.9)' }}
          />
        )}
      </div>
    </div>
  );
};

interface SocialCapitalLeaderboardProps {
  limit?: number;
}

export default function SocialCapitalLeaderboard({ limit }: SocialCapitalLeaderboardProps = {}) {
  const { user } = useAuth();
  const [realUsers, setRealUsers] = useState<LeaderboardUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      const data = await apiGet('/api/social-capital/leaderboard?limit=10');
      setRealUsers(data.users || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  // Merge real users with fake profiles, ensuring current user appears
  const getAllUsers = (): LeaderboardUser[] => {
    // Start with fake profiles
    let allUsers = [...FAKE_PROFILES];
    
    // Add real users (they'll be merged based on score)
    realUsers.forEach(realUser => {
      // Check if this is the current user - boost visibility
      const isCurrentUser = user?.id === realUser.id;
      
      // Add real user to the list
      allUsers.push({
        ...realUser,
        featured_organizations: isCurrentUser ? [
          { name: 'LinkedIn', domain: 'linkedin.com' },
        ] : []
      });
    });
    
    // Sort by score descending and take top N (default 10)
    return allUsers
      .sort((a, b) => b.social_capital_score - a.social_capital_score)
      .slice(0, limit || 10);
  };

  const users = getAllUsers();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-2 mb-6">
          <Trophy className="h-6 w-6 text-white" />
          <div className="text-center">
            <h2 className="font-riccione text-2xl text-white">Leaderboard</h2>
            <p className="text-[#666] text-xs font-gilroy tracking-[0.1em] uppercase">TOP NETWORKERS</p>
                </div>
              </div>
        <div className="flex flex-col gap-4 items-center">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="w-full max-w-[500px] h-[280px] bg-[#111] rounded-[20px] animate-pulse border border-[#1a1a1a]" />
            ))}
          </div>
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Header - Centered */}
      <div className="flex flex-col items-center gap-2 sticky top-0 z-40 bg-black/80 backdrop-blur-md py-4 -mx-4 px-4">
          <Trophy className="h-6 w-6 text-white" />
        <div className="text-center">
          <h2 className="font-riccione text-2xl text-white">Leaderboard</h2>
          <p className="text-[#666] text-xs font-gilroy tracking-[0.1em] uppercase">TOP NETWORKERS BY SOCIAL CAPITAL</p>
                </div>
                </div>

      {/* Vertical Scroll Container with Smooth Momentum */}
      <div 
        className="flex flex-col gap-4 pb-8 scroll-smooth items-center"
        style={{
          scrollBehavior: 'smooth',
          WebkitOverflowScrolling: 'touch', // iOS momentum scrolling
        }}
      >
        {users.map((leaderUser, index) => (
          <LeaderboardCard
            key={leaderUser.id}
            user={leaderUser}
            rank={index + 1}
            isCurrentUser={user?.id === leaderUser.id}
          />
        ))}
              </div>
        </div>
  );
}
