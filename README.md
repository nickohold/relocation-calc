# Relocation Architect

[![CI](https://github.com/nickohold/relocation-calc/actions/workflows/ci.yml/badge.svg)](https://github.com/nickohold/relocation-calc/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://relocation-savings-calculator.vercel.app/)
[![React 19](https://img.shields.io/badge/React-19-149eca.svg)](https://react.dev/)

A relocation financial-impact calculator that compares any two of **20 countries / ~50 cities** on the two axes that actually decide whether a move makes you richer: **liquid cash flow** and **wealth accumulation**. It exists to stop a "more pocket money" answer from masking a net-worth loss.

**Live:** https://relocation-savings-calculator.vercel.app/

It started as a single IL→US decision tool and was generalized into a symmetric, pluggable multi-country engine — that generalization is the interesting part of the codebase.

## What it does

Given a salary, contribution rates, rent, and lifestyle burn for a source and a destination, it computes for each side:

- Net take-home after the destination's real tax stack (e.g. US FICA + federal + state + city; Israeli income tax + BTL + Health)
- Mandatory and elective savings (pension, keren hishtalmut, 401(k), severance), each capped to that country's statutory limits
- Liquid cash flow (net − rent − burn), normalized to USD for comparison
- The optimal 401(k) personal contribution to match the source country's forced-savings rate
- A **Wealth Gap** warning when a cap (e.g. the IRS 401(k) limit) means the destination can't match the source's savings velocity — more cash in pocket, less net worth

Live FX rates are fetched from the ECB (via Frankfurter) with a 24h cache and a static fallback snapshot.

## Architecture

The tax logic is fully decoupled from React. Each country is a self-contained module; the engine dispatches to them and the UI only renders the result.

```
src/countries/<CC>.js   Per-country engine: compute() + meta + cited constants
        │                (US, IL, UK, DE, FR, NL, CH, CA, AU, SG, JP, … — 20 total)
        ▼
src/calc.js             Dispatcher: runComparison() assembles a symmetric
        │                source-vs-destination result. No React, pure functions.
        ▼
src/App.jsx             UI state + two themed layouts (Sunrise / Bento).
src/components/*         Presentational breakdown, summary, controls.
```

Adding a country is a localized change: drop in `src/countries/<CC>.js` with its `compute()` and cited constants, then register it. The engine and UI need no changes.

## Source of truth for the math

Every tax bracket, BTL/Health rate, contribution cap, and dependency graph lives in [LOGIC.md](./LOGIC.md), with primary-source citations per country. If the code disagrees with that document, one of them is wrong — file an issue. The bug-history table at the bottom records past regressions, their root cause, and the test that now locks each fix.

## Quality

- **103 unit tests** (Vitest) over the calc engine — bracket math, statutory caps, per-country effective-rate sanity bands, registry integrity, and regression locks for every historical bug. Several countries are cross-checked against published worked examples (e.g. German §32a Grundtabelle, Swedish SKV 433).
- **CI** runs lint → test → build on every push and PR.
- **Zero-warning lint** (ESLint flat config, React Hooks rules enforced).

## Project layout

```
src/
  App.jsx           # UI: Sunrise (light) and Bento (dark) layouts
  calc.js           # Pure tax engine + symmetric dispatcher, no React
  calc.test.js      # 103 Vitest tests
  countries/        # 20 per-country engines with cited constants
  components/        # Presentational UI
LOGIC.md            # Spec — formulas, sources, bug history
.github/workflows/  # CI: lint + test + build on push/PR
```

## Develop

```bash
npm install
npm run dev          # vite dev server
npm test             # run all tests
npm run test:watch   # watch mode
npm run lint         # eslint (zero warnings)
npm run build        # production build
```

## Deploy

Pushes to `main` auto-deploy to Vercel (no config — Vite is auto-detected). The footer shows the deployed `vN.N.{commit-count} · {short-sha} · {date}` and links back to the commit on GitHub.

## Modeling boundaries

The engine is **directional**, not a tax filing. Filing status is single, equity comp / RSUs are not modeled, FX is a daily snapshot, and multi-line payroll (cash gross, taxable cash extras, non-cash imputed benefits) is collapsed into one cash `gross` plus an optional `imputedBenefits` input. The full list of simplifications and assumptions is in [LOGIC.md §5](./LOGIC.md#5-known-simplifications--assumptions).

## License

[MIT](./LICENSE)
