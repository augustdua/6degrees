// Currency conversion and formatting utilities

// Exchange rates (update as needed)
const USD_TO_INR_RATE = 83;
const EUR_TO_INR_RATE = 90; // 1 EUR = 90 INR (approximate)
const INR_TO_EUR_RATE = 1 / EUR_TO_INR_RATE;

export type Currency = 'INR' | 'EUR';

/**
 * Detect user's preferred currency based on browser locale
 */
export const detectUserCurrency = (): Currency => {
  try {
    const locale = navigator.language.toLowerCase();
    
    // EU countries that use EUR
    const euCountries = ['de', 'fr', 'it', 'es', 'nl', 'be', 'at', 'pt', 'ie', 'fi', 'gr', 'cy', 'ee', 'lv', 'lt', 'lu', 'mt', 'sk', 'si'];
    
    // Check if locale indicates India
    if (locale.includes('-in') || locale === 'hi' || locale === 'ta' || locale === 'te') {
      return 'INR';
    }
    
    // Check if locale indicates EU country
    if (euCountries.some(country => locale.startsWith(country) || locale.includes(`-${country}`))) {
      return 'EUR';
    }
    
    // Default to INR
    return 'INR';
  } catch (error) {
    console.error('Error detecting currency:', error);
    return 'INR';
  }
};

/**
 * Convert amount between currencies
 */
export const convertCurrency = (
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency
): number => {
  if (fromCurrency === toCurrency) return amount;
  
  if (fromCurrency === 'INR' && toCurrency === 'EUR') {
    return amount * INR_TO_EUR_RATE;
  }
  
  if (fromCurrency === 'EUR' && toCurrency === 'INR') {
    return amount * EUR_TO_INR_RATE;
  }
  
  return amount;
};

/**
 * Format currency amount with appropriate symbol and formatting
 */
export const formatCurrency = (amount: number, currency: Currency): string => {
  if (currency === 'EUR') {
    return new Intl.NumberFormat('en-EU', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  }
  
  // INR formatting with Indian numbering system
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
};

/**
 * Get the appropriate amount from an offer based on user's currency preference
 */
export const getOfferPrice = (
  offer: { asking_price_inr?: number; asking_price_eur?: number; currency?: Currency },
  userCurrency: Currency
): number => {
  // If offer has the amount in user's currency, use it directly
  if (userCurrency === 'EUR' && offer.asking_price_eur) {
    return offer.asking_price_eur;
  }
  
  if (userCurrency === 'INR' && offer.asking_price_inr) {
    return offer.asking_price_inr;
  }
  
  // Otherwise convert from the available currency
  if (userCurrency === 'EUR' && offer.asking_price_inr) {
    return convertCurrency(offer.asking_price_inr, 'INR', 'EUR');
  }
  
  if (userCurrency === 'INR' && offer.asking_price_eur) {
    return convertCurrency(offer.asking_price_eur, 'EUR', 'INR');
  }
  
  return 0;
};

/**
 * Format offer price in user's preferred currency
 */
export const formatOfferPrice = (
  offer: { asking_price_inr?: number; asking_price_eur?: number; currency?: Currency },
  userCurrency: Currency
): string => {
  const amount = getOfferPrice(offer, userCurrency);
  return formatCurrency(amount, userCurrency);
};

/**
 * Get currency symbol
 */
export const getCurrencySymbol = (currency: Currency): string => {
  return currency === 'EUR' ? '€' : '₹';
};

// Legacy functions for backward compatibility
export const usdToInr = (usdAmount: number): number => {
  return usdAmount * USD_TO_INR_RATE;
};

export const formatINR = (amount: number): string => {
  return formatCurrency(amount, 'INR');
};

export const convertAndFormatINR = (usdAmount: number): string => {
  const inrAmount = usdToInr(usdAmount);
  return formatINR(inrAmount);
};