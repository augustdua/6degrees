import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, Phone, DollarSign, Building2, Briefcase, Users } from 'lucide-react';
import { useCurrency } from '@/contexts/CurrencyContext';
import { formatOfferPrice } from '@/lib/currency';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

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
  };
}

const OfferDetailsModal: React.FC<OfferDetailsModalProps> = ({
  isOpen,
  onClose,
  offer
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">{offer.title}</DialogTitle>
          <DialogDescription className="text-base mt-2">
            {offer.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* Target Info */}
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            <div className="flex-shrink-0">
              {offer.target_logo_url ? (
                <img
                  src={offer.target_logo_url}
                  alt={offer.target_organization || 'Organization'}
                  className="w-16 h-16 object-contain rounded-lg border border-border bg-background p-2"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-16 h-16 rounded-lg border border-border bg-background flex items-center justify-center">
                  <Building2 className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {offer.target_position && (
                <p className="font-semibold text-lg">{offer.target_position}</p>
              )}
              {offer.target_organization && (
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-4 w-4" />
                  {offer.target_organization}
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">
                {formatOfferPrice(offer, userCurrency)}
              </p>
            </div>
          </div>

          {/* Use Cases / Example Questions */}
          {offer.use_cases && Array.isArray(offer.use_cases) && offer.use_cases.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold text-lg">Example Questions You Can Ask</h3>
              </div>
              <div className="space-y-2">
                {offer.use_cases.map((useCase, index) => (
                  <div
                    key={index}
                    className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-start gap-2">
                      <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                        {index + 1}
                      </Badge>
                      <p className="text-sm flex-1">{useCase}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                These are AI-generated examples based on the target's profile. Use them as inspiration for your intro call.
              </p>
            </div>
          )}

          {/* Additional Organizations */}
          {offer.additional_org_logos && Array.isArray(offer.additional_org_logos) && offer.additional_org_logos.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <h3 className="font-semibold text-sm">Also Connects To</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {offer.additional_org_logos.map((org, index) => (
                  <div key={index} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg border border-border">
                    {org.logo_url && (
                      <img
                        src={org.logo_url}
                        alt={org.name}
                        className="w-8 h-8 object-contain rounded"
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

          {/* Stats */}
          <div className="flex items-center gap-4 pt-4 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{offer.bids_count || 0} bids</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Phone className="w-4 h-4" />
              <span>Intro call</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleBookCall}
              className="flex-1"
              size="lg"
            >
              <Phone className="h-4 w-4 mr-2" />
              Book a Call
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              size="lg"
              onClick={() => {
                if (!user) {
                  navigate('/auth');
                  return;
                }
                // Place bid - will be handled by parent component
                // For now, just show toast and close
                toast({
                  title: 'Place Bid',
                  description: 'Use the Place Bid button on the offer card to submit your bid.'
                });
                onClose();
              }}
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Place Bid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferDetailsModal;

