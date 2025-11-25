import React, { useState, useEffect } from 'react';
import { Offer } from '@/hooks/useOffers';
import { cn } from '@/lib/utils';
import { formatOfferPrice } from '@/lib/currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Heart, Users, Building2 } from 'lucide-react';

// Deterministic face images for demo purposes
const DEMO_FACES = [
  'photo-1506794778202-cad84cf45f1d', // Male, intense
  'photo-1544723795-3fb6469f5b39', // Female, professional
  'photo-1507003211169-0a1dd7228f2d', // Male, smiling
  'photo-1500648767791-00dcc994a43e', // Male, artistic
  'photo-1494790108377-be9c29b29330', // Female, bright
  'photo-1573496359142-b8d87734a5a2', // Female, corporate
  'photo-1560250097-0b93528c311a', // Male, suit
  'photo-1573497019940-1c28c88b4f3e', // Female, glasses
];

// Get a consistent face based on ID
const getFaceImage = (id: string) => {
  // If it's a real offer with a connected user avatar, prioritize that
  // Note: We'll handle this in the component logic now

  // Fallback to deterministic demo faces
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  const index = Math.abs(hash) % DEMO_FACES.length;
  return `https://images.unsplash.com/${DEMO_FACES[index]}?auto=format&fit=crop&w=800&q=80`;
};

interface OfferCardProps {
  offer: Offer | any; // Using any to support the demo offer shape in Feed.tsx
  onClick?: () => void;
  onBid?: (e: React.MouseEvent) => void;
  onBook?: (e: React.MouseEvent) => void;
  className?: string;
}

export const OfferCard: React.FC<OfferCardProps> = ({ 
  offer, 
  onClick, 
  onBid, 
  onBook,
  className 
}) => {
  const { userCurrency } = useCurrency();
  const [faceUrl, setFaceUrl] = useState<string>('');

  // Extract display data
  const companyName = offer.target_organization || 'Hidden Company';
  // If position is missing, try to parse from title or use fallback
  const position = offer.target_position || 'Professional Connection';
  
  // Tags - limit to 3
  const displayTags = (offer.tags || []).slice(0, 3);
  if (displayTags.length === 0) {
    // Fallback tags based on context
    if (companyName !== 'Hidden Company') displayTags.push('Direct Access');
    displayTags.push('Verified');
  }

  useEffect(() => {
    // Strategy for Face Image:
    // 1. If offer has a connection.avatar_url (real user), use it
    // 2. If offer has offer_photo_url, use it
    // 3. Fallback to deterministic Unsplash face based on ID
    
    if (offer.connection?.avatar_url) {
        setFaceUrl(offer.connection.avatar_url);
    } else if (offer.offer_photo_url) {
        setFaceUrl(offer.offer_photo_url);
    } else {
        setFaceUrl(getFaceImage(offer.id));
    }
  }, [offer]);

  return (
    <div 
      onClick={onClick}
      className={cn(
        "group relative w-full bg-black rounded-[20px] border border-[#1a1a1a] overflow-hidden flex flex-col shadow-2xl transition-transform duration-300 hover:scale-[1.01] cursor-pointer",
        // Default height if not specified by parent, but allow override
        "h-[500px]", 
        className
      )}
    >
      {/* Content Layer - Text and Buttons */}
      <div className="relative z-10 flex flex-col h-full p-7">
        
        {/* Eyebrow */}
        <div className="flex items-center gap-2 mb-6 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="h-[1px] w-8 bg-[#555]"></div>
          <span className="text-[0.55rem] text-[#888] uppercase tracking-[0.4em] font-medium">
            Expert Access
          </span>
        </div>

        {/* Headline Group */}
        <div className="mb-6">
          <h3 className="text-2xl font-[800] text-white tracking-[0.08em] leading-[1.1] mb-2 uppercase">
            {companyName}
          </h3>
          <div className="text-[0.75rem] font-[600] text-[#888] tracking-[0.12em] uppercase leading-relaxed max-w-[70%]">
            {position}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 max-w-[65%] mb-auto">
          {displayTags.map((tag: string, i: number) => (
            <span 
              key={i} 
              className="text-[0.55rem] text-[#aaa] border border-[#333] px-2.5 py-1.5 rounded-md tracking-[0.1em] uppercase bg-black/50 backdrop-blur-sm"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Stats (Optional: Keep them subtle if needed, or hide per new design. 
            The prompt didn't explicitly ask for stats but they are useful context) */}
        {/* <div className="flex gap-4 mb-6 text-[0.6rem] text-[#666] tracking-wider font-medium">
           <span>{offer.likes_count || 0} LIKES</span>
           <span>{offer.bids_count || 0} BIDS</span>
        </div> */}

        {/* CTA Buttons */}
        <div className="flex gap-3 mt-6 z-20">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onBook?.(e);
            }}
            className="flex-1 py-3 bg-white text-black border border-white rounded-lg text-[0.6rem] font-[700] tracking-[0.15em] uppercase hover:bg-[#e5e5e5] transition-colors"
          >
            Book Call
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onBid?.(e);
            }}
            className="flex-1 py-3 bg-transparent text-white border border-[#333] rounded-lg text-[0.6rem] font-[700] tracking-[0.15em] uppercase hover:bg-[#111] hover:border-white transition-colors"
          >
            Place Bid
          </button>
        </div>
      </div>

      {/* Background Photo Layer */}
      <div className="absolute right-[-20px] bottom-0 w-[75%] h-[65%] z-0 pointer-events-none">
        {/* Masking Gradients */}
        <div className="absolute inset-0 z-10" 
          style={{
            background: `
              linear-gradient(to right, #000 10%, transparent 60%),
              linear-gradient(to bottom, #000 0%, transparent 20%),
              linear-gradient(to top, #000 0%, transparent 15%)
            `
          }}
        ></div>
        
        {faceUrl && (
            <img 
            src={faceUrl} 
            alt="Expert" 
            className="w-full h-full object-cover object-top opacity-90 contrast-[1.2] brightness-[0.8]" 
            style={{ filter: 'grayscale(1)' }}
            />
        )}
      </div>
    </div>
  );
};
