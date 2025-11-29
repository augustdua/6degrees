import { useEffect, useState } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

interface LeaderboardUser {
  id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
  social_capital_score: number;
  position?: string;
  featured_organizations?: Array<{
    name: string;
    logo_url: string;
  }>;
}

// Impressive fake profiles with Indian faces and prestigious organizations
const FAKE_PROFILES: LeaderboardUser[] = [
  {
    id: 'fake-1',
    first_name: 'Arjun',
    last_name: 'Mehta',
    profile_picture_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 847,
    position: 'Partner',
    featured_organizations: [
      { name: 'Sequoia', logo_url: 'https://logo.clearbit.com/sequoiacap.com' },
      { name: 'Google', logo_url: 'https://logo.clearbit.com/google.com' },
      { name: 'Stanford', logo_url: 'https://logo.clearbit.com/stanford.edu' },
    ]
  },
  {
    id: 'fake-2',
    first_name: 'Priya',
    last_name: 'Sharma',
    profile_picture_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 792,
    position: 'Managing Director',
    featured_organizations: [
      { name: 'Accel', logo_url: 'https://logo.clearbit.com/accel.com' },
      { name: 'McKinsey', logo_url: 'https://logo.clearbit.com/mckinsey.com' },
      { name: 'IIT Bombay', logo_url: 'https://logo.clearbit.com/iitb.ac.in' },
    ]
  },
  {
    id: 'fake-3',
    first_name: 'Vikram',
    last_name: 'Kapoor',
    profile_picture_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 724,
    position: 'Founder & CEO',
    featured_organizations: [
      { name: 'Matrix Partners', logo_url: 'https://logo.clearbit.com/matrixpartners.com' },
      { name: 'Amazon', logo_url: 'https://logo.clearbit.com/amazon.com' },
      { name: 'Y Combinator', logo_url: 'https://logo.clearbit.com/ycombinator.com' },
    ]
  },
  {
    id: 'fake-4',
    first_name: 'Ananya',
    last_name: 'Reddy',
    profile_picture_url: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 689,
    position: 'General Partner',
    featured_organizations: [
      { name: 'Lightspeed', logo_url: 'https://logo.clearbit.com/lsvp.com' },
      { name: 'Goldman Sachs', logo_url: 'https://logo.clearbit.com/goldmansachs.com' },
      { name: 'Harvard', logo_url: 'https://logo.clearbit.com/harvard.edu' },
    ]
  },
  {
    id: 'fake-5',
    first_name: 'Rohan',
    last_name: 'Agarwal',
    profile_picture_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 651,
    position: 'Investment Director',
    featured_organizations: [
      { name: 'Tiger Global', logo_url: 'https://logo.clearbit.com/tigerglobal.com' },
      { name: 'Meta', logo_url: 'https://logo.clearbit.com/meta.com' },
      { name: 'IIM Ahmedabad', logo_url: 'https://logo.clearbit.com/iima.ac.in' },
    ]
  },
  {
    id: 'fake-6',
    first_name: 'Kavitha',
    last_name: 'Nair',
    profile_picture_url: 'https://images.unsplash.com/photo-1544723795-3fb6469f5b39?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 598,
    position: 'Principal',
    featured_organizations: [
      { name: 'Andreessen', logo_url: 'https://logo.clearbit.com/a16z.com' },
      { name: 'Microsoft', logo_url: 'https://logo.clearbit.com/microsoft.com' },
      { name: 'Wharton', logo_url: 'https://logo.clearbit.com/wharton.upenn.edu' },
    ]
  },
  {
    id: 'fake-7',
    first_name: 'Aditya',
    last_name: 'Iyer',
    profile_picture_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 542,
    position: 'Venture Partner',
    featured_organizations: [
      { name: 'Nexus', logo_url: 'https://logo.clearbit.com/nexusvp.com' },
      { name: 'Apple', logo_url: 'https://logo.clearbit.com/apple.com' },
      { name: 'MIT', logo_url: 'https://logo.clearbit.com/mit.edu' },
    ]
  },
  {
    id: 'fake-8',
    first_name: 'Sneha',
    last_name: 'Gupta',
    profile_picture_url: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 487,
    position: 'Operating Partner',
    featured_organizations: [
      { name: 'Peak XV', logo_url: 'https://logo.clearbit.com/peakxv.com' },
      { name: 'Bain', logo_url: 'https://logo.clearbit.com/bain.com' },
      { name: 'ISB', logo_url: 'https://logo.clearbit.com/isb.edu' },
    ]
  },
  {
    id: 'fake-9',
    first_name: 'Karthik',
    last_name: 'Subramanian',
    profile_picture_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80',
    social_capital_score: 423,
    position: 'Portfolio Advisor',
    featured_organizations: [
      { name: 'Elevation', logo_url: 'https://logo.clearbit.com/elevationcapital.com' },
      { name: 'Flipkart', logo_url: 'https://logo.clearbit.com/flipkart.com' },
      { name: 'IIT Delhi', logo_url: 'https://logo.clearbit.com/iitd.ac.in' },
    ]
  },
];

