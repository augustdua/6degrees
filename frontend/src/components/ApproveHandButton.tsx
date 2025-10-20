import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Hand, Check, X } from 'lucide-react';
import { useDailyCall } from './DailyCallProvider';

export function ApproveHandButton() {
  const { handRaised, handRaiseMessage, sendAppMessage } = useDailyCall();
  const [timeLeft, setTimeLeft] = useState(15);
  const [dismissed, setDismissed] = useState(false);

  // Auto-dismiss timer
  useEffect(() => {
    if (!handRaised || dismissed) {
      setTimeLeft(15);
      setDismissed(false);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleDismiss();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [handRaised, dismissed]);

  const handleApprove = () => {
    console.log('✅ User approved hand');
    sendAppMessage({ type: 'approve_hand' });
    setDismissed(true);
  };

  const handleDismiss = () => {
    console.log('❌ User dismissed hand');
    sendAppMessage({ type: 'cancel_bot_speech' });
    setDismissed(true);
  };

  if (!handRaised || dismissed) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <Card className="w-full max-w-md p-6 space-y-4 animate-in zoom-in duration-300">
        {/* Icon and title */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-full bg-orange-100">
            <Hand className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold">AI Co-Pilot wants to speak</h3>
            <p className="text-sm text-muted-foreground">Auto-dismiss in {timeLeft}s</p>
          </div>
        </div>

        {/* Message */}
        <p className="text-sm text-muted-foreground bg-gray-50 p-3 rounded-lg">
          {handRaiseMessage}
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleApprove}
            className="flex-1 bg-primary hover:bg-primary/90"
            size="lg"
          >
            <Check className="w-4 h-4 mr-2" />
            Let it speak
          </Button>
          <Button
            onClick={handleDismiss}
            variant="outline"
            size="lg"
          >
            <X className="w-4 h-4 mr-2" />
            Dismiss
          </Button>
        </div>
      </Card>
    </div>
  );
}

