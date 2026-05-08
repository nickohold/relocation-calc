// Singapore tax engine — citizen/PR under 55, YA 2026.
// Foreign-worker (no CPF) treatment is OUT OF SCOPE.
// Sources:
//   - https://www.iras.gov.sg/
//   - https://www.cpf.gov.sg/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const SG_BRACKETS = [
  { max: 20000,  rate: 0.00 },
  { max: 30000,  rate: 0.02 },
  { max: 40000,  rate: 0.035 },
  { max: 80000,  rate: 0.07 },
  { max: 120000, rate: 0.115 },
  { max: 160000, rate: 0.15 },
  { max: 200000, rate: 0.18 },
  { max: 240000, rate: 0.19 },
  { max: 280000, rate: 0.195 },
  { max: 320000, rate: 0.20 },
  { max: 500000, rate: 0.22 },
  { max: 1000000, rate: 0.23 },
  { max: Infinity, rate: 0.24 },
];
export const SG_EARNED_INCOME_RELIEF = 1000;
export const SG_CPF = { annual_wage_ceiling: 102000, rate_employee: 0.20 };
export const SG_SRS_CAP = 15300;

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  // CPF (employee 20% up to OW ceiling).
  const cpf = Math.min(grossLocal, SG_CPF.annual_wage_ceiling) * SG_CPF.rate_employee;
  // SRS-style additional retirement (capped).
  const eePension = Math.min(grossLocal * (eePensionPct / 100), SG_SRS_CAP);

  const taxable = Math.max(0, grossLocal - cpf - eePension - SG_EARNED_INCOME_RELIEF);
  const incomeTax = calcBrackets(taxable, SG_BRACKETS);
  const socialSec = cpf;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.SGD;
  const totalSavings = cpf + eePension;
  return {
    countryCode: 'SG', currency: 'SGD',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: cpf,
    netLocal, erContributions: 0, totalSavingsLocal: totalSavings,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavings * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Income Tax', amount: incomeTax, kind: 'tax' },
      { label: 'CPF (EE)', amount: cpf, kind: 'social' },
      { label: 'SRS', amount: eePension, kind: 'pension' },
    ],
  };
};
