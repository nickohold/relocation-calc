// Sweden tax engine — single, Stockholm, 2026.
// Implements the real piecewise grundavdrag and jobbskatteavdrag (under-66) per
// Skatteverket SKV 433 (Teknisk beskrivning, 2026 utgåva 36).
// Sources:
//   - https://www.skatteverket.se/
//   - https://www.skatteverket.se/download/18.1522bf3f19aea8075ba55c/1766385913260/teknisk-beskrivning-skv-433-2026-utgava-36.pdf
//   - https://www.skatteverket.se/privat/skatter/beloppochprocent/2026.4.1522bf3f19aea8075ba21.html

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const SE_MUNICIPAL_RATE_STOCKHOLM = 0.3055;
// Brytpunkt for statlig skatt 2026 = 660,400 SEK (Skatteverket).
export const SE_NATIONAL_BRACKETS = [
  { max: 643000, rate: 0.00 },
  { max: Infinity, rate: 0.20 },
];
export const SE_PBB_2026 = 59200;          // Prisbasbelopp 2026
export const SE_IBA_2026 = 83400;
export const SE_THRESHOLD_75 = 7.5 * SE_IBA_2026;
// Jobbskatteavdrag is reduced against the part of kommunalskatt that excludes
// begravningsavgift + trossamfund (~1.16 percentage points). See SKV 433 §7.5.2.
export const SE_KI_OFFSET = 0.0116;

// 2026 grundavdrag (under 66) per SKV 433 §Grundavdrag.
// Output is rounded UP to nearest SEK 100 and capped by FFI.
export const calcGrundavdrag2026 = (ffi) => {
  const PBB = SE_PBB_2026;
  let ga;
  if (ffi <= 0.99 * PBB) {
    // Floor at 0.423 PBB per table; FFI cap applied below.
    ga = 0.423 * PBB;
  } else if (ffi <= 2.72 * PBB) {
    ga = 0.423 * PBB + (ffi - 0.99 * PBB) * 0.20;
  } else if (ffi <= 3.11 * PBB) {
    ga = 0.77 * PBB;
  } else if (ffi <= 7.88 * PBB) {
    ga = 0.77 * PBB - (ffi - 3.11 * PBB) * 0.10;
  } else {
    ga = 0.293 * PBB;
  }
  ga = Math.min(ga, Math.max(0, ffi));
  // Round up to nearest 100.
  return Math.ceil(ga / 100) * 100;
};

// 2026 jobbskatteavdrag (under 66) per SKV 433 §7.5.2.
// Returns the SEK reduction against kommunal income tax. The reduction is
// (basis - GA) * KI, where KI = kommunalskattesats - 0.0116, and `basis`
// depends piecewise on arbetsinkomst:
//   AI ≤ 0.91 PBB:                          basis = AI
//   0.91 < AI ≤ 3.24 PBB:                   basis = 0.91 PBB + 0.3874 * (AI - 0.91 PBB)
//   3.24 < AI ≤ 8.08 PBB:                   basis = 1.813 PBB + 0.2510 * (AI - 3.24 PBB)
//   AI > 8.08 PBB:                          basis = 3.027 PBB
// Floor at 0; arbetsinkomst rounded down to 100 first; output floored to whole SEK.
export const calcJobbskatteavdrag2026 = (arbetsinkomst, kommunalRate) => {
  const PBB = SE_PBB_2026;
  const AI = Math.floor(Math.max(0, arbetsinkomst) / 100) * 100;
  let basis;
  if (AI <= 0.91 * PBB) {
    basis = AI;
  } else if (AI <= 3.24 * PBB) {
    basis = 0.91 * PBB + 0.3874 * (AI - 0.91 * PBB);
  } else if (AI <= 8.08 * PBB) {
    basis = 1.813 * PBB + 0.2510 * (AI - 3.24 * PBB);
  } else {
    basis = 3.027 * PBB;
  }
  const GA = calcGrundavdrag2026(AI);
  const KI = Math.max(0, kommunalRate - SE_KI_OFFSET);
  const reduction = Math.max(0, basis - GA) * KI;
  return Math.floor(reduction);
};

