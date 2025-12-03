import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Building2, 
  Mail, 
  Phone, 
  User,
  Sparkles,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { formatOfferPrice } from '@/lib/currency';
import { useCurrency } from '@/contexts/CurrencyContext';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ApolloOffer {
  id: string;
  title: string;
  description: string;
  target_organization?: string;
  target_position?: string;
  target_logo_url?: string;
  asking_price_inr: number;
  first_name?: string;
  last_name_obfuscated?: string;
  has_email?: boolean;
  has_phone?: boolean;
  is_apollo_sourced?: boolean;
  display_name?: string;
  apollo_person_id?: string;
}

interface ApolloOfferCardProps {
  offer: ApolloOffer;
  onClick?: () => void;
}

export const ApolloOfferCard: React.FC<ApolloOfferCardProps> = ({ offer, onClick }) => {
  const { userCurrency } = useCurrency();
  const { toast } = useToast();
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);

  const displayName = offer.display_name || 
    (offer.first_name && offer.last_name_obfuscated 
      ? `${offer.first_name} ${offer.last_name_obfuscated}` 
      : 'Professional');

  const initials = offer.first_name 
    ? offer.first_name.charAt(0).toUpperCase() 
    : 'P';

  const handleRequestIntro = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (requested) return;
    
    setRequesting(true);
    try {
      const response = await apiPost('/api/intro-requests/request', {
        offerId: offer.id
      });

      if (response.success) {
        setRequested(true);
        toast({
          title: '✨ Intro Requested!',
          description: `We'll reach out to ${displayName} and get back to you soon.`
        });
      } else {
        throw new Error(response.error || 'Failed to request intro');
      }
    } catch (error: any) {
      console.error('Error requesting intro:', error);
      toast({
        variant: 'destructive',
        title: 'Request Failed',
        description: error.message || 'Failed to request intro. Please try again.'
      });
    } finally {
      setRequesting(false);
    }
  };

  return (
    <Card 
      className="bg-[#111] border-[#222] hover:border-[#333] transition-all cursor-pointer group overflow-hidden"
      onClick={onClick}
    >
      <CardContent className="p-5">
        {/* Header with Avatar and Name */}
        <div className="flex items-start gap-4 mb-4">
          {/* Blurred Avatar with Connector Label */}
          <div className="relative mt-2">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black border border-[#333] group-hover:border-[#CBAA5A]/50 px-2.5 py-0.5 rounded-full flex items-center justify-center z-10 shadow-lg transition-all duration-300">
              <span className="font-riccione text-[8px] text-white group-hover:text-[#CBAA5A] tracking-[0.15em] uppercase whitespace-nowrap transition-colors duration-300">
                CONNECTOR
              </span>
            </div>
            <Avatar className="h-14 w-14 border-2 border-[#333]">
              <AvatarFallback 
                className="bg-gradient-to-br from-[#333] to-[#222] text-[#666] text-lg font-bold"
                style={{ filter: 'blur(2px)' }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            {/* Real Person Badge */}
            <div className="absolute -bottom-1 -right-1 bg-[#CBAA5A] rounded-full p-1">
              <User className="h-3 w-3 text-black" />
            </div>
          </div>

          {/* Name and Title */}
          <div className="flex-1 min-w-0">
            <h3 className="font-gilroy font-bold text-white text-base truncate">
              {displayName}
            </h3>
            <p className="font-gilroy text-[#888] text-sm truncate">
              {offer.target_position}
            </p>
          </div>
        </div>

        {/* Company */}
        <div className="flex items-center gap-2 mb-3">
          <Building2 className="h-4 w-4 text-[#666] flex-shrink-0" />
          <span className="font-gilroy text-[#aaa] text-sm truncate">
            {offer.target_organization || 'Company'}
          </span>
        </div>

        {/* Availability Badges */}
        <div className="flex flex-wrap gap-2 mb-4">
          {offer.has_email && (
            <Badge variant="outline" className="bg-green-500/10 border-green-500/30 text-green-400 text-[10px] font-gilroy">
              <Mail className="h-3 w-3 mr-1" />
              Email Available
            </Badge>
          )}
          {offer.has_phone && (
            <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-400 text-[10px] font-gilroy">
              <Phone className="h-3 w-3 mr-1" />
              Phone Available
            </Badge>
          )}
          {offer.is_apollo_sourced && (
            <Badge variant="outline" className="bg-[#CBAA5A]/10 border-[#CBAA5A]/30 text-[#CBAA5A] text-[10px] font-gilroy">
              <Sparkles className="h-3 w-3 mr-1" />
              Verified Profile
            </Badge>
          )}
        </div>

        {/* Price and CTA */}
        <div className="flex items-center justify-between pt-3 border-t border-[#222]">
          <div>
            <p className="font-gilroy text-[10px] text-[#666] uppercase tracking-wider">
              Intro Price
            </p>
            <p className="font-gilroy font-bold text-[#CBAA5A] text-lg">
              {formatOfferPrice({ asking_price_inr: offer.asking_price_inr }, userCurrency)}
            </p>
          </div>

          <Button
            onClick={handleRequestIntro}
            disabled={requesting || requested}
            className={`font-gilroy font-bold text-xs tracking-wide transition-all ${
              requested 
                ? 'bg-green-600 hover:bg-green-600 text-white cursor-default'
                : 'bg-white text-black hover:bg-[#CBAA5A]'
            }`}
          >
            {requesting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Requesting...
              </>
            ) : requested ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Requested
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Request Intro
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ApolloOfferCard;




