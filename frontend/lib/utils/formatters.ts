/**
 * Standard Indian Regional Formatters
 * Ensures the app uses ₹ (INR), DD/MM/YYYY, and the Lakh/Crore system.
 */

export const formatINR = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatDateIndia = (date: string | Date | null) => {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN').format(d);
};

export const formatNumberIndia = (num: number) => {
  return new Intl.NumberFormat('en-IN').format(num);
};
