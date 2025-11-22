import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface CategorySectionProps {
  categoryName: string;
  description?: string;
  children: React.ReactNode;
  onViewAll?: () => void;
  itemCount?: number;
}

export const CategorySection: React.FC<CategorySectionProps> = ({
  categoryName,
  description,
  children,
  onViewAll,
  itemCount
}) => {
  return (
    <section className="mb-12 w-full px-2 md:px-6 lg:px-10 max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between mb-6 px-0">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{categoryName}</h2>
            {itemCount !== undefined && (
              <span className="text-sm text-muted-foreground font-medium mt-1">({itemCount})</span>
            )}
          </div>
          {description && (
            <p className="text-muted-foreground text-sm md:text-base max-w-2xl">
              {description}
            </p>
          )}
        </div>

        {onViewAll && (
          <Button
            variant="ghost"
            onClick={onViewAll}
            className="text-sm font-medium hover:bg-transparent hover:text-primary p-0 h-auto mb-1"
          >
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="px-0">
        <div
          className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scroll-smooth mobile-scroll-fix hide-scrollbar cursor-grab active:cursor-grabbing"
          style={{
            WebkitOverflowScrolling: 'touch',
            overscrollBehaviorX: 'contain',
            touchAction: 'pan-x'
          }}
        >
          {React.Children.map(children, (child) => (
            <div className="snap-start shrink-0 w-[60vw] sm:w-[calc(33.333%-1rem)] lg:w-[calc(22%-1rem)]">
              {child}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