// Aluminum/metallic tier styling based on score
const getAluminumTierStyle = (score: number) => {
  if (score > 500) return {
    bg: 'bg-gradient-to-r from-[#1a1a1a] to-[#0d0d0d]',
    border: 'border-[#CBAA5A]',
    scoreGradient: 'from-[#CBAA5A] via-[#E5D9B6] to-[#CBAA5A]',
    glow: 'shadow-[0_0_20px_rgba(203,170,90,0.3)]',
    tierName: 'BLACK TIER'
  };
  if (score >= 400) return {
    bg: 'bg-gradient-to-r from-[#1f1f1f] to-[#151515]',
    border: 'border-[#E5E4E2]/60',
    scoreGradient: 'from-[#E5E4E2] via-[#ffffff] to-[#E5E4E2]',
    glow: 'shadow-[0_0_15px_rgba(229,228,226,0.2)]',
    tierName: 'PLATINUM'
  };
  if (score >= 300) return {
    bg: 'bg-gradient-to-r from-[#1a1a1a] to-[#121212]',
    border: 'border-[#CBAA5A]/50',
    scoreGradient: 'from-[#CBAA5A] via-[#D4B863] to-[#CBAA5A]',
    glow: '',
    tierName: 'ELITE'
  };
  if (score >= 200) return {
    bg: 'bg-gradient-to-r from-[#1a1a1a] to-[#0f0f0f]',
    border: 'border-[#888]/40',
    scoreGradient: 'from-[#aaa] via-[#ccc] to-[#aaa]',
    glow: '',
    tierName: 'STRONG'
  };
  if (score >= 100) return {
    bg: 'bg-gradient-to-r from-[#151515] to-[#0a0a0a]',
    border: 'border-[#666]/30',
    scoreGradient: 'from-[#888] via-[#999] to-[#888]',
    glow: '',
    tierName: 'GROWING'
  };
  return {
    bg: 'bg-gradient-to-r from-[#111] to-[#0a0a0a]',
    border: 'border-[#444]/20',
    scoreGradient: 'from-[#666] via-[#777] to-[#666]',
    glow: '',
    tierName: 'EMERGING'
  };
};

