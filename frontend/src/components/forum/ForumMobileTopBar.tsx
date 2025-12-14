import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, TrendingUp, Loader2, ChevronDown, ChevronUp, Users } from 'lucide-react';

interface InterestData {
  community_slug: string;
  community_name: string;
  community_icon?: string;
  percentage: number;
}

interface ForumMobileTopBarProps {
  activeCommunity?: string;
}

export const ForumMobileTopBar = ({ activeCommunity }: ForumMobileTopBarProps) => {
  const { user } = useAuth();
  
  const [interests, setInterests] = useState<InterestData[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(true);
  
  const [activeSection, setActiveSection] = useState<'offers' | 'matches' | 'interests' | null>(null);

  // Fetch user interests
  useEffect(() => {
    const fetchInterests = async () => {
      // Default interests
      const defaultInterests = [
        { community_slug: 'build-in-public', community_name: 'Build in Public', percentage: 40 },
        { community_slug: 'network', community_name: 'Network', percentage: 30 },
        { community_slug: 'wins', community_name: 'Wins', percentage: 20 },
        { community_slug: 'failures', community_name: 'Failures', percentage: 10 },
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

  const toggleSection = (section: 'offers' | 'matches' | 'interests') => {
    setActiveSection(activeSection === section ? null : section);
  };

  return (
    <div className="xl:hidden font-reddit mb-2">
      {/* Split Top Bar */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm overflow-hidden">
        <div className="flex">
          {/* Offers Section */}
          <button
            onClick={() => toggleSection('offers')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 border-r border-[#1a1a1a] transition-colors ${
              activeSection === 'offers' 
                ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]' 
                : 'text-[#808080] hover:bg-[#111]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">Offers</span>
            {activeSection === 'offers' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {/* Matches Section */}
          <button
            onClick={() => toggleSection('matches')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 border-r border-[#1a1a1a] transition-colors ${
              activeSection === 'matches' 
                ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]' 
                : 'text-[#808080] hover:bg-[#111]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">Matches</span>
            {activeSection === 'matches' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>

          {/* Interests Section */}
          <button
            onClick={() => toggleSection('interests')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2.5 transition-colors ${
              activeSection === 'interests' 
                ? 'bg-[#CBAA5A]/10 text-[#CBAA5A]' 
                : 'text-[#808080] hover:bg-[#111]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold">Interests</span>
            {activeSection === 'interests' ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {/* Expanded Offers Content - Coming Soon */}
        {activeSection === 'offers' && (
          <div className="border-t border-[#1a1a1a] p-4">
            <div className="text-center py-3">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[#CBAA5A]/50" />
              </div>
              <p className="text-xs font-medium text-[#808080]">Coming Soon</p>
              <p className="text-[9px] text-[#505050] mt-1">
                Personalized offers based on your activity
              </p>
            </div>
          </div>
        )}

        {/* Expanded Matches Content - Coming Soon */}
        {activeSection === 'matches' && (
          <div className="border-t border-[#1a1a1a] p-4">
            <div className="text-center py-3">
              <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Users className="w-5 h-5 text-[#CBAA5A]/50" />
              </div>
              <p className="text-xs font-medium text-[#808080]">Coming Soon</p>
              <p className="text-[9px] text-[#505050] mt-1">
                GNN-powered networking matches
              </p>
            </div>
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
