import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface AnimatedKeywordBannerProps {
  keywords: string[];
  onKeywordClick?: (keyword: string) => void;
  interval?: number; // milliseconds between rotations
}

export const AnimatedKeywordBanner: React.FC<AnimatedKeywordBannerProps> = ({
  keywords,
  onKeywordClick,
  interval = 3000
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    if (keywords.length <= 1) return;

    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % keywords.length);
        setFade(true);
      }, 300);
    }, interval);

    return () => clearInterval(timer);
  }, [keywords.length, interval]);

  if (keywords.length === 0) return null;

  // Show 3-5 keywords at once
  const visibleCount = Math.min(5, keywords.length);
  const visibleKeywords = [];
  for (let i = 0; i < visibleCount; i++) {
    const index = (currentIndex + i) % keywords.length;
    visibleKeywords.push(keywords[index]);
  }

  return (
    <div className="w-full bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 py-6 px-4 rounded-lg mb-6">
      <div className="max-w-7xl mx-auto">
        <p className="text-center text-sm text-muted-foreground mb-3">
          Explore connections in
        </p>
        <div
          className={`flex flex-wrap justify-center gap-2 transition-opacity duration-300 ${
            fade ? 'opacity-100' : 'opacity-50'
          }`}
        >
          {visibleKeywords.map((keyword, idx) => (
            <Badge
              key={`${keyword}-${idx}`}
              variant="secondary"
              className={`text-base px-4 py-2 cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 transform hover:scale-105 ${
                onKeywordClick ? 'cursor-pointer' : 'cursor-default'
              }`}
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

