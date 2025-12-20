import React, { useState, useEffect, memo } from 'react';
import { Offer } from '@/hooks/useOffers';
import { cn } from '@/lib/utils';
import { formatOfferPrice } from '@/lib/currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Heart, Users, Building2 } from 'lucide-react';
import { useTracker } from '@/hooks/useInteractionTracker';

// Optimized image with lazy loading
const LazyImage = memo(({ src, alt, className, style }: { 
  src: string; 
  alt: string; 
  className?: string; 
  style?: React.CSSProperties;
}) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  
  if (error || !src) return null;
  
  return (
    <img 
      src={src} 
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      className={cn(
        className,
        'transition-opacity duration-300',
        loaded ? 'opacity-90' : 'opacity-0'
      )}
      style={style}
    />
  );
});

// Extensive list of deterministic face images for demo purposes (100+ unique IDs)
// Prioritizing South Asian / Southeast Asian / Indian faces for regional relevance
const DEMO_FACES = [
  // South Asian / Indian Men - Professional portraits
  'photo-1506794778202-cad84cf45f1d',
  'photo-1507003211169-0a1dd7228f2d',
  'photo-1560250097-0b93528c311a', // Indian businessman in suit
  'photo-1519085360753-af0119f7cbe7',
  'photo-1472099645785-5658abf4ff4e',
  'photo-1531427186611-ecfd6d936c79',
  'photo-1506277886164-e25aa3f4ef7f',
  'photo-1500648767791-00dcc994a43e',
  'photo-1522075469751-3a6694fb2f61',
  'photo-1504593811423-6dd665756598',
  'photo-1519345182560-3f2917c472ef',
  'photo-1507591064344-4c6ce005b128',
  'photo-1552058544-f2b08422138a',
  'photo-1506803582998-15c23009caac',
  'photo-1492562080023-ab3db95bfbce',
  'photo-1531384441138-2736e62e0919',
  'photo-1463453091185-61582044d556',
  'photo-1500048993953-d23a436266cf',
  'photo-1496345010651-c48f841ea187',
  'photo-1583195764036-6dc248ac07d9',
  'photo-1508341591423-4347099e1f19',
  'photo-1509680851642-4f4c9713163a',
  'photo-1542596594-649edbc13630',
  'photo-1521119989659-a83eee488058',
  'photo-1581382575275-97901c2635b7',
  'photo-1504257432389-5271ff81b9a8',
  'photo-1530268729831-4b0b9e170218',
  'photo-1513956589380-bad6acb9b9d4',
  'photo-1501196354995-cbb51c65aaea',
  'photo-1522529599102-193c0d76b5b6',
  'photo-1524250502761-1ac6f2e30d43',
  'photo-1568602471122-7832951cc4c5',
  'photo-1528763380143-65b3ac89a3ff',
  'photo-1527980965255-d3b416303d12',
  'photo-1535713875002-d1d0cf377fde',
  'photo-1599566150163-29194dcaad36',
  'photo-1570295999919-56ceb5ecca61',
  'photo-1554151228-14d9def656ec',
  'photo-1520341280432-4749d4d7bcf9',
  'photo-1499996860823-5214fcc65f8f',
  'photo-1534030347209-7147fd9e7b9a',
  'photo-1503235930437-8c6293ba41f5',
  'photo-1539571696357-5a69c17a67c6',
  'photo-1525134479668-1bee4c7c642b',
  
  // South Asian / Indian Women - Professional portraits
  'photo-1573496359142-b8d87734a5a2', // Indian woman professional
  'photo-1573497019940-1c28c88b4f3e', // Indian woman glasses corporate
  'photo-1544723795-3fb6469f5b39', // South Asian woman professional
  'photo-1531123897727-8f129e1688ce',
  'photo-1494790108377-be9c29b29330',
  'photo-1534528741775-53994a69daeb',
  'photo-1517841905240-472988babdf9',
  'photo-1524504388940-b1c1722653e1',
  'photo-1502378735452-bc7d86632805',
  'photo-1488426862026-3ee34a7d66df',
  'photo-1544005313-94ddf0286df2',
  'photo-1517365830460-955ce3ccd263',
  'photo-1529626455594-4ff0802cfb7e',
  'photo-1438761681033-6461ffad8d80',
  'photo-1489424731084-a5d8b219a5bb',
  'photo-1487412720507-e7ab37603c6f',
  'photo-1464863979621-258859e62245',
  'photo-1531746020798-e6953c6e8e04',
  'photo-1514626585111-9aa86183ac98',
  'photo-1508214751196-bcfd4ca60f91',
  'photo-1552374196-c4e7ffc6e126',
  'photo-1523824921871-d6f1a15151f1',
  'photo-1503185912284-5271ff81b9a8',
  'photo-1534751516642-a1af1ef26a56',
  'photo-1509967419530-32487aedbc30',
  'photo-1506956191951-7a88da4435e5',
  'photo-1520813792240-56fc4a3765a7',
  'photo-1521146764736-56c929d59c83',
  'photo-1529139574466-a302c27e0169',
  'photo-1512288094938-363287817259',
  'photo-1532074205216-d0e1f4b87368',
  'photo-1545996124-0501eb296251',
  'photo-1512484776495-a09d92e87c3b',
  'photo-1516575334481-f85287c2c81d',
  'photo-1530785602389-07594beb8b73',
  'photo-1523983254932-c7e6571c9d60',
  'photo-1532910404247-7ad948a65c5e',
  'photo-1522556189639-db5f3fc985d3',
  'photo-1515023115689-589c33041697',
  'photo-1521227889351-bf6f5b2e4e37',
  'photo-1515202913167-d9db90267ff9',
  'photo-1526413232648-9954e43863a9',
  'photo-1548142813-c348350df52b',
  'photo-1520528777338-5a78080329f3',
  'photo-1500522144261-ea64433bbe27',
  'photo-1519699047748-de8e457a634e',
  'photo-1524253482453-3fed8d2fe12b',
  'photo-1535324703438-0f97914149d5',
  'photo-1479936343636-73cdc5aae0c3',
  'photo-1502823403499-6ccfcf4fb453',
  'photo-1514315384763-ba401779410f',
  'photo-1504703395950-b89145a5425b',
  'photo-1506919258185-6078bba75d52',
  'photo-1523264939339-c89f9dadde2e',
  'photo-1517586979036-c7f1700ed20d',
  'photo-1500917293891-ef795e70e1f6',
  'photo-1500259783852-f4d735a96799'
];

