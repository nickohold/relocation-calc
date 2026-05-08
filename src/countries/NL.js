// Netherlands tax engine — single, employee under AOW age, 2026.
// Sources:
//   - https://www.belastingdienst.nl/
//   - https://www.rijksoverheid.nl/onderwerpen/belastingplan

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const NL_BOX1_2026 = [
  { max: 38883, rate: 0.3575 },  // 2026 schijf 1: 8.10% IB + 27.65% premies (belastingdienst.nl)
  { max: 78426, rate: 0.3756 },  // 2026 box-1 bracket 2 cap per belastingdienst.nl
  { max: Infinity, rate: 0.495 },
];

export const NL_AHK_2026 = {
  max: 3115, full_threshold: 29736, taper_rate: 0.06398, zero_at: 78426,
};

export const NL_AOW_FRANCHISE = 19172;
export const NL_PENSION_BASE_CAP = 137800;

const calcAHK = (income) => {
  const C = NL_AHK_2026;
  if (income <= C.full_threshold) return C.max;
  if (income >= C.zero_at) return 0;
  return Math.max(0, C.max - (income - C.full_threshold) * C.taper_rate);
};

const calcArbeidskorting = (income) => {
  if (income <= 11965) return income * 0.08324;
  if (income <= 25845) return 996 + (income - 11965) * 0.31009;
  if (income <= 45592) return 5300 + (income - 25845) * 0.01950;
  if (income <= 132920) return 5685 + (income - 45592) * (-0.06510);
  return 0;
};

export const compute = ({
  grossLocal,
  eePensionPct = 7.5,
  erPensionPct = 15.9,
  lijfrenteAmt = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const pensionBase = Math.max(0, Math.min(grossLocal, NL_PENSION_BASE_CAP) - NL_AOW_FRANCHISE);
  const eeContribution = pensionBase * (eePensionPct / 100);
  const erContribution = pensionBase * (erPensionPct / 100);
  const lijfrente = Math.max(0, lijfrenteAmt);

  const taxable = Math.max(0, grossLocal - eeContribution - lijfrente);
  const grossIT = calcBrackets(taxable, NL_BOX1_2026);
  const ahk = calcAHK(taxable);
  const arbk = Math.max(0, calcArbeidskorting(taxable));
  const incomeTax = Math.max(0, grossIT - ahk - arbk);

  const socialSec = 0;
  const netLocal = grossLocal - incomeTax - eeContribution - lijfrente;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = eeContribution + erContribution + lijfrente;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'NL', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eeContribution, eeOtherDeductions: lijfrente,
    netLocal, erContributions: erContribution, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? incomeTax / grossLocal : 0,
    breakdown: [
      { label: 'Box 1 (incl. social)', amount: incomeTax, kind: 'tax' },
      { label: '2nd-pillar EE', amount: eeContribution, kind: 'pension' },
      { label: '2nd-pillar ER', amount: erContribution, kind: 'pension' },
      ...(lijfrente > 0 ? [{ label: 'Lijfrente', amount: lijfrente, kind: 'pension' }] : []),
    ],
  };
};

export const meta = {
  countryCode: 'NL',
  countryName: 'Netherlands',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'Box 1 (income from work, under AOW age)',
    brackets: NL_BOX1_2026.map((b) => ({ upTo: b.max, rate: b.rate })),
    notes: [
      'Box 1 rates already include national social insurance (volksverzekeringen).',
      'Heffingskorting (AHK) and Arbeidskorting reduce computed tax.',
    ],
  },
  socialSecurity: {
    label: 'Built into Box 1 (volksverzekeringen) — no separate EE social charges',
    rates: [],
  },
  deductions: [
    { label: 'Algemene heffingskorting (max)', amount: NL_AHK_2026.max, currency: 'EUR', note: `Tapers from €${NL_AHK_2026.full_threshold.toLocaleString()} to €${NL_AHK_2026.zero_at.toLocaleString()}.` },
    { label: 'AOW franchise (pension base offset)', amount: NL_AOW_FRANCHISE, currency: 'EUR' },
  ],
  retirementCaps: [
    { label: 'Pension base cap', amount: NL_PENSION_BASE_CAP, currency: 'EUR', note: '2nd-pillar contributions computed on (gross capped) − AOW franchise.' },
  ],
  localTax: null,
  simplifications: [
    'Arbeidskorting modeled as piecewise per 2026 tables.',
    '30%-ruling not applied; assumes regular resident.',
  ],
  sources: [
    { name: 'Belastingdienst', url: 'https://www.belastingdienst.nl/' },
    { name: 'Rijksoverheid — Belastingplan', url: 'https://www.rijksoverheid.nl/onderwerpen/belastingplan' },
  ],
};
