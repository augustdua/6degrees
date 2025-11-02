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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Questions You Can Ask</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Use Cases / Questions */}
          {offer.use_cases && Array.isArray(offer.use_cases) && offer.use_cases.length > 0 ? (
            <div className="space-y-3">
              <div className="space-y-2">
                {offer.use_cases.map((useCase, index) => (
                  <div
                    key={index}
                    className="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
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
            <div className="text-center py-8 text-muted-foreground">
              <Lightbulb className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No example questions available for this offer yet.</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OfferDetailsModal;

