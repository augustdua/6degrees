import React, { useState } from 'react';
import { X, Copy, MessageSquare, Image as ImageIcon, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAnalytics } from '@/hooks/useAnalytics';

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
  const { trackShare } = useAnalytics();

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

    // Track share as copy_link
    trackShare(
      '',
      'connection',
      'copy_link',
      shareableLink,
      { target: targetName }
    );
  };

  const shareToSocialMedia = async (platform: string) => {
    const defaultMessage = `Help me connect with ${targetName}! Join this networking chain and earn rewards when we succeed.`;
    const shareText = customMessage || defaultMessage;
    const fullText = `${shareText}\n\n${shareableLink}`;

    try {
      const linkId = shareableLink.split('/r/').pop() || 'default';
      const backendUrl = import.meta.env.PROD
        ? (import.meta.env.VITE_BACKEND_URL || 'https://6degreesbackend-production.up.railway.app')
        : '';
      const targetEncoded = encodeURIComponent(targetName);
      const imageUrl = `${backendUrl}/api/og-image/r/${linkId}?target=${targetEncoded}`;

      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const file = new File([blob], `6degree-${targetName.replace(/\s+/g, '-')}.png`, { type: 'image/png' });

      // Try Web Share API first (works on mobile)
      if (navigator.share && navigator.canShare) {
        const shareData: any = {
          title: `Connect with ${targetName}`,
          text: fullText,
          files: [file]
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          trackShare('', 'connection', platform, shareableLink, { target: targetName });
          toast({
            title: "Shared!",
            description: "Image shared successfully."
          });
          return;
        }
      }

      // Fallback: Download image + open platform URL
      await downloadImage(blob, targetName);

      const encodedText = encodeURIComponent(shareText);
      const encodedUrl = encodeURIComponent(shareableLink);
      let shareUrl = '';

      switch (platform) {
        case 'whatsapp':
          shareUrl = `https://wa.me/?text=${encodeURIComponent(fullText)}`;
          break;
        case 'linkedin':
          shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
          break;
        case 'twitter':
          shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
          break;
        case 'facebook':
          shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
          break;
        default:
          return;
      }

      window.open(shareUrl, '_blank', 'noopener,noreferrer');
      trackShare('', 'connection', platform, shareableLink, { target: targetName });

      toast({
        title: "Image Downloaded!",
        description: `Now attach the downloaded image to your ${platform} post.`,
      });
    } catch (error: any) {
      console.error('Error sharing:', error);
      if (error.name !== 'AbortError') {
        toast({
          title: "Couldn't Share",
          description: "Please try the download button.",
          variant: "destructive"
        });
      }
    }
  };

  const shareImageDirectly = async () => {
    try {
      const linkId = shareableLink.split('/r/').pop() || 'default';
      const backendUrl = import.meta.env.PROD
        ? (import.meta.env.VITE_BACKEND_URL || 'https://6degreesbackend-production.up.railway.app')
        : '';
      const targetEncoded = encodeURIComponent(targetName);
      const imageUrl = `${backendUrl}/api/og-image/r/${linkId}?target=${targetEncoded}`;

      // Fetch the image as blob
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      const defaultMessage = `Help me connect with ${targetName}! Join this networking chain and earn rewards when we succeed.`;
      const shareText = customMessage || defaultMessage;
      const fullText = `${shareText}\n\n${shareableLink}`;

      // Check if Web Share API is available (mobile devices)
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], `6degree-connect-${targetName.replace(/\s+/g, '-')}.png`, { type: 'image/png' });

        const shareData: any = {
          title: `Connect with ${targetName} - 6Degree`,
          text: fullText,
          files: [file]
        };

        if (navigator.canShare(shareData)) {
          await navigator.share(shareData);
          toast({
            title: "Shared!",
            description: "Image and link shared successfully."
          });
          trackShare('', 'connection', 'native_share', shareableLink, { target: targetName });
          return;
        }
      }

      // Fallback: Download the image with instructions
      downloadImage(blob, targetName);
      toast({
        title: "Image Downloaded!",
        description: "Now open WhatsApp/Instagram and attach the downloaded image.",
      });
    } catch (error: any) {
      console.error('Error sharing image:', error);
      if (error.name !== 'AbortError') { // User cancelled
        toast({
          title: "Couldn't Share",
          description: "Try the download button to share manually.",
          variant: "destructive"
        });
      }
    }
  };

  const downloadImage = async (blob?: Blob, name?: string) => {
    try {
      let imageBlob = blob;

      if (!imageBlob) {
        const linkId = shareableLink.split('/r/').pop() || 'default';
        const backendUrl = import.meta.env.PROD
          ? (import.meta.env.VITE_BACKEND_URL || 'https://6degreesbackend-production.up.railway.app')
          : '';
        const targetEncoded = encodeURIComponent(targetName);
        const imageUrl = `${backendUrl}/api/og-image/r/${linkId}?target=${targetEncoded}`;

        const response = await fetch(imageUrl);
        imageBlob = await response.blob();
      }

      const url = window.URL.createObjectURL(imageBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `6degree-connect-${(name || targetName).replace(/\s+/g, '-')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Image Downloaded!",
        description: "Now you can share it anywhere - Instagram, WhatsApp status, etc!"
      });

      trackShare('', 'connection', 'download_image', shareableLink, { target: targetName });
    } catch (error) {
      console.error('Error downloading image:', error);
      toast({
        title: "Download Failed",
        description: "Please try again.",
        variant: "destructive"
      });
    }
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

          {/* Share with Image - All buttons share image */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <ImageIcon className="w-5 h-5 text-indigo-600" />
              <Label className="text-base">Share Image + Link Together</Label>
            </div>
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 mb-3">
              <p className="text-xs text-indigo-900 font-medium">
                ✨ All buttons now share the branded image with your message!
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={copyLink} variant="default" className="w-full">
                <Copy className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
              <Button
                onClick={() => shareToSocialMedia('whatsapp')}
                variant="outline"
                className="w-full bg-[#25D366] hover:bg-[#20BA5A] text-white hover:text-white border-0"
              >
                WhatsApp
              </Button>
              <Button
                onClick={() => shareToSocialMedia('linkedin')}
                variant="outline"
                className="w-full bg-[#0077B5] hover:bg-[#006399] text-white hover:text-white border-0"
              >
                LinkedIn
              </Button>
              <Button
                onClick={() => shareToSocialMedia('twitter')}
                variant="outline"
                className="w-full bg-[#1DA1F2] hover:bg-[#1A8CD8] text-white hover:text-white border-0"
              >
                Twitter
              </Button>
              <Button
                onClick={() => shareToSocialMedia('facebook')}
                variant="outline"
                className="w-full bg-[#1877F2] hover:bg-[#166FE5] text-white hover:text-white border-0"
              >
                Facebook
              </Button>
              <Button
                onClick={shareImageDirectly}
                variant="outline"
                className="w-full border-2 border-indigo-400 text-indigo-700 hover:bg-indigo-50"
              >
                <Share2 className="w-4 h-4 mr-2" />
                More Options
              </Button>
            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-gray-600 mb-2">Or download to share manually:</p>
              <Button
                onClick={() => downloadImage()}
                variant="outline"
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Image
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
