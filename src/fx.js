// FX rates as of May 2026 — USD per 1 unit of local currency.
// Sources: ECB / oanda mid-market snapshot 2026-05.

export const FX_USD_PER_UNIT = {
  USD: 1.000,
  ILS: 1 / 2.9081,    // ~0.3439
  GBP: 1 / 0.7355,    // ~1.3596
  EUR: 1 / 0.8508,    // ~1.1753
  CAD: 1 / 1.3623,    // ~0.7341
  AUD: 1 / 1.3822,    // ~0.7235
  CHF: 1 / 0.7792,    // ~1.2834
  SGD: 1 / 1.2685,    // ~0.7884
  JPY: 1 / 156.4154,  // ~0.006393
  SEK: 1 / 9.2325,    // ~0.10831
  DKK: 1 / 6.3575,    // ~0.15730
  NOK: 1 / 9.2778,    // ~0.10778
  PLN: 1 / 3.6026,    // ~0.27758
  AED: 1 / 3.6725,    // ~0.27229
};

export const toUSD = (amount, currency) => {
  const rate = FX_USD_PER_UNIT[currency];
  if (rate == null) throw new Error(`Unknown currency: ${currency}`);
  return amount * rate;
};

export const fromUSD = (amountUSD, currency) => {
  const rate = FX_USD_PER_UNIT[currency];
  if (rate == null) throw new Error(`Unknown currency: ${currency}`);
  return amountUSD / rate;
};
