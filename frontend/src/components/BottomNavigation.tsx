import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Home,
  Users,
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

  const isActive = (path: string) => {
    if (path === '/feed') {
      return location.pathname === '/feed' || location.pathname === '/';
    }
    if (path === '/profile') {
      return location.pathname.startsWith('/profile');
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-[#222] md:hidden z-50 ${className}`}>
      <div className="flex items-center justify-around py-3 px-6 max-w-sm mx-auto">
        {/* Feed */}
        <button
          onClick={() => navigate('/feed')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            isActive('/feed') ? 'text-[#CBAA5A]' : 'text-[#666] hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.1em]">FEED</span>
        </button>

        {/* People */}
        <button
          onClick={() => navigate('/feed?tab=people')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            location.search.includes('tab=people') ? 'text-[#CBAA5A]' : 'text-[#666] hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.1em]">PEOPLE</span>
        </button>

        {/* Profile - Centered with grayscale avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center"
        >
          {user ? (
            <Avatar className={`w-9 h-9 grayscale ${isActive('/profile') ? 'ring-2 ring-[#CBAA5A] ring-offset-2 ring-offset-black grayscale-0' : 'ring-1 ring-[#333]'} transition-all`}>
              <AvatarImage src={user.avatar || undefined} className="grayscale" />
              <AvatarFallback className="bg-[#333] text-white text-[11px] font-gilroy">
                {user.firstName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`p-2 rounded-full ${isActive('/profile') ? 'bg-[#CBAA5A] text-black' : 'text-[#666] border border-[#333]'}`}>
              <User className="w-5 h-5" />
            </div>
          )}
        </button>

        {/* DMs */}
        <button
          onClick={() => navigate('/profile?tab=messages')}
          className={`flex flex-col items-center gap-0.5 transition-all ${
            location.search.includes('tab=messages') ? 'text-[#CBAA5A]' : 'text-[#666] hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.1em]">DMS</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNavigation;

