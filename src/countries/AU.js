// Australia tax engine — single resident, FY 2025-26.
// Sources:
//   - https://www.ato.gov.au/
//   - https://www.ato.gov.au/rates/individual-income-tax-rates/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const AU_BRACKETS = [
  { max: 18200, rate: 0.00 }, { max: 45000, rate: 0.16 },
  { max: 135000, rate: 0.30 }, { max: 190000, rate: 0.37 },
  { max: Infinity, rate: 0.45 },
];
export const AU_MEDICARE_LEVY = 0.02;
export const AU_MLS_SINGLE = [
  { max: 101000, rate: 0.00 }, { max: 118000, rate: 0.01 },
  { max: 158000, rate: 0.0125 }, { max: Infinity, rate: 0.015 },
];
export const AU_SUPER_RATE = 0.12;
export const AU_SUPER_CONCESSIONAL_CAP = 32500;
export const AU_MSCB_OTE = 65070 * 4;

const calcMLS = (income) => {
  for (const b of AU_MLS_SINGLE) if (income <= b.max) return income * b.rate;
  return income * 0.015;
};

export const compute = ({
  grossLocal,
  salarySacrificePct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const sgContribution = Math.min(grossLocal, AU_MSCB_OTE) * AU_SUPER_RATE;
  const ssRoom = Math.max(0, AU_SUPER_CONCESSIONAL_CAP - sgContribution);
  const ssContribution = Math.min(grossLocal * (salarySacrificePct / 100), ssRoom);
  const eePension = ssContribution; // pre-tax for EE only

  const taxable = Math.max(0, grossLocal - eePension);
  const grossIT = calcBrackets(taxable, AU_BRACKETS);
  const medicare = grossLocal > 32500 ? taxable * AU_MEDICARE_LEVY : 0;
  const mls = calcMLS(taxable);
  const incomeTax = grossIT;
  const socialSec = medicare + mls;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = sgContribution + ssContribution;
  const fx = FX_USD_PER_UNIT.AUD;
  return {
    countryCode: 'AU', currency: 'AUD',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: sgContribution, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Income Tax', amount: incomeTax, kind: 'tax' },
      { label: 'Medicare + MLS', amount: socialSec, kind: 'social' },
      { label: 'Super Guarantee (ER)', amount: sgContribution, kind: 'pension' },
      { label: 'Salary Sacrifice (EE)', amount: ssContribution, kind: 'pension' },
    ],
  };
};
