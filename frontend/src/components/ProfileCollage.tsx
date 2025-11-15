import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

interface FeaturedConnection {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  profile_picture_url: string | null;
}

interface ProfileCollageProps {
  userPhoto: string | null;
  userName: string;
  organizations: Organization[];
  featuredConnections?: FeaturedConnection[];
  size?: 'small' | 'medium' | 'large';
}

const ProfileCollage: React.FC<ProfileCollageProps> = ({
  userPhoto,
  userName,
  organizations,
  featuredConnections = [],
  size = 'large'
}) => {
  // Size configurations
  const sizeConfig = {
    small: {
      container: 'w-32 h-32',
      userAvatar: 'w-16 h-16',
      orgLogo: 'w-10 h-10',
      connectionAvatar: 'w-8 h-8'
    },
    medium: {
      container: 'w-48 h-48',
      userAvatar: 'w-24 h-24',
      orgLogo: 'w-14 h-14',
      connectionAvatar: 'w-12 h-12'
    },
    large: {
      container: 'w-80 h-80',
      userAvatar: 'w-32 h-32',
      orgLogo: 'w-20 h-20',
      connectionAvatar: 'w-16 h-16'
    }
  };

  const config = sizeConfig[size];

  // Calculate positions for organizations (in a circle around user)
  const getOrgPosition = (index: number, total: number) => {
    const angle = (index * 360) / total - 90; // Start from top
    const radius = size === 'small' ? 45 : size === 'medium' ? 65 : 110;
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
    const rotation = (index % 2 === 0 ? 1 : -1) * (Math.random() * 8 + 2); // 2-10 degrees
    return { x, y, rotation };
  };

  // Calculate positions for connections (further out, between orgs)
  const getConnectionPosition = (index: number, total: number) => {
    const angle = (index * 360) / total - 90 + (360 / total / 2); // Offset between orgs
    const radius = size === 'small' ? 55 : size === 'medium' ? 80 : 135;
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
    const rotation = (index % 2 === 0 ? 1 : -1) * (Math.random() * 10 + 3);
    return { x, y, rotation };
  };

  const displayOrgs = organizations.slice(0, 6);
  const displayConnections = featuredConnections.slice(0, 8);
  const userInitials = userName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className={`relative ${config.container} mx-auto`}>
      {/* User photo in center */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
        style={{
          filter: 'drop-shadow(0 4px 12px rgba(0, 0, 0, 0.15))'
        }}
      >
        <Avatar className={`${config.userAvatar} border-4 border-background ring-2 ring-primary/20`}>
          <AvatarImage src={userPhoto || undefined} alt={userName} />
          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-primary to-primary/70">
            {userInitials}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Organization logos */}
      {displayOrgs.map((org, index) => {
        const pos = getOrgPosition(index, displayOrgs.length);
        return (
          <div
            key={org.id}
            className="absolute transition-transform hover:scale-110 hover:z-30"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
              filter: 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.1))',
              zIndex: 10
            }}
          >
            <div
              className={`${config.orgLogo} bg-white dark:bg-gray-800 rounded-lg p-2 border-2 border-background flex items-center justify-center`}
            >
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <Building2 className="w-full h-full text-muted-foreground" />
              )}
            </div>
          </div>
        );
      })}

      {/* Featured connection photos */}
      {displayConnections.map((connection, index) => {
        const pos = getConnectionPosition(index, displayConnections.length);
        const initials = `${connection.first_name[0]}${connection.last_name[0]}`.toUpperCase();
        return (
          <div
            key={connection.id}
            className="absolute transition-transform hover:scale-110 hover:z-30"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: `translate(-50%, -50%) rotate(${pos.rotation}deg)`,
              filter: 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.1))',
              zIndex: 5
            }}
          >
            <Avatar className={`${config.connectionAvatar} border-2 border-background ring-1 ring-primary/10`}>
              <AvatarImage
                src={connection.profile_picture_url || undefined}
                alt={`${connection.first_name} ${connection.last_name}`}
              />
              <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-500 text-white">
                {initials}
              </AvatarFallback>
            </Avatar>
          </div>
        );
      })}
    </div>
  );
};

export default ProfileCollage;

