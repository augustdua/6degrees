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

  const isOnHome = location.pathname === '/' || location.pathname === '/feed';
  const isOnForum = location.pathname.startsWith('/forum') || location.pathname === '/home';
  const isOnMessages = location.pathname === '/messages';
  const isOnProfile = location.pathname.startsWith('/profile');

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-[#222] md:hidden z-50 ${className}`}>
      <div className="flex items-center justify-around py-2 px-4">
        {/* Home - Goes to main feed/forum */}
        <button
          onClick={() => navigate('/')}
          className={`flex flex-col items-center gap-0.5 w-14 transition-all ${
            isOnHome ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Home className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.05em]">HOME</span>
        </button>

        {/* Forum */}
        <button
          onClick={() => navigate('/forum')}
          className={`flex flex-col items-center gap-0.5 w-14 transition-all ${
            isOnForum ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.05em]">FORUM</span>
        </button>

        {/* Messages */}
        <button
          onClick={() => navigate('/messages')}
          className={`flex flex-col items-center gap-0.5 w-14 transition-all ${
            isOnMessages ? 'text-[#CBAA5A]' : 'text-[#555] hover:text-white'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[8px] font-gilroy tracking-[0.05em]">MESSAGES</span>
        </button>

        {/* Profile - Exact Center with elevated avatar */}
        <button
          onClick={() => navigate('/profile')}
          className="flex flex-col items-center justify-center -mt-4"
        >
          {user ? (
            <Avatar className={`w-11 h-11 ${isOnProfile ? 'ring-2 ring-[#CBAA5A] ring-offset-2 ring-offset-black' : 'ring-1 ring-[#444] grayscale'} transition-all`}>
              <AvatarImage src={user.avatar || undefined} className={isOnProfile ? '' : 'grayscale'} />
              <AvatarFallback className="bg-[#333] text-white text-[12px] font-gilroy">
                {user.firstName?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className={`p-2.5 rounded-full ${isOnProfile ? 'bg-[#CBAA5A] text-black' : 'text-[#555] border border-[#444]'}`}>
              <User className="w-5 h-5" />
            </div>
          )}
        </button>

        {/* Spacer */}
        <div className="w-14" />
      </div>
    </nav>
  );
};

export default BottomNavigation;

