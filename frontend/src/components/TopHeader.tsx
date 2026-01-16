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
    <header className={`sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border ${className}`}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo */}
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <span
            className="text-lg tracking-tight text-foreground"
            style={{ fontFamily: "'Cherry Bomb One', system-ui, sans-serif", color: "#000000" }}
          >
            crosslunch
          </span>
        </Link>

        {/* Center: Search (optional, hidden on mobile) */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search communities, posts..."
              className="w-full bg-card border border-border rounded-full pl-10 pr-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
            />
          </div>
        </div>

        {/* Right: Actions + Profile */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              {/* Notifications */}
              <button
                onClick={() => navigate('/messages')}
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Bell className="w-5 h-5" />
                {(notificationCounts?.unreadMessages || 0) > 0 && (
                  <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                    {notificationCounts?.unreadMessages > 9 ? '9+' : notificationCounts?.unreadMessages}
                  </span>
                )}
              </button>

              {/* Messages */}
              <button
                onClick={() => navigate('/messages')}
                className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <MessageSquare className="w-5 h-5" />
              </button>

              {/* Profile Dropdown */}
              <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-1.5 rounded-full hover:bg-muted transition-colors">
                    <Avatar className="w-8 h-8 ring-1 ring-border">
                      <AvatarImage src={user.avatar || undefined} />
                      <AvatarFallback className="bg-muted text-foreground text-xs font-gilroy">
                        {user.firstName?.[0] || '?'}
                      </AvatarFallback>
                    </Avatar>
                    <ChevronDown className="w-4 h-4 text-muted-foreground hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent 
                  align="end" 
                  className="w-56 bg-popover border border-border rounded-lg shadow-xl"
                >
                  {/* User Info */}
                  <div className="px-3 py-2 border-b border-border">
                    <p className="font-gilroy font-bold text-foreground text-sm">
                      {user.firstName} {user.lastName}
                    </p>
                    <p className="text-muted-foreground text-xs truncate">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <DropdownMenuItem 
                      onClick={() => navigate('/profile')}
                      className="flex items-center gap-3 px-3 py-2 text-foreground hover:bg-muted cursor-pointer"
                    >
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-gilroy text-sm">Profile</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => navigate('/profile?tab=settings')}
                      className="flex items-center gap-3 px-3 py-2 text-foreground hover:bg-muted cursor-pointer"
                    >
                      <Settings className="w-4 h-4 text-muted-foreground" />
                      <span className="font-gilroy text-sm">Settings</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem 
                      onClick={() => navigate('/messages')}
                      className="flex items-center gap-3 px-3 py-2 text-foreground hover:bg-muted cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <span className="font-gilroy text-sm">Messages</span>
                      {(notificationCounts?.unreadMessages || 0) > 0 && (
                        <span className="ml-auto px-2 py-0.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full">
                          {notificationCounts?.unreadMessages}
                        </span>
                      )}
                    </DropdownMenuItem>
                  </div>

                  <DropdownMenuSeparator className="bg-border" />

                  <div className="py-1">
                    <DropdownMenuItem 
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-3 py-2 text-destructive hover:bg-muted cursor-pointer"
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
                className="px-4 py-2 text-sm font-gilroy font-bold text-foreground hover:text-primary transition-colors"
              >
                Log In
              </button>
              <button
                onClick={() => navigate('/auth')}
                className="px-4 py-2 text-sm font-gilroy font-bold bg-primary text-primary-foreground rounded-full hover:bg-primary/90 transition-colors"
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



