// Ireland tax engine — single, employee, 2026.
// Sources:
//   - https://www.revenue.ie/
//   - https://www.citizensinformation.ie/en/money-and-tax/tax/income-tax/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const IE_BRACKETS_SINGLE = [
  { max: 44000, rate: 0.20 },
  { max: Infinity, rate: 0.40 },
];
export const IE_TAX_CREDITS_SINGLE_PAYE = 4000;
export const IE_USC_BANDS = [
  { max: 12012, rate: 0.005 },
  { max: 28700, rate: 0.02 },
  { max: 70044, rate: 0.03 },
  { max: Infinity, rate: 0.08 },
];
export const IE_PRSI_RATE = 0.042375;

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  const eePension = grossLocal * (eePensionPct / 100);
  // Pension reduces IT base only, NOT USC or PRSI.
  const itBase = Math.max(0, grossLocal - eePension);
  const grossIT = calcBrackets(itBase, IE_BRACKETS_SINGLE);
  const incomeTax = Math.max(0, grossIT - IE_TAX_CREDITS_SINGLE_PAYE);

  const usc = calcBrackets(grossLocal, IE_USC_BANDS);
  const prsi = grossLocal * IE_PRSI_RATE;
  const socialSec = usc + prsi;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'IE', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: eePension,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: eePension * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Income Tax', amount: incomeTax, kind: 'tax' },
      { label: 'USC', amount: usc, kind: 'social' },
      { label: 'PRSI', amount: prsi, kind: 'social' },
      { label: 'Pension EE', amount: eePension, kind: 'pension' },
    ],
  };
};
