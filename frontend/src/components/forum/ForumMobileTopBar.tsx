import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { formatOfferPrice } from '@/lib/currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Sparkles, TrendingUp, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ForYouOffer {
  id: string;
  title: string;
  description: string;
  target_organization?: string;
  target_logo_url?: string;
  asking_price_inr: number;
}

interface InterestData {
  community_slug: string;
  community_name: string;
  community_icon: string;
  percentage: number;
}

interface ForumMobileTopBarProps {
  activeCommunity?: string;
}

export const ForumMobileTopBar = ({ activeCommunity }: ForumMobileTopBarProps) => {
  const { user } = useAuth();
  const { userCurrency } = useCurrency();
  const navigate = useNavigate();
  
  const [offers, setOffers] = useState<ForYouOffer[]>([]);
  const [interests, setInterests] = useState<InterestData[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [loadingInterests, setLoadingInterests] = useState(true);
  
  const [activeSection, setActiveSection] = useState<'offers' | 'interests' | null>(null);

  // Fetch offers from regular offers page
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        // Fetch from regular offers endpoint - just 1 offer
        const data = await apiGet('/api/offers?limit=1');
        setOffers((data.offers || []).slice(0, 1));
      } catch (err) {
        console.error('Error fetching offers:', err);
      } finally {
        setLoadingOffers(false);
      }
    };
    fetchOffers();
  }, []);

  // Fetch user interests
  useEffect(() => {
    const fetchInterests = async () => {
      // Default interests
      const defaultInterests = [
        { community_slug: 'build-in-public', community_name: 'Build in Public', community_icon: '🚀', percentage: 40 },
        { community_slug: 'network', community_name: 'Network', community_icon: '🤝', percentage: 30 },
        { community_slug: 'wins', community_name: 'Wins', community_icon: '🏆', percentage: 20 },
        { community_slug: 'failures', community_name: 'Failures', community_icon: '💔', percentage: 10 },
      ];
      
      if (!user) {
        setInterests(defaultInterests);
        setLoadingInterests(false);
        return;
      }
      
      try {
        const data = await apiGet('/api/forum/my-interests');
        if (data.interests && data.interests.length > 0) {
          setInterests(data.interests);
        } else {
          setInterests(defaultInterests);
        }
      } catch (err) {
        setInterests(defaultInterests);
      } finally {
        setLoadingInterests(false);
      }
    };
    fetchInterests();
  }, [user]);

  const toggleSection = (section: 'offers' | 'interests') => {
    setActiveSection(activeSection === section ? null : section);
  };

  const handleOfferClick = (offerId: string) => {
    navigate(`/feed?offer=${offerId}`);
  };

  return (
    <div className="xl:hidden font-reddit mb-2">
      {/* Split Top Bar */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm overflow-hidden">
        <div className="flex">
          {/* Offers Section */}
          <button
            onClick={() => toggleSection('offers')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 border-r border-[#1a1a1a] transition-colors ${
              activeSection === 'offers' 
                ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]' 
                : 'text-[#808080] hover:bg-[#111]'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-bold">Offers</span>
            {activeSection === 'offers' ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Interests Section */}
          <button
            onClick={() => toggleSection('interests')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 transition-colors ${
              activeSection === 'interests' 
                ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]' 
                : 'text-[#808080] hover:bg-[#111]'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-bold">Interests</span>
            {activeSection === 'interests' ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Expanded Offers Content */}
        {activeSection === 'offers' && (
          <div className="border-t border-[#1a1a1a] p-3">
            {loadingOffers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
              </div>
            ) : offers.length === 0 ? (
              <div className="py-3 text-center">
                <p className="text-xs text-[#606060]">No offers available</p>
                <p className="text-[10px] text-[#404040] mt-1">Engage more to unlock personalized offers</p>
              </div>
            ) : (
              <div className="space-y-2">
                {offers.map((offer) => (
                  <div
                    key={offer.id}
                    onClick={() => handleOfferClick(offer.id)}
                    className="p-2.5 bg-[#111] hover:bg-[#1a1a1a] rounded border border-[#1a1a1a] hover:border-[#333] cursor-pointer transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      {offer.target_logo_url ? (
                        <img 
                          src={offer.target_logo_url} 
                          alt="" 
                          className="w-10 h-10 rounded bg-white object-contain flex-shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#1a1a1a] flex items-center justify-center text-[#606060] text-sm font-bold flex-shrink-0">
                          {offer.target_organization?.charAt(0) || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#e0e0e0] font-medium line-clamp-1">
                          {offer.title}
                        </p>
                        {offer.target_organization && (
                          <p className="text-xs text-[#606060] line-clamp-1">
                            {offer.target_organization}
                          </p>
                        )}
                        <p className="text-xs text-[#CBAA5A] font-bold mt-1">
                          {formatOfferPrice(offer.asking_price_inr, userCurrency)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* View All Link */}
                <button
                  onClick={() => navigate('/feed')}
                  className="w-full flex items-center justify-center gap-1 py-2 text-xs text-[#CBAA5A] hover:text-[#D4B76A] font-bold transition-colors"
                >
                  View All Offers
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Expanded Interests Content */}
        {activeSection === 'interests' && (
          <div className="border-t border-[#1a1a1a] p-3">
            {loadingInterests ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-[#CBAA5A]" />
              </div>
            ) : (
              <div className="space-y-3">
                {interests.map((interest) => (
                  <div key={interest.community_slug} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{interest.community_icon}</span>
                        <span className="text-xs text-[#b0b0b0]">{interest.community_name}</span>
                      </div>
                      <span className="text-xs font-bold text-[#CBAA5A]">{interest.percentage}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#CBAA5A] rounded-full transition-all duration-500"
                        style={{ width: `${interest.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                
                {!user && (
                  <p className="text-[10px] text-[#606060] text-center pt-2 border-t border-[#1a1a1a]">
                    Sign in to see your real interests
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

