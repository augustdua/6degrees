import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowBigUp } from 'lucide-react';
import type { Offer } from '@/hooks/useOffers';
import { formatOfferPrice } from '@/lib/currency';

function getFaceFallback(id: string): string {
  // Keep this lightweight (we don't want to ship a huge list into the forum bundle).
  const faces = [
    'photo-1506794778202-cad84cf45f1d',
    'photo-1507003211169-0a1dd7228f2d',
    'photo-1560250097-0b93528c311a',
    'photo-1522075469751-3a6694fb2f61',
    'photo-1534528741775-53994a69daeb',
    'photo-1517841905240-472988babdf9',
    'photo-1544723795-3fb6469f5b39',
    'photo-1573496359142-b8d87734a5a2',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % faces.length;
  return `https://images.unsplash.com/${faces[idx]}?auto=format&fit=crop&w=800&q=80`;
}

export function SponsoredOfferCard(props: { offer: Offer }) {
  const { offer } = props;
  const navigate = useNavigate();
  const [faceUrl, setFaceUrl] = useState<string>('');

  const company = offer.target_organization || 'Hidden Company';
  const position = offer.target_position || 'Professional Connection';
  const desc = offer.description || offer.title || '';
  const price = useMemo(() => formatOfferPrice(offer as any, 'INR'), [offer]);
  
  // Connector is the person who posted the offer (offer creator)
  const connector = useMemo(() => {
    const c = (offer as any)?.creator;
    if (c?.first_name || c?.last_name) {
      return `${c.first_name || ''} ${c.last_name || ''}`.trim();
    }
    return null;
  }, [offer]);

  // Match OfferCard face strategy: connection avatar -> offer photo -> deterministic fallback
  useEffect(() => {
    const url =
      (offer as any)?.connection?.avatar_url ||
      (offer as any)?.offer_photo_url ||
      getFaceFallback(String((offer as any)?.id || 'offer'));
    setFaceUrl(String(url || ''));
  }, [offer]);

  return (
    <article
      onClick={() => navigate('/profile?tab=offers')}
      className="font-reddit bg-card hover:bg-accent border border-border rounded-sm overflow-hidden transition-colors duration-150 cursor-pointer min-h-[220px] sm:min-h-[240px]"
    >
      <div className="flex">
        {/* Reddit-style Vote Column */}
        <div className="flex flex-col items-center py-2 px-2 bg-muted w-10 flex-shrink-0">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-accent transition-colors text-muted-foreground hover:text-[#CBAA5A]"
            aria-label="Upvote"
          >
            <ArrowBigUp className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold my-0.5 text-muted-foreground">•</span>
          <div className="w-5 h-5" />
        </div>

        {/* Main Content */}
        <div className="flex-1 py-3 px-3">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs mb-2 flex-wrap">
            <span className="flex items-center gap-1 text-[#CBAA5A]">
              <Sparkles className="w-3 h-3" />
              <span className="font-bold">Sponsored</span>
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{company}</span>
            {connector ? (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground">Connector: <span className="text-[#CBAA5A]">{connector}</span></span>
              </>
            ) : null}
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{price}</span>
          </div>

          {/* Content */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-foreground text-base font-medium leading-snug mb-1 line-clamp-2 hover:opacity-90">
                {position}
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3 mb-2">{desc}</p>
              <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Offer</span>
            </div>

            {faceUrl ? (
              // Larger photo for better visibility
              <div className="w-32 h-36 sm:w-36 sm:h-40 rounded overflow-hidden flex-shrink-0 border border-border bg-background">
                <img
                  src={faceUrl}
                  alt=""
                  className="w-full h-full object-cover object-top contrast-[1.2] brightness-[0.8]"
                  loading="lazy"
                  decoding="async"
                  style={{ filter: 'grayscale(1)' }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            ) : null}
          </div>

          {/* Action */}
          <div className="flex items-center gap-1 mt-2 -ml-1">
            {/* Preserve original OfferCard CTA styling (compact sizing) */}
            <div className="flex gap-2 w-full">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/profile?tab=offers');
                }}
                className="flex-1 py-2 bg-white text-black border-2 border-white rounded-full text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-[#CBAA5A] hover:text-black hover:border-[#CBAA5A] transition-colors font-gilroy"
              >
                BOOK CALL
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/profile?tab=offers');
                }}
                className="flex-1 py-2 bg-transparent text-foreground border-2 border-border rounded-full text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-accent transition-colors font-gilroy"
              >
                PLACE BID
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}


