import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatOfferPrice } from '@/lib/currency';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Linkedin,
  ExternalLink,
  Lock,
  Building2,
  TrendingUp,
  Star,
  Handshake,
  Users,
  CheckCircle
} from 'lucide-react';

interface PublicProfileData {
  user: {
    id: string;
    first_name: string;
    last_name: string;
    bio: string | null;
    linkedin_url: string | null;
    profile_picture_url: string | null;
    is_profile_public: boolean;
    social_capital_score?: number;
  };
  organizations: Array<{
    id: string;
    name: string;
    logo_url: string | null;
    position: string | null;
    is_current: boolean;
  }>;
  collage_organizations?: Array<{
    id: string;
    name: string;
    logo_url: string | null;
  }>;
  featured_connections: Array<{
    id: string;
    first_name: string;
    last_name: string;
  }>;
  active_offers_count: number;
  active_requests_count: number;
}

interface PublicExplicitFacets {
  skills: Array<{ skill: { id: string; name: string } }>;
  roles: Array<{ role: { id: string; name: string } }>;
  industries: Array<{ industry: { id: string; name: string } }>;
  needs: Array<{ id: string; need_text: string }>;
  offerings: Array<{ id: string; offering_text: string }>;
}

interface Offer {
  id: string;
  title: string;
  description: string;
  target_organization?: string;
  target_position?: string;
  asking_price_inr: number;
  asking_price_eur?: number;
  rating?: number;
  bids_count?: number;
}

interface FounderProject {
  id: string;
  name: string;
  tagline?: string | null;
  website_url?: string | null;
  stage?: string | null;
  product_demo_url?: string | null;
  pitch_url?: string | null;
  is_public?: boolean;
}

interface PublicStandup {
  id: string;
  local_date: string;
  timezone: string;
  yesterday: string;
  today: string;
  blockers?: string | null;
  created_at: string;
}

