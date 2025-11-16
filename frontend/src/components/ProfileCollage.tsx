import React from 'react';
import { Building2 } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
}

interface ProfileCollageProps {
  organizations: Organization[];
}

const ProfileCollage: React.FC<ProfileCollageProps> = ({
  organizations
}) => {
  // Metro tile layouts with varied sizes and shapes
  // Format: { left, top, width, height } in pixels
  const metroLayouts: Record<number, Array<{ left: number; top: number; width: number; height: number }>> = {
    1: [
      { left: 0, top: 0, width: 430, height: 380 }
    ],
    2: [
      { left: 0, top: 0, width: 252, height: 380 },
      { left: 257, top: 0, width: 173, height: 380 }
    ],
    3: [
      { left: 0, top: 0, width: 252, height: 187 },
      { left: 257, top: 0, width: 173, height: 187 },
      { left: 0, top: 192, width: 430, height: 188 }
    ],
    4: [
      { left: 0, top: 0, width: 252, height: 187 },
      { left: 257, top: 0, width: 173, height: 187 },
      { left: 0, top: 192, width: 252, height: 188 },
      { left: 257, top: 192, width: 173, height: 188 }
    ],
    5: [
      { left: 0, top: 0, width: 252, height: 187 },
      { left: 257, top: 0, width: 173, height: 187 },
      { left: 0, top: 192, width: 123, height: 188 },
      { left: 128, top: 192, width: 124, height: 188 },
      { left: 257, top: 192, width: 173, height: 188 }
    ],
    6: [
      { left: 0, top: 0, width: 252, height: 187 },
      { left: 257, top: 0, width: 173, height: 187 },
      { left: 0, top: 192, width: 123, height: 188 },
      { left: 128, top: 192, width: 124, height: 188 },
      { left: 257, top: 192, width: 173, height: 91 },
      { left: 257, top: 288, width: 173, height: 92 }
    ],
    7: [
      { left: 0, top: 0, width: 252, height: 187 },
      { left: 257, top: 0, width: 173, height: 187 },
      { left: 0, top: 192, width: 123, height: 188 },
      { left: 128, top: 192, width: 124, height: 91 },
      { left: 128, top: 288, width: 124, height: 92 },
      { left: 257, top: 192, width: 84, height: 188 },
      { left: 346, top: 192, width: 84, height: 188 }
    ]
  };

  const logoCount = Math.min(organizations.length, 7);
  const layout = metroLayouts[logoCount] || metroLayouts[6];

  return (
    <div className="relative w-full mx-auto" style={{ maxWidth: '450px', height: '400px', padding: '10px', boxSizing: 'border-box' }}>
      {/* Organization logos - Metro tiles */}
      {organizations.slice(0, 7).map((org, index) => {
        const pos = layout[index] || layout[0];
        
        return (
          <div
            key={org.id}
            className="absolute bg-white/[0.08] backdrop-blur-md border border-white/10 rounded-xl p-4 transition-all duration-300 hover:scale-105 hover:bg-white/[0.12] hover:border-primary/40 hover:shadow-[0_8px_24px_rgba(55,213,163,0.3)] flex items-center justify-center cursor-pointer group overflow-hidden"
            style={{
              left: `${pos.left}px`,
              top: `${pos.top}px`,
              width: `${pos.width}px`,
              height: `${pos.height}px`,
              zIndex: 2
            }}
          >
            {org.logo_url ? (
              <img
                src={org.logo_url}
                alt={org.name}
                className="max-w-[85%] max-h-[85%] object-contain transition-transform group-hover:scale-110"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-primary">
                <Building2 className="w-12 h-12 mb-2" />
                <span className="text-sm font-bold text-center">{org.name}</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default ProfileCollage;
