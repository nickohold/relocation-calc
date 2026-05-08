// Sweden tax engine — single, Stockholm, 2026.
// SIMPLIFIED: grundavdrag and jobbskatteavdrag piecewise functions approximated to single values.
// Sources:
//   - https://www.skatteverket.se/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const SE_MUNICIPAL_RATE_STOCKHOLM = 0.3055;
export const SE_NATIONAL_BRACKETS = [
  { max: 643000, rate: 0.00 },
  { max: Infinity, rate: 0.20 },
];
export const SE_GRUNDAVDRAG_DEFAULT = 17400;
export const SE_JOBBSKATTEAVDRAG_HIGH = 35000;
export const SE_IBA_2026 = 83400;
export const SE_THRESHOLD_75 = 7.5 * SE_IBA_2026;

export const compute = ({
  grossLocal,
  eeSalaryExchangePct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const itpUnder = Math.min(grossLocal, SE_THRESHOLD_75) * 0.045;
  const itpOver = Math.max(0, grossLocal - SE_THRESHOLD_75) * 0.30;
  const tjanstepension = itpUnder + itpOver;
  const salaryExchange = grossLocal * (eeSalaryExchangePct / 100);
  const eePension = salaryExchange; // pre-tax for EE

  const taxable = Math.max(0, grossLocal - eePension - SE_GRUNDAVDRAG_DEFAULT);

  const municipal = taxable * SE_MUNICIPAL_RATE_STOCKHOLM;
  const national = calcBrackets(taxable, SE_NATIONAL_BRACKETS);
  const incomeTax = Math.max(0, national + municipal - SE_JOBBSKATTEAVDRAG_HIGH);
  const socialSec = 0;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = tjanstepension + salaryExchange;
  const fx = FX_USD_PER_UNIT.SEK;
  return {
    countryCode: 'SE', currency: 'SEK',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: tjanstepension, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? incomeTax / grossLocal : 0,
    breakdown: [
      { label: 'Kommunal + Statlig (net of credit)', amount: incomeTax, kind: 'tax' },
      { label: 'Tjänstepension (ITP1)', amount: tjanstepension, kind: 'pension' },
      ...(salaryExchange > 0 ? [{ label: 'Löneväxling', amount: salaryExchange, kind: 'pension' }] : []),
    ],
  };
};

export const meta = {
  countryCode: 'SE',
  countryName: 'Sweden',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'Income Tax (Stockholm: kommunal + statlig)',
    brackets: [
      { upTo: SE_NATIONAL_BRACKETS[0].max, rate: SE_MUNICIPAL_RATE_STOCKHOLM, note: 'Kommunalskatt only (Stockholm)' },
      { upTo: Infinity, rate: SE_MUNICIPAL_RATE_STOCKHOLM + 0.20, note: 'Kommunal + Statlig (20% national above ~SEK 643k)' },
    ],
    notes: [
      `Stockholm kommunalskatt ${(SE_MUNICIPAL_RATE_STOCKHOLM * 100).toFixed(2)}%. Other municipalities differ.`,
      'Statlig skatt 20% on income above ~SEK 643,000 (national).',
      `Jobbskatteavdrag (high-income approximation: SEK ${SE_JOBBSKATTEAVDRAG_HIGH.toLocaleString()}) reduces tax.`,
    ],
  },
  socialSecurity: {
    label: 'Employee social charges effectively zero (employer pays arbetsgivaravgift)',
    rates: [],
  },
  deductions: [
    { label: 'Grundavdrag (default)', amount: SE_GRUNDAVDRAG_DEFAULT, currency: 'SEK', note: 'Approximation; real schedule is piecewise.' },
    { label: 'Jobbskatteavdrag (high-income approx)', amount: SE_JOBBSKATTEAVDRAG_HIGH, currency: 'SEK' },
  ],
  retirementCaps: [
    { label: 'IBA 2026 (income base amount)', amount: SE_IBA_2026, currency: 'SEK' },
    { label: 'ITP1 threshold (7.5 × IBA)', amount: SE_THRESHOLD_75, currency: 'SEK' },
  ],
  localTax: null,
  simplifications: [
    'Only Stockholm kommunalskatt rate modeled.',
    'Grundavdrag and jobbskatteavdrag piecewise functions approximated to single values.',
    'ITP1 modeled as 4.5% under threshold + 30% over.',
  ],
  sources: [
    { name: 'Skatteverket', url: 'https://www.skatteverket.se/' },
  ],
};
