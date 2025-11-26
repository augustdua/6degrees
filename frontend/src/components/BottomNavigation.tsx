import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Handshake,
  Network,
  Newspaper,
  Gift,
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
    return location.pathname.startsWith('/profile');
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-[#222] md:hidden z-50 ${className}`}>
      <div className="flex items-center justify-around py-2 px-4">
        {/* Offers - Goes to Feed Offers (bids tab) */}
        <button
          onClick={() => navigate('/feed?tab=bids')}
          className={`flex flex-col items-center gap-0.5 w-14 transition-all ${
            isActiveTab('bids') && location.pathname === '/feed' ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Handshake className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.05em]">OFFERS</span>
        </button>

        {/* Requests - Goes to Feed Requests */}
        <button
          onClick={() => navigate('/feed?tab=requests')}
          className={`flex flex-col items-center gap-0.5 w-14 transition-all ${
            isActiveTab('requests') && location.pathname === '/feed' ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Network className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.05em]">REQUESTS</span>
        </button>

        {/* Profile - Exact Center with elevated avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center -mt-4"
        >
          {user ? (
            <Avatar className={`w-11 h-11 ${isProfileActive() ? 'ring-2 ring-[#CBAA5A] ring-offset-2 ring-offset-black' : 'ring-1 ring-[#444] grayscale'} transition-all`}>
              <AvatarImage src={user.avatar || undefined} className={isProfileActive() ? '' : 'grayscale'} />
              <AvatarFallback className="bg-[#333] text-white text-[12px] font-gilroy">
                {user.firstName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`p-2.5 rounded-full ${isProfileActive() ? 'bg-[#CBAA5A] text-black' : 'text-[#555] border border-[#444]'}`}>
              <User className="w-5 h-5" />
            </div>
          )}
        </button>

        {/* News - Goes to Feed News tab */}
        <button
          onClick={() => navigate('/feed?tab=news')}
          className={`flex flex-col items-center gap-0.5 w-14 transition-all ${
            isActiveTab('news') && location.pathname === '/feed' ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Newspaper className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.05em]">NEWS</span>
        </button>

        {/* Perks */}
        <button
          onClick={() => navigate('/feed?tab=perks')}
          className={`flex flex-col items-center gap-0.5 w-14 transition-all ${
            isActiveTab('perks') ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Gift className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.05em]">PERKS</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;

