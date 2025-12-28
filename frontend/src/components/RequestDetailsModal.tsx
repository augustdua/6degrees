import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, Send, Target } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { getLogoDevUrl } from '@/utils/logoDev';

interface RequestDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    target: string;
    message?: string;
    targetOrganization?: string;
    targetOrganizationLogo?: string;
    reward: number;
    currency?: string;
    participantCount: number;
    creator: {
      id: string;
      firstName: string;
      lastName: string;
      avatar?: string;
      bio?: string;
    };
  };
  onRefer: () => void;
  onBid: () => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  isOpen,
  onClose,
  request,
  onRefer,
  onBid
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-[calc(100vw-2rem)] sm:max-w-lg p-0 gap-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header Image Area */}
        <div className="relative w-full h-48 bg-muted/20 overflow-hidden shrink-0">
          {request.targetOrganizationLogo ? (
            <img
              src={getLogoDevUrl(request.targetOrganizationLogo)}
              alt={request.targetOrganization || 'Organization'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = request.targetOrganizationLogo || '';
                target.style.objectFit = 'contain';
                target.style.padding = '1rem';
                target.parentElement!.style.backgroundColor = 'white';
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-500/10 via-background to-blue-500/10">
              <Target className="w-16 h-16 text-indigo-500/40" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-4">
          {/* Looking for section */}
          <div>
            <p className="font-semibold text-sm mb-1 text-muted-foreground">Looking for:</p>
            <p className="text-base leading-relaxed font-medium">{request.target}</p>
          </div>

          {/* Message/Description */}
          {request.message && (
            <p className="text-sm text-muted-foreground leading-relaxed">
              {request.message}
            </p>
          )}

          {/* Price & Stats */}
          <div className="flex items-center justify-between pt-3 border-t">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{request.participantCount || 0} Referrers</span>
            </div>
            <div className="text-indigo-600 dark:text-indigo-400 font-bold text-xl">
              ₹{request.reward.toLocaleString()}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 border-white/20 hover:bg-white/5 hover:border-white/30 text-white"
              onClick={() => {
                onRefer();
                onClose();
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Refer
            </Button>
            <Button 
              className="flex-1 bg-white hover:bg-[#CBAA5A] text-black hover:text-black transition-all duration-300"
              onClick={() => {
                onBid();
                onClose();
              }}
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Bid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

