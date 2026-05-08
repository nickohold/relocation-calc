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
export const NO_IPS_CAP = 25000;       // 2026: raised from 15,000 (skatteetaten.no)
export const NO_G_2025 = 130160;       // G as of 1 May 2025 (nav.no); May 2026 trygdeoppgjør pending

export const compute = ({
  grossLocal,
  erOtpPct = 5,
  eeOtpPct = 0,
  ipsAmt = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  const G = NO_G_2025;
  const tier1 = Math.max(0, Math.min(grossLocal, 7.1 * G) - G);
  const tier2 = Math.max(0, Math.min(grossLocal, 12 * G) - 7.1 * G);
  const erTier1 = tier1 * (erOtpPct / 100);
  const erTier2 = tier2 * (Math.max(erOtpPct, 18.1) / 100);
  const erContribution = erTier1 + erTier2;
  const eeContribution = (tier1 + tier2) * (eeOtpPct / 100);
  const ipsCapped = Math.min(Math.max(0, ipsAmt), NO_IPS_CAP);

  const eePension = eeContribution + ipsCapped;
  const minstefradrag = Math.min(grossLocal * NO_MINSTEFRADRAG_RATE, NO_MINSTEFRADRAG_CAP);
  const alminneligBase = Math.max(0, grossLocal - minstefradrag - NO_PERSONFRADRAG - eePension);
  const alminnelig = alminneligBase * NO_ALMINNELIG_RATE;
  const trinn = calcBrackets(grossLocal, NO_TRINNSKATT);
  const trygde = grossLocal * NO_TRYGDEAVGIFT;

  const incomeTax = alminnelig + trinn;
  const socialSec = trygde;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = erContribution + eeContribution + ipsCapped;
  const fx = FX_USD_PER_UNIT.NOK;
  return {
    countryCode: 'NO', currency: 'NOK',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: erContribution, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Alminnelig + Trinnskatt', amount: incomeTax, kind: 'tax' },
      { label: 'Trygdeavgift', amount: socialSec, kind: 'social' },
      { label: 'OTP ER', amount: erContribution, kind: 'pension' },
      ...(eeContribution > 0 ? [{ label: 'OTP EE', amount: eeContribution, kind: 'pension' }] : []),
      ...(ipsCapped > 0 ? [{ label: 'IPS', amount: ipsCapped, kind: 'pension' }] : []),
    ],
  };
};

export const meta = {
  countryCode: 'NO',
  countryName: 'Norway',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'Income Tax (Oslo)',
    brackets: [
      { upTo: Infinity, rate: NO_ALMINNELIG_RATE, note: 'Alminnelig inntekt flat (after deductions)' },
      ...NO_TRINNSKATT.map((b) => ({ upTo: b.max, rate: b.rate, note: 'Trinnskatt (added on top of alminnelig)' })),
    ],
    notes: ['Alminnelig 22% applies to taxable income net of personfradrag and minstefradrag. Trinnskatt is additive.'],
  },
  socialSecurity: {
    label: 'Trygdeavgift (employee national insurance)',
    rates: [
      { label: 'Trygdeavgift', rate: NO_TRYGDEAVGIFT, threshold: 'all gross' },
    ],
  },
  deductions: [
    { label: 'Personfradrag', amount: NO_PERSONFRADRAG, currency: 'NOK' },
    { label: 'Minstefradrag rate', amount: NO_MINSTEFRADRAG_RATE * 100, currency: '%' },
    { label: 'Minstefradrag cap', amount: NO_MINSTEFRADRAG_CAP, currency: 'NOK' },
  ],
  retirementCaps: [
    { label: 'IPS deductible cap', amount: NO_IPS_CAP, currency: 'NOK' },
    { label: 'G (folketrygdens grunnbeløp)', amount: NO_G_2025, currency: 'NOK', note: 'Used for OTP coordination thresholds.' },
  ],
  localTax: null,
  simplifications: [
    'Oslo only.',
    'OTP modeled with statutory cliff at 7.1G (rate stepup to 18.1%).',
    'No formueskatt (wealth tax) modeled.',
  ],
  sources: [
    { name: 'Skatteetaten', url: 'https://www.skatteetaten.no/' },
  ],
};
