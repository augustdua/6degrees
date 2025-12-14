import { useState, useEffect } from 'react';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { Sparkles, TrendingUp, Loader2, Users } from 'lucide-react';

interface InterestData {
  community_slug: string;
  community_name: string;
  community_icon?: string;
  interaction_count: number;
  percentage: number;
}

interface ForumRightSidebarProps {
  activeCommunity?: string;
}

export const ForumRightSidebar = ({ activeCommunity }: ForumRightSidebarProps) => {
  const { user } = useAuth();
  
  const [interests, setInterests] = useState<InterestData[]>([]);
  const [loadingInterests, setLoadingInterests] = useState(true);
  const [totalInteractions, setTotalInteractions] = useState(0);

  // Fetch user interests from forum interactions
  useEffect(() => {
    const fetchInterests = async () => {
      if (!user) {
        // Show default interests for non-logged in users
        setInterests([
          { community_slug: 'build-in-public', community_name: 'Build in Public', interaction_count: 0, percentage: 40 },
          { community_slug: 'network', community_name: 'Network', interaction_count: 0, percentage: 30 },
          { community_slug: 'wins', community_name: 'Wins', interaction_count: 0, percentage: 20 },
          { community_slug: 'failures', community_name: 'Failures', interaction_count: 0, percentage: 10 },
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
            { community_slug: 'build-in-public', community_name: 'Build in Public', interaction_count: 0, percentage: 40 },
            { community_slug: 'network', community_name: 'Network', interaction_count: 0, percentage: 30 },
            { community_slug: 'wins', community_name: 'Wins', interaction_count: 0, percentage: 20 },
            { community_slug: 'failures', community_name: 'Failures', interaction_count: 0, percentage: 10 },
          ]);
        }
      } catch (err) {
        console.error('Error fetching interests:', err);
        // Default placeholder
        setInterests([
          { community_slug: 'build-in-public', community_name: 'Build in Public', interaction_count: 0, percentage: 40 },
          { community_slug: 'network', community_name: 'Network', interaction_count: 0, percentage: 30 },
          { community_slug: 'wins', community_name: 'Wins', interaction_count: 0, percentage: 20 },
          { community_slug: 'failures', community_name: 'Failures', interaction_count: 0, percentage: 10 },
        ]);
      } finally {
        setLoadingInterests(false);
      }
    };
    fetchInterests();
  }, [user]);

  return (
    <div className="font-reddit w-72 flex-shrink-0 hidden xl:block">
      <div className="sticky top-4 space-y-3">
        {/* Offers For You Section - Coming Soon */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#CBAA5A]" />
            <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">
              Offers For You
            </h3>
          </div>
          
          <div className="p-4">
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#CBAA5A]/50" />
              </div>
              <p className="text-sm font-medium text-[#808080]">Coming Soon</p>
              <p className="text-[10px] text-[#505050] mt-1 leading-relaxed">
                Personalized offers based on your forum activity
              </p>
            </div>
          </div>
        </div>

        {/* Potential Matches Section - Coming Soon */}
        <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-sm overflow-hidden">
          <div className="px-3 py-2 border-b border-[#1a1a1a] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#CBAA5A]" />
            <h3 className="text-xs font-bold text-[#e0e0e0] uppercase tracking-wider">
              Potential Matches
            </h3>
          </div>
          
          <div className="p-4">
            <div className="text-center py-4">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#1a1a1a] flex items-center justify-center">
                <Users className="w-6 h-6 text-[#CBAA5A]/50" />
              </div>
              <p className="text-sm font-medium text-[#808080]">Coming Soon</p>
              <p className="text-[10px] text-[#505050] mt-1 leading-relaxed">
                GNN-powered networking matches based on your interests
              </p>
            </div>
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
