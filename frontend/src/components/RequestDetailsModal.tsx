import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Users, DollarSign, Send, Target, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

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
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        {/* Header Image Area */}
        <div className="relative w-full h-40 bg-muted/20 overflow-hidden shrink-0">
          {request.targetOrganizationLogo ? (
            <img
              src={request.targetOrganizationLogo}
              alt={request.targetOrganization || 'Organization'}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
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

        <div className="p-6 space-y-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold leading-tight">
              Looking for: {request.target}
            </DialogTitle>
            {request.message && (
              <DialogDescription className="text-base mt-2">
                {request.message}
              </DialogDescription>
            )}
          </DialogHeader>

          {/* Creator Info */}
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Avatar className="h-10 w-10">
              <AvatarImage src={request.creator.avatar} />
              <AvatarFallback>{request.creator.firstName?.[0]}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Requested by</p>
              <p className="font-semibold text-sm">
                {request.creator.firstName} {request.creator.lastName}
              </p>
            </div>
          </div>

          {/* Reward & Stats */}
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
              ₹{request.reward.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="w-4 h-4" />
              <span>{request.participantCount} Referrers</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              variant="outline" 
              className="flex-1 border-indigo-500/30 hover:bg-indigo-500/10"
              onClick={() => {
                onRefer();
                onClose();
              }}
            >
              <Send className="w-4 h-4 mr-2" />
              Refer
            </Button>
            <Button 
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
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

