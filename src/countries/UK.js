// UK tax engine — single, no dependents, employee. Tax year 2025/26 (6 Apr 2025 – 5 Apr 2026).
// Sources:
//   - https://www.gov.uk/income-tax-rates
//   - https://www.gov.uk/national-insurance-rates-letters
//   - https://www.gov.uk/government/publications/income-tax-personal-allowance

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const UK_BRACKETS = [
  { max: 12570, rate: 0.00 },
  { max: 50270, rate: 0.20 },
  { max: 125140, rate: 0.40 },
  { max: Infinity, rate: 0.45 },
];

export const UK_NI = {
  primaryThreshold: 12570,
  upperEarningsLimit: 50270,
  rateMain: 0.08,
  rateAboveUEL: 0.02,
};

const UK_PA_FULL = 12570;

const calcUKTax = (taxableIncome) => {
  // Personal Allowance taper: above £100k, PA reduced by £1 per £2 over.
  let pa = UK_PA_FULL;
  if (taxableIncome > 100000) {
    pa = Math.max(0, UK_PA_FULL - (taxableIncome - 100000) / 2);
  }
  const aboveAllowance = Math.max(0, taxableIncome - pa);
  // Apply brackets ignoring the zero band (since we already subtracted PA).
  const bands = [
    { max: 50270 - 12570, rate: 0.20 },
    { max: 125140 - 12570, rate: 0.40 },
    { max: Infinity, rate: 0.45 },
  ];
  return calcBrackets(aboveAllowance, bands);
};

const calcUKNI = (gross) => {
  const lower = Math.max(0, Math.min(gross, UK_NI.upperEarningsLimit) - UK_NI.primaryThreshold);
  const upper = Math.max(0, gross - UK_NI.upperEarningsLimit);
  return lower * UK_NI.rateMain + upper * UK_NI.rateAboveUEL;
};

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  const eePension = grossLocal * (eePensionPct / 100);
  // Pension treated as occupational (pre-tax only, NOT pre-NI). Salary sacrifice = future toggle.
  const taxableIncome = Math.max(0, grossLocal - eePension);
  const incomeTax = calcUKTax(taxableIncome);
  const ni = calcUKNI(grossLocal);

  const netLocal = grossLocal - incomeTax - ni - eePension;
  const fx = FX_USD_PER_UNIT.GBP;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = eePension; // no employer match modeled by default

  return {
    countryCode: 'UK', currency: 'GBP',
    grossLocal,
    incomeTax,
    socialSec: ni,
    localTax: 0,
    eePensionLocal: eePension,
    eeOtherDeductions: 0,
    netLocal,
    erContributions: 0,
    totalSavingsLocal,
    rentLocal: rentLocal * 12,
    miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx,
    totalSavingsUSD: totalSavingsLocal * fx,
    liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + ni) / grossLocal : 0,
    breakdown: [
      { label: 'Income Tax', amount: incomeTax, kind: 'tax' },
      { label: 'National Insurance', amount: ni, kind: 'social' },
      { label: 'Pension EE', amount: eePension, kind: 'pension' },
    ],
  };
};
