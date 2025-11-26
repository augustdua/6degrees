import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Handshake,
  Network,
  Users,
  Newspaper,
  Gift,
  MessageSquare,
  User
} from 'lucide-react';

interface BottomNavigationProps {
  className?: string;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const isActiveTab = (tab: string) => {
    return location.search.includes(`tab=${tab}`);
  };

  const isProfileActive = () => {
    return location.pathname.startsWith('/profile') && !location.search.includes('tab=');
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-[#222] md:hidden z-50 ${className}`}>
      <div className="flex items-center justify-between py-2 px-2">
        {/* Offers */}
        <button
          onClick={() => navigate('/profile?tab=offers')}
          className={`flex flex-col items-center gap-0.5 px-1.5 transition-all ${
            isActiveTab('offers') ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Handshake className="w-4 h-4" />
          <span className="text-[7px] font-gilroy tracking-[0.05em]">OFFERS</span>
        </button>

        {/* Requests */}
        <button
          onClick={() => navigate('/profile?tab=requests')}
          className={`flex flex-col items-center gap-0.5 px-1.5 transition-all ${
            isActiveTab('requests') ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Network className="w-4 h-4" />
          <span className="text-[7px] font-gilroy tracking-[0.05em]">REQUESTS</span>
        </button>

        {/* People */}
        <button
          onClick={() => navigate('/feed?tab=people')}
          className={`flex flex-col items-center gap-0.5 px-1.5 transition-all ${
            isActiveTab('people') ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="text-[7px] font-gilroy tracking-[0.05em]">PEOPLE</span>
        </button>

        {/* Profile - Centered with grayscale avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center -mt-3"
        >
          {user ? (
            <Avatar className={`w-10 h-10 grayscale ${isProfileActive() ? 'ring-2 ring-[#CBAA5A] ring-offset-2 ring-offset-black grayscale-0' : 'ring-1 ring-[#444]'} transition-all`}>
              <AvatarImage src={user.avatar || undefined} className="grayscale" />
              <AvatarFallback className="bg-[#333] text-white text-[11px] font-gilroy">
                {user.firstName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`p-2 rounded-full ${isProfileActive() ? 'bg-[#CBAA5A] text-black' : 'text-[#555] border border-[#444]'}`}>
              <User className="w-5 h-5" />
            </div>
          )}
        </button>

        {/* News */}
        <button
          onClick={() => navigate('/feed')}
          className={`flex flex-col items-center gap-0.5 px-1.5 transition-all ${
            location.pathname === '/feed' && !location.search ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Newspaper className="w-4 h-4" />
          <span className="text-[7px] font-gilroy tracking-[0.05em]">NEWS</span>
        </button>

        {/* Perks */}
        <button
          onClick={() => navigate('/feed?tab=perks')}
          className={`flex flex-col items-center gap-0.5 px-1.5 transition-all ${
            isActiveTab('perks') ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span className="text-[7px] font-gilroy tracking-[0.05em]">PERKS</span>
        </button>

        {/* DMs */}
        <button
          onClick={() => navigate('/profile?tab=messages')}
          className={`flex flex-col items-center gap-0.5 px-1.5 transition-all ${
            isActiveTab('messages') ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="text-[7px] font-gilroy tracking-[0.05em]">DMS</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;

