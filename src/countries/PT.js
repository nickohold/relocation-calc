// Portugal tax engine — regular resident, single, employee, 2026. NOT IFICI/RNH 2.0.
// Sources:
//   - https://www.portaldasfinancas.gov.pt/
//   - https://www.seg-social.pt/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const PT_BRACKETS_2026 = [
  { max: 7703,  rate: 0.1325 }, { max: 11623, rate: 0.165 }, { max: 16472, rate: 0.22 },
  { max: 21321, rate: 0.25 },   { max: 27146, rate: 0.32 },  { max: 39791, rate: 0.355 },
  { max: 51997, rate: 0.435 },  { max: 81199, rate: 0.45 },  { max: Infinity, rate: 0.48 },
];

export const PT_SOLIDARITY_SURCHARGE = [
  { max: 80000, rate: 0.00 }, { max: 250000, rate: 0.025 }, { max: Infinity, rate: 0.05 },
];

export const PT_DEDUCAO_ESPECIFICA = 4587;
export const PT_SOCIAL_SECURITY_RATE = 0.11;
export const PT_PPR_CREDIT_RATE = 0.20;

const pprMaxByAge = (age) => {
  if (age < 35) return 2000;
  if (age < 50) return 1750;
  return 1500;
};

export const compute = ({
  grossLocal,
  pprAmt = 2000,
  age = 35,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const ss = grossLocal * PT_SOCIAL_SECURITY_RATE;
  const pprMax = pprMaxByAge(age);
  const pprContribution = Math.min(Math.max(0, pprAmt), pprMax);
  const pprCredit = pprContribution * PT_PPR_CREDIT_RATE;
  // PPR is a tax credit, not deduction — does NOT reduce IT base.
  const eePension = pprContribution;

  const taxable = Math.max(0, grossLocal - PT_DEDUCAO_ESPECIFICA);
  const grossIT = calcBrackets(taxable, PT_BRACKETS_2026);
  const solidarity = calcBrackets(taxable, PT_SOLIDARITY_SURCHARGE);
  const incomeTax = Math.max(0, grossIT + solidarity - pprCredit);
  const socialSec = ss;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = pprContribution;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'PT', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'IRS + Solidarity', amount: incomeTax, kind: 'tax' },
      { label: 'Segurança Social', amount: socialSec, kind: 'social' },
      { label: 'PPR', amount: pprContribution, kind: 'pension' },
    ],
  };
};