// Get a consistent face based on ID
const getFaceImage = (id: string) => {
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
  interactionSource?: 'feed' | 'for_you' | 'unknown';
}

export const OfferCard: React.FC<OfferCardProps> = memo(({ 
  offer, 
  onClick, 
  onBid, 
  onBook, 
  className,
  interactionSource = 'unknown'
}) => {
  const { userCurrency } = useCurrency();
  const [faceUrl, setFaceUrl] = useState<string>('');
  const { track } = useTracker();
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const hasTrackedView = React.useRef(false);

  // Extract display data
  // Primary font (Riccione) = normal case for company name
  // Secondary font (Gilroy) = ALL CAPS for position, tags, buttons
  const companyName = offer.target_organization || 'Hidden Company';
  const position = (offer.target_position || 'Professional Connection').toUpperCase();
  
  // Tags - limit to 3, ALL CAPS (secondary font)
  const rawTags = (offer.tags || []).slice(0, 3);
  const displayTags: string[] = rawTags.map((tag: string) => tag.toUpperCase());
  if (displayTags.length === 0) {
    if (companyName !== 'Hidden Company') displayTags.push('DIRECT ACCESS');
    displayTags.push('VERIFIED');
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

  // Track view when card enters viewport
  useEffect(() => {
    if (!cardRef.current || hasTrackedView.current || !offer?.id) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasTrackedView.current) {
            hasTrackedView.current = true;
            track({
              target_type: 'offer',
              target_id: offer.id,
              event_type: 'view',
              metadata: { source: interactionSource }
            });
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [offer?.id, interactionSource, track]);

  return (
    <div 
      ref={cardRef}
      onClick={() => {
        if (offer?.id) {
          track({
            target_type: 'offer',
            target_id: offer.id,
            event_type: 'click',
            metadata: { source: interactionSource, action: 'open_details' }
          });
        }
        onClick?.();
      }}
      className={cn(
        "group relative w-full bg-black rounded-[16px] md:rounded-[20px] border border-[#1a1a1a] hover:border-[#CBAA5A] overflow-hidden flex flex-col shadow-2xl transition-all duration-300 hover:scale-[1.01] cursor-pointer",
        // Same aspect ratio 4:5 across ALL screen sizes for consistent look
        "aspect-[4/5]", 
        className
      )}
    >
      {/* Content Layer - Text and Buttons */}
      <div className="relative z-10 flex flex-col h-full p-5 sm:p-5 md:p-6">
        
        {/* Eyebrow - hidden on mobile for space */}
        <div className="hidden sm:flex items-center gap-2 mb-2 md:mb-4 opacity-0 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <div className="h-[1px] w-6 md:w-8 bg-[#555]"></div>
          <span className="text-[0.5rem] md:text-[0.55rem] text-[#888] uppercase tracking-[0.4em] font-medium font-gilroy">
            EXPERT ACCESS
          </span>
        </div>

        {/* Headline Group - Golden Ratio: Category 36px > Company 22px > Position 14px */}
        {/* Primary font (Riccione) = normal case, Secondary font (Gilroy) = ALL CAPS */}
        <div className="mb-3 sm:mb-3 md:mb-4">
          <h3 className="text-[20px] sm:text-[20px] md:text-[22px] text-white group-hover:text-[#CBAA5A] tracking-[0.02em] leading-[1.1] mb-1 sm:mb-1 font-riccione transition-colors duration-300 line-clamp-1">
            {offer.target_organization || 'Hidden Company'}
          </h3>
          <div className="text-[12px] sm:text-[12px] md:text-[13px] font-bold text-[#888] tracking-[0.2em] uppercase leading-relaxed max-w-[85%] font-gilroy line-clamp-1">
            {position}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 sm:gap-2 max-w-[65%] mb-auto">
          {displayTags.slice(0, 2).map((tag: string, i: number) => (
            <span 
              key={i} 
              className="text-[10px] sm:text-[11px] text-[#aaa] border border-[#444] px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-full tracking-[0.15em] uppercase bg-black/50 backdrop-blur-sm font-gilroy font-medium"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex gap-2 sm:gap-3 mt-auto z-20">
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (offer?.id) {
                track({
                  target_type: 'offer',
                  target_id: offer.id,
                  event_type: 'book_click',
                  metadata: { source: interactionSource }
                });
              }
              onBook?.(e);
            }}
            className="flex-1 py-3 sm:py-3.5 bg-white text-black border-2 border-white rounded-full text-[11px] sm:text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-[#CBAA5A] hover:text-black hover:border-[#CBAA5A] transition-colors font-gilroy"
          >
            BOOK CALL
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (offer?.id) {
                track({
                  target_type: 'offer',
                  target_id: offer.id,
                  event_type: 'bid_click',
                  metadata: { source: interactionSource }
                });
              }
              onBid?.(e);
            }}
            className="flex-1 py-3 sm:py-3.5 bg-transparent text-white border-2 border-[#444] rounded-full text-[11px] sm:text-[11px] font-bold tracking-[0.15em] uppercase hover:bg-[#111] hover:border-white transition-colors font-gilroy"
          >
            REQUEST INTRO
          </button>
        </div>
      </div>

      {/* Background Photo Layer */}
      <div className="absolute right-[-10px] sm:right-[-20px] bottom-0 w-[75%] sm:w-[70%] md:w-[75%] h-[65%] sm:h-[60%] md:h-[65%] z-0 pointer-events-none">
        
        {/* CONNECTOR Label - centered above photo */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black border border-[#333] group-hover:border-[#CBAA5A]/50 px-3 py-1 rounded-full flex items-center justify-center z-20 shadow-xl transition-all duration-300">
            <span className="font-riccione text-[9px] text-white group-hover:text-[#CBAA5A] tracking-[0.2em] uppercase whitespace-nowrap transition-colors duration-300">
            CONNECTOR
            </span>
        </div>

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
          <LazyImage 
            src={faceUrl} 
            alt="Expert" 
            className="w-full h-full object-cover object-top contrast-[1.2] brightness-[0.8]" 
            style={{ filter: 'grayscale(1)' }}
          />
        )}
      </div>
    </div>
  );
});
