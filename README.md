# Relocation Architect

[![CI](https://github.com/nickohold/relocation-calc/actions/workflows/ci.yml/badge.svg)](https://github.com/nickohold/relocation-calc/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen.svg)](https://relocation-savings-calculator.vercel.app/)
[![React 19](https://img.shields.io/badge/React-19-149eca.svg)](https://react.dev/)

**Will moving abroad actually make you wealthier — or just hand you more monthly cash while quietly eroding your net worth?** That question has a counterintuitive answer, and this tool exists to compute it honestly.

**Live:** https://relocation-savings-calculator.vercel.app/

## Why this exists

I had to decide whether to leave Israel for a US offer. The naive comparison — "the US salary is bigger, so I come out ahead" — is wrong, and dangerously so. A bigger paycheck in a higher-tax, higher-rent city can leave you with more spending money *and* a worse retirement trajectory at the same time. Most relocation calculators only show you the first half of that picture (take-home pay) and hide the second.

So I built one that refuses to. It tracks two separate axes, because a move is only a real win if **both** hold:

1. **Liquid cash flow** — what's left after taxes, mandatory savings, rent, and lifestyle burn.
2. **Wealth accumulation** — what's actually flowing into long-term retirement vehicles (pension, keren hishtalmut, 401(k), and their equivalents).

## The Wealth Gap

The core insight is that different countries force you to save at different *velocities*, and a destination's legal caps can make it impossible to match the one you're leaving.

Israel's system pushes a large fraction of gross salary into pension and keren hishtalmut automatically. The US 401(k) has a hard annual cap ($24,500 in 2026). Above a certain salary, the US simply will not *let* you save as fast as Israel was making you — so you take home more cash each month while building less wealth each year. The tool surfaces this as an explicit **Wealth Gap** warning: more pocket money, lower net worth. That trade is invisible on a take-home-pay calculator, and it's the whole reason this one exists.

## From one decision to twenty countries

It started as a single Israel→US question. Generalizing it into a symmetric engine that compares **any two of 20 countries / 53 cities** was the interesting engineering problem — and it's what makes the repo worth reading.

```
src/countries/<CC>.js   Per-country engine: compute() + meta + cited constants
        │                (US, IL, UK, IE, DE, FR, NL, CH, CA, AU, SG, JP,
        │                 ES, IT, PT, SE, DK, NO, AE, PL)
        ▼
src/calc.js             Dispatcher: runComparison() assembles a symmetric
        │                source-vs-destination result, computes the Wealth Gap.
        ▼                Pure functions, no React.
src/App.jsx             UI state + two themed layouts (Sunrise / Bento).
src/components/*         Presentational breakdown, summary, controls.
```

Each country is a self-contained module with its real tax brackets, statutory caps, and social-contribution rules, every constant cited to a primary source. Adding a country is a localized change — drop in `src/countries/<CC>.js`, register it, and the engine and UI pick it up unchanged.

## Source of truth for the math

Every bracket, rate, cap, and assumption lives in [LOGIC.md](./LOGIC.md), with per-country source citations and a bug-history table recording past regressions and the test that now locks each fix. If the code and that document ever disagree, one of them is a bug — file an issue.

## Quality

- **131 tests** (Vitest) over the calc engine — bracket math, statutory caps, per-country effective-rate regression locks, and reference vectors cross-checked against published figures (Israeli payslip, German §32a Grundtabelle, Swedish SKV 433, UK HMRC, US IRS, Australian ATO, Italian IRPEF).
- **CI** runs lint → test → build on every push and PR.
- **Zero-warning lint** (ESLint flat config, React Hooks rules enforced), and a top-level error boundary so a bad input degrades gracefully instead of white-screening.

## Project layout

```
src/
  App.jsx           # UI: Sunrise (light) and Bento (dark) layouts
  calc.js           # Pure tax engine + symmetric dispatcher + Wealth Gap, no React
  calc.test.js      # engine tests
  countries/        # 20 per-country engines with cited constants
  components/        # Presentational UI
  fxLive.js         # live ECB/Frankfurter FX with 24h cache + static fallback
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

The engine is **directional**, not a tax filing. Filing status is single, equity comp / RSUs are not modeled, FX is a daily snapshot, and multi-line payroll (cash gross, taxable cash extras, non-cash imputed benefits) is collapsed into one cash `gross` plus an optional `imputedBenefits` input. The full list of simplifications and assumptions, per country, is in [LOGIC.md §5](./LOGIC.md#5-known-simplifications--assumptions).

## License

[MIT](./LICENSE)
