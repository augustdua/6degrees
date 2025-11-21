import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface CategorySectionProps {
  categoryName: string;
  children: React.ReactNode;
  onViewAll?: () => void;
  itemCount?: number;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  categoryName,
  children,
  onViewAll,
  itemCount
}) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 400;
      const newScrollLeft =
        scrollContainerRef.current.scrollLeft +
        (direction === 'right' ? scrollAmount : -scrollAmount);
      
      scrollContainerRef.current.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="mb-6 md:mb-8 w-full">
      {/* Category header */}
      <div className="flex items-center justify-between mb-3 md:mb-4 px-4">
        <div className="flex items-center gap-2 md:gap-3">
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{categoryName}</h2>
          {itemCount !== undefined && (
            <span className="text-xs sm:text-sm text-muted-foreground">({itemCount})</span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Scroll buttons - Hidden on mobile */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="h-7 w-7 md:h-8 md:w-8 hidden sm:flex"
          >
            <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="h-7 w-7 md:h-8 md:w-8 hidden sm:flex"
          >
            <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
          </Button>

          {/* View All button */}
          {onViewAll && (
            <Button
              variant="ghost"
              onClick={onViewAll}
              className="ml-1 sm:ml-2 text-xs sm:text-sm px-2 sm:px-4"
            >
              <span className="hidden sm:inline">View All</span>
              <span className="sm:hidden">All</span>
              <ArrowRight className="ml-1 sm:ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex overflow-x-auto pb-4 px-4 sm:px-0 scrollbar-hide"
        style={{
          gap: '1.5rem',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          WebkitOverflowScrolling: 'touch',
          scrollSnapType: 'x mandatory',
          touchAction: 'pan-x'
        }}
      >
        {children}
      </div>
    </div>
  );
};


