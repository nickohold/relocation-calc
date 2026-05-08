// Singapore tax engine — citizen/PR or foreigner (EP/S-Pass), YA 2026.
// Sources:
//   - https://www.iras.gov.sg/
//   - https://www.cpf.gov.sg/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const SG_BRACKETS = [
  { max: 20000,  rate: 0.00 }, { max: 30000,  rate: 0.02 }, { max: 40000,  rate: 0.035 },
  { max: 80000,  rate: 0.07 }, { max: 120000, rate: 0.115 }, { max: 160000, rate: 0.15 },
  { max: 200000, rate: 0.18 }, { max: 240000, rate: 0.19 }, { max: 280000, rate: 0.195 },
  { max: 320000, rate: 0.20 }, { max: 500000, rate: 0.22 }, { max: 1000000, rate: 0.23 },
  { max: Infinity, rate: 0.24 },
];
export const SG_EARNED_INCOME_RELIEF = 1000;
export const SG_CPF = { annual_wage_ceiling: 102000 };
export const SG_SRS_CAP_LOCAL = 15300;
export const SG_SRS_CAP_FOREIGN = 35700;

// CPF rates by age (2026): under 55 EE 20% / ER 17%, 55-60 18/16, 60-65 12.5/12.5.
const cpfRatesByAge = (age) => {
  if (age < 55) return { ee: 20, er: 17 };
  if (age < 60) return { ee: 18, er: 16 };
  if (age < 65) return { ee: 12.5, er: 12.5 };
  return { ee: 7.5, er: 9 };
};

export const compute = ({
  grossLocal,
  srsAmt = 0,
  isForeigner = false,
  age = 35,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const rates = isForeigner ? { ee: 0, er: 0 } : cpfRatesByAge(age);
  const cpfWage = Math.min(grossLocal, SG_CPF.annual_wage_ceiling);
  const cpfEe = cpfWage * (rates.ee / 100);
  const cpfEr = cpfWage * (rates.er / 100);

  const srsCap = isForeigner ? SG_SRS_CAP_FOREIGN : SG_SRS_CAP_LOCAL;
  const srsContribution = Math.min(Math.max(0, srsAmt), srsCap);
  const eePension = srsContribution; // SRS is pre-tax

  const taxable = Math.max(0, grossLocal - cpfEe - eePension - SG_EARNED_INCOME_RELIEF);
  const incomeTax = calcBrackets(taxable, SG_BRACKETS);
  const socialSec = cpfEe;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = cpfEe + cpfEr + srsContribution;
  const fx = FX_USD_PER_UNIT.SGD;
  return {
    countryCode: 'SG', currency: 'SGD',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: cpfEe,
    netLocal, erContributions: cpfEr, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Income Tax', amount: incomeTax, kind: 'tax' },
      { label: 'CPF EE', amount: cpfEe, kind: 'pension' },
      { label: 'CPF ER', amount: cpfEr, kind: 'pension' },
      ...(srsContribution > 0 ? [{ label: 'SRS', amount: srsContribution, kind: 'pension' }] : []),
    ],
  };
};
