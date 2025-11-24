import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, Phone, DollarSign, Building2, Users } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatOfferPrice } from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { getCloudinaryLogoUrlPremium } from '@/utils/cloudinary';

interface OfferDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  offer: {
    id: string;
    title: string;
    description: string;
    target_position?: string;
    target_organization?: string;
    target_logo_url?: string;
    asking_price_inr: number;
    asking_price_eur: number;
    currency?: string;
    likes_count?: number;
    bids_count?: number;
    use_cases?: string[];
    additional_org_logos?: Array<{ name: string; logo_url: string }>;
    connection?: { avatar_url?: string };
  };
  onBidClick?: () => void;
}

const OfferDetailsModal: React.FC<OfferDetailsModalProps> = ({
  isOpen,
  onClose,
  offer,
  onBidClick
}) => {
  const { userCurrency } = useCurrency();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleBookCall = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    try {
      await apiPost(`/api/offers/${offer.id}/request-call`, {});
      toast({
        title: 'Request Sent!',
        description: 'Check your Messages tab for approval from the creator.'
      });
      onClose();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send call request'
      });
    }
  };

  const handleBid = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (onBidClick) {
      onBidClick();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0 mx-4 sm:mx-auto">
        {/* Header Image Area */}
        <div className="relative w-full h-48 bg-muted/20 overflow-hidden shrink-0">
          {offer.target_logo_url ? (
            <img
              src={getCloudinaryLogoUrlPremium(offer.target_logo_url)}
              alt={offer.target_organization || 'Organization'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = offer.target_logo_url || '';
                target.style.objectFit = 'contain';
                target.style.padding = '1rem';
                target.parentElement!.style.backgroundColor = 'white';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
              <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Avatar with Position/Organization */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 flex-shrink-0 ring-2 ring-primary/10">
              <AvatarImage src={offer.connection?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                {offer.target_position?.[0] || offer.target_organization?.[0] || '?'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {offer.target_position ? (
                <p className="font-semibold text-base truncate">{offer.target_position}</p>
              ) : (
                <p className="font-semibold text-base truncate text-muted-foreground">Professional Connection</p>
              )}
              {offer.target_organization && (
                <p className="text-sm text-muted-foreground truncate">{offer.target_organization}</p>
              )}
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {offer.description}
          </p>

          {/* Additional Organizations */}
          {offer.additional_org_logos && Array.isArray(offer.additional_org_logos) && offer.additional_org_logos.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground font-medium">Also connects to:</p>
              <div className="flex flex-wrap gap-2">
                {offer.additional_org_logos.map((org, index) => (
                  <div key={index} className="flex items-center gap-2 px-2 py-1.5 bg-muted/50 rounded-lg border border-border/50 backdrop-blur-sm">
                    {org.logo_url && (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="w-5 h-5 object-contain rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <span className="text-xs font-medium">{org.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Price & Stats */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Heart className="w-4 h-4" />
                <span>{offer.likes_count || 0}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{offer.bids_count || 0}</span>
              </div>
            </div>
            <div className="text-primary font-bold text-xl">
              {formatOfferPrice(offer, userCurrency)}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleBookCall}>
              <Phone className="w-4 h-4 mr-2" />
              Book Call
            </Button>
            <Button variant="outline" className="flex-1" onClick={handleBid}>
              <DollarSign className="w-4 h-4 mr-2" />
              Place Bid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferDetailsModal;

