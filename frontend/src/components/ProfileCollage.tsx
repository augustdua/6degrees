import React from 'react';
import { Building2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ProfileCollageProps {
  organizations: Organization[];
  size?: 'default' | 'compact';
}

const ProfileCollage: React.FC<ProfileCollageProps> = ({
  organizations,
  size = 'default'
}) => {
  // Scaling factor for compact mode
  const scale = size === 'compact' ? 0.35 : 1;
  const baseWidth = 450;
  const baseHeight = 400;
  
  // Metro tile layouts with varied sizes and shapes
  // Format: { left, top, width, height } in pixels
  // All positions account for 10px padding on all sides
  const metroLayouts: Record<number, Array<{ left: number; top: number; width: number; height: number }>> = {
    1: [
      { left: 10, top: 10, width: 430, height: 380 }
    ],
    2: [
      { left: 10, top: 10, width: 252, height: 380 },
      { left: 267, top: 10, width: 173, height: 380 }
    ],
    3: [
      { left: 10, top: 10, width: 252, height: 187 },
      { left: 267, top: 10, width: 173, height: 187 },
      { left: 10, top: 202, width: 430, height: 188 }
    ],
    4: [
      { left: 10, top: 10, width: 252, height: 187 },
      { left: 267, top: 10, width: 173, height: 187 },
      { left: 10, top: 202, width: 252, height: 188 },
      { left: 267, top: 202, width: 173, height: 188 }
    ],
    5: [
      { left: 10, top: 10, width: 252, height: 187 },
      { left: 267, top: 10, width: 173, height: 187 },
      { left: 10, top: 202, width: 123, height: 188 },
      { left: 138, top: 202, width: 124, height: 188 },
      { left: 267, top: 202, width: 173, height: 188 }
    ],
    6: [
      { left: 10, top: 10, width: 252, height: 187 },
      { left: 267, top: 10, width: 173, height: 187 },
      { left: 10, top: 202, width: 123, height: 188 },
      { left: 138, top: 202, width: 124, height: 188 },
      { left: 267, top: 202, width: 173, height: 91 },
      { left: 267, top: 298, width: 173, height: 92 }
    ],
    7: [
      { left: 10, top: 10, width: 252, height: 187 },
      { left: 267, top: 10, width: 173, height: 187 },
      { left: 10, top: 202, width: 123, height: 188 },
      { left: 138, top: 202, width: 124, height: 91 },
      { left: 138, top: 298, width: 124, height: 92 },
      { left: 267, top: 202, width: 84, height: 188 },
      { left: 356, top: 202, width: 84, height: 188 }
    ]
  };

  const logoCount = Math.min(organizations.length, 7);
  const layout = metroLayouts[logoCount] || metroLayouts[6];

  const scaledWidth = baseWidth * scale;
  const scaledHeight = baseHeight * scale;
  const padding = 10 * scale;

  return (
    <div 
      className="relative w-full mx-auto" 
      style={{ 
        maxWidth: `${scaledWidth}px`, 
        height: `${scaledHeight}px`, 
        padding: `${padding}px`, 
        boxSizing: 'border-box' 
      }}
    >
      {/* Organization logos - Metro tiles */}
      {organizations.slice(0, 7).map((org, index) => {
        const pos = layout[index] || layout[0];
        
        return (
          <div
            key={org.id}
            className={`absolute backdrop-blur-md flex items-center justify-center group overflow-hidden ${
              size === 'compact' 
                ? 'rounded-md p-1 bg-white/20 border border-primary/20 hover:bg-white/30' 
                : 'rounded-xl p-4 bg-white/15 border border-primary/30 transition-all duration-300 hover:scale-105 hover:bg-white/20 hover:border-primary/50 hover:shadow-[0_8px_32px_rgba(55,213,163,0.4)] cursor-pointer'
            }`}
            style={{
              left: `${pos.left * scale}px`,
              top: `${pos.top * scale}px`,
              width: `${pos.width * scale}px`,
              height: `${pos.height * scale}px`,
              zIndex: 2
            }}
          >
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className={`object-contain ${size === 'compact' ? 'max-w-[90%] max-h-[90%]' : 'max-w-[85%] max-h-[85%] transition-transform group-hover:scale-110'}`}
              />
            ) : (
              <div className={`flex flex-col items-center justify-center text-primary ${size === 'compact' ? 'text-[8px]' : ''}`}>
                <Building2 className={size === 'compact' ? 'w-3 h-3' : 'w-12 h-12 mb-2'} />
                {size !== 'compact' && <span className="text-sm font-bold text-center">{org.name}</span>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProfileCollage;
