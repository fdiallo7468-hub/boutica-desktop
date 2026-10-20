/**
 * Decimal-safe Money utilities for Boutica Desktop
 * Currency default: XOF (Franc CFA) as specified in Boutica Design System & backend default
 */

export function parseMoneyToNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  const cleaned = value.replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

let defaultCurrency = 'XOF';

/** Devise de la boutique authentifiée (fournie par Boutica Cloud à la connexion). */
export function setDefaultCurrency(code: string | undefined | null): void {
  defaultCurrency = code && /^[A-Za-z]{3}$/.test(code) ? code.toUpperCase() : 'XOF';
}

export function formatMoney(
  value: string | number | null | undefined,
  currency: string = defaultCurrency,
  locale = 'fr-FR'
): string {
  const num = parseMoneyToNumber(value);

  // For XOF, standard formatting is typically integer with space separator and "XOF" or "FCFA"
  if (currency.toUpperCase() === 'XOF') {
    const formatted = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(Math.round(num));
    return `${formatted} XOF`;
  }

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${num.toFixed(2)} ${currency}`;
  }
}

export function calculateSubtotal(items: Array<{ quantity: number; unitPrice: number | string }>): number {
  return items.reduce((acc, item) => {
    const price = parseMoneyToNumber(item.unitPrice);
    const qty = Math.max(0, item.quantity || 0);
    return acc + Math.round(price * qty * 100) / 100;
  }, 0);
}

export function calculateNetTotal(subtotal: number, discount = 0): number {
  const disc = Math.max(0, parseMoneyToNumber(discount));
  const safeDiscount = Math.min(disc, subtotal);
  return Math.max(0, Math.round((subtotal - safeDiscount) * 100) / 100);
}

export function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'ik-' + Date.now() + '-' + Math.random().toString(36).substring(2, 11);
}
