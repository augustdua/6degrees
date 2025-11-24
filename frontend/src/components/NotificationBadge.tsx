import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  className?: string;
  max?: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  className,
  max = 99 
}) => {
  if (count <= 0) return null;

  const displayCount = count > max ? `${max}+` : count.toString();

  return (
    <span
      className={cn(
        "absolute -top-1 -right-1 flex items-center justify-center",
        "min-w-5 h-5 px-1",
        "text-xs font-bold text-white",
        "bg-red-500 rounded-full",
        "border-2 border-background",
        "animate-pulse",
        className
      )}
    >
      {displayCount}
    </span>
  );
};

interface TabNotificationBadgeProps {
  count: number;
  inline?: boolean;
}

export const TabNotificationBadge: React.FC<TabNotificationBadgeProps> = ({ 
  count,
  inline = false 
}) => {
  if (count <= 0) return null;

  const displayCount = count > 99 ? '99+' : count.toString();

  if (inline) {
    return (
      <span className="ml-2 px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
        {displayCount}
      </span>
    );
  }

  return (
    <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold text-white bg-red-500 rounded-full animate-pulse">
      {displayCount}
    </span>
  );
};

