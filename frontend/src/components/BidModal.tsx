import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCurrency } from '@/contexts/CurrencyContext';
import { Currency, convertCurrency, getCurrencySymbol } from '@/lib/currency';
import { Gavel, TrendingDown, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BidModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (bidData: {
    bidAmountInr: number;
    bidAmountEur: number;
    bidCurrency: Currency;
    bidMessage?: string;
  }) => Promise<void>;
  offer: {
    id: string;
    title: string;
    asking_price_inr: number;
    asking_price_eur: number;
  };
  loading?: boolean;
}

const BidModal: React.FC<BidModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  offer,
  loading = false
}) => {
  const { userCurrency } = useCurrency();
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(userCurrency);
  const [bidAmount, setBidAmount] = useState('');
  const [bidMessage, setBidMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const amount = parseFloat(bidAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid bid amount');
      return;
    }

    // Convert to both currencies
    const bidAmountInr = selectedCurrency === 'INR' ? amount : convertCurrency(amount, 'EUR', 'INR');
    const bidAmountEur = selectedCurrency === 'EUR' ? amount : convertCurrency(amount, 'INR', 'EUR');

    // Check if bid is at least 50% of asking price
    const minBidInr = offer.asking_price_inr * 0.5;
    const minBidEur = offer.asking_price_eur * 0.5;

    if (bidAmountInr < minBidInr || bidAmountEur < minBidEur) {
      const minBid = selectedCurrency === 'INR' ? minBidInr : minBidEur;
      setError(`Minimum bid is ${getCurrencySymbol(selectedCurrency)}${Math.round(minBid).toLocaleString()} (50% of asking price)`);
      return;
    }

    try {
      await onSubmit({
        bidAmountInr: Math.round(bidAmountInr),
        bidAmountEur: Math.round(bidAmountEur * 100) / 100,
        bidCurrency: selectedCurrency,
        bidMessage: bidMessage.trim() || undefined
      });

      // Reset form
      setBidAmount('');
      setBidMessage('');
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to place bid');
    }
  };

  const handleClose = () => {
    setBidAmount('');
    setBidMessage('');
    setError(null);
    onClose();
  };

  const askingPrice = selectedCurrency === 'INR' ? offer.asking_price_inr : offer.asking_price_eur;
  const minBid = Math.round(askingPrice * 0.5);
  const currentBid = parseFloat(bidAmount) || 0;
  const discount = currentBid > 0 ? Math.round(((askingPrice - currentBid) / askingPrice) * 100) : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5 text-primary" />
            Place a Bid
          </DialogTitle>
          <DialogDescription>
            Make an offer for this intro call
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Offer Title */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm font-medium">{offer.title}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Listed at: {getCurrencySymbol(selectedCurrency)}{askingPrice.toLocaleString()}
            </p>
          </div>

          {/* Currency Selection */}
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={selectedCurrency} onValueChange={(value) => setSelectedCurrency(value as Currency)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR (₹)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="USD">USD ($)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Bid Amount */}
          <div className="space-y-2">
            <Label htmlFor="bidAmount">Your Bid Amount *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {getCurrencySymbol(selectedCurrency)}
              </span>
              <Input
                id="bidAmount"
                type="number"
                placeholder="0"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className="pl-8"
                min={minBid}
                step={selectedCurrency === 'INR' ? '100' : '10'}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum: {getCurrencySymbol(selectedCurrency)}{minBid.toLocaleString()} (50% of asking price)
            </p>
            {discount > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <TrendingDown className="h-4 w-4 text-green-600" />
                <span className="text-green-600 font-medium">{discount}% discount</span>
              </div>
            )}
          </div>

          {/* Bid Message */}
          <div className="space-y-2">
            <Label htmlFor="bidMessage">Message (Optional)</Label>
            <Textarea
              id="bidMessage"
              placeholder="Explain why you're interested or why this price works for you..."
              value={bidMessage}
              onChange={(e) => setBidMessage(e.target.value)}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {bidMessage.length}/500 characters
            </p>
          </div>

          {/* Info Alert */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-xs">
              Your bid will be sent to the offer creator via Messages. They can accept or decline it. If accepted, the intro call will be scheduled.
            </AlertDescription>
          </Alert>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Actions */}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !bidAmount}>
              {loading ? 'Placing Bid...' : 'Place Bid'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default BidModal;

