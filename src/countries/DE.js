// Germany tax engine — single, employee, 2026. APPROXIMATION of §32a EStG (zone 2/3 are quadratic).
// Sources:
//   - https://www.bundesfinanzministerium.de/ (Einkommensteuertarif §32a)
//   - https://www.deutsche-rentenversicherung.de/ (BBG-RV)
//   - https://www.gkv-spitzenverband.de/ (BBG-KV)

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const DE_BRACKETS_SINGLE = [
  { max: 12348, rate: 0.00 },
  { max: 17800, rate: 0.19 },
  { max: 69878, rate: 0.33 },
  { max: 277825, rate: 0.42 },
  { max: Infinity, rate: 0.45 },
];

export const DE_SOLI_RATE = 0.055;
export const DE_SOLI_FREIGRENZE_TAX = 19950;

export const DE_SOC_2026 = {
  pension: 0.093,
  unemployment: 0.013,
  health_base: 0.073,
  health_zusatz: 0.0145,
  ltc: 0.024,
  ltc_childless_surcharge: 0.006,
  pension_unemp_cap: 101400,
  health_ltc_cap: 69750,
};
export const DE_WERBUNGSKOSTEN_PAUSCHALE = 1230;

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  const C = DE_SOC_2026;
  const eePension = grossLocal * (eePensionPct / 100);
  // Rürup-style pension deduction (capped at €30,826/yr for simplicity).
  const pensionDeductible = Math.min(eePension, 30826);

  const taxable = Math.max(0, grossLocal - pensionDeductible - DE_WERBUNGSKOSTEN_PAUSCHALE);
  const grossIT = calcBrackets(taxable, DE_BRACKETS_SINGLE);
  const soli = grossIT > DE_SOLI_FREIGRENZE_TAX ? grossIT * DE_SOLI_RATE : 0;
  const incomeTax = grossIT + soli;

  // Employee social: pension+unemployment capped at BBG-RV; health+ltc at BBG-KV.
  const peuBase = Math.min(grossLocal, C.pension_unemp_cap);
  const hltcBase = Math.min(grossLocal, C.health_ltc_cap);
  const pension = peuBase * C.pension;
  const unemp = peuBase * C.unemployment;
  const health = hltcBase * (C.health_base + C.health_zusatz);
  const ltc = hltcBase * (C.ltc + C.ltc_childless_surcharge);
  const socialSec = pension + unemp + health + ltc;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'DE', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: eePension,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: eePension * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Einkommensteuer + Soli', amount: incomeTax, kind: 'tax' },
      { label: 'Sozialversicherung', amount: socialSec, kind: 'social' },
      { label: 'Pension EE', amount: eePension, kind: 'pension' },
    ],
  };
};
