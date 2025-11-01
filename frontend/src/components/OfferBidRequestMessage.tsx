import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Check, X, MessageSquare, Clock } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface OfferBidRequestMessageProps {
  message: {
    message_id: string;
    sender_id: string;
    receiver_id: string;
    metadata: {
      bid_id: string;
      offer_id: string;
      offer_title: string;
      bid_amount_inr: number;
      bid_amount_eur: number;
      bid_currency: string;
      bid_message?: string;
    };
  };
  onStatusChange?: () => void;
}

const OfferBidRequestMessage: React.FC<OfferBidRequestMessageProps> = ({
  message,
  onStatusChange
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [response, setResponse] = useState('');
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const { toast } = useToast();

  const { metadata } = message;
  const currencySymbol = metadata.bid_currency === 'INR' ? '₹' : metadata.bid_currency === 'EUR' ? '€' : '$';
  const bidAmount = metadata.bid_currency === 'INR' ? metadata.bid_amount_inr : metadata.bid_amount_eur;
  
  // Check if current user is the bidder (sender) or creator (receiver)
  const isBidder = user?.id === message.sender_id;
  const isCreator = user?.id === message.receiver_id;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await apiPost(`/api/offers/bids/${metadata.bid_id}/approve`, {
        response: response.trim() || undefined
      });
      
      setStatus('approved');
      toast({
        title: 'Bid Approved!',
        description: 'The intro call has been created. Check your Intros tab.'
      });
      
      if (onStatusChange) onStatusChange();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to approve bid'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await apiPost(`/api/offers/bids/${metadata.bid_id}/reject`, {
        response: response.trim() || undefined
      });
      
      setStatus('rejected');
      toast({
        title: 'Bid Rejected',
        description: 'The bidder has been notified.'
      });
      
      if (onStatusChange) onStatusChange();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to reject bid'
      });
    } finally {
      setLoading(false);
    }
  };

  if (status === 'approved') {
    return (
      <Card className="p-4 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
          <Check className="h-5 w-5" />
          <span className="font-medium">Bid Approved</span>
        </div>
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">
          Intro call has been created
        </p>
      </Card>
    );
  }

  if (status === 'rejected') {
    return (
      <Card className="p-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <X className="h-5 w-5" />
          <span className="font-medium">Bid Rejected</span>
        </div>
      </Card>
    );
  }

  // If user is the bidder, show waiting state
  if (isBidder && status === 'pending') {
    return (
      <Card className="p-4 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
            <h4 className="font-semibold text-yellow-900 dark:text-yellow-100">Bid Pending Approval</h4>
          </div>
          
          <div className="bg-white dark:bg-gray-900 rounded-lg p-3 space-y-2">
            <div className="text-sm">
              <span className="text-gray-600 dark:text-gray-400">Offer:</span>{' '}
              <span className="font-medium">{metadata.offer_title}</span>
            </div>
            <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
              {currencySymbol}{bidAmount.toLocaleString()}
            </div>
            {metadata.bid_message && (
              <div className="text-sm pt-2 border-t">
                <span className="text-gray-600 dark:text-gray-400">Your message:</span>
                <p className="mt-1 italic text-gray-700 dark:text-gray-300">"{metadata.bid_message}"</p>
              </div>
            )}
          </div>
          
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Waiting for the creator to review your bid...
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h4 className="font-semibold text-blue-900 dark:text-blue-100">
                {isCreator ? 'New Bid on Your Offer' : 'Bid Request'}
              </h4>
            </div>
            <Badge variant="secondary" className="mt-1">Pending Approval</Badge>
          </div>
        </div>

        {/* Offer Details */}
        <div className="bg-white dark:bg-gray-900 rounded-lg p-3 space-y-2">
          <div className="text-sm">
            <span className="text-gray-600 dark:text-gray-400">Offer:</span>{' '}
            <span className="font-medium">{metadata.offer_title}</span>
          </div>
          <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
            {currencySymbol}{bidAmount.toLocaleString()}
          </div>
          {metadata.bid_message && (
            <div className="text-sm pt-2 border-t">
              <span className="text-gray-600 dark:text-gray-400">Message:</span>
              <p className="mt-1 italic text-gray-700 dark:text-gray-300">"{metadata.bid_message}"</p>
            </div>
          )}
        </div>

        {/* Response Form */}
        {showResponse && (
          <div className="space-y-2">
            <Label className="text-sm">Your Response (Optional)</Label>
            <Textarea
              placeholder="Add a message to the bidder..."
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={2}
              maxLength={300}
            />
          </div>
        )}

        {/* Action Buttons - Only show for creator */}
        {isCreator && (
          <div className="flex gap-2 pt-2">
            <Button
              className="flex-1"
              onClick={() => {
                if (showResponse) {
                  handleApprove();
                } else {
                  setShowResponse(true);
                }
              }}
              disabled={loading}
            >
              <Check className="h-4 w-4 mr-2" />
              {showResponse ? (loading ? 'Approving...' : 'Confirm Approval') : 'Approve Bid'}
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => {
                if (showResponse) {
                  handleReject();
                } else {
                  setShowResponse(true);
                }
              }}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              {showResponse ? (loading ? 'Rejecting...' : 'Confirm Rejection') : 'Reject Bid'}
            </Button>
          </div>
        )}

        {showResponse && isCreator && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => {
              setShowResponse(false);
              setResponse('');
            }}
          >
            Cancel
          </Button>
        )}
      </div>
    </Card>
  );
};

export default OfferBidRequestMessage;