export const compute = ({
  grossLocal,
  eeSalaryExchangePct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const itpUnder = Math.min(grossLocal, SE_THRESHOLD_75) * 0.045;
  const itpOver = Math.max(0, grossLocal - SE_THRESHOLD_75) * 0.30;
  const tjanstepension = itpUnder + itpOver;
  const salaryExchange = grossLocal * (eeSalaryExchangePct / 100);
  const eePension = salaryExchange; // pre-tax for EE

  // FFI = arbetsinkomst after pre-tax pension reductions (löneväxling).
  const ffi = Math.max(0, grossLocal - eePension);
  const grundavdrag = calcGrundavdrag2026(ffi);
  const taxable = Math.max(0, ffi - grundavdrag);

  const municipal = taxable * SE_MUNICIPAL_RATE_STOCKHOLM;
  const national = calcBrackets(taxable, SE_NATIONAL_BRACKETS);
  const jobbskatteavdrag = calcJobbskatteavdrag2026(ffi, SE_MUNICIPAL_RATE_STOCKHOLM);
  // Jobbskatteavdrag reduces only kommunal income tax, never below zero.
  const municipalNet = Math.max(0, municipal - jobbskatteavdrag);
  const incomeTax = municipalNet + national;
  const socialSec = 0;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = tjanstepension + salaryExchange;
  const fx = FX_USD_PER_UNIT.SEK;
  return {
    countryCode: 'SE', currency: 'SEK',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: tjanstepension, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? incomeTax / grossLocal : 0,
    breakdown: [
      { label: 'Kommunal + Statlig (net of credit)', amount: incomeTax, kind: 'tax' },
      { label: 'Tjänstepension (ITP1)', amount: tjanstepension, kind: 'pension' },
      ...(salaryExchange > 0 ? [{ label: 'Löneväxling', amount: salaryExchange, kind: 'pension' }] : []),
    ],
  };
};

export const meta = {
  countryCode: 'SE',
  countryName: 'Sweden',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'Income Tax (Stockholm: kommunal + statlig)',
    brackets: [
      { upTo: SE_NATIONAL_BRACKETS[0].max, rate: SE_MUNICIPAL_RATE_STOCKHOLM, note: 'Kommunalskatt only (Stockholm)' },
      { upTo: Infinity, rate: SE_MUNICIPAL_RATE_STOCKHOLM + 0.20, note: 'Kommunal + Statlig (20% national above ~SEK 643k)' },
    ],
    notes: [
      `Stockholm kommunalskatt ${(SE_MUNICIPAL_RATE_STOCKHOLM * 100).toFixed(2)}%. Other municipalities differ.`,
      'Statlig skatt 20% on income above ~SEK 643,000 (national).',
      'Jobbskatteavdrag computed via real piecewise function (SKV 433 §7.5.2, under-66) — phases in to ~26.1k SEK ceiling at AI ≈ 8.08 × PBB, then phases out.',
    ],
  },
  socialSecurity: {
    label: 'Employee social charges effectively zero (employer pays arbetsgivaravgift)',
    rates: [],
  },
  deductions: [
    { label: 'Grundavdrag (piecewise, SKV 433)', amount: 0.77 * SE_PBB_2026, currency: 'SEK', note: 'Max value (~SEK 45,584) shown; real schedule is piecewise on FFI.' },
    { label: 'Jobbskatteavdrag (piecewise, SKV 433 §7.5.2)', amount: 3.027 * SE_PBB_2026, currency: 'SEK', note: 'Max basis (~SEK 179,198) shown; reduction = (basis − GA) × (KI − 1.16pp).' },
  ],
  retirementCaps: [
    { label: 'IBA 2026 (income base amount)', amount: SE_IBA_2026, currency: 'SEK' },
    { label: 'ITP1 threshold (7.5 × IBA)', amount: SE_THRESHOLD_75, currency: 'SEK' },
  ],
  localTax: null,
  simplifications: [
    'Only Stockholm kommunalskatt rate modeled.',
    'Grundavdrag and jobbskatteavdrag implemented per SKV 433 (under-66 schedule); over-66 schedule not modeled.',
    'ITP1 modeled as 4.5% under threshold + 30% over.',
  ],
  sources: [
    { name: 'Skatteverket', url: 'https://www.skatteverket.se/' },
  ],
};
