// United Arab Emirates tax engine — no personal income tax.
// EOSG (End-of-Service Gratuity) is the mandatory employer-side severance — UAE's
// pitzuyim equivalent. Modeled here as an annual accrual on Basic salary.
// Sources:
//   - https://www.tax.gov.ae/
//   - https://u.ae/en/information-and-services/finance-and-investment/taxation
//   - https://www.iloe.ae/

import { FX_USD_PER_UNIT } from '../fx.js';

export const AE_ILOE_ANNUAL = 120;

export const compute = ({
  grossLocal,
  basicPctOfGross = 60,
  yearsOfService = 3,
  includeEosgInSavings = true,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const ilo = grossLocal > 192000 ? AE_ILOE_ANNUAL : 60;
  const socialSec = grossLocal > 0 ? ilo : 0;

  const basic = grossLocal * (basicPctOfGross / 100);
  // 21 days/yr accrual for first 5 yrs (~5.83% of basic), 30 days/yr after (~8.33%).
  const accrualPct = yearsOfService < 5 ? 0.0583 : 0.0833;
  const eosgAccrual = basic * accrualPct;

  const netLocal = grossLocal - socialSec;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = includeEosgInSavings ? eosgAccrual : 0;
  const fx = FX_USD_PER_UNIT.AED;
  return {
    countryCode: 'AE', currency: 'AED',
    grossLocal,
    incomeTax: 0, socialSec, localTax: 0,
    eePensionLocal: 0, eeOtherDeductions: 0,
    netLocal, erContributions: eosgAccrual, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? socialSec / grossLocal : 0,
    breakdown: [
      { label: 'No income tax', amount: 0, kind: 'tax' },
      { label: 'ILOE (unemployment ins.)', amount: socialSec, kind: 'social' },
      { label: 'EOSG (end-of-service gratuity)', amount: eosgAccrual, kind: 'pension' },
    ],
  };
};

export const meta = {
  countryCode: 'AE',
  countryName: 'United Arab Emirates',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'No personal income tax',
    brackets: [{ upTo: Infinity, rate: 0.00, note: 'UAE has no personal income tax.' }],
    notes: ['9% Corporate Tax does not apply to employment income.'],
  },
  socialSecurity: {
    label: 'ILOE (unemployment insurance, mandatory for employees)',
    rates: [
      { label: 'ILOE (basic salary ≤ AED 16,000/mo)', rate: 0, threshold: 'AED 60/yr fixed' },
      { label: 'ILOE (basic salary > AED 16,000/mo)', rate: 0, threshold: `AED ${AE_ILOE_ANNUAL}/yr fixed` },
    ],
  },
  deductions: [],
  retirementCaps: [
    { label: 'EOSG accrual (years 1–4)', amount: 5.83, currency: '%', note: '21 days/yr of basic salary.' },
    { label: 'EOSG accrual (year 5+)', amount: 8.33, currency: '%', note: '30 days/yr of basic salary.' },
  ],
  localTax: null,
  simplifications: [
    'EOSG (End-of-Service Gratuity) modeled as annual accrual on Basic salary; Basic % of gross is configurable.',
    'No DIFC/ADGM-specific savings schemes modeled.',
  ],
  sources: [
    { name: 'UAE Federal Tax Authority', url: 'https://www.tax.gov.ae/' },
    { name: 'u.ae — Taxation', url: 'https://u.ae/en/information-and-services/finance-and-investment/taxation' },
    { name: 'ILOE — Unemployment Insurance', url: 'https://www.iloe.ae/' },
  ],
};
