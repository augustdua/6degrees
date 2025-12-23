import React, { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Info, Coins } from 'lucide-react';

const BetaBanner: React.FC = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if this is a page refresh (not navigation)
    const isPageRefresh = performance.navigation?.type === 1 || 
                         (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming)?.type === 'reload';
    
    if (isPageRefresh) {
      setShowBanner(true);
      // Animate in after a short delay
      setTimeout(() => setIsVisible(true), 100);
    }
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
  };

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
    }`}>
      <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 rounded-none border-x-0 border-t-0">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <Coins className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
            <AlertDescription className="text-orange-800 dark:text-orange-200">
              <strong>Beta Version:</strong> Zaurq is currently in beta testing. All rewards use virtual currency for testing purposes.
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              Beta
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Alert>
    </div>
  );
};

export default BetaBanner;
