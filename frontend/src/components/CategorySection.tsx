import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

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
  return (
    <section className="mb-8 w-full px-2 md:px-6 lg:px-10">
      <div className="flex items-center justify-between mb-4 px-0">
        <div className="flex items-center gap-3">
          <h2 className="text-xl md:text-2xl font-bold">{categoryName}</h2>
          {itemCount !== undefined && (
            <span className="text-sm text-muted-foreground">({itemCount})</span>
          )}
        </div>

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

      <div className="px-0">
        <div
          className="flex gap-3 sm:gap-4 lg:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth mobile-scroll-fix hide-scrollbar touch-pan-x cursor-grab active:cursor-grabbing"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain'
          }}
        >
          {React.Children.map(children, (child) => (
            <div className="snap-start w-[78vw] sm:w-[320px] md:w-[360px] flex-shrink-0">
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
