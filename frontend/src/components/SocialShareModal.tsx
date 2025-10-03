import React, { useState } from 'react';
import { X, Copy, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface SocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareableLink: string;
  targetName: string;
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  isOpen,
  onClose,
  shareableLink,
  targetName
}) => {
  const [customMessage, setCustomMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  if (!isOpen) return null;

  const copyLink = () => {
    const shareText = customMessage
      ? `${customMessage}\n\n${shareableLink}`
      : shareableLink;

    navigator.clipboard.writeText(shareText);
    toast({
      title: "Link Copied!",
      description: customMessage
        ? "Your personalized message and link have been copied."
        : "Share this link to continue building the connection chain.",
    });
  };

  const shareToSocialMedia = (platform: string) => {
    const defaultMessage = `Help me connect with ${targetName}! Join this networking chain and earn rewards when we succeed.`;
    const shareText = customMessage || defaultMessage;
    const fullText = `${shareText} ${shareableLink}`;

    let url = "";
    switch (platform) {
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareableLink)}&text=${encodeURIComponent(shareText)}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
        break;
      default:
        copyLink();
        return;
    }

    window.open(url, '_blank', 'width=600,height=400');
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Share Your Link</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-600 hover:text-gray-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              <h3 className="text-lg font-semibold">Personalize Your Share</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Add a personal message to increase engagement when sharing with your network.
            </p>

            <div className="space-y-3">
              <Label htmlFor="custom-message">Your message (optional)</Label>
              <Textarea
                id="custom-message"
                placeholder="e.g., 'I know someone who might be perfect for this opportunity!' or 'This could be great for your network!'"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="min-h-[100px] resize-none"
                maxLength={280}
              />
              <div className="flex justify-between items-center text-xs text-gray-600">
                <span>Personal messages get 3x more engagement</span>
                <span>{customMessage.length}/280</span>
              </div>
            </div>
          </div>

          {/* Preview Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Preview</Label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? "Hide" : "Show"} Preview
              </Button>
            </div>

            {showPreview && (
              <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300">
                {customMessage && (
                  <p className="text-sm mb-3 text-gray-900">{customMessage}</p>
                )}
                <div className="bg-white p-3 rounded border">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-xs">6°</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">6Degree Connection Chain</p>
                      <p className="text-xs text-gray-600">Help connect with {targetName}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 break-all">{shareableLink}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sharing Options */}
          <div className="space-y-4">
            <Label>Share Your Link</Label>
            <div className="grid grid-cols-2 gap-3">
              <Button onClick={copyLink} variant="default" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button onClick={() => shareToSocialMedia('linkedin')} variant="outline" className="w-full">
                LinkedIn
              </Button>
              <Button onClick={() => shareToSocialMedia('twitter')} variant="outline" className="w-full">
                Twitter
              </Button>
              <Button onClick={() => shareToSocialMedia('whatsapp')} variant="outline" className="w-full">
                WhatsApp
              </Button>
            </div>
          </div>

          <div className="text-center text-sm text-gray-600 space-y-1">
            <p>✓ Share your link to find more connections</p>
            <p>✓ Earn rewards when the chain completes</p>
            <p>✓ Track progress in your dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
};
