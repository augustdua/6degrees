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
      label: 'Feed',
      icon: Home,
      path: '/feed',
      onClick: () => navigate('/feed'),
    },
    {
      id: 'people',
      label: 'People',
      icon: Users,
      path: '/people',
      onClick: () => navigate('/feed?tab=people'),
    },
    {
      id: 'create',
      label: 'Create',
      icon: Plus,
      path: '/create',
      onClick: () => navigate('/create'),
      isSpecial: true,
    },
    {
      id: 'messages',
      label: 'DMs',
      icon: MessageSquare,
      path: '/profile?tab=messages',
      onClick: () => navigate('/profile?tab=messages'),
      badge: counts?.unreadMessages || 0,
    },
    {
      id: 'profile',
      label: 'Me',
      icon: User,
      path: '/profile',
      onClick: () => navigate('/profile'),
      isProfile: true,
    },
  ];

  return (
    <nav className={`fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border md:hidden z-50 ${className}`}>
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          // Special "Create" button styling
          if (item.isSpecial) {
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className="flex flex-col items-center justify-center -mt-4"
                aria-label={item.label}
              >
                <div className="bg-[#CBAA5A] text-black p-3 rounded-full shadow-lg hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>
              </button>
            );
          }

          // Profile button with avatar
          if (item.isProfile) {
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all ${
                  active 
                    ? 'text-[#CBAA5A]' 
                    : 'text-muted-foreground hover:text-white'
                }`}
                aria-label={item.label}
              >
                {user ? (
                  <Avatar className={`w-6 h-6 ${active ? 'ring-2 ring-[#CBAA5A]' : ''}`}>
                    <AvatarImage src={user.avatar || undefined} />
                    <AvatarFallback className="bg-[#CBAA5A] text-black text-[10px]">
                      {user.firstName?.[0] || '?'}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <Icon className="w-5 h-5" />
                )}
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          }

          // Regular nav items
          return (
            <button
              key={item.id}
              onClick={item.onClick}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-all relative ${
                active 
                  ? 'text-[#CBAA5A]' 
                  : 'text-muted-foreground hover:text-white'
              }`}
              aria-label={item.label}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && item.badge > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {item.badge > 9 ? '9+' : item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavigation;