const PublicProfile: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { userCurrency } = useCurrency();
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [topOffers, setTopOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [introStats, setIntroStats] = useState({ count: 0, rating: 0 });
  const [explicitFacets, setExplicitFacets] = useState<PublicExplicitFacets | null>(null);
  const [founderProject, setFounderProject] = useState<FounderProject | null>(null);
  const [standups, setStandups] = useState<PublicStandup[]>([]);
  const [standupMeta, setStandupMeta] = useState<{ streak: number; maxStreak: number }>({ streak: 0, maxStreak: 0 });
  const [githubCounts, setGithubCounts] = useState<Array<{ date: string; count: number }>>([]);

  // Load profile immediately when userId is available, don't wait for auth
  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId]);

  // Check if own profile separately (doesn't block loading)
  useEffect(() => {
    setIsOwnProfile(currentUser?.id === userId);
  }, [currentUser, userId]);

  const loadProfile = async () => {
    console.log('🔄 PublicProfile: Loading profile for userId:', userId);
    setLoading(true);
    setError(null);

    try {
      // Use backend API instead of direct Supabase - prevents hanging
      const profileData = await apiGet(`/api/profile/${userId}`, { skipCache: true });

      console.log('🔄 PublicProfile: API result:', profileData);

      if (!profileData) {
        setError('Profile not found');
        return;
      }

      setProfile(profileData as PublicProfileData);

      if (!profileData.user.is_profile_public && currentUser?.id !== userId) {
        setError('This profile is private');
        return;
      }

      // Founder project + standups (LinkedIn-style journey)
      try {
        const p = await apiGet(`/api/profile/${userId}/project`, { skipCache: true });
        setFounderProject(p?.project || null);
      } catch {
        setFounderProject(null);
      }
      try {
        const s = await apiGet(`/api/profile/${userId}/standups?limit=20`, { skipCache: true });
        setStandups(Array.isArray(s?.standups) ? s.standups : []);
        setStandupMeta({ streak: s?.streak || 0, maxStreak: s?.maxStreak || 0 });
      } catch {
        setStandups([]);
      }
      try {
        const g = await apiGet(API_ENDPOINTS.PROFILE_PUBLIC_GITHUB_COMMIT_COUNTS(userId, 14), { skipCache: true });
        setGithubCounts(Array.isArray(g?.counts) ? g.counts : []);
      } catch {
        setGithubCounts([]);
      }

      // Fetch explicit facets (skills/role/industry/needs/offerings)
      try {
        const facets = await apiGet(`/api/profile/${userId}/explicit`, { skipCache: true });
        setExplicitFacets(facets as PublicExplicitFacets);
      } catch (facetsErr) {
        // Non-fatal
        console.warn('Could not load explicit facets:', facetsErr);
        setExplicitFacets(null);
      }

      // Fetch top rated offers via backend
      try {
        const offersResponse = await apiGet(`/api/profile/${userId}/offers?limit=2`, { skipCache: true });
        setTopOffers(offersResponse?.offers || []);
      } catch (offersErr) {
        console.warn('Could not load offers:', offersErr);
      }

    } catch (err: any) {
      console.error('Error loading profile:', err);
      // Handle specific error cases
      if (err.message?.includes('403')) {
        setError('This profile is private');
      } else if (err.message?.includes('404')) {
        setError('Profile not found');
      } else {
        setError('Failed to load profile');
      }
    } finally {
      setLoading(false);
    }
  };

  // Get tier name based on score
  const getTierName = (score: number) => {
    if (score === 0) return 'UNRANKED';
    if (score <= 100) return 'EMERGING';
    if (score <= 200) return 'GROWING';
    if (score <= 300) return 'STRONG';
    if (score <= 400) return 'ELITE';
    return 'LEGENDARY';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#CBAA5A] mx-auto mb-4"></div>
          <p className="text-[#666] font-gilroy tracking-[0.15em] uppercase text-sm">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#888] hover:text-white transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-gilroy tracking-[0.15em] uppercase text-[10px]">Back</span>
          </button>
        </div>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-16 h-16 rounded-full bg-[#1a1a1a] border border-[#333] flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-[#666]" />
          </div>
          <p className="text-white font-gilroy tracking-[0.1em] uppercase text-sm mb-4">{error}</p>
          <Button 
            onClick={() => navigate('/feed')} 
            className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px]"
          >
            Go to Feed
          </Button>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const userName = `${profile.user.first_name} ${profile.user.last_name}`;
  const score = profile.user.social_capital_score || 0;
  const tierName = getTierName(score);
  const allOrgs = profile.collage_organizations || profile.organizations || [];

  return (
    <div className="min-h-screen bg-black pb-12">
      {/* Minimal Header */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#888] hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-gilroy tracking-[0.15em] uppercase text-[10px]">Back</span>
          </button>
          {isOwnProfile && (
            <button
              onClick={() => navigate('/profile')}
              className="text-[#CBAA5A] hover:text-white font-gilroy tracking-[0.15em] uppercase text-[10px] transition-colors"
            >
              Edit Profile
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4">
        
        {/* Hero Section - Profile Card with SoCap */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          
          {/* Left - Profile Card (matching the app's design) */}
          <div className="group relative bg-black rounded-[20px] border border-[#1a1a1a] overflow-hidden flex shadow-2xl h-[320px]">
            {/* Left Side - Content */}
            <div className="relative z-10 flex flex-col h-full p-5 w-[55%]">
              {/* Score Badge */}
              <div className="bg-gradient-to-br from-[#2a2a2a] via-[#1a1a1a] to-[#0f0f0f] rounded-xl p-3 border border-[#333] w-fit mb-auto">
                <div className="flex items-center gap-1 mb-0.5">
                  <TrendingUp className="w-3 h-3 text-[#888]" strokeWidth={2.5} />
                  <span className="text-[8px] font-gilroy font-bold tracking-[0.15em] text-[#666] uppercase">
                    SOCAP
                  </span>
                </div>
                <div className={`font-riccione text-[40px] leading-none tracking-tight ${score >= 100 ? 'text-[#CBAA5A]' : 'text-white'}`}>
                  {score}
                </div>
                <div className="text-[8px] font-gilroy font-bold tracking-[0.2em] text-[#555] uppercase mt-0.5">
                  {tierName}
                </div>
              </div>

              {/* Name */}
              <div className="mt-auto">
                <h1 className="font-riccione text-2xl text-white mb-2">{userName}</h1>
                {profile.user.bio && (
                  <p className="text-[11px] text-[#888] font-gilroy tracking-[0.05em] line-clamp-2 leading-relaxed">
                    {profile.user.bio}
                  </p>
                )}

                {/* Explicit facets (skills/role/industry) */}
                {explicitFacets && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {explicitFacets.roles?.slice(0, 1).map((r) => (
                      <span
                        key={r.role.id}
                        className="px-2.5 py-1 rounded-full border border-[#333] bg-black text-[#ddd] text-[9px] font-gilroy tracking-[0.15em] uppercase"
                      >
                        {r.role.name}
                      </span>
                    ))}
                    {explicitFacets.industries?.slice(0, 1).map((i) => (
                      <span
                        key={i.industry.id}
                        className="px-2.5 py-1 rounded-full border border-[#333] bg-black text-[#ddd] text-[9px] font-gilroy tracking-[0.15em] uppercase"
                      >
                        {i.industry.name}
                      </span>
                    ))}
                    {explicitFacets.skills?.slice(0, 3).map((s) => (
                      <span
                        key={s.skill.id}
                        className="px-2.5 py-1 rounded-full border border-[#1a1a1a] bg-[#0a0a0a] text-[#b0b0b0] text-[9px] font-gilroy tracking-[0.15em] uppercase"
                      >
                        {s.skill.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Org Logos Preview */}
              {allOrgs.length > 0 && (
                <div className="flex gap-2 mt-3">
                  {allOrgs.slice(0, 4).map((org, i) => (
                    <div 
                      key={i}
                      className="w-8 h-8 rounded-lg bg-white/10 border border-[#333] p-1.5 flex items-center justify-center"
                    >
                      {org.logo_url ? (
                        <img src={org.logo_url} alt={org.name} className="w-full h-full object-contain" />
                      ) : (
                        <Building2 className="w-4 h-4 text-[#666]" />
                      )}
                    </div>
                  ))}
                  {allOrgs.length > 4 && (
                    <div className="w-8 h-8 rounded-lg bg-[#1a1a1a] border border-[#333] flex items-center justify-center">
                      <span className="text-[9px] text-[#888] font-gilroy font-bold">+{allOrgs.length - 4}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Side - Profile Photo */}
            <div className="relative w-[45%] h-full">
              <div className="absolute inset-0 z-10 pointer-events-none" 
                style={{ background: 'linear-gradient(to right, #000 0%, transparent 30%)' }}
              />
              {profile.user.profile_picture_url ? (
                <img 
                  src={profile.user.profile_picture_url} 
                  alt={userName}
                  className="w-full h-full object-cover object-center"
                  style={{ filter: 'grayscale(1) contrast(1.1) brightness(0.9)' }}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#333] to-[#1a1a1a] flex items-center justify-center">
                  <span className="font-riccione text-6xl text-[#444]">
                    {profile.user.first_name?.[0]}{profile.user.last_name?.[0]}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Right - Stats Card */}
          <div className="rounded-[20px] border border-[#222] bg-gradient-to-br from-[#111] to-black p-6 flex flex-col justify-between h-[320px]">
            <div>
              <h2 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-6">Activity & Rating</h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 rounded-xl bg-[#1a1a1a] border border-[#333]">
                  <div className="font-riccione text-3xl text-[#CBAA5A] flex items-center justify-center gap-1">
                    {introStats.rating > 0 ? introStats.rating.toFixed(1) : '—'}
                    {introStats.rating > 0 && <Star className="w-5 h-5 fill-[#CBAA5A]" />}
                  </div>
                  <div className="text-[9px] font-gilroy tracking-[0.15em] text-[#666] uppercase mt-2">Rating</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[#1a1a1a] border border-[#333]">
                  <div className="font-riccione text-3xl text-white">{introStats.count}</div>
                  <div className="text-[9px] font-gilroy tracking-[0.15em] text-[#666] uppercase mt-2">Intros Made</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[#1a1a1a] border border-[#333]">
                  <div className="font-riccione text-3xl text-white">{profile.active_offers_count}</div>
                  <div className="text-[9px] font-gilroy tracking-[0.15em] text-[#666] uppercase mt-2">Active Offers</div>
                </div>
                <div className="text-center p-4 rounded-xl bg-[#1a1a1a] border border-[#333]">
                  <div className="font-riccione text-3xl text-white">{allOrgs.length}</div>
                  <div className="text-[9px] font-gilroy tracking-[0.15em] text-[#666] uppercase mt-2">Network Orgs</div>
                </div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex gap-3 mt-6">
              {!isOwnProfile && (
                <Button
                  onClick={() => navigate('/auth?returnUrl=' + encodeURIComponent(window.location.pathname))}
                  className="flex-1 bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[10px] h-12"
                >
                  <Handshake className="w-4 h-4 mr-2" />
                  Connect on Zaurq
                </Button>
              )}
              {profile.user.linkedin_url && (
                <a
                  href={profile.user.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 px-6 h-12 rounded-md border border-[#333] hover:border-[#CBAA5A] text-[#888] hover:text-[#CBAA5A] transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        </div>

        {/* About Section */}
        {profile.user.bio && (
          <div className="rounded-[20px] border border-[#222] bg-gradient-to-br from-[#111] to-black p-6 mb-6">
            <h2 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-3">About</h2>
            <p className="text-white font-gilroy tracking-[0.03em] text-sm leading-relaxed">
              {profile.user.bio}
            </p>
          </div>
        )}

        {/* Founder Journey */}
        <div className="rounded-[20px] border border-[#222] bg-gradient-to-br from-[#111] to-black p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888]">Founder Journey</h2>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 rounded-full border border-[#333] bg-black/40 px-3 py-1">
                <CheckCircle className="w-3.5 h-3.5 text-[#555]" />
                <span className="text-[9px] font-gilroy tracking-[0.12em] uppercase text-[#777]">
                  Revenue Verified (soon)
                </span>
              </div>
              <div className="flex items-center gap-1.5 rounded-full border border-[#333] bg-black/40 px-3 py-1">
                <span className="text-[9px] font-gilroy tracking-[0.12em] uppercase text-[#777]">
                  Streak {standupMeta.streak}{standupMeta.maxStreak ? ` (Best ${standupMeta.maxStreak})` : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Venture */}
          {founderProject && (
            <div className="rounded-xl border border-[#222] bg-black/40 p-4 mb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-riccione text-xl text-white">{founderProject.name}</div>
                  {founderProject.tagline && (
                    <div className="text-[12px] text-[#888] font-gilroy tracking-[0.03em] mt-1">
                      {founderProject.tagline}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {founderProject.stage && (
                      <span className="px-2.5 py-1 rounded-full border border-[#333] bg-black text-[#ddd] text-[9px] font-gilroy tracking-[0.15em] uppercase">
                        {founderProject.stage}
                      </span>
                    )}
                    {founderProject.website_url && (
                      <a
                        href={founderProject.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-full border border-[#333] bg-black text-[#CBAA5A] text-[9px] font-gilroy tracking-[0.15em] uppercase hover:underline"
                      >
                        Website
                      </a>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {founderProject.product_demo_url && (
                  <div className="rounded-lg border border-[#222] bg-[#0a0a0a] p-3">
                    <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666] mb-2">Product Demo</div>
                    <a
                      href={founderProject.product_demo_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#CBAA5A] text-sm font-gilroy hover:underline break-all"
                    >
                      {founderProject.product_demo_url}
                    </a>
                  </div>
                )}
                {founderProject.pitch_url && (
                  <div className="rounded-lg border border-[#222] bg-[#0a0a0a] p-3">
                    <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666] mb-2">Pitch</div>
                    <a
                      href={founderProject.pitch_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#CBAA5A] text-sm font-gilroy hover:underline break-all"
                    >
                      {founderProject.pitch_url}
                    </a>
                  </div>
                )}
              </div>

              {/* GitHub commit counts (aggregates only) */}
              {githubCounts.length > 0 && (
                <div className="mt-4 rounded-lg border border-[#222] bg-[#0a0a0a] p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] font-gilroy tracking-[0.15em] uppercase text-[#666]">GitHub commits/day</div>
                    <div className="text-[9px] font-gilroy tracking-[0.12em] uppercase text-[#777]">
                      last {githubCounts.length} days
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-7 gap-2">
                    {githubCounts.slice(-14).map((d) => (
                      <div key={d.date} className="text-center">
                        <div className="text-white font-riccione text-lg leading-none">{d.count}</div>
                        <div className="text-[8px] text-[#666] font-gilroy tracking-[0.12em] uppercase mt-1">
                          {d.date.slice(5)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Standup timeline */}
          {standups.length === 0 ? (
            <div className="text-[#666] font-gilroy tracking-[0.05em] text-sm">
              No standups yet.
            </div>
          ) : (
            <div className="space-y-3">
              {standups.slice(0, 10).map((s) => (
                <div key={s.id} className="rounded-xl border border-[#222] bg-black/40 p-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#888]">
                      {s.local_date}
                    </div>
                    <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#555]">
                      {s.timezone}
                    </div>
                  </div>
                  <div className="mt-3 space-y-2 text-sm">
                    <div>
                      <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Yesterday</div>
                      <div className="text-white font-gilroy tracking-[0.02em]">{s.yesterday}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Today</div>
                      <div className="text-white font-gilroy tracking-[0.02em]">{s.today}</div>
                    </div>
                    {s.blockers && (
                      <div>
                        <div className="text-[10px] font-gilroy tracking-[0.15em] uppercase text-[#666]">Blockers</div>
                        <div className="text-[#CBAA5A] font-gilroy tracking-[0.02em]">{s.blockers}</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Network Organizations */}
        {allOrgs.length > 0 && (
          <div className="rounded-[20px] border border-[#222] bg-gradient-to-br from-[#111] to-black p-6 mb-6">
            <h2 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-4">Network</h2>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
              {allOrgs.map((org, i) => (
                <div 
                  key={i}
                  className="aspect-square rounded-xl bg-white/5 border border-[#333] hover:border-[#CBAA5A]/50 p-3 flex items-center justify-center transition-colors group"
                  title={org.name}
                >
                  {org.logo_url ? (
                    <img 
                      src={org.logo_url} 
                      alt={org.name} 
                      className="w-full h-full object-contain opacity-80 group-hover:opacity-100 transition-opacity" 
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-[#666]" />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top Offers */}
        {topOffers.length > 0 && (
          <div className="rounded-[20px] border border-[#222] bg-gradient-to-br from-[#111] to-black p-6 mb-6">
            <h2 className="font-gilroy tracking-[0.15em] uppercase text-[10px] text-[#888] mb-4">Top Offers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {topOffers.map((offer) => (
                <Link
                  key={offer.id}
                  to={`/feed?tab=bids`}
                  className="group block"
                >
                  <div className="rounded-xl border border-[#333] hover:border-[#CBAA5A] bg-[#0a0a0a] p-5 transition-all hover:bg-[#111]">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-riccione text-lg text-white group-hover:text-[#CBAA5A] transition-colors line-clamp-1">
                          {offer.target_organization || 'Connection Offer'}
                        </h3>
                        <p className="text-[11px] text-[#666] font-gilroy tracking-[0.1em] uppercase mt-1">
                          {offer.target_position || offer.title}
                        </p>
                      </div>
                      {offer.rating && offer.rating > 0 && (
                        <div className="flex items-center gap-1 bg-[#CBAA5A]/10 px-2 py-1 rounded-full">
                          <Star className="w-3 h-3 text-[#CBAA5A] fill-[#CBAA5A]" />
                          <span className="text-[10px] text-[#CBAA5A] font-gilroy font-bold">{offer.rating.toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[12px] text-[#888] font-gilroy line-clamp-2 mb-4">
                      {offer.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="font-riccione text-xl text-[#CBAA5A]">
                        {formatOfferPrice(offer, userCurrency)}
                      </span>
                      {offer.bids_count && offer.bids_count > 0 && (
                        <span className="text-[10px] text-[#666] font-gilroy">
                          <Users className="w-3 h-3 inline mr-1" />
                          {offer.bids_count} interested
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Footer CTA for non-logged in users */}
        {!currentUser && (
          <div className="text-center py-8 border-t border-[#222] mt-8">
            <p className="text-[#666] font-gilroy tracking-[0.1em] uppercase text-[11px] mb-4">
              Join Zaurq to connect with {profile.user.first_name}
            </p>
            <Button
              onClick={() => navigate('/auth?returnUrl=' + encodeURIComponent(window.location.pathname))}
              className="bg-[#CBAA5A] text-black hover:bg-white font-gilroy tracking-[0.15em] uppercase text-[11px] px-8 h-12"
            >
              Get Started Free
            </Button>
          </div>
        )}

        {/* Minimal Footer */}
        <div className="text-center pt-8 mt-8 border-t border-[#1a1a1a]">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="w-6 h-6 bg-gradient-to-br from-[#CBAA5A] to-[#8B7355] rounded-md flex items-center justify-center">
              <span
                className="text-black font-bold text-[10px]"
                style={{ fontFamily: 'Riccione-DemiBold, ui-serif, serif' }}
              >
                Z
              </span>
            </div>
            <span className="font-riccione text-white text-sm">Zaurq</span>
          </div>
          <p className="text-[10px] text-[#555] font-gilroy tracking-[0.1em]">
            Network your way to any connection
          </p>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;
