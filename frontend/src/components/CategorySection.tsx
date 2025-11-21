import React, { useRef, useState } from 'react';
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
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.8; // Scroll 80% of view width
      const newScrollLeft =
        container.scrollLeft +
        (direction === 'right' ? scrollAmount : -scrollAmount);
      
      container.scrollTo({
        left: newScrollLeft,
        behavior: 'smooth'
      });
    }
  };

  const isDragging = useRef(false);
  const lastX = useRef(0);
  const [isPointerActive, setPointerActive] = useState(false);

  const handleDragStart = (clientX: number) => {
    if (!scrollContainerRef.current) return;
    isDragging.current = true;
    lastX.current = clientX;
    setPointerActive(true);
  };

  const handleDragMove = (clientX: number) => {
    if (!isDragging.current || !scrollContainerRef.current) return;
    const delta = clientX - lastX.current;
    scrollContainerRef.current.scrollLeft -= delta;
    lastX.current = clientX;
  };

  const stopDragging = () => {
    isDragging.current = false;
    setPointerActive(false);
  };

  const carouselItems = React.Children.map(children, (child) => (
    <div className="snap-center w-[82vw] sm:w-[280px] md:w-[320px] flex-shrink-0">
      {child}
    </div>
  ));

  return (
    <div className="mb-8 w-full group">
      {/* Category header */}
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold">{categoryName}</h2>
          {itemCount !== undefined && (
            <span className="text-sm text-muted-foreground">({itemCount})</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Desktop Scroll Buttons */}
          <div className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('left')}
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => scroll('right')}
              className="h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* View All button */}
          {onViewAll && (
            <Button
              variant="ghost"
              onClick={onViewAll}
              className="text-sm font-medium hover:bg-transparent hover:text-primary p-0 h-auto"
            >
              View All <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Embedded Netflix-style scroller */}
      <div className="relative">
        <div
          ref={scrollContainerRef}
          className={`flex gap-4 px-4 md:px-0 pb-4 overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-hide ${isPointerActive ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ WebkitOverflowScrolling: 'touch' }}
          onMouseDown={(e) => handleDragStart(e.clientX)}
          onMouseMove={(e) => {
            if (isDragging.current) {
              e.preventDefault();
              handleDragMove(e.clientX);
            }
          }}
          onMouseLeave={stopDragging}
          onMouseUp={stopDragging}
          onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
          onTouchMove={(e) => {
            handleDragMove(e.touches[0].clientX);
          }}
          onTouchEnd={stopDragging}
        >
          {carouselItems}
        </div>

        {/* Mobile gradient hints */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-6 bg-gradient-to-r from-background to-transparent md:hidden" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-background to-transparent md:hidden" />
      </div>
    </div>
  );
};
