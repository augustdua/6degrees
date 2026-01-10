import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  User,
  Settings,
  MessageSquare,
  LogOut,
  ChevronDown,
  Bell,
  Search,
} from 'lucide-react';
import { useNotificationCounts } from '@/hooks/useNotificationCounts';

interface TopHeaderProps {
  className?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({ className = '' }) => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { counts: notificationCounts } = useNotificationCounts();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className={`sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-[#222] ${className}`}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 bg-gradient-to-br from-[#CBAA5A] to-[#8B7355] rounded-lg flex items-center justify-center">
            <span
              className="text-black font-bold text-sm"
              style={{ fontFamily: 'Riccione-DemiBold, ui-serif, serif' }}
            >
              Z
            </span>
          </div>
          <span className="font-gilroy font-bold text-lg tracking-tight text-white hidden sm:block">
            Zaurq
          </span>
        </Link>

        {/* Center: Search (optional, hidden on mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#666]" />
            <input
              type="text"
              placeholder="Search communities, posts..."
              className="w-full bg-[#1a1a1a] border border-[#333] rounded-full pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#666] focus:outline-none focus:border-[#CBAA5A]/50 transition-colors"
            />
          </div>
        </div>

        {/* Right: Actions + Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notifications */}
              <button
                onClick={() => navigate('/profile?tab=messages')}
                className="relative p-2 text-[#888] hover:text-white transition-colors"
              >
                <Bell className="w-5 h-5" />
                {(notificationCounts?.unreadMessages || 0) > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notificationCounts?.unreadMessages > 9 ? '9+' : notificationCounts?.unreadMessages}
                  </span>
                )}
              </button>

              {/* Messages */}
              <button
                onClick={() => navigate('/messages')}
                className="relative p-2 text-[#888] hover:text-white transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* Profile Dropdown */}
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-[#1a1a1a] transition-colors">
                    <Avatar className="w-8 h-8 ring-1 ring-[#333]">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="bg-[#333] text-white text-xs font-gilroy">
                        {user.firstName?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-[#666] hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl"
                >
                  {/* User Info */}
                  <div className="px-3 py-2 border-b border-[#333]">
                    <p className="font-gilroy font-bold text-white text-sm">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-[#666] text-xs truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <DropdownMenuItem 
                      onClick={() => navigate('/profile')}
                      className="flex items-center gap-3 px-3 py-2 text-white hover:bg-[#252525] cursor-pointer"
                    >
                      <User className="w-4 h-4 text-[#888]" />
                      <span className="font-gilroy text-sm">Profile</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => navigate('/profile?tab=settings')}
                      className="flex items-center gap-3 px-3 py-2 text-white hover:bg-[#252525] cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-[#888]" />
                      <span className="font-gilroy text-sm">Settings</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => navigate('/messages')}
                      className="flex items-center gap-3 px-3 py-2 text-white hover:bg-[#252525] cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-[#888]" />
                      <span className="font-gilroy text-sm">Messages</span>
                      {(notificationCounts?.unreadMessages || 0) > 0 && (
                        <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full">
                          {notificationCounts?.unreadMessages}
                        </span>
                      )}
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="bg-[#333]" />

                  <div className="py-1">
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-3 py-2 text-red-400 hover:bg-[#252525] cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="font-gilroy text-sm">Sign Out</span>
                    </DropdownMenuItem>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 text-sm font-gilroy font-bold text-white hover:text-[#CBAA5A] transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 text-sm font-gilroy font-bold bg-[#CBAA5A] text-black rounded-full hover:bg-[#D4B76A] transition-colors"
              >
                Sign Up
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default TopHeader;