// Rank medal styling
const getRankStyle = (rank: number) => {
  if (rank === 1) return {
    bg: 'bg-gradient-to-br from-[#CBAA5A] via-[#E5D9B6] to-[#B28A28]',
    text: 'text-black',
    size: 'w-8 h-8 text-base',
    shadow: 'shadow-[0_0_15px_rgba(203,170,90,0.5)]'
  };
  if (rank === 2) return {
    bg: 'bg-gradient-to-br from-[#E5E4E2] via-[#ffffff] to-[#C0C0C0]',
    text: 'text-black',
    size: 'w-7 h-7 text-sm',
    shadow: 'shadow-[0_0_10px_rgba(229,228,226,0.4)]'
  };
  if (rank === 3) return {
    bg: 'bg-gradient-to-br from-[#CD7F32] via-[#E4A853] to-[#B87333]',
    text: 'text-black',
    size: 'w-7 h-7 text-sm',
    shadow: 'shadow-[0_0_10px_rgba(205,127,50,0.4)]'
  };
  return {
    bg: 'bg-[#2a2a2a]',
    text: 'text-[#888]',
    size: 'w-6 h-6 text-xs',
    shadow: ''
  };
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
          { name: 'Your Network', logo_url: 'https://logo.clearbit.com/linkedin.com' },
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
      <div className="space-y-4 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-[#CBAA5A]" />
            <div>
              <h2 className="font-riccione text-2xl text-white">Leaderboard</h2>
              <p className="text-[#666] text-xs font-gilroy tracking-[0.1em] uppercase">TOP NETWORKERS</p>
            </div>
          </div>
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-32 bg-[#111] rounded-2xl animate-pulse border border-[#222]" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Trophy className="h-6 w-6 text-[#CBAA5A]" />
          <div>
            <h2 className="font-riccione text-2xl text-white">Leaderboard</h2>
            <p className="text-[#666] text-xs font-gilroy tracking-[0.1em] uppercase">TOP NETWORKERS BY SOCIAL CAPITAL</p>
          </div>
        </div>
      </div>

      {/* User Cards */}
      <div className="space-y-3">
        {users.map((leaderUser, index) => {
          const rank = index + 1;
          const tierStyle = getAluminumTierStyle(leaderUser.social_capital_score);
          const rankStyle = getRankStyle(rank);
          const isCurrentUser = user?.id === leaderUser.id;

          return (
            <div
              key={leaderUser.id}
              className={`
                relative overflow-hidden rounded-2xl border-2 transition-all duration-300 hover:scale-[1.01]
                ${tierStyle.bg} ${tierStyle.border} ${tierStyle.glow}
                ${isCurrentUser ? 'ring-2 ring-[#CBAA5A] ring-offset-2 ring-offset-black' : ''}
              `}
            >
              {/* Background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)`,
                  backgroundSize: '24px 24px'
                }} />
              </div>

              <div className="relative z-10 p-4 md:p-5">
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={`
                    ${rankStyle.bg} ${rankStyle.text} ${rankStyle.size} ${rankStyle.shadow}
                    rounded-full flex items-center justify-center font-bold flex-shrink-0
                  `}>
                    {rank}
                  </div>

                  {/* Avatar with aluminum score badge */}
                  <div className="relative flex-shrink-0">
                    <div className={`
                      w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden border-2
                      ${rank <= 3 ? 'border-[#CBAA5A]/50' : 'border-[#333]'}
                    `}>
                      <img
                        src={leaderUser.profile_picture_url || `https://ui-avatars.com/api/?name=${leaderUser.first_name}+${leaderUser.last_name}&background=1a1a1a&color=888`}
                        alt={`${leaderUser.first_name} ${leaderUser.last_name}`}
                        className="w-full h-full object-cover"
                        style={{ filter: 'contrast(1.1) brightness(0.95)' }}
                      />
                    </div>
                    
                    {/* Aluminum Score Badge - Top Left */}
                    <div className={`
                      absolute -top-2 -left-2 px-2 py-1 rounded-lg
                      bg-gradient-to-r ${tierStyle.scoreGradient}
                      shadow-lg
                    `}>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="w-3 h-3 text-black" strokeWidth={3} />
                        <span className="text-xs font-bold text-black font-gilroy">
                          {leaderUser.social_capital_score}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`
                        font-riccione text-lg md:text-xl truncate
                        ${rank <= 3 ? 'text-white' : 'text-[#ccc]'}
                        ${isCurrentUser ? 'text-[#CBAA5A]' : ''}
                      `}>
                        {leaderUser.first_name} {leaderUser.last_name}
                        {isCurrentUser && <span className="text-xs ml-2 text-[#888]">(You)</span>}
                      </h3>
                    </div>
                    {leaderUser.position && (
                      <p className="text-[10px] md:text-[11px] font-gilroy font-bold tracking-[0.15em] uppercase text-[#666] truncate">
                        {leaderUser.position}
                      </p>
                    )}
                    <p className="text-[9px] font-gilroy tracking-[0.2em] uppercase text-[#555] mt-1">
                      {tierStyle.tierName}
                    </p>
                  </div>

                  {/* Organization Logos - Right Side (Grayscale) */}
                  {leaderUser.featured_organizations && leaderUser.featured_organizations.length > 0 && (
                    <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                      {leaderUser.featured_organizations.slice(0, 3).map((org, orgIndex) => (
                        <div
                          key={orgIndex}
                          className="w-8 h-8 md:w-10 md:h-10 rounded-lg bg-white/10 p-1.5 border border-[#333] hover:border-[#555] transition-colors"
                          title={org.name}
                        >
                          <img
                            src={org.logo_url}
                            alt={org.name}
                            className="w-full h-full object-contain"
                            style={{ filter: 'grayscale(100%) brightness(1.2) contrast(0.9)' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Mobile: Organization logos below */}
                {leaderUser.featured_organizations && leaderUser.featured_organizations.length > 0 && (
                  <div className="flex sm:hidden items-center gap-2 mt-3 pt-3 border-t border-[#222]">
                    <span className="text-[8px] font-gilroy tracking-[0.2em] uppercase text-[#444] mr-2">NETWORK</span>
                    {leaderUser.featured_organizations.slice(0, 4).map((org, orgIndex) => (
                      <div
                        key={orgIndex}
                        className="w-7 h-7 rounded-md bg-white/10 p-1 border border-[#333]"
                        title={org.name}
                      >
                        <img
                          src={org.logo_url}
                          alt={org.name}
                          className="w-full h-full object-contain"
                          style={{ filter: 'grayscale(100%) brightness(1.2) contrast(0.9)' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
