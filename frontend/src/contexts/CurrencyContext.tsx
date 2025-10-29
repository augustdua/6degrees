import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Currency, detectUserCurrency } from '@/lib/currency';

interface CurrencyContextType {
  userCurrency: Currency;
  setUserCurrency: (currency: Currency) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

interface CurrencyProviderProps {
  children: ReactNode;
}

export const CurrencyProvider: React.FC<CurrencyProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [userCurrency, setUserCurrencyState] = useState<Currency>('INR');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeCurrency = () => {
      if (user?.preferred_currency) {
        // Use user's saved preference
        setUserCurrencyState(user.preferred_currency as Currency);
      } else {
        // Auto-detect from browser locale
        const detected = detectUserCurrency();
        setUserCurrencyState(detected);
      }
      setIsLoading(false);
    };

    initializeCurrency();
  }, [user]);

  const setUserCurrency = (currency: Currency) => {
    setUserCurrencyState(currency);
  };

  return (
    <CurrencyContext.Provider value={{ userCurrency, setUserCurrency, isLoading }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};

