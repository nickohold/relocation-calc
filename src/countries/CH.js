// Switzerland tax engine — single, 2026. Zurich (ZRH) and Geneva (GVA) only.
// Geneva ICC is approximated; the official continuous-formula coefficients vary year-to-year.
// Sources:
//   - https://www.estv.admin.ch/ (federal DBG)
//   - https://www.zh.ch/de/steuern-finanzen.html (Zurich canton)
//   - https://www.ge.ch/c/impots-particuliers (Geneva ICC — approximated)

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const CH_FEDERAL_BRACKETS_SINGLE = [
  { max: 15000, rate: 0.00 },
  { max: 32800, rate: 0.0077 },
  { max: 42900, rate: 0.0088 },
  { max: 57200, rate: 0.0264 },
  { max: 75200, rate: 0.0297 },
  { max: 81000, rate: 0.0594 },
  { max: 107400, rate: 0.066 },
  { max: 139600, rate: 0.088 },
  { max: 182600, rate: 0.110 },
  { max: 783300, rate: 0.132 },
  { max: Infinity, rate: 0.115 },
];

export const CH_ZH_BRACKETS_EINFACH_SINGLE = [
  { max: 7000, rate: 0.00 }, { max: 12000, rate: 0.02 }, { max: 16800, rate: 0.03 },
  { max: 24800, rate: 0.04 }, { max: 34500, rate: 0.05 }, { max: 45700, rate: 0.06 },
  { max: 58800, rate: 0.07 }, { max: 76400, rate: 0.08 }, { max: 110400, rate: 0.09 },
  { max: 144100, rate: 0.10 }, { max: 197200, rate: 0.11 }, { max: 263300, rate: 0.12 },
  { max: Infinity, rate: 0.13 },
];
export const CH_ZH_MULTIPLIER = 2.20;

export const CH_GE_BRACKETS_EINFACH_SINGLE = [
  { max: 18000, rate: 0.00 }, { max: 50000, rate: 0.085 }, { max: 100000, rate: 0.13 },
  { max: 200000, rate: 0.165 }, { max: 615000, rate: 0.180 }, { max: Infinity, rate: 0.190 },
];
export const CH_GE_MULTIPLIER = 1.93;

export const CH_SOC_2026 = {
  ahv_iv_eo: 0.053,
  alv_low: 0.011,
  alv_solidarity: 0.005,
  alv_cap: 148200,
};
export const CH_SAULE3A_MAX_WITH_PK = 7258;
export const CH_BVG_COORD_DEDUCTION = 26460;
export const CH_BVG_UPPER = 90720; // coord salary max base = 90,720 - 26,460 = 64,260

const bvgPctByAge = (age) => {
  if (age < 35) return 7;
  if (age < 45) return 10;
  if (age < 55) return 15;
  return 18;
};

export const compute = ({
  grossLocal,
  eeBvgPct = 0,
  erBvgPct = 0,
  pillar3aAmt = 7258,
  buyInsAmt = 0,
  age = 35,
  rentLocal = 0,
  miscBurnLocal = 0,
  locationKey,
}) => {
  const C = CH_SOC_2026;
  const coordSalary = Math.max(0, Math.min(grossLocal, CH_BVG_UPPER) - CH_BVG_COORD_DEDUCTION);
  // Auto by age (split half/half) unless overridden.
  const totalAgePct = bvgPctByAge(age);
  const eePct = eeBvgPct > 0 ? eeBvgPct : totalAgePct / 2;
  const erPct = erBvgPct > 0 ? erBvgPct : totalAgePct / 2;
  const bvgEe = coordSalary * (eePct / 100);
  const bvgEr = coordSalary * (erPct / 100);

  const pillar3a = Math.min(Math.max(0, pillar3aAmt), CH_SAULE3A_MAX_WITH_PK);
  const buyIns = Math.max(0, buyInsAmt);

  // Pre-tax IT base: bvgEe + pillar3a + buyIns are all deductible.
  const eePension = bvgEe + pillar3a + buyIns;
  const taxable = Math.max(0, grossLocal - eePension);
  const fed = calcBrackets(taxable, CH_FEDERAL_BRACKETS_SINGLE);

  let cantonal = 0;
  if (locationKey === 'CH-ZRH') {
    cantonal = calcBrackets(taxable, CH_ZH_BRACKETS_EINFACH_SINGLE) * CH_ZH_MULTIPLIER;
  } else if (locationKey === 'CH-GVA') {
    cantonal = calcBrackets(taxable, CH_GE_BRACKETS_EINFACH_SINGLE) * CH_GE_MULTIPLIER;
  }

  const ahv = grossLocal * C.ahv_iv_eo;
  const alv = Math.min(grossLocal, C.alv_cap) * C.alv_low
    + Math.max(0, grossLocal - C.alv_cap) * C.alv_solidarity;
  const socialSec = ahv + alv;

  const incomeTax = fed;
  const localTax = cantonal;

  const netLocal = grossLocal - incomeTax - socialSec - localTax - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = bvgEe + bvgEr + pillar3a + buyIns;
  const fx = FX_USD_PER_UNIT.CHF;
  return {
    countryCode: 'CH', currency: 'CHF',
    grossLocal, incomeTax, socialSec, localTax,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: bvgEr, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec + localTax) / grossLocal : 0,
    breakdown: [
      { label: 'Federal (DBG)', amount: fed, kind: 'tax' },
      { label: 'Cantonal + Communal', amount: cantonal, kind: 'tax' },
      { label: 'AHV/IV/EO + ALV', amount: socialSec, kind: 'social' },
      { label: 'BVG/LPP EE', amount: bvgEe, kind: 'pension' },
      { label: 'BVG/LPP ER', amount: bvgEr, kind: 'pension' },
      { label: 'Säule 3a', amount: pillar3a, kind: 'pension' },
      ...(buyIns > 0 ? [{ label: 'BVG buy-ins', amount: buyIns, kind: 'pension' }] : []),
    ],
  };
};
