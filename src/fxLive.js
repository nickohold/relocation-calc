// Live FX rates via Frankfurter (https://www.frankfurter.app — free, no key, ECB-based).
// Cached in localStorage for 24h; falls back to the hardcoded May 2026 snapshot in fx.js
// if the fetch fails. Mutates FX_USD_PER_UNIT in place so all engine code picks up the
// fresh rates without a wider refactor.

import { FX_USD_PER_UNIT } from './fx.js';

const FRANKFURTER_URL = 'https://api.frankfurter.dev/v1/latest';
const CACHE_KEY = 'relocation-calc:fxCache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
// ECB-published currencies. AED is omitted (USD-pegged at 3.6725 since 1997; ECB
// doesn't publish it and Frankfurter 404s if you ask). AED keeps its hardcoded peg.
const TARGET_CCYS = ['ILS', 'GBP', 'EUR', 'CAD', 'AUD', 'CHF', 'SGD', 'JPY', 'SEK', 'DKK', 'NOK', 'PLN'];

// Status surfaced to the UI footer.
export const fxStatus = {
  source: 'static',                // 'live' | 'cache' | 'static'
  asOf: '2026-05',                 // ISO date string of the rates we're using
  fetchedAt: null,                 // Date.now() when this session last fetched/loaded cache
};

const readCache = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.fetchedAt || !parsed?.rates) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeCache = (rates, asOf) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({
      rates,
      asOf,
      fetchedAt: Date.now(),
    }));
  } catch {
    /* localStorage might be full or disabled — silently ignore */
  }
};

// Convert Frankfurter's "currency_per_USD" map into our "USD per 1 unit" shape.
const applyRates = (ratesPerUSD, asOf, source) => {
  for (const ccy of TARGET_CCYS) {
    const r = ratesPerUSD[ccy];
    if (typeof r === 'number' && r > 0) {
      FX_USD_PER_UNIT[ccy] = 1 / r;
    }
  }
  fxStatus.source = source;
  fxStatus.asOf = asOf;
  fxStatus.fetchedAt = Date.now();
};

export const loadLiveFxRates = async () => {
  // 1. Use cache if fresh.
  const cached = readCache();
  if (cached) {
    applyRates(cached.rates, cached.asOf, 'cache');
    return fxStatus;
  }

  // 2. Fetch live.
  if (typeof fetch === 'undefined') return fxStatus;
  try {
    const url = `${FRANKFURTER_URL}?from=USD&to=${TARGET_CCYS.join(',')}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout?.(8000) });
    if (!resp.ok) throw new Error(`fx fetch failed: ${resp.status}`);
    const json = await resp.json();
    if (!json?.rates) throw new Error('fx response missing rates');
    applyRates(json.rates, json.date ?? '', 'live');
    writeCache(json.rates, json.date ?? '');
    return fxStatus;
  } catch {
    // 3. Silent fallback to the static rates already in FX_USD_PER_UNIT.
    return fxStatus;
  }
};
