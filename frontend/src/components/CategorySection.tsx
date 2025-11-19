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
    <div className="mb-8">
      {/* Category header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">{categoryName}</h2>
          {itemCount !== undefined && (
            <span className="text-sm text-muted-foreground">({itemCount})</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Scroll buttons */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('left')}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => scroll('right')}
            className="h-8 w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          
          {/* View All button */}
          {onViewAll && (
            <Button
              variant="ghost"
              onClick={onViewAll}
              className="ml-2"
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Horizontal scroll container */}
      <div
        ref={scrollContainerRef}
        className="flex gap-4 overflow-x-auto scrollbar-hide pb-4"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none'
        }}
      >
        {children}
      </div>
    </div>
  );
};

