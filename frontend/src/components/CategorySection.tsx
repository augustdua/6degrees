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
    <div
      className="mb-8 overflow-hidden"
      style={{
        width: '100vw',
        marginLeft: 'calc(-50vw + 50%)'
      }}
    >
      <div className="flex items-center justify-between mb-4 px-4 md:px-0">
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

      <div
        className="overflow-x-auto"
        style={{
          display: 'flex',
          gap: '16px',
          padding: '0 16px 16px',
          WebkitOverflowScrolling: 'touch',
          overflowY: 'hidden'
        }}
      >
        {React.Children.map(children, (child) => (
          <div
            style={{
              flexShrink: 0,
              width: '75vw',
              maxWidth: '320px'
            }}
          >
            {child}
          </div>
        ))}
      </div>
    </div>
  );
};
