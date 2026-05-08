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
export const IE_EARNINGS_CAP = 115000;

const ageBandPct = (age) => {
  if (age < 30) return 15;
  if (age < 40) return 20;
  if (age < 50) return 25;
  if (age < 55) return 30;
  if (age < 60) return 35;
  return 40;
};

export const compute = ({
  grossLocal,
  eePensionPct = 5,
  erPensionPct = 0,
  age = 35,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const reckonable = Math.min(grossLocal, IE_EARNINGS_CAP);
  const eeCap = reckonable * (ageBandPct(age) / 100);
  const eeContribution = Math.min(grossLocal * (eePensionPct / 100), eeCap);
  const erContribution = grossLocal * (erPensionPct / 100);

  // Pension reduces IT base only, NOT USC or PRSI.
  const itBase = Math.max(0, grossLocal - eeContribution);
  const grossIT = calcBrackets(itBase, IE_BRACKETS_SINGLE);
  const incomeTax = Math.max(0, grossIT - IE_TAX_CREDITS_SINGLE_PAYE);

  const usc = calcBrackets(grossLocal, IE_USC_BANDS);
  const prsi = grossLocal * IE_PRSI_RATE;
  const socialSec = usc + prsi;

  const netLocal = grossLocal - incomeTax - socialSec - eeContribution;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = eeContribution + erContribution;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'IE', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eeContribution, eeOtherDeductions: 0,
    netLocal, erContributions: erContribution, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Income Tax', amount: incomeTax, kind: 'tax' },
      { label: 'USC', amount: usc, kind: 'social' },
      { label: 'PRSI', amount: prsi, kind: 'social' },
      { label: 'Pension EE', amount: eeContribution, kind: 'pension' },
      { label: 'Pension ER', amount: erContribution, kind: 'pension' },
    ],
  };
};
