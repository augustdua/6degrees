import { useDailyCall } from './DailyCallProvider';
import { Button } from './ui/button';
import { Check, X, Hand } from 'lucide-react';

export function ApproveHandButton() {
  const { botState, handRaisedMessage, sendAppMessage } = useDailyCall();

  // Only show when bot has raised hand
  if (botState !== 'raised_hand' || !handRaisedMessage) {
    return null;
  }

  const handleApprove = () => {
    console.log('✅ User approved bot to speak');
    sendAppMessage({ type: 'approve_hand' });
  };

  const handleReject = () => {
    console.log('❌ User rejected bot speech');
    sendAppMessage({ type: 'cancel_bot_speech' });
  };

  return (
    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-orange-100 rounded-full">
            <Hand className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">AI Co-Pilot Wants to Speak</h3>
            <p className="text-sm text-gray-500">6Degrees Consultation Assistant</p>
          </div>
        </div>

        {/* Message Preview */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-900 font-medium mb-1">Preview:</p>
          <p className="text-sm text-gray-700 line-clamp-3">{handRaisedMessage}</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleReject}
            variant="outline"
            className="flex-1 flex items-center justify-center gap-2 h-12 border-gray-300 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
            <span className="font-semibold">Not Now</span>
          </Button>
          <Button
            onClick={handleApprove}
            className="flex-1 flex items-center justify-center gap-2 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg"
          >
            <Check className="w-5 h-5" />
            <span className="font-semibold">Let AI Speak</span>
          </Button>
        </div>

        {/* Branding Footer */}
        <div className="mt-4 text-center">
          <p className="text-xs text-gray-400">Powered by 6Degrees AI Co-Pilot</p>
        </div>
      </div>
    </div>
  );
}
