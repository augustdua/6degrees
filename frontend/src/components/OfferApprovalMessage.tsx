import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { apiPost } from '@/lib/api';

interface OfferApprovalMessageProps {
  message: {
    message_id: string;
    content: string;
    metadata?: {
      offer_id: string;
      offer_title?: string;
      action_required?: boolean;
    };
    is_own_message: boolean;
    sent_at: string;
  };
  onStatusChange?: () => void;
}

export const OfferApprovalMessage: React.FC<OfferApprovalMessageProps> = ({
  message,
  onStatusChange,
}) => {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [error, setError] = useState<string | null>(null);

  const handleApprove = async () => {
    if (!message.metadata?.offer_id) return;
    
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/offers/${message.metadata.offer_id}/approve`, {});
      setStatus('approved');
      onStatusChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to approve offer');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!message.metadata?.offer_id) return;
    
    setLoading(true);
    setError(null);
    try {
      await apiPost(`/api/offers/${message.metadata.offer_id}/reject`, {});
      setStatus('rejected');
      onStatusChange?.();
    } catch (err: any) {
      setError(err.message || 'Failed to reject offer');
    } finally {
      setLoading(false);
    }
  };

  // Extract offer title from content
  const offerTitle = message.metadata?.offer_title || 
    message.content.match(/Offer: "([^"]+)"/)?.[1] || 
    'Unknown Offer';

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            🤝
          </div>
          
          <div className="flex-1 space-y-3">
            <div>
              <h4 className="font-semibold text-sm mb-1">Offer Introduction Request</h4>
              <p className="text-sm text-muted-foreground">
                📋 <span className="font-medium">{offerTitle}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                They would like to offer connections to you for networking opportunities.
              </p>
            </div>

            {message.is_own_message ? (
              // Sender view: Show status
              <div className="flex items-center gap-2">
                {status === 'pending' && (
                  <div className="flex items-center gap-1.5 text-xs text-yellow-600 dark:text-yellow-400">
                    <Clock className="h-3.5 w-3.5" />
                    <span>Awaiting response...</span>
                  </div>
                )}
                {status === 'approved' && (
                  <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Approved!</span>
                  </div>
                )}
                {status === 'rejected' && (
                  <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400">
                    <X className="h-3.5 w-3.5" />
                    <span>Declined</span>
                  </div>
                )}
              </div>
            ) : (
              // Receiver view: Show action buttons
              status === 'pending' ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleApprove}
                      disabled={loading}
                      className="flex-1 bg-green-600 hover:bg-green-700"
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={handleReject}
                      disabled={loading}
                      className="flex-1"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Decline
                    </Button>
                  </div>
                  {error && (
                    <div className="flex items-center gap-1 text-xs text-destructive">
                      <AlertCircle className="h-3 w-3" />
                      {error}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {status === 'approved' && '✅ You approved this offer'}
                  {status === 'rejected' && '❌ You declined this offer'}
                </div>
              )
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

