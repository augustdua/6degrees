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
          animation: scroll-horizontal 150s linear infinite;
          display: inline-flex;
          flex-wrap: wrap;
          width: max-content;
          align-content: flex-start;
        }
        
        .animate-scroll-horizontal-container {
          display: flex;
          flex-direction: column;
          height: 160px;
        }
        
        @media (max-width: 768px) {
          .animate-scroll-horizontal-container {
            height: 120px;
          }
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

  // Split keywords into 4 rows for multi-row display
  const keywordsPerRow = Math.ceil(keywords.length / 4);
  const rows = [
    keywords.slice(0, keywordsPerRow),
    keywords.slice(keywordsPerRow, keywordsPerRow * 2),
    keywords.slice(keywordsPerRow * 2, keywordsPerRow * 3),
    keywords.slice(keywordsPerRow * 3),
  ];
  
  // Duplicate each row for seamless scrolling
  const duplicatedRows = rows.map(row => [...row, ...row, ...row]);

  return (
    <div className="w-full max-w-full bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-4 md:py-6 px-3 sm:px-4 rounded-lg mb-4 md:mb-6 overflow-hidden">
      <p className="text-center text-xs sm:text-sm text-muted-foreground mb-2 md:mb-3">
        Explore connections in
      </p>
      <div className="relative w-full max-w-full overflow-hidden">
        <div className="flex flex-col gap-1.5 md:gap-2 max-w-full">
          {duplicatedRows.slice(0, 3).map((row, rowIdx) => (
            <div key={rowIdx} className="relative w-full max-w-full overflow-hidden">
              <div className="animate-scroll-horizontal flex gap-1.5 md:gap-2">
                {row.map((keyword, idx) => (
                  <Badge
                    key={`${keyword}-${rowIdx}-${idx}`}
                    variant="secondary"
                    className="text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-1.5 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 transform hover:scale-105 whitespace-nowrap flex-shrink-0"
                    onClick={() => onKeywordClick?.(keyword)}
                  >
                    {keyword}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
