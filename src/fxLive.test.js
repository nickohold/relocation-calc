// @vitest-environment jsdom
//
// fxLive talks to Frankfurter and mutates FX_USD_PER_UNIT in place. These tests mock
// global fetch and localStorage (jsdom provides window/localStorage) to cover the
// cache / live / fallback branches and the per-USD inversion.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadLiveFxRates, fxStatus } from './fxLive.js';
import { FX_USD_PER_UNIT } from './fx.js';

const CACHE_KEY = 'relocation-calc:fxCache';

// Snapshot the static rates so we can restore them and assert "unchanged on failure".
const STATIC_SNAPSHOT = { ...FX_USD_PER_UNIT };

const resetRates = () => {
  for (const k of Object.keys(FX_USD_PER_UNIT)) delete FX_USD_PER_UNIT[k];
  Object.assign(FX_USD_PER_UNIT, STATIC_SNAPSHOT);
};

const resetStatus = () => {
  fxStatus.source = 'static';
  fxStatus.asOf = '2026-05';
  fxStatus.fetchedAt = null;
};

// Frankfurter returns "currency per 1 USD".
const FRANKFURTER_RESPONSE = {
  amount: 1,
  base: 'USD',
  date: '2026-06-20',
  rates: { GBP: 0.8, EUR: 0.9, ILS: 3.5, JPY: 150 },
};

beforeEach(() => {
  window.localStorage.clear();
  resetRates();
  resetStatus();
  vi.useRealTimers();
});

afterEach(() => {
  vi.restoreAllMocks();
  resetRates();
  resetStatus();
});

describe('fxLive — loadLiveFxRates', () => {
  it('successful fetch updates FX_USD_PER_UNIT and returns live status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FRANKFURTER_RESPONSE,
    });

    const status = await loadLiveFxRates();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(status.source).toBe('live');
    expect(status.asOf).toBe('2026-06-20');
    expect(fxStatus.source).toBe('live');
  });

  it('inverts per-USD rates correctly (USD per 1 unit = 1 / per-USD)', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FRANKFURTER_RESPONSE,
    });

    await loadLiveFxRates();

    // GBP 0.8 per USD → 1.25 USD per GBP; JPY 150 per USD → 0.006667 USD per JPY.
    expect(FX_USD_PER_UNIT.GBP).toBeCloseTo(1 / 0.8, 10);
    expect(FX_USD_PER_UNIT.EUR).toBeCloseTo(1 / 0.9, 10);
    expect(FX_USD_PER_UNIT.JPY).toBeCloseTo(1 / 150, 10);
  });

  it('cache hit within TTL applies cached rates and does NOT refetch', async () => {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({
      rates: { GBP: 0.75 },
      asOf: '2026-06-19',
      fetchedAt: Date.now(),
    }));
    globalThis.fetch = vi.fn();

    const status = await loadLiveFxRates();

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(status.source).toBe('cache');
    expect(FX_USD_PER_UNIT.GBP).toBeCloseTo(1 / 0.75, 10);
  });

  it('stale cache (older than 24h TTL) is ignored and triggers a refetch', async () => {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify({
      rates: { GBP: 0.75 },
      asOf: '2026-06-01',
      fetchedAt: Date.now() - (25 * 60 * 60 * 1000), // 25h ago
    }));
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FRANKFURTER_RESPONSE,
    });

    const status = await loadLiveFxRates();

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(status.source).toBe('live');
    // Live value (0.8) applied, not the stale cached 0.75.
    expect(FX_USD_PER_UNIT.GBP).toBeCloseTo(1 / 0.8, 10);
  });

  it('successful fetch writes the response to the cache', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => FRANKFURTER_RESPONSE,
    });

    await loadLiveFxRates();

    const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY));
    expect(cached.rates.GBP).toBe(0.8);
    expect(cached.asOf).toBe('2026-06-20');
    expect(typeof cached.fetchedAt).toBe('number');
  });

  it('fetch rejection falls back to the static snapshot (rates unchanged)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network down'));

    const status = await loadLiveFxRates();

    expect(status.source).toBe('static');
    expect(FX_USD_PER_UNIT.GBP).toBeCloseTo(STATIC_SNAPSHOT.GBP, 12);
    expect(FX_USD_PER_UNIT.EUR).toBeCloseTo(STATIC_SNAPSHOT.EUR, 12);
  });

  it('non-OK HTTP response falls back to the static snapshot', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });

    const status = await loadLiveFxRates();

    expect(status.source).toBe('static');
    expect(FX_USD_PER_UNIT.GBP).toBeCloseTo(STATIC_SNAPSHOT.GBP, 12);
  });

  it('response missing a rates object falls back to the static snapshot', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ amount: 1, base: 'USD', date: '2026-06-20' }),
    });

    const status = await loadLiveFxRates();

    expect(status.source).toBe('static');
    expect(FX_USD_PER_UNIT.GBP).toBeCloseTo(STATIC_SNAPSHOT.GBP, 12);
  });
});
