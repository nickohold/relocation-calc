// Display-only currency formatter. The calc engine works in native currencies
// (ILS for IL inputs, USD for US outputs); this helper converts the USD-normalized
// numbers used in the UI into the user's selected display currency.
//
// All UI numbers are passed in as USD. For ILS display, divide by fxRate.
// (No precision loss: the engine produces USD by multiplying ILS × fxRate, so
// USD ÷ fxRate is the exact original ILS amount.)
export function formatMoney(usdAmount, displayCurrency, fxRate) {
  if (usdAmount === 0) return '--';
  const val = displayCurrency === 'ILS' ? usdAmount / fxRate : usdAmount;
  const symbol = displayCurrency === 'ILS' ? '₪' : '$';
  return `${val < 0 ? '-' : ''}${symbol}${Math.abs(Math.round(val)).toLocaleString()}`;
}
