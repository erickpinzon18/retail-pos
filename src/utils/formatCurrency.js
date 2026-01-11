// Format number as Mexican Peso currency
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

// Format number with thousand separators (no currency symbol)
export const formatNumber = (num) => {
  return new Intl.NumberFormat('es-MX').format(num);
};

// Parse currency string to number
export const parseCurrency = (currencyString) => {
  return parseFloat(currencyString.replace(/[^0-9.-]+/g, ''));
};
