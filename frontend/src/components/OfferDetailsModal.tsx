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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0">
        {/* Header Image Area */}
        <div className="relative w-full h-40 bg-muted/20 overflow-hidden shrink-0">
          {offer.target_logo_url ? (
            <img
              src={offer.target_logo_url}
              alt={offer.target_organization || 'Organization'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.objectFit = 'contain';
                target.style.padding = '1rem';
                target.parentElement!.style.backgroundColor = 'white';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/30 to-muted/10">
              <Building2 className="w-12 h-12 opacity-50" />
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{offer.title}</DialogTitle>
            <DialogDescription className="text-base mt-2">
              {offer.description}
            </DialogDescription>
          </DialogHeader>

          {/* Organization & Position */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-muted-foreground">Organization</p>
              <p className="font-semibold">{offer.target_organization || 'N/A'}</p>
            </div>
            <div className="flex-1 border-l pl-3">
              <p className="text-sm font-medium text-muted-foreground">Position</p>
              <p className="font-semibold">{offer.target_position || 'N/A'}</p>
            </div>
          </div>

          {/* Price & Stats */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-primary">
              {formatOfferPrice(offer, userCurrency)}
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                <span>{offer.bids_count || 0} Bids</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Lightbulb className="w-4 h-4" />
              Suggested Topics
            </h3>
            {/* Use Cases / Questions */}
            {offer.use_cases && Array.isArray(offer.use_cases) && offer.use_cases.length > 0 ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  {offer.use_cases.map((useCase, index) => (
                    <div
                      key={index}
                      className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
                    >
                      <div className="flex items-start gap-3">
                        <Badge variant="outline" className="mt-0.5 flex-shrink-0">
                          {index + 1}
                        </Badge>
                        <p className="text-sm flex-1 font-medium">{useCase}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground text-sm border rounded-lg border-dashed">
                No specific topics listed.
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button className="flex-1" onClick={handleBookCall}>
              <Phone className="w-4 h-4 mr-2" />
              Book Call
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferDetailsModal;

