import { useEffect, useState } from 'react';
import { Wrench, Clock } from 'lucide-react';

interface MaintenanceModeProps {
  children: React.ReactNode;
}

export const MaintenanceMode = ({ children }: MaintenanceModeProps) => {
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkMaintenanceMode();
  }, []);

  const checkMaintenanceMode = () => {
    try {
      // Check environment variable for maintenance mode
      const maintenanceEnabled = import.meta.env.VITE_MAINTENANCE_MODE === 'true';
      setIsMaintenanceMode(maintenanceEnabled);
    } catch (error) {
      console.error('Error checking maintenance mode:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isMaintenanceMode) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-black flex items-center justify-center p-4">
        <div className="max-w-2xl w-full bg-gradient-to-br from-purple-500/10 via-black to-purple-900/20 border border-purple-500/20 rounded-lg p-8 md:p-12 text-center shadow-2xl">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Wrench className="h-16 w-16 text-purple-500 animate-pulse" />
              <Clock className="h-8 w-8 text-purple-400 absolute -bottom-1 -right-1" />
            </div>
          </div>
          
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            We're Making Things Better
          </h1>
          
          <p className="text-gray-300 text-lg mb-6">
            6Degree is currently undergoing exciting improvements to enhance your networking experience.
          </p>
          
          <div className="bg-black/40 rounded-lg p-6 mb-6 border border-purple-500/10">
            <p className="text-gray-400">
              We're working hard to bring you new features and improvements. 
              The platform will be back online shortly.
            </p>
          </div>
          
          <p className="text-sm text-gray-500">
            Expected downtime: ~30 minutes
          </p>
          
          <div className="mt-8 flex items-center justify-center gap-4">
            <div className="flex gap-2">
              <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="h-2 w-2 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};







