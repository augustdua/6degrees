import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Network,
  DollarSign,
  MessageSquare,
  Users,
  User,
  Handshake,
  Video,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  AlertTriangle
} from 'lucide-react';

interface DashboardSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  unreadMessages?: number;
  networkNotifications?: number;
  introNotifications?: number;
  className?: string;
}

const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  unreadMessages = 0,
  networkNotifications = 0,
  introNotifications = 0,
  className = ''
}) => {
  const { user, signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const baseNavigationItems = [
    { id: 'mychains', icon: Network, label: 'My Chains', badge: null },
    { id: 'wallet', icon: DollarSign, label: 'Wallet', badge: null },
    { id: 'messages', icon: MessageSquare, label: 'Messages', badge: unreadMessages > 0 ? unreadMessages : null },
    { id: 'network', icon: Users, label: 'My Network', badge: networkNotifications > 0 ? networkNotifications : null },
    { id: 'people', icon: User, label: 'Discover People', badge: null },
    { id: 'offers', icon: Handshake, label: 'My Offers', badge: null },
    { id: 'intros', icon: Video, label: 'Intros', badge: introNotifications > 0 ? introNotifications : null },
  ];

  // Add debug tab in development
  const navigationItems = process.env.NODE_ENV === 'development'
    ? [...baseNavigationItems, { id: 'debug', icon: AlertTriangle, label: 'Debug Errors', badge: null }]
    : baseNavigationItems;

  const handleNavClick = (tabId: string) => {
    onTabChange(tabId);
    setIsMobileOpen(false);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setIsMobileOpen(!isMobileOpen)}
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Overlay for mobile */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-screen bg-background border-r border-border z-40
          transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${className}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">
                  6°
                </div>
                <span className="font-bold text-lg">6Degree</span>
              </div>
            )}
            {isCollapsed && (
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold mx-auto">
                6°
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 overflow-y-auto py-4">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              
              return (
                <Button
                  key={item.id}
                  variant={isActive ? 'secondary' : 'ghost'}
                  className={`
                    w-full mb-1 relative
                    ${isCollapsed ? 'justify-center px-0' : 'justify-start px-4'}
                    ${isActive ? 'bg-primary/10 text-primary' : ''}
                  `}
                  onClick={() => handleNavClick(item.id)}
                >
                  <Icon className={`h-5 w-5 ${!isCollapsed && 'mr-3'}`} />
                  {!isCollapsed && (
                    <span className="flex-1 text-left">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <Badge variant="destructive" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                  {isCollapsed && item.badge && (
                    <div className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
                  )}
                </Button>
              );
            })}
          </nav>

          {/* Profile Section */}
          <div className="border-t border-border p-4 space-y-2">
            {/* Settings Button */}
            <Button
              variant="ghost"
              className={`w-full mb-2 ${isCollapsed ? 'justify-center px-0' : 'justify-start'}`}
              onClick={() => {
                // Frontend only settings - can add a modal or navigate to settings page
                alert('Settings coming soon!');
              }}
            >
              <Settings className={`h-5 w-5 ${!isCollapsed && 'mr-3'}`} />
              {!isCollapsed && 'Settings'}
            </Button>

            {/* Profile Info */}
            <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
              <Avatar className={`${isCollapsed ? 'w-8 h-8' : 'w-10 h-10'}`}>
                <AvatarImage src={user?.avatar_url} />
                <AvatarFallback>
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </AvatarFallback>
              </Avatar>
              {!isCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {user?.email}
                  </p>
                </div>
              )}
            </div>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={`w-full hidden md:flex ${isCollapsed ? 'justify-center' : ''}`}
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <>
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  <span>Collapse</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>

      {/* Spacer to prevent content from going under sidebar */}
      <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? 'w-16' : 'w-64'}`} />
    </>
  );
};

export default DashboardSidebar;

