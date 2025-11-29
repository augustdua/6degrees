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
        "group relative w-full bg-black rounded-[16px] md:rounded-[20px] border border-[#1a1a1a] overflow-hidden flex flex-col shadow-2xl transition-all duration-300 hover:scale-[1.01] cursor-pointer",
        // Same aspect ratio 4:5 across ALL screen sizes for consistent look
        "aspect-[4/5]"
      )}
    >
      {/* Aluminum Score Badge - Top Left Inside Card */}
      <div className="absolute top-4 left-4 z-30">
        <div className="bg-gradient-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0f0f0f] rounded-2xl p-3 sm:p-4 border border-[#333] backdrop-blur-sm">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-[#888]" strokeWidth={2.5} />
            <span className="text-[8px] sm:text-[9px] font-gilroy font-bold tracking-[0.15em] text-[#666] uppercase">
              SOCAP
            </span>
          </div>
          <div className={cn(
            "font-riccione text-[32px] sm:text-[40px] md:text-[48px] leading-none tracking-tight",
            tier.color
          )}>
            {user.social_capital_score}
          </div>
          <div className="text-[8px] sm:text-[9px] font-gilroy font-bold tracking-[0.2em] text-[#555] uppercase mt-0.5">
            {tier.name}
          </div>
        </div>
      </div>

      {/* Rank Badge - Top Right */}
      <div className="absolute top-4 right-4 z-30">
        <div className="bg-[#1a1a1a]/90 backdrop-blur-sm rounded-full px-3 py-1.5 border border-[#333]">
          <span className="text-[10px] sm:text-[11px] text-[#888] uppercase tracking-[0.2em] font-gilroy font-bold">
            #{rank}
          </span>
        </div>
      </div>

      {/* Content Layer - Name, Position, and Organization Logos */}
      <div className="relative z-10 flex flex-col h-full p-5 sm:p-5 md:p-6">
        {/* Spacer for score badge */}
        <div className="flex-1" />

        {/* Name and Position as Tags */}
        <div className="flex flex-wrap gap-2 sm:gap-2 max-w-[70%] mb-3">
          <span className="text-[10px] sm:text-[11px] text-[#aaa] border border-[#444] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full tracking-[0.1em] bg-black/50 backdrop-blur-sm font-gilroy font-medium">
            {user.first_name} {user.last_name}
            {isCurrentUser && <span className="text-[#888] ml-1">(You)</span>}
          </span>
          {user.position && (
            <span className="text-[10px] sm:text-[11px] text-[#777] border border-[#333] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full tracking-[0.15em] uppercase bg-black/50 backdrop-blur-sm font-gilroy font-medium">
              {user.position}
            </span>
          )}
        </div>

        {/* Organization Logos - Big and Grayscale */}
        {user.featured_organizations && user.featured_organizations.length > 0 && (
          <div className="z-20">
            <div className="text-[8px] text-[#555] uppercase tracking-[0.3em] font-gilroy font-bold mb-2">
              NETWORK
            </div>
            <div className="flex gap-3">
              {user.featured_organizations.slice(0, 3).map((org, orgIndex) => (
                <div
                  key={orgIndex}
                  className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-xl bg-white/10 p-2 sm:p-2.5 border border-[#333] hover:border-[#555] transition-colors flex items-center justify-center"
                  title={org.name}
                >
                  <img
                    src={`https://img.logo.dev/${org.domain}?token=pk_VAZ6tvAVQHCDwKeaNRVyjQ`}
                    alt={org.name}
                    className="w-full h-full object-contain"
                    style={{ filter: 'grayscale(100%) brightness(1.3) contrast(0.9)' }}
                    onError={(e) => {
                      // Fallback to first letter if logo fails
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      target.parentElement!.innerHTML = `<span class="text-[#666] font-gilroy font-bold text-lg">${org.name[0]}</span>`;
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Background Photo Layer */}
      <div className="absolute right-[-10px] sm:right-[-20px] bottom-0 w-[75%] sm:w-[70%] md:w-[75%] h-[65%] sm:h-[60%] md:h-[65%] z-0 pointer-events-none">
        {/* Masking Gradients */}
        <div className="absolute inset-0 z-10" 
          style={{
            background: `
              linear-gradient(to right, #000 10%, transparent 60%),
              linear-gradient(to bottom, #000 0%, transparent 20%),
              linear-gradient(to top, #000 0%, transparent 15%)
            `
          }}
        ></div>
        
        {user.profile_picture_url && (
          <img 
            src={user.profile_picture_url} 
            alt={`${user.first_name} ${user.last_name}`}
            className="w-full h-full object-cover object-top opacity-90 contrast-[1.2] brightness-[0.8]" 
            style={{ filter: 'grayscale(1)' }}
          />
        )}
      </div>
    </div>
  );
};

export default function SocialCapitalLeaderboard() {
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
    
    // Sort by score descending and take top 10
    return allUsers
      .sort((a, b) => b.social_capital_score - a.social_capital_score)
      .slice(0, 10);
  };

  const users = getAllUsers();

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="h-6 w-6 text-white" />
          <div>
            <h2 className="font-riccione text-2xl text-white">Leaderboard</h2>
            <p className="text-[#666] text-xs font-gilroy tracking-[0.1em] uppercase">TOP NETWORKERS</p>
                </div>
              </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-[4/5] bg-[#111] rounded-[20px] animate-pulse border border-[#1a1a1a]" />
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
      {/* Header */}
      <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-white" />
        <div>
          <h2 className="font-riccione text-2xl text-white">Leaderboard</h2>
          <p className="text-[#666] text-xs font-gilroy tracking-[0.1em] uppercase">TOP NETWORKERS BY SOCIAL CAPITAL</p>
                </div>
                </div>

      {/* User Cards Grid - Same layout as Offers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
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
