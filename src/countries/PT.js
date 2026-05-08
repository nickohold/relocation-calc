// Portugal tax engine — regular resident, single, employee, 2026. NOT IFICI/RNH 2.0.
// Sources:
//   - https://www.portaldasfinancas.gov.pt/
//   - https://www.seg-social.pt/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

// IRS 2026 — Orçamento do Estado 2026 (Lei 73-A/2025), Art. 68 CIRS.
// Verified vs PwC Tax Summaries Portugal (last reviewed 2026-01-05).
export const PT_BRACKETS_2026 = [
  { max: 8342,  rate: 0.125 }, { max: 12587, rate: 0.157 }, { max: 17838, rate: 0.212 },
  { max: 23089, rate: 0.241 }, { max: 29397, rate: 0.311 }, { max: 43090, rate: 0.349 },
  { max: 46566, rate: 0.431 }, { max: 86634, rate: 0.446 }, { max: Infinity, rate: 0.48 },
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

export const meta = {
  countryCode: 'PT',
  countryName: 'Portugal',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'IRS (regular resident, single)',
    brackets: PT_BRACKETS_2026.map((b) => ({ upTo: b.max, rate: b.rate })),
    notes: ['Solidarity surcharge: +2.5% above €80k, +5% above €250k.'],
  },
  socialSecurity: {
    label: 'Segurança Social (employee share)',
    rates: [
      { label: 'Social Security', rate: PT_SOCIAL_SECURITY_RATE, threshold: 'all gross' },
    ],
  },
  deductions: [
    { label: 'Dedução específica (employment)', amount: PT_DEDUCAO_ESPECIFICA, currency: 'EUR' },
  ],
  retirementCaps: [
    { label: 'PPR cap (under 35)', amount: 2000, currency: 'EUR' },
    { label: 'PPR cap (35–49)', amount: 1750, currency: 'EUR' },
    { label: 'PPR cap (50+)', amount: 1500, currency: 'EUR' },
    { label: 'PPR tax credit rate', amount: PT_PPR_CREDIT_RATE * 100, currency: '%' },
  ],
  localTax: null,
  simplifications: [
    'Regular resident only — IFICI / former NHR / RNH 2.0 regimes not applied.',
    'PPR is a tax credit (post-IRS), not a base reduction.',
    'No dependents, no health/education itemizations.',
  ],
  sources: [
    { name: 'Portal das Finanças', url: 'https://www.portaldasfinancas.gov.pt/' },
    { name: 'Segurança Social', url: 'https://www.seg-social.pt/' },
  ],
};
