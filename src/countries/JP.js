// Japan tax engine — single, Tokyo Kyokai Kenpo, CY 2026.
// Sources:
//   - https://www.nta.go.jp/
//   - https://www.kyoukaikenpo.or.jp/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const JP_NATIONAL_BRACKETS = [
  { max: 1950000, rate: 0.05 }, { max: 3300000, rate: 0.10 },
  { max: 6950000, rate: 0.20 }, { max: 9000000, rate: 0.23 },
  { max: 18000000, rate: 0.33 }, { max: 40000000, rate: 0.40 },
  { max: Infinity, rate: 0.45 },
];

export const JP_RECONSTRUCTION_SURTAX = 0.021;
export const JP_INHABITANT_FLAT_RATE = 0.10;
export const JP_INHABITANT_PER_CAPITA = 5000;
export const JP_BASIC_DEDUCTION = 580000;
export const JP_EMPLOYMENT_INCOME_DEDUCTION_CAP = 1950000;
export const JP_HEALTH_RATE = 0.04955;
export const JP_PENSION_RATE = 0.0915;
export const JP_PENSION_REM_CAP_MONTHLY = 650000;
export const JP_HEALTH_REM_CAP_MONTHLY = 1390000;
export const JP_EMPLOYMENT_INS_RATE = 0.0055;
export const JP_DC_MONTHLY_CAP = 62000;

export const compute = ({
  grossLocal,
  iDecoMonthlyJpy = 23000,
  dcCorpMonthlyJpy = 0,
  age = 35,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void age;
  const monthly = grossLocal / 12;
  const pensionMonthly = Math.min(monthly, JP_PENSION_REM_CAP_MONTHLY);
  const healthMonthly = Math.min(monthly, JP_HEALTH_REM_CAP_MONTHLY);
  const epiAnnual = pensionMonthly * 12 * JP_PENSION_RATE;
  const healthAnnual = healthMonthly * 12 * JP_HEALTH_RATE;
  const empIns = grossLocal * JP_EMPLOYMENT_INS_RATE;
  const socialSec = epiAnnual + healthAnnual + empIns;

  // Combined ¥62k/mo cap on iDeCo + corporate DC matching.
  const iDecoAnnual = Math.min(Math.max(0, iDecoMonthlyJpy) * 12, JP_DC_MONTHLY_CAP * 12);
  const dcRoom = Math.max(0, JP_DC_MONTHLY_CAP * 12 - iDecoAnnual);
  const dcCorpAnnual = Math.min(Math.max(0, dcCorpMonthlyJpy) * 12, dcRoom);
  const eePension = iDecoAnnual + dcCorpAnnual;

  const taxable = Math.max(0,
    grossLocal - JP_EMPLOYMENT_INCOME_DEDUCTION_CAP - JP_BASIC_DEDUCTION - socialSec - eePension);
  const nationalIT = calcBrackets(taxable, JP_NATIONAL_BRACKETS);
  const surtax = nationalIT * JP_RECONSTRUCTION_SURTAX;
  const inhabitant = taxable * JP_INHABITANT_FLAT_RATE + JP_INHABITANT_PER_CAPITA;

  const incomeTax = nationalIT + surtax;
  const localTax = inhabitant;

  const netLocal = grossLocal - incomeTax - localTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  // EPI EE half is statutory pension savings; voluntary iDeCo + corp DC are extra.
  const totalSavingsLocal = epiAnnual + iDecoAnnual + dcCorpAnnual;
  const fx = FX_USD_PER_UNIT.JPY;
  return {
    countryCode: 'JP', currency: 'JPY',
    grossLocal, incomeTax, socialSec, localTax,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + localTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'National IT + surtax', amount: incomeTax, kind: 'tax' },
      { label: 'Inhabitant Tax', amount: localTax, kind: 'tax' },
      { label: 'Pension + Health + EI', amount: socialSec, kind: 'social' },
      { label: 'EPI (statutory pension)', amount: epiAnnual, kind: 'pension' },
      ...(iDecoAnnual > 0 ? [{ label: 'iDeCo', amount: iDecoAnnual, kind: 'pension' }] : []),
      ...(dcCorpAnnual > 0 ? [{ label: 'Corp DC matching', amount: dcCorpAnnual, kind: 'pension' }] : []),
    ],
  };
};
