import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMafias, type Mafia } from '@/hooks/useMafias';
import { useWallet } from '@/hooks/useWallet';
import { Loader2, Wallet, Users, Crown, AlertTriangle, DollarSign } from 'lucide-react';

interface JoinMafiaModalProps {
  isOpen: boolean;
  onClose: () => void;
  mafia: Mafia | null;
  onSuccess?: () => void;
}

export const JoinMafiaModal: React.FC<JoinMafiaModalProps> = ({
  isOpen,
  onClose,
  mafia,
  onSuccess,
}) => {
  const { toast } = useToast();
  const { joinAsPaidMember } = useMafias();
  const { wallet, fetchWallet } = useWallet();

  const [loading, setLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setWalletLoading(true);
      fetchWallet().finally(() => setWalletLoading(false));
    }
  }, [isOpen, fetchWallet]);

  if (!mafia) return null;

  const hasEnoughBalance = wallet && wallet.balance >= mafia.monthly_price;

  const handleJoin = async () => {
    if (!hasEnoughBalance) {
      toast({
        title: 'Insufficient Balance',
        description: 'Please add funds to your wallet to join this mafia',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      await joinAsPaidMember(mafia.id);

      toast({
        title: 'Welcome to the Mafia! 🎉',
        description: `You've successfully joined ${mafia.name}`,
      });

      onClose();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        title: 'Failed to Join',
        description: error.message || 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-primary" />
            Join {mafia.name}
          </DialogTitle>
          <DialogDescription>
            Subscribe to this exclusive professional community
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Cover Image */}
          {mafia.cover_image_url ? (
            <div className="w-full h-32 rounded-lg overflow-hidden">
              <img
                src={mafia.cover_image_url}
                alt={mafia.name}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-full h-32 rounded-lg bg-gradient-to-br from-primary/10 to-accent/5 flex items-center justify-center">
              <Crown className="w-12 h-12 text-primary/30" />
            </div>
          )}

          {/* Description */}
          <div>
            <h4 className="font-semibold mb-2">About</h4>
            <p className="text-sm text-muted-foreground">{mafia.description}</p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 py-3 border-y">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">
                {mafia.member_count || 0} member{(mafia.member_count || 0) !== 1 ? 's' : ''}
              </span>
            </div>
            {mafia.founding_member_count !== undefined && (
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-primary" />
                <span className="text-sm">
                  {mafia.founding_member_count} founding member
                  {mafia.founding_member_count !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>

          {/* Pricing */}
          <div className="bg-primary/5 rounded-lg p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Monthly Subscription</span>
              <span className="text-2xl font-bold text-primary">
                ${mafia.monthly_price.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Auto-renews monthly. Founding members earn revenue share from all subscriptions.
            </p>
          </div>

          {/* Wallet Balance */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Your Wallet Balance
              </span>
              {walletLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <span className="text-lg font-semibold">
                  ${wallet?.balance.toFixed(2) || '0.00'}
                </span>
              )}
            </div>

            {!walletLoading && !hasEnoughBalance && (
              <div className="flex items-start gap-2 bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 p-3 rounded-lg">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p className="text-xs">
                  You need ${(mafia.monthly_price - (wallet?.balance || 0)).toFixed(2)} more to join
                  this mafia. Please add funds to your wallet.
                </p>
              </div>
            )}
          </div>

          {/* Next Payment Info */}
          <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
            <strong>What happens next:</strong>
            <ul className="mt-1 space-y-1 list-disc list-inside">
              <li>${mafia.monthly_price} will be deducted from your wallet now</li>
              <li>Your subscription auto-renews on the same day each month</li>
              <li>You can cancel anytime from your dashboard</li>
              <li>You'll get access to the exclusive group chat immediately</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleJoin}
            disabled={loading || walletLoading || !hasEnoughBalance}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Joining...
              </>
            ) : (
              <>
                <DollarSign className="w-4 h-4 mr-2" />
                Join for ${mafia.monthly_price}/mo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


