// @vitest-environment jsdom
//
// Minimal UI smoke test. Mounts <App/> once and asserts that both comparison panels
// render and that a computed currency figure reaches the DOM. The per-file pragma above
// keeps the rest of the suite on the default node environment. fetch is stubbed so the
// on-mount loadLiveFxRates() call falls back to static rates instead of hitting the network.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import App from './App.jsx';

beforeEach(() => {
  window.localStorage.clear();
  // Force loadLiveFxRates() down the fallback path — no real network in CI.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in test')));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('App — UI smoke', () => {
  it('renders source + destination panels and a computed currency figure', () => {
    const { container, getAllByText } = render(<App />);

    // Both panels render their heading labels.
    expect(getAllByText(/^Source$/).length).toBeGreaterThanOrEqual(1);
    expect(getAllByText(/^Destination$/).length).toBeGreaterThanOrEqual(1);

    // A computed/derived currency figure made it to the DOM. Defaults are
    // IL-TLV source (₪384,000 gross) and US-NYC dest ($200,000 gross); the engine
    // renders net/liquid figures with a currency symbol + thousands-separated number.
    expect(container.textContent).toMatch(/[$₪€£][\d][\d,]{2,}/);
  });
});
