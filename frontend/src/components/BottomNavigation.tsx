import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';
import {
  Home,
  Users,
  Plus,
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
  const { counts } = useNotificationCounts();

  const isActive = (path: string) => {
    if (path === '/feed') {
      return location.pathname === '/feed' || location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const navItems = [
    {
      id: 'feed',
      label: 'FEED',
      icon: Home,
      path: '/feed',
      onClick: () => navigate('/feed'),
    },
    {
      id: 'people',
      label: 'PEOPLE',
      icon: Users,
      path: '/people',
      onClick: () => navigate('/feed?tab=people'),
    },
    {
      id: 'create',
      label: '',
      icon: Plus,
      path: '/create',
      onClick: () => navigate('/create'),
      isSpecial: true,
    },
    {
      id: 'messages',
      label: 'DMS',
      icon: MessageSquare,
      path: '/profile?tab=messages',
      onClick: () => navigate('/profile?tab=messages'),
      badge: counts?.unreadMessages || 0,
    },
    {
      id: 'profile',
      label: '',
      icon: User,
      path: '/profile',
      onClick: () => navigate('/profile'),
      isProfile: true,
    },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-xl border-t border-[#222] md:hidden z-50 ${className}`}>
      <div className="flex items-center justify-around py-2 px-4 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          // Special "Create" button styling - elevated gold button
          if (item.isSpecial) {
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex items-center justify-center -mt-5"
                aria-label="Create"
              >
                <div className="bg-[#CBAA5A] text-black p-3.5 rounded-full shadow-lg shadow-[#CBAA5A]/20 hover:scale-110 transition-transform border-4 border-black">
                  <Icon className="w-5 h-5" />
                </div>
              </button>
            );
          }

          // Profile button with avatar - center-right position
          if (item.isProfile) {
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center"
                aria-label="Profile"
              >
                {user ? (
                  <Avatar className={`w-7 h-7 ${active ? 'ring-2 ring-[#CBAA5A] ring-offset-2 ring-offset-black' : 'ring-1 ring-[#333]'} transition-all`}>
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="bg-[#CBAA5A] text-black text-[10px] font-gilroy">
                      {user.firstName?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className={`p-1.5 rounded-full ${active ? 'bg-[#CBAA5A] text-black' : 'text-[#666]'}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                )}
              </button>
            );
          }

          // Regular nav items with Gilroy font
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-0.5 py-1 px-2 transition-all relative ${
                active 
                  ? 'text-[#CBAA5A]' 
                  : 'text-[#666] hover:text-white'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[7px] font-gilroy font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              {item.label && (
                <span className="text-[8px] font-gilroy tracking-[0.1em]">{item.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;

