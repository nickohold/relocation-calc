// France tax engine — single, employee, 2026 (revenus 2025).
// SIMPLIFIED: employee social charges modeled as flat ~22% of brut (non-cadre approximation).
// Sources:
//   - https://www.impots.gouv.fr/
//   - https://www.urssaf.fr/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const FR_BRACKETS_2026 = [
  { max: 11600, rate: 0.00 },
  { max: 29579, rate: 0.11 },
  { max: 84577, rate: 0.30 },
  { max: 181917, rate: 0.41 },
  { max: Infinity, rate: 0.45 },
];

export const FR_CEHR = [
  { max: 250000, rate: 0.00 },
  { max: 500000, rate: 0.03 },
  { max: Infinity, rate: 0.04 },
];

export const FR_ABATTEMENT = { rate: 0.10, min: 504, max: 14426 };
export const FR_FLAT_COTIS = 0.22;     // simplification
export const FR_CSG_DEDUCTIBLE = 0.068;
export const FR_CSG_NONDEDUCT = 0.024;
export const FR_CRDS = 0.005;

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  const eePension = grossLocal * (eePensionPct / 100);

  // Flat 22% employee cotisations approximation (excludes CSG/CRDS).
  const cotisations = grossLocal * FR_FLAT_COTIS;
  // CSG/CRDS on 98.25% of brut (1.75% abattement).
  const csgBase = grossLocal * 0.9825;
  const csgDed = csgBase * FR_CSG_DEDUCTIBLE;
  const csgNd = csgBase * FR_CSG_NONDEDUCT;
  const crds = csgBase * FR_CRDS;
  const socialSec = cotisations + csgDed + csgNd + crds;

  // Income tax base: gross - cotisations - deductible CSG - 10% abattement on remainder
  const afterCotis = grossLocal - cotisations - csgDed - eePension;
  const abat = Math.min(FR_ABATTEMENT.max, Math.max(FR_ABATTEMENT.min, afterCotis * FR_ABATTEMENT.rate));
  const itBase = Math.max(0, afterCotis - abat);
  const grossIT = calcBrackets(itBase, FR_BRACKETS_2026);
  const cehr = calcBrackets(grossLocal, FR_CEHR);
  const incomeTax = grossIT + cehr;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'FR', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: eePension,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: eePension * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Impôt sur le revenu', amount: incomeTax, kind: 'tax' },
      { label: 'Cotisations + CSG/CRDS', amount: socialSec, kind: 'social' },
      { label: 'Pension EE', amount: eePension, kind: 'pension' },
    ],
  };
};
