import React, { useState, useEffect } from 'react';
import { useOffers, OfferBid } from '@/hooks/useOffers';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, DollarSign, User, Clock, Calendar } from 'lucide-react';
import { convertAndFormatINR } from '@/lib/currency';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface OfferBidsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  offerId: string;
  offerTitle: string;
  onBidAccepted?: () => void;
}

const OfferBidsPanel: React.FC<OfferBidsPanelProps> = ({
  isOpen,
  onClose,
  offerId,
  offerTitle,
  onBidAccepted
}) => {
  const { getOfferBids, acceptOfferBid, loading } = useOffers();
  const [bids, setBids] = useState<OfferBid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const [acceptingBidId, setAcceptingBidId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBids();
    }
  }, [isOpen, offerId]);

  const loadBids = async () => {
    setLoadingBids(true);
    setError(null);
    try {
      const data = await getOfferBids(offerId);
      setBids(data || []);
    } catch (err) {
      console.error('Error loading bids:', err);
      setError('Failed to load bids');
    } finally {
      setLoadingBids(false);
    }
  };

  const handleAcceptBid = async (bidId: string) => {
    setAcceptingBidId(bidId);
    setError(null);
    try {
      await acceptOfferBid(offerId, bidId);
      
      // Refresh bids to show updated status
      await loadBids();
      
      // Notify parent
      if (onBidAccepted) {
        onBidAccepted();
      }

      // Show success message
      alert('Bid accepted! You can now schedule a consultation.');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept bid';
      setError(errorMessage);
    } finally {
      setAcceptingBidId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { 
      label: string; 
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: React.ReactNode;
    }> = {
      pending: { 
        label: 'Pending', 
        variant: 'outline',
        icon: <Clock className="w-3 h-3" />
      },
      accepted: { 
        label: 'Accepted', 
        variant: 'default',
        icon: <CheckCircle className="w-3 h-3" />
      },
      rejected: { 
        label: 'Rejected', 
        variant: 'destructive',
        icon: <XCircle className="w-3 h-3" />
      },
    };

    const config = statusConfig[status] || { 
      label: status, 
      variant: 'outline',
      icon: null
    };
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const pendingBids = bids.filter(b => b.status === 'pending');
  const acceptedBids = bids.filter(b => b.status === 'accepted');
  const otherBids = bids.filter(b => b.status !== 'pending' && b.status !== 'accepted');

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Bids on Your Offer</SheetTitle>
          <SheetDescription className="line-clamp-2">
            {offerTitle}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {loadingBids ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading bids...</p>
            </div>
          ) : bids.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                <User className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No bids yet</h3>
              <p className="text-muted-foreground">
                When users bid on your offer, they'll appear here
              </p>
            </div>
          ) : (
            <>
              {/* Pending Bids Section */}
              {pendingBids.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Pending Bids
                    </h3>
                    <Badge variant="outline">{pendingBids.length}</Badge>
                  </div>
                  
                  {pendingBids.map((bid) => (
                    <Card key={bid.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="space-y-4">
                          {/* Buyer Info */}
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={bid.buyer?.avatar_url} />
                                <AvatarFallback>
                                  {bid.buyer?.first_name?.[0]}
                                  {bid.buyer?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">
                                  {bid.buyer?.first_name} {bid.buyer?.last_name}
                                </p>
                                {bid.buyer?.company && (
                                  <p className="text-sm text-muted-foreground">
                                    {bid.buyer?.role} at {bid.buyer?.company}
                                  </p>
                                )}
                                {bid.buyer?.bio && (
                                  <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                    {bid.buyer?.bio}
                                  </p>
                                )}
                              </div>
                            </div>
                            {getStatusBadge(bid.status)}
                          </div>

                          {/* Bid Amount */}
                          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                            <DollarSign className="w-5 h-5 text-primary" />
                            <div>
                              <p className="text-sm text-muted-foreground">Bid Amount</p>
                              <p className="text-lg font-bold text-primary">
                                ₹{bid.bid_amount_inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>

                          {/* Timestamp */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>Submitted {format(new Date(bid.created_at), 'MMM dd, yyyy h:mm a')}</span>
                          </div>

                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              className="flex-1"
                              onClick={() => handleAcceptBid(bid.id)}
                              disabled={acceptingBidId !== null}
                            >
                              {acceptingBidId === bid.id ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                  Accepting...
                                </>
                              ) : (
                                <>
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Accept Bid
                                </>
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              className="flex-1"
                              disabled={acceptingBidId !== null}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Accepted Bids Section */}
              {acceptedBids.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                      Accepted Bids
                    </h3>
                    <Badge variant="default">{acceptedBids.length}</Badge>
                  </div>
                  
                  {acceptedBids.map((bid) => (
                    <Card key={bid.id} className="border-l-4 border-l-green-500">
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={bid.buyer?.avatar_url} />
                                <AvatarFallback>
                                  {bid.buyer?.first_name?.[0]}
                                  {bid.buyer?.last_name?.[0]}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-semibold">
                                  {bid.buyer?.first_name} {bid.buyer?.last_name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  ₹{bid.bid_amount_inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </p>
                              </div>
                            </div>
                            {getStatusBadge(bid.status)}
                          </div>

                          {bid.accepted_at && (
                            <div className="text-xs text-muted-foreground">
                              Accepted {format(new Date(bid.accepted_at), 'MMM dd, yyyy h:mm a')}
                            </div>
                          )}

                          {/* Next Step: Schedule Consultation */}
                          <Button className="w-full" variant="outline">
                            <Calendar className="w-4 h-4 mr-2" />
                            Schedule Consultation
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Other Bids (Rejected, etc.) */}
              {otherBids.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Other Bids
                  </h3>
                  
                  {otherBids.map((bid) => (
                    <Card key={bid.id} className="opacity-60">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={bid.buyer?.avatar_url} />
                              <AvatarFallback>
                                {bid.buyer?.first_name?.[0]}
                                {bid.buyer?.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">
                                {bid.buyer?.first_name} {bid.buyer?.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                ₹{bid.bid_amount_inr.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </p>
                            </div>
                          </div>
                          {getStatusBadge(bid.status)}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default OfferBidsPanel;

