import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface AnimatedKeywordBannerProps {
  keywords: string[];
  onKeywordClick?: (keyword: string) => void;
  interval?: number; // not used anymore but kept for compatibility
}

export const AnimatedKeywordBanner: React.FC<AnimatedKeywordBannerProps> = ({
  keywords,
  onKeywordClick,
}) => {
  useEffect(() => {
    console.log('🎨 AnimatedKeywordBanner: Received keywords:', keywords);
    
    // Add the keyframes animation to the document
    const styleId = 'animated-keyword-banner-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes scroll-horizontal {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-scroll-horizontal {
          animation: scroll-horizontal 60s linear infinite;
          display: flex;
          width: max-content;
        }

        .animate-scroll-horizontal:hover {
          animation-play-state: paused;
        }
      `;
      document.head.appendChild(style);
      console.log('✅ AnimatedKeywordBanner: Injected animation styles');
    }
  }, [keywords]);

  if (!keywords || keywords.length === 0) {
    console.log('⚠️ AnimatedKeywordBanner: No keywords, not rendering');
    return null;
  }
  
  console.log(`✅ AnimatedKeywordBanner: Rendering with ${keywords.length} keywords`);

  // Duplicate keywords multiple times for seamless loop
  const duplicatedKeywords = [...keywords, ...keywords, ...keywords];

  return (
    <div className="w-full bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-6 px-4 rounded-lg mb-6 overflow-hidden">
      <p className="text-center text-sm text-muted-foreground mb-3">
        Explore connections in
      </p>
      <div className="relative w-full overflow-hidden">
        {/* Animated scrolling container */}
        <div className="animate-scroll-horizontal">
          {duplicatedKeywords.map((keyword, idx) => (
            <Badge
              key={`${keyword}-${idx}`}
              variant="secondary"
              className="text-base px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 transform hover:scale-105 whitespace-nowrap flex-shrink-0 mx-1"
              onClick={() => onKeywordClick?.(keyword)}
            >
              {keyword}
            </Badge>
          ))}
        </div>
      </div>
    </div>
  );
};
