// Netherlands tax engine — single, employee under AOW age, 2026.
// Sources:
//   - https://www.belastingdienst.nl/
//   - https://www.rijksoverheid.nl/onderwerpen/belastingplan

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const NL_BOX1_2026 = [
  { max: 38883, rate: 0.357 },
  { max: 79137, rate: 0.3756 },
  { max: Infinity, rate: 0.495 },
];

export const NL_AHK_2026 = {
  max: 3115, full_threshold: 29736, taper_rate: 0.06398, zero_at: 78426,
};

const calcAHK = (income) => {
  const C = NL_AHK_2026;
  if (income <= C.full_threshold) return C.max;
  if (income >= C.zero_at) return 0;
  return Math.max(0, C.max - (income - C.full_threshold) * C.taper_rate);
};

const calcArbeidskorting = (income) => {
  // Piecewise per 2026 schedule (simplified).
  if (income <= 11965) return income * 0.08324;
  if (income <= 25845) return 996 + (income - 11965) * 0.31009;
  if (income <= 45592) return 5300 + (income - 25845) * 0.01950;
  if (income <= 132920) return 5685 + (income - 45592) * (-0.06510);
  return 0;
};

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  // Pensioenpremie pre-tax, capped pensioengevend salaris €137,800.
  const eePension = Math.min(grossLocal, 137800) * (eePensionPct / 100);
  const taxable = Math.max(0, grossLocal - eePension);
  const grossIT = calcBrackets(taxable, NL_BOX1_2026);
  const ahk = calcAHK(taxable);
  const arbk = Math.max(0, calcArbeidskorting(taxable));
  const incomeTax = Math.max(0, grossIT - ahk - arbk);

  // Box 1 already includes AOW + Anw + WLZ (social) folded in.
  const socialSec = 0;
  const netLocal = grossLocal - incomeTax - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'NL', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: eePension,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: eePension * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? incomeTax / grossLocal : 0,
    breakdown: [
      { label: 'Box 1 (incl. social)', amount: incomeTax, kind: 'tax' },
      { label: 'Pension EE', amount: eePension, kind: 'pension' },
    ],
  };
};
