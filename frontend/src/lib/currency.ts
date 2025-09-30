// Currency conversion and formatting utilities

const USD_TO_INR_RATE = 83; // Update this rate as needed

/**
 * Convert USD amount to INR
 */
export const usdToInr = (usdAmount: number): number => {
  return usdAmount * USD_TO_INR_RATE;
};

/**
 * Format currency amount in INR
 */
export const formatINR = (amount: number): string => {
  return `₹${amount.toFixed(2)}`;
};

/**
 * Convert USD to INR and format
 */
export const convertAndFormatINR = (usdAmount: number): string => {
  const inrAmount = usdToInr(usdAmount);
  return formatINR(inrAmount);
};