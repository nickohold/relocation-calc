// Multi-currency formatter for the Compare-Two UI.
// Inputs: amount in USD (canonical), target currency code, FX table.
// Returns formatted string like "$12,345" / "₪42,000" / "€10,500".
import { FX_USD_PER_UNIT } from '../fx.js';

const SYMBOLS = {
  USD: '$', ILS: '₪', GBP: '£', EUR: '€',
  CAD: 'C$', AUD: 'A$', CHF: 'CHF ', SGD: 'S$',
  JPY: '¥', SEK: 'kr ', DKK: 'kr ', NOK: 'kr ',
  PLN: 'zł ', AED: 'AED ',
};

export function fmtAmount(usdAmount, currency) {
  if (!Number.isFinite(usdAmount)) return '—';
  if (Math.abs(usdAmount) < 0.5) return '—';
  const fx = FX_USD_PER_UNIT[currency];
  if (fx == null) return `$${Math.round(usdAmount).toLocaleString()}`;
  const local = usdAmount / fx;
  const sym = SYMBOLS[currency] ?? '';
  const sign = local < 0 ? '-' : '';
  const rounded = Math.round(Math.abs(local));
  return `${sign}${sym}${rounded.toLocaleString()}`;
}

export function fmtPct(frac, digits = 1) {
  if (!Number.isFinite(frac)) return '—';
  return `${(frac * 100).toFixed(digits)}%`;
}

// Pick the display currency based on user toggle ('source' | 'dest' | 'USD').
export function pickDisplayCurrency(mode, sourceCurrency, destCurrency) {
  if (mode === 'source') return sourceCurrency;
  if (mode === 'dest') return destCurrency;
  return 'USD';
}
