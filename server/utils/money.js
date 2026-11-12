/**
 * Mandate Gateway — Minor Currency Unit Handling
 * 
 * Rules:
 * 1. Financial amounts MUST be stored as integer minor units (e.g. paise, cents).
 * 2. Floating-point arithmetic is strictly prohibited for monetary calculations.
 * 3. Default factor: 100 (e.g., 100 paise = 1 INR, 100 cents = 1 USD).
 */

const CURRENCY_FACTORS = {
  INR: 100,
  USD: 100,
  EUR: 100,
  GBP: 100,
  JPY: 1, // Zero-decimal currency
};

/**
 * Get decimal factor for currency
 */
export function getCurrencyFactor(currency = 'INR') {
  return CURRENCY_FACTORS[currency.toUpperCase()] || 100;
}

/**
 * Convert major currency amount (e.g. 5000.50 INR) to integer minor units (500050 paise)
 */
export function toMinorUnits(amountMajor, currency = 'INR') {
  if (amountMajor === undefined || amountMajor === null || isNaN(Number(amountMajor))) {
    throw new Error('Invalid monetary amount: cannot convert NaN to minor units');
  }
  const factor = getCurrencyFactor(currency);
  const parsed = Number(amountMajor);
  return Math.round(parsed * factor);
}

/**
 * Convert integer minor units (500050 paise) to major currency units (5000.50)
 */
export function fromMinorUnits(amountMinor, currency = 'INR') {
  if (amountMinor === undefined || amountMinor === null || isNaN(Number(amountMinor))) {
    return 0;
  }
  const factor = getCurrencyFactor(currency);
  return Number(amountMinor) / factor;
}

/**
 * Format minor units into human readable string
 */
export function formatCurrency(amountMinor, currency = 'INR') {
  const major = fromMinorUnits(amountMinor, currency);
  const curr = currency.toUpperCase();
  
  if (curr === 'INR') {
    return `₹${Math.round(major).toLocaleString('en-IN')}`;
  }
  if (curr === 'USD') {
    return `$${major.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `${major.toLocaleString()} ${curr}`;
}

