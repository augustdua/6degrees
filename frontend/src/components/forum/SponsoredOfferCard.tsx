import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowBigUp } from 'lucide-react';
import type { Offer } from '@/hooks/useOffers';
import { formatOfferPrice } from '@/lib/currency';

export function SponsoredOfferCard(props: { offer: Offer }) {
  const { offer } = props;
  const navigate = useNavigate();

  const company = offer.target_organization || 'Hidden Company';
  const position = offer.target_position || 'Professional Connection';
  const desc = offer.description || offer.title || '';
  const price = useMemo(() => formatOfferPrice(offer as any, 'INR'), [offer]);

  const thumb = offer.target_logo_url || offer.offer_photo_url || '';

  return (
    <article
      onClick={() => navigate('/profile?tab=offers')}
      className="font-reddit bg-[#0a0a0a] hover:bg-[#111] border border-[#1a1a1a] rounded-sm overflow-hidden transition-colors duration-150 cursor-pointer"
    >
      <div className="flex">
        {/* Reddit-style Vote Column */}
        <div className="flex flex-col items-center py-2 px-2 bg-[#080808] w-10 flex-shrink-0">
          <button
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-[#1a1a1a] transition-colors text-[#606060] hover:text-[#CBAA5A]"
            aria-label="Upvote"
          >
            <ArrowBigUp className="w-5 h-5" />
          </button>
          <span className="text-xs font-bold my-0.5 text-[#d0d0d0]">•</span>
          <div className="w-5 h-5" />
        </div>

        {/* Main Content */}
        <div className="flex-1 py-2 px-3">
          {/* Header */}
          <div className="flex items-center gap-2 text-xs mb-2">
            <span className="flex items-center gap-1 text-[#CBAA5A]">
              <Sparkles className="w-3 h-3" />
              <span className="font-bold">Sponsored</span>
            </span>
            <span className="text-[#606060]">•</span>
            <span className="text-[#808080]">{company}</span>
            <span className="text-[#606060]">•</span>
            <span className="text-[#606060]">{price}</span>
          </div>

          {/* Content */}
          <div className="flex gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-[#e0e0e0] text-base font-medium leading-snug mb-1 line-clamp-2 hover:text-white">
                {position}
              </h3>
              <p className="text-[#808080] text-sm leading-relaxed line-clamp-2 mb-2">{desc}</p>
              <span className="text-[10px] text-[#606060] uppercase tracking-wide">Offer</span>
            </div>

            {thumb ? (
              <div className="w-20 h-20 rounded overflow-hidden flex-shrink-0 border border-[#1a1a1a] bg-[#0b0b0b]">
                <img
                  src={thumb}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
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
                className="flex-1 py-2 bg-transparent text-white border-2 border-[#444] rounded-full text-[10px] font-bold tracking-[0.15em] uppercase hover:bg-[#111] hover:border-white transition-colors font-gilroy"
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


