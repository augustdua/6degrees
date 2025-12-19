import { Clock, Shield, CheckCircle } from 'lucide-react';

interface WaitlistOverlayProps {
  /** Feature name being blocked (for messaging) */
  feature?: string;
  /** Custom title */
  title?: string;
  /** Custom description */
  description?: string;
  /** Whether to show as a full-page overlay or inline */
  fullPage?: boolean;
}

/**
 * Overlay shown when a waitlisted user tries to access member-only features.
 */
export function WaitlistOverlay({
  feature,
  title,
  description,
  fullPage = false,
}: WaitlistOverlayProps) {
  const defaultTitle = 'Membership Under Review';
  const defaultDescription = feature
    ? `Access to ${feature} is available for approved members only. Your application is being reviewed.`
    : 'This feature is available for approved members only. Your application is being reviewed.';

  const content = (
    <div className="text-center px-6 py-12 max-w-md mx-auto">
      {/* Icon */}
      <div className="mb-6 flex justify-center">
        <div className="w-20 h-20 rounded-full bg-[#CBAA5A]/10 flex items-center justify-center">
          <Clock className="w-10 h-10 text-[#CBAA5A]" />
        </div>
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-white mb-3 font-gilroy">
        {title || defaultTitle}
      </h2>

      {/* Description */}
      <p className="text-[#909090] text-base mb-8 leading-relaxed">
        {description || defaultDescription}
      </p>

      {/* Status indicators */}
      <div className="space-y-3 text-left bg-[#111] border border-[#222] rounded-lg p-4 mb-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-[#b0b0b0] text-sm">Profile created</span>
        </div>
        <div className="flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
          <span className="text-[#b0b0b0] text-sm">Browse offers</span>
        </div>
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-[#CBAA5A] flex-shrink-0" />
          <span className="text-[#b0b0b0] text-sm">Full access pending review</span>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#CBAA5A] flex-shrink-0 mt-0.5" />
          <p className="text-sm text-[#808080] text-left">
            We review each application to ensure quality connections. 
            You'll receive an email once your membership is approved.
          </p>
        </div>
      </div>
    </div>
  );

  if (fullPage) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        {content}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      {content}
    </div>
  );
}

/**
 * Inline banner for waitlisted users (less intrusive than overlay).
 */
export function WaitlistBanner() {
  return (
    <div className="bg-[#1a1500] border border-[#CBAA5A]/30 rounded-lg p-4 mb-4">
      <div className="flex items-center gap-3">
        <Clock className="w-5 h-5 text-[#CBAA5A] flex-shrink-0" />
        <div>
          <p className="text-[#CBAA5A] font-medium text-sm">Membership Under Review</p>
          <p className="text-[#909090] text-xs mt-0.5">
            Some features are limited while your application is being reviewed.
          </p>
        </div>
      </div>
    </div>
  );
}

