// Display-only currency formatter. Two modes:
//
// 1. Legacy (3-arg): formatMoney(usdAmount, displayCurrency, fxRate)
//    Used by the original IL→US single-source UI. `displayCurrency` is 'USD' or 'ILS',
//    `fxRate` is ILS-per-USD-ish (actually USD-per-ILS in the legacy code path).
//    Kept for backwards compat — tests / legacy App.jsx may still use it.
//
// 2. Multi-currency (object form): formatMoney({ usdAmount, currency, fxUsdPerUnit })
//    Used by the new multi-country Destination Explorer. `currency` is the ISO code
//    (e.g. 'EUR', 'JPY', 'ILS'); `fxUsdPerUnit` comes from FX_USD_PER_UNIT.
//
// Returns a localized string like "$1,234", "₪4,500", "€2,100", "¥220,000".

const SYMBOLS = {
  USD: '$',  ILS: '₪',  GBP: '£',  EUR: '€',  CAD: 'C$', AUD: 'A$',
  CHF: 'CHF ', SGD: 'S$', JPY: '¥',  SEK: 'kr', DKK: 'kr', NOK: 'kr',
  PLN: 'zł', AED: 'AED ',
};

const symbolFor = (code) => SYMBOLS[code] ?? `${code} `;

export function formatMoney(arg1, arg2, arg3) {
  // Object form (new multi-currency).
  if (arg1 && typeof arg1 === 'object') {
    const { usdAmount, currency = 'USD', fxUsdPerUnit } = arg1;
    if (!usdAmount && usdAmount !== 0) return '--';
    if (usdAmount === 0) return '--';
    const rate = fxUsdPerUnit ?? 1;
    const val = currency === 'USD' ? usdAmount : usdAmount / rate;
    const sym = symbolFor(currency);
    const sign = val < 0 ? '-' : '';
    return `${sign}${sym}${Math.abs(Math.round(val)).toLocaleString()}`;
  }

  // Legacy (3-arg) form.
  const usdAmount = arg1;
  const displayCurrency = arg2;
  const fxRate = arg3;
  if (usdAmount === 0) return '--';
  const val = displayCurrency === 'ILS' ? usdAmount / fxRate : usdAmount;
  const symbol = displayCurrency === 'ILS' ? '₪' : '$';
  return `${val < 0 ? '-' : ''}${symbol}${Math.abs(Math.round(val)).toLocaleString()}`;
}

// Convenience formatter for the multi-currency UI.
// Always renders a sign (use `signed=true` for deltas).
export function formatUSD(usd, { signed = false } = {}) {
  if (usd === 0 || usd == null || Number.isNaN(usd)) return signed ? '$0' : '--';
  const sign = usd < 0 ? '-' : (signed ? '+' : '');
  return `${sign}$${Math.abs(Math.round(usd)).toLocaleString()}`;
}

export function formatLocal(amount, currency) {
  if (amount === 0 || amount == null || Number.isNaN(amount)) return '--';
  const sym = symbolFor(currency);
  const sign = amount < 0 ? '-' : '';
  return `${sign}${sym}${Math.abs(Math.round(amount)).toLocaleString()}`;
}
