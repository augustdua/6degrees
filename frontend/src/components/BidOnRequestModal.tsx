import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { DollarSign, Send, Loader2 } from 'lucide-react';

interface BidOnRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: {
    id: string;
    target: string;
    targetOrganization?: string;
    targetOrganizationLogo?: string;
    reward: number;
    currency?: string;
    creator: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

export const BidOnRequestModal: React.FC<BidOnRequestModalProps> = ({
  isOpen,
  onClose,
  request
}) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Authentication Required',
        description: 'Please sign in to place a bid.',
        variant: 'destructive'
      });
      return;
    }

    if (!message.trim()) {
      toast({
        title: 'Message Required',
        description: 'Please enter your bid message.',
        variant: 'destructive'
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Insert bid into request_bids table
      const { error: bidError } = await supabase
        .from('request_bids')
        .insert({
          request_id: request.id,
          bidder_id: user.id,
          message: message.trim(),
          status: 'pending'
        });

      if (bidError) {
        console.error('Error creating bid:', bidError);
        throw new Error(bidError.message);
      }

      toast({
        title: 'Bid Submitted!',
        description: `Your bid has been sent to ${request.creator.firstName} for review.`
      });

      setMessage('');
      onClose();

    } catch (error: any) {
      console.error('Error submitting bid:', error);
      toast({
        title: 'Failed to Submit Bid',
        description: error.message || 'Please try again.',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            Place a Bid
          </DialogTitle>
          <DialogDescription>
            Submit your bid to help connect with this target. The request creator will review and approve.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Request Summary */}
          <div className="bg-gradient-to-br from-indigo-500/5 via-background to-blue-500/5 p-4 rounded-lg border border-indigo-500/10">
            <div className="flex items-start gap-4">
              {request.targetOrganizationLogo ? (
                <div className="flex-shrink-0 w-16 h-16 bg-white dark:bg-slate-900 rounded-lg shadow-sm flex items-center justify-center p-2">
                  <img
                    src={request.targetOrganizationLogo}
                    alt={request.targetOrganization || 'Organization'}
                    className="max-w-full max-h-full object-contain"
                  />
                </div>
              ) : null}
              <div className="flex-1 min-w-0">
                {request.targetOrganization && (
                  <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                    {request.targetOrganization}
                  </p>
                )}
                <p className="font-semibold text-base mb-2">{request.target}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Reward:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">
                    ₹{request.reward.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bid Message */}
          <div className="space-y-2">
            <Label htmlFor="bid-message">
              Your Bid Message <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="bid-message"
              placeholder="I can help connect you to [Target Name] through my network at [Company/Organization]. I have experience in..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="resize-none"
              disabled={isSubmitting}
            />
            <p className="text-xs text-muted-foreground">
              Explain how you can help make this connection. Be specific about your relationship or network.
            </p>
          </div>

          {/* Info Banner */}
          <div className="bg-white/5 border border-white/10 rounded-lg p-3">
            <p className="text-sm text-muted-foreground">
              💡 <span className="font-medium">Tip:</span> Include specific details about your connection or expertise to increase your chances of approval.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-white hover:bg-gray-100 text-black"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Bid
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
















