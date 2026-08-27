/**
 * Reusable formatting utilities for financial and property data.
 */

export const formatCurrency = (
  value: number | string | null | undefined,
  currency: string = 'AUD',
  locale: string = 'en-AU'
): string => {
  if (value === null || value === undefined || value === '') return '$0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '$0';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    maximumFractionDigits: 0,
  }).format(num);
};

export const formatNumber = (
  value: number | string | null | undefined,
  maximumFractionDigits: number = 2
): string => {
  if (value === null || value === undefined || value === '') return '0';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';

  return new Intl.NumberFormat('en-AU', {
    maximumFractionDigits,
  }).format(num);
};

export const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};
