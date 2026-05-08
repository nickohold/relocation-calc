// Poland tax engine — single, employee, 2026.
// Sources:
//   - https://www.podatki.gov.pl/
//   - https://www.zus.pl/

import { FX_USD_PER_UNIT } from '../fx.js';

export const PL_FIRST_BRACKET = 120000;
export const PL_LOW_RATE = 0.12;
export const PL_HIGH_RATE = 0.32;
export const PL_REDUCING_AMOUNT = 3600;        // operationalizes the PLN 30,000 tax-free allowance
export const PL_SOLIDARITY_LEVY_THRESHOLD = 1000000;
export const PL_SOLIDARITY_LEVY_RATE = 0.04;

export const PL_ZUS_RATE = 0.1371;
export const PL_ZUS_CAP = 282600;
export const PL_ZUS_RATE_ABOVE_CAP = 0.0245;
export const PL_HEALTH_RATE = 0.09;

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eePensionPct; void eeOtherPct;
  const eePension = 0;

  const zusCapped = Math.min(grossLocal, PL_ZUS_CAP) * PL_ZUS_RATE;
  const zusAbove = Math.max(0, grossLocal - PL_ZUS_CAP) * PL_ZUS_RATE_ABOVE_CAP;
  const zus = zusCapped + zusAbove;

  const health = (grossLocal - zus) * PL_HEALTH_RATE;

  const taxBase = Math.max(0, grossLocal - zus);
  const pitGross = taxBase <= PL_FIRST_BRACKET
    ? taxBase * PL_LOW_RATE - PL_REDUCING_AMOUNT
    : PL_FIRST_BRACKET * PL_LOW_RATE - PL_REDUCING_AMOUNT
      + (taxBase - PL_FIRST_BRACKET) * PL_HIGH_RATE;
  const pit = Math.max(0, pitGross);
  const solidarity = Math.max(0, grossLocal - PL_SOLIDARITY_LEVY_THRESHOLD) * PL_SOLIDARITY_LEVY_RATE;
  const incomeTax = pit + solidarity;
  const socialSec = zus + health;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.PLN;
  return {
    countryCode: 'PL', currency: 'PLN',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: 0, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: 0,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: 0, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'PIT', amount: incomeTax, kind: 'tax' },
      { label: 'ZUS + Health', amount: socialSec, kind: 'social' },
    ],
  };
};
