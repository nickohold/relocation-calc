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
export const DE_SOLI_FREIGRENZE_TAX = 20350;  // 2026 — §3 Abs.3 SolZG 1995 (gesetze-im-internet.de)

export const DE_SOC_2026 = {
  pension: 0.093,
  unemployment: 0.013,
  health_base: 0.073,
  health_zusatz: 0.0145,
  ltc: 0.018,                       // 2026: Pflegeversicherung employee with children (TK; total 3.6% / 2)
  ltc_childless_surcharge: 0.006,   // Childless 23+ surcharge → 2.4% total childless
  pension_unemp_cap: 101400,
  health_ltc_cap: 69750,
};
export const DE_WERBUNGSKOSTEN_PAUSCHALE = 1230;
export const DE_BBG_RV_2026 = 101400;

export const compute = ({
  grossLocal,
  bavPct = 4,
  erBavPct = 0,
  riesterFlag = false,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const C = DE_SOC_2026;
  const bbg = DE_BBG_RV_2026;
  const bavTaxFreeCap = 0.08 * bbg; // €8,112
  // bAV (Entgeltumwandlung) = EE salary-conversion to occupational pension.
  const bavContribution = Math.min(grossLocal * (bavPct / 100), bbg);
  const erBavContribution = Math.min(grossLocal * (erBavPct / 100), bbg);
  const riester = riesterFlag ? 2100 : 0;
  // EE-side savings = bav (employee). For income tax base, deduct EE bav clamped at tax-free cap + Riester.
  const pensionDeductible = Math.min(bavContribution, bavTaxFreeCap) + riester;

  const taxable = Math.max(0, grossLocal - pensionDeductible - DE_WERBUNGSKOSTEN_PAUSCHALE);
  const grossIT = calcBrackets(taxable, DE_BRACKETS_SINGLE);
  const soli = grossIT > DE_SOLI_FREIGRENZE_TAX ? grossIT * DE_SOLI_RATE : 0;
  const incomeTax = grossIT + soli;

  const peuBase = Math.min(grossLocal, C.pension_unemp_cap);
  const hltcBase = Math.min(grossLocal, C.health_ltc_cap);
  const pension = peuBase * C.pension;
  const unemp = peuBase * C.unemployment;
  const health = hltcBase * (C.health_base + C.health_zusatz);
  const ltc = hltcBase * (C.ltc + C.ltc_childless_surcharge);
  const socialSec = pension + unemp + health + ltc;

  const netLocal = grossLocal - incomeTax - socialSec - bavContribution;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = bavContribution + erBavContribution + riester;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'DE', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: bavContribution, eeOtherDeductions: 0,
    netLocal, erContributions: erBavContribution, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Einkommensteuer + Soli', amount: incomeTax, kind: 'tax' },
      { label: 'Sozialversicherung', amount: socialSec, kind: 'social' },
      { label: 'bAV EE', amount: bavContribution, kind: 'pension' },
      { label: 'bAV ER', amount: erBavContribution, kind: 'pension' },
      ...(riester > 0 ? [{ label: 'Riester', amount: riester, kind: 'pension' }] : []),
    ],
  };
};

export const meta = {
  countryCode: 'DE',
  countryName: 'Germany',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'Einkommensteuer (§32a EStG, single — APPROXIMATED)',
    brackets: DE_BRACKETS_SINGLE.map((b) => ({ upTo: b.max, rate: b.rate })),
    notes: [
      'Real §32a uses quadratic zones 2 and 3 — flat-rate approximation here.',
      `Solidaritätszuschlag (${(DE_SOLI_RATE * 100).toFixed(1)}%) applies when gross IT > €${DE_SOLI_FREIGRENZE_TAX.toLocaleString()}.`,
    ],
  },
  socialSecurity: {
    label: 'Sozialversicherung (employee share, 2026)',
    rates: [
      { label: 'Pension (RV)', rate: DE_SOC_2026.pension, threshold: `up to BBG €${DE_SOC_2026.pension_unemp_cap.toLocaleString()}` },
      { label: 'Unemployment (ALV)', rate: DE_SOC_2026.unemployment, threshold: `up to BBG €${DE_SOC_2026.pension_unemp_cap.toLocaleString()}` },
      { label: 'Health (KV base + Zusatz)', rate: DE_SOC_2026.health_base + DE_SOC_2026.health_zusatz, threshold: `up to €${DE_SOC_2026.health_ltc_cap.toLocaleString()}` },
      { label: 'Long-term care (PV, childless)', rate: DE_SOC_2026.ltc + DE_SOC_2026.ltc_childless_surcharge, threshold: `up to €${DE_SOC_2026.health_ltc_cap.toLocaleString()}` },
    ],
  },
  deductions: [
    { label: 'Werbungskostenpauschale', amount: DE_WERBUNGSKOSTEN_PAUSCHALE, currency: 'EUR' },
  ],
  retirementCaps: [
    { label: 'BBG-RV (pension/unemp ceiling)', amount: DE_BBG_RV_2026, currency: 'EUR' },
    { label: 'bAV tax-free cap (8% × BBG)', amount: 0.08 * DE_BBG_RV_2026, currency: 'EUR' },
    { label: 'Riester max (if eligible)', amount: 2100, currency: 'EUR' },
  ],
  localTax: null,
  simplifications: [
    'Income-tax brackets approximated as flat rates per zone (real §32a is quadratic in zones 2-3).',
    'Childless LTC surcharge applied; family/Kirchensteuer not modeled.',
    'bAV via Entgeltumwandlung; Riester applied only when flag set.',
  ],
  sources: [
    { name: 'Bundesfinanzministerium (BMF) — Einkommensteuertarif', url: 'https://www.bundesfinanzministerium.de/' },
    { name: 'Deutsche Rentenversicherung — BBG', url: 'https://www.deutsche-rentenversicherung.de/' },
    { name: 'GKV-Spitzenverband — KV-Beiträge', url: 'https://www.gkv-spitzenverband.de/' },
  ],
};
