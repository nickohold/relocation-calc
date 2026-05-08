// Norway tax engine — single, Oslo, 2026.
// Sources:
//   - https://www.skatteetaten.no/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const NO_TRINNSKATT = [
  { max: 226100, rate: 0.00 },
  { max: 318300, rate: 0.017 },
  { max: 725050, rate: 0.04 },
  { max: 980100, rate: 0.137 },
  { max: 1467200, rate: 0.168 },
  { max: Infinity, rate: 0.178 },
];

export const NO_ALMINNELIG_RATE = 0.22;
export const NO_TRYGDEAVGIFT = 0.076;
export const NO_PERSONFRADRAG = 114540;
export const NO_MINSTEFRADRAG_RATE = 0.46;
export const NO_MINSTEFRADRAG_CAP = 95700;
export const NO_IPS_CAP = 25000;

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  const eePension = Math.min(grossLocal * (eePensionPct / 100), NO_IPS_CAP);
  const minstefradrag = Math.min(grossLocal * NO_MINSTEFRADRAG_RATE, NO_MINSTEFRADRAG_CAP);
  const alminneligBase = Math.max(0, grossLocal - minstefradrag - NO_PERSONFRADRAG - eePension);
  const alminnelig = alminneligBase * NO_ALMINNELIG_RATE;
  const trinn = calcBrackets(grossLocal, NO_TRINNSKATT);
  const trygde = grossLocal * NO_TRYGDEAVGIFT;

  const incomeTax = alminnelig + trinn;
  const socialSec = trygde;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.NOK;
  return {
    countryCode: 'NO', currency: 'NOK',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: eePension,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: eePension * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Alminnelig + Trinnskatt', amount: incomeTax, kind: 'tax' },
      { label: 'Trygdeavgift', amount: socialSec, kind: 'social' },
      { label: 'IPS', amount: eePension, kind: 'pension' },
    ],
  };
};
