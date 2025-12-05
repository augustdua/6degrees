import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, TrendingUp, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { OfferCard } from '@/components/OfferCard';

interface ForYouOffer {
  id: string;
  title: string;
  description: string;
  target_organization?: string;
  target_logo_url?: string;
  asking_price_inr: number;
  creator?: {
    id: string;
    first_name: string;
    last_name: string;
    profile_picture_url?: string;
  };
}

interface InterestData {
  community_slug: string;
  community_name: string;
  community_icon: string;
  interaction_count: number;
  percentage: number;
}

interface ForumRightSidebarProps {
  activeCommunity?: string;
}

export const ForumRightSidebar = ({ activeCommunity }: ForumRightSidebarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [offers, setOffers] = useState<ForYouOffer[]>([]);
  const [interests, setInterests] = useState<InterestData[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingInterests, setLoadingInterests] = useState(true);
  const [totalInteractions, setTotalInteractions] = useState(0);

  // Fetch offers from regular offers page
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        // Fetch 3 offers
        const data = await apiGet('/api/offers?limit=3');
        setOffers((data.offers || []).slice(0, 3));
      } catch (err) {
        console.error('Error fetching offers:', err);
      } finally {
        setLoadingOffers(false);
      }
    };
    fetchOffers();
  }, []);

  // Fetch user interests from forum interactions
  useEffect(() => {
    const fetchInterests = async () => {
      if (!user) {
        // Show default interests for non-logged in users
        setInterests([
          { community_slug: 'build-in-public', community_name: 'Build in Public', community_icon: '🚀', interaction_count: 0, percentage: 40 },
          { community_slug: 'network', community_name: 'Network', community_icon: '🤝', interaction_count: 0, percentage: 30 },
          { community_slug: 'wins', community_name: 'Wins', community_icon: '🏆', interaction_count: 0, percentage: 20 },
          { community_slug: 'failures', community_name: 'Failures', community_icon: '💔', interaction_count: 0, percentage: 10 },
        ]);
        setLoadingInterests(false);
        return;
      }
      
      try {
        // Try to get interaction stats
        const data = await apiGet('/api/forum/my-interests');
        if (data.interests && data.interests.length > 0) {
          setInterests(data.interests);
          setTotalInteractions(data.total_interactions || 0);
        } else {
          // Default placeholder data
          setInterests([
            { community_slug: 'build-in-public', community_name: 'Build in Public', community_icon: '🚀', interaction_count: 0, percentage: 40 },
            { community_slug: 'network', community_name: 'Network', community_icon: '🤝', interaction_count: 0, percentage: 30 },
            { community_slug: 'wins', community_name: 'Wins', community_icon: '🏆', interaction_count: 0, percentage: 20 },
            { community_slug: 'failures', community_name: 'Failures', community_icon: '💔', interaction_count: 0, percentage: 10 },
          ]);
        }
      } catch (err) {
        console.error('Error fetching interests:', err);
        // Default placeholder
        setInterests([
          { community_slug: 'build-in-public', community_name: 'Build in Public', community_icon: '🚀', interaction_count: 0, percentage: 40 },
          { community_slug: 'network', community_name: 'Network', community_icon: '🤝', interaction_count: 0, percentage: 30 },
          { community_slug: 'wins', community_name: 'Wins', community_icon: '🏆', interaction_count: 0, percentage: 20 },
          { community_slug: 'failures', community_name: 'Failures', community_icon: '💔', interaction_count: 0, percentage: 10 },
        ]);
      } finally {
        setLoadingInterests(false);
      }
    };
    fetchInterests();
  }, [user]);

  const handleOfferClick = (offerId: string) => {
    navigate(`/feed?offer=${offerId}`);
  };

  return (
    <div className="font-reddit w-72 flex-shrink-0 hidden xl:block">
      <div className="sticky top-4 space-y-3">
        {/* Offers For You Section */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#CBAA5A]" />
            <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">
              Offers For You
            </h3>
          </div>
          
          {activeCommunity && activeCommunity !== 'all' && (
            <div className="px-3 py-1.5 bg-[#CBAA5A]/5 border-b border-[#1a1a1a]">
              <p className="text-[10px] text-[#CBAA5A]">
                Based on your interest in this community
              </p>
            </div>
          )}
          
          <div className="p-2">
            {loadingOffers ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
              </div>
            ) : offers.length === 0 ? (
              <div className="py-4 text-center">
                <p className="text-xs text-[#606060]">No offers available</p>
                <p className="text-[10px] text-[#404040] mt-1">Engage more to unlock personalized offers</p>
              </div>
            ) : (
              <div className="space-y-2">
                {offers.map((offer) => (
                  <div key={offer.id} className="transform scale-100 origin-top-left">
                    <OfferCard
                      offer={offer}
                      onClick={() => handleOfferClick(offer.id)}
                      className="!aspect-[5/4] !rounded-lg [&_h3]:!text-[14px] [&_h3]:!mb-0 [&_.text-\\[12px\\]]:!text-[10px] [&_.text-\\[13px\\]]:!text-[10px] [&_button]:!py-2 [&_button]:!text-[9px] [&_.gap-2]:!gap-1 [&_.gap-3]:!gap-1.5 [&_.p-5]:!p-3 [&_.p-6]:!p-3 [&_.mb-3]:!mb-1 [&_.mb-4]:!mb-2 [&_span.text-\\[10px\\]]:!text-[8px] [&_span.text-\\[11px\\]]:!text-[9px] [&_.px-2\\.5]:!px-1.5 [&_.py-1\\.5]:!py-1 [&_.hidden.sm\\:flex]:!hidden hover:!scale-[1.02] transition-transform duration-200"
                    />
                  </div>
                ))}
                
                {/* View All Link */}
                <button
                  onClick={() => navigate('/feed')}
                  className="w-full flex items-center justify-center gap-1 py-2 text-[10px] text-[#CBAA5A] hover:text-[#D4B76A] font-bold transition-colors"
                >
                  View All Offers
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Your Interests Section */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#CBAA5A]" />
            <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">
              Your Interests
            </h3>
          </div>
          
          <div className="p-3">
            {loadingInterests ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
              </div>
            ) : (
              <div className="space-y-2.5">
                {interests.map((interest) => (
                  <div key={interest.community_slug} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{interest.community_icon}</span>
                        <span className="text-xs text-[#b0b0b0]">{interest.community_name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#CBAA5A]">{interest.percentage}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#CBAA5A] rounded-full transition-all duration-500"
                        style={{ width: `${interest.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                
                {/* Stats footer */}
                {totalInteractions > 0 && (
                  <div className="pt-2 mt-2 border-t border-[#1a1a1a]">
                    <p className="text-[10px] text-[#606060] text-center">
                      {totalInteractions} interactions tracked
                    </p>
                  </div>
                )}
                
                {!user && (
                  <div className="pt-2 mt-2 border-t border-[#1a1a1a]">
                    <p className="text-[10px] text-[#606060] text-center">
                      Sign in to see your real interests
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

