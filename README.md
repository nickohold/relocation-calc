# Relocation Architect

Compares the financial reality of staying in Israel versus moving to a US metro (NYC, NJ, Austin, Houston). Tracks both **liquid cash flow** and **wealth accumulation** so a "more pocket money" answer doesn't mask a net-worth loss.

Live: https://relocation-calc.vercel.app/

## What it does

Given Israeli salary + contribution percentages and a US offer, it computes:
- Israeli net take-home, mandatory savings (pension + keren + severance), and liquid cash flow
- US net take-home with FICA, federal, state, and city taxes
- The optimal 401(k) personal contribution % to match the Israeli savings rate
- A **Wealth Gap** warning when the IRS 401(k) cap can't keep up with Israeli forced savings — this means more pocket money but a net-worth loss
- A monthly side-by-side breakdown in two layouts (light/dark)

## Stack

- React 19 + Vite 8
- Tailwind CSS v4
- lucide-react icons
- Vitest for the calc engine

## Source of truth for the math

All tax brackets, BTL/Health rates, contribution caps, and dependency graphs live in [LOGIC.md](./LOGIC.md). If the code disagrees with that document, one of them is wrong — file an issue. Bug-history table at the bottom records past regressions and their fixes.

Constants are centralized in `src/calc.js → CONSTANTS`. Update them together when refreshing for a new tax year.

## Project layout

```
src/
  App.jsx           # UI: Sunrise (light) and Bento (dark) layouts
  calc.js           # Pure tax engine, no React
  calc.test.js      # 50 vitest tests
LOGIC.md            # Spec — formulas, sources, bug history
.github/workflows/  # CI runs tests + build on push/PR
```

## Develop

```bash
npm install
npm run dev          # vite dev server
npm test             # run all tests
npm run test:watch   # watch mode
npm run build        # production build
```

## Deploy

Pushes to `main` auto-deploy to Vercel (no config — Vite is auto-detected). The footer shows the deployed `vN.N.{commit-count} · {short-sha} · {date}` and links back to the commit on GitHub.

## Modeling boundaries

The engine is **directional**, not a tax filing. Filing status is single, equity comp / RSUs are not modeled, FX is static, and Israeli payroll has multiple income lines (cash gross, taxable cash extras, non-cash imputed benefits) that the model collapses into one cash `gross` plus an optional `imputedBenefits` input. Full list of simplifications and assumptions in [LOGIC.md §5](./LOGIC.md#5-known-simplifications--assumptions).
