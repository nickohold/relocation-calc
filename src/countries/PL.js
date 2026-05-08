// Poland tax engine — single, employee, 2026.
// Sources:
//   - https://www.podatki.gov.pl/
//   - https://www.zus.pl/

import { FX_USD_PER_UNIT } from '../fx.js';

export const PL_FIRST_BRACKET = 120000;
export const PL_LOW_RATE = 0.12;
export const PL_HIGH_RATE = 0.32;
export const PL_REDUCING_AMOUNT = 3600;
export const PL_SOLIDARITY_LEVY_THRESHOLD = 1000000;
export const PL_SOLIDARITY_LEVY_RATE = 0.04;

export const PL_ZUS_RATE = 0.1371;
export const PL_ZUS_CAP = 282600;
export const PL_ZUS_RATE_ABOVE_CAP = 0.0245;
export const PL_HEALTH_RATE = 0.09;
export const PL_IKZE_CAP = 10407;
export const PL_PPK_STATE_SUBSIDY = 240;

export const compute = ({
  grossLocal,
  ppkEePct = 2,
  ppkErPct = 1.5,
  ikzeAmt = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const ppkEe = grossLocal * (ppkEePct / 100);
  const ppkEr = grossLocal * (ppkErPct / 100);
  const ikzeCapped = Math.min(Math.max(0, ikzeAmt), PL_IKZE_CAP);

  const zusCapped = Math.min(grossLocal, PL_ZUS_CAP) * PL_ZUS_RATE;
  const zusAbove = Math.max(0, grossLocal - PL_ZUS_CAP) * PL_ZUS_RATE_ABOVE_CAP;
  const zus = zusCapped + zusAbove;

  // Only IKZE is pre-tax; PPK EE is post-tax.
  const taxBase = Math.max(0, grossLocal - zus - ikzeCapped);
  const pitGross = taxBase <= PL_FIRST_BRACKET
    ? taxBase * PL_LOW_RATE - PL_REDUCING_AMOUNT
    : PL_FIRST_BRACKET * PL_LOW_RATE - PL_REDUCING_AMOUNT
      + (taxBase - PL_FIRST_BRACKET) * PL_HIGH_RATE;
  const pit = Math.max(0, pitGross);
  const solidarity = Math.max(0, grossLocal - PL_SOLIDARITY_LEVY_THRESHOLD) * PL_SOLIDARITY_LEVY_RATE;
  const incomeTax = pit + solidarity;
  const health = (grossLocal - zus) * PL_HEALTH_RATE;
  const socialSec = zus + health;

  const netLocal = grossLocal - incomeTax - socialSec - ppkEe - ikzeCapped;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = ppkEe + ppkEr + ikzeCapped + PL_PPK_STATE_SUBSIDY;
  const fx = FX_USD_PER_UNIT.PLN;
  return {
    countryCode: 'PL', currency: 'PLN',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: ppkEe, eeOtherDeductions: ikzeCapped,
    netLocal, erContributions: ppkEr, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'PIT', amount: incomeTax, kind: 'tax' },
      { label: 'ZUS + Health', amount: socialSec, kind: 'social' },
      { label: 'PPK EE', amount: ppkEe, kind: 'pension' },
      { label: 'PPK ER', amount: ppkEr, kind: 'pension' },
      ...(ikzeCapped > 0 ? [{ label: 'IKZE', amount: ikzeCapped, kind: 'pension' }] : []),
      { label: 'PPK state subsidy', amount: PL_PPK_STATE_SUBSIDY, kind: 'pension' },
    ],
  };
};

export const meta = {
  countryCode: 'PL',
  countryName: 'Poland',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'PIT (single)',
    brackets: [
      { upTo: PL_FIRST_BRACKET, rate: PL_LOW_RATE, note: `Less reducing amount PLN ${PL_REDUCING_AMOUNT.toLocaleString()}` },
      { upTo: Infinity, rate: PL_HIGH_RATE },
    ],
    notes: [
      `Solidarity levy ${(PL_SOLIDARITY_LEVY_RATE * 100).toFixed(0)}% on income above PLN ${PL_SOLIDARITY_LEVY_THRESHOLD.toLocaleString()}.`,
    ],
  },
  socialSecurity: {
    label: 'ZUS + Health (employee)',
    rates: [
      { label: 'ZUS (capped)', rate: PL_ZUS_RATE, threshold: `up to PLN ${PL_ZUS_CAP.toLocaleString()}` },
      { label: 'ZUS (above cap, sickness)', rate: PL_ZUS_RATE_ABOVE_CAP, threshold: `above PLN ${PL_ZUS_CAP.toLocaleString()}` },
      { label: 'Health (NFZ)', rate: PL_HEALTH_RATE, threshold: 'on (gross − ZUS)' },
    ],
  },
  deductions: [
    { label: 'PIT reducing amount', amount: PL_REDUCING_AMOUNT, currency: 'PLN' },
  ],
  retirementCaps: [
    { label: 'IKZE deductible cap', amount: PL_IKZE_CAP, currency: 'PLN' },
    { label: 'PPK state annual subsidy', amount: PL_PPK_STATE_SUBSIDY, currency: 'PLN' },
  ],
  localTax: null,
  simplifications: [
    'Only IKZE is pre-tax; PPK EE is post-tax.',
    'Health contribution applied at flat 9% on (gross − ZUS) regardless of business form.',
  ],
  sources: [
    { name: 'podatki.gov.pl', url: 'https://www.podatki.gov.pl/' },
    { name: 'ZUS', url: 'https://www.zus.pl/' },
  ],
};
