// Spain tax engine — single, employee, 2026. Madrid (MAD) and Barcelona/Catalonia (CAT).
// Sources:
//   - https://sede.agenciatributaria.gob.es/
//   - https://www.comunidad.madrid/
//   - https://atc.gencat.cat/
//   - https://www.seg-social.es/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const ES_STATE_BRACKETS = [
  { max: 12450, rate: 0.095 }, { max: 20200, rate: 0.12 }, { max: 35200, rate: 0.15 },
  { max: 60000, rate: 0.185 }, { max: 300000, rate: 0.225 }, { max: Infinity, rate: 0.245 },
];

export const ES_MAD_BRACKETS = [
  { max: 13362, rate: 0.085 }, { max: 18004, rate: 0.107 }, { max: 35425, rate: 0.128 },
  { max: 57320, rate: 0.174 }, { max: Infinity, rate: 0.205 },
];

export const ES_CAT_BRACKETS = [
  { max: 12500, rate: 0.095 }, { max: 22000, rate: 0.125 }, { max: 33000, rate: 0.16 },
  { max: 53000, rate: 0.19 }, { max: 90000, rate: 0.215 }, { max: 120000, rate: 0.235 },
  { max: 175000, rate: 0.245 }, { max: Infinity, rate: 0.255 },
];

export const ES_PERSONAL_ALLOWANCE = 5550;
export const ES_SS_RATE = 0.065;
export const ES_SS_BASE_CAP_ANNUAL = 61214.40;
export const ES_PENSION_INDIV_CAP = 1500;
export const ES_PENSION_EMPLEO_CAP = 8500;

export const compute = ({
  grossLocal,
  planPensionesAmt = 1500,
  erPlanEmpleoAmt = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
  locationKey,
}) => {
  const planContribution = Math.min(Math.max(0, planPensionesAmt), ES_PENSION_INDIV_CAP);
  const erPlanContribution = Math.min(Math.max(0, erPlanEmpleoAmt), ES_PENSION_EMPLEO_CAP);
  const eePension = planContribution;
  const ss = Math.min(grossLocal, ES_SS_BASE_CAP_ANNUAL) * ES_SS_RATE;

  const taxable = Math.max(0, grossLocal - eePension - erPlanContribution - ss - ES_PERSONAL_ALLOWANCE);
  const stateTax = calcBrackets(taxable, ES_STATE_BRACKETS);
  const regionalBrackets = locationKey === 'ES-BCN' ? ES_CAT_BRACKETS : ES_MAD_BRACKETS;
  const regionalTax = calcBrackets(taxable, regionalBrackets);

  const incomeTax = stateTax + regionalTax;
  const socialSec = ss;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = planContribution + erPlanContribution;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'ES', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: erPlanContribution, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'IRPF (state + regional)', amount: incomeTax, kind: 'tax' },
      { label: 'Seguridad Social', amount: socialSec, kind: 'social' },
      { label: 'Plan de pensiones (EE)', amount: planContribution, kind: 'pension' },
      ...(erPlanContribution > 0 ? [{ label: 'Plan de empleo (ER)', amount: erPlanContribution, kind: 'pension' }] : []),
    ],
  };
};

export const meta = {
  countryCode: 'ES',
  countryName: 'Spain',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'IRPF (state portion, single)',
    brackets: ES_STATE_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })),
    notes: ['Total IRPF = state + regional (autonomous community).'],
  },
  socialSecurity: {
    label: 'Seguridad Social (employee share)',
    rates: [
      { label: 'Seguridad Social', rate: ES_SS_RATE, threshold: `up to base cap €${ES_SS_BASE_CAP_ANNUAL.toLocaleString()}/yr` },
    ],
  },
  deductions: [
    { label: 'Mínimo personal (single)', amount: ES_PERSONAL_ALLOWANCE, currency: 'EUR' },
  ],
  retirementCaps: [
    { label: 'Plan de pensiones individual cap', amount: ES_PENSION_INDIV_CAP, currency: 'EUR' },
    { label: 'Plan de empleo (ER) cap', amount: ES_PENSION_EMPLEO_CAP, currency: 'EUR' },
  ],
  localTax: {
    label: 'Regional IRPF (autonomous communities)',
    regions: [
      { code: 'MAD', label: 'Madrid', brackets: ES_MAD_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })) },
      { code: 'CAT', label: 'Cataluña', brackets: ES_CAT_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })) },
    ],
  },
  simplifications: [
    'Only Madrid and Cataluña regional schedules modeled.',
    'No reductions for joint filing, large family, etc.',
    'Beckham Law (impatriate flat 24%) not applied.',
  ],
  sources: [
    { name: 'Agencia Tributaria (AEAT)', url: 'https://sede.agenciatributaria.gob.es/' },
    { name: 'Comunidad de Madrid — Hacienda', url: 'https://www.comunidad.madrid/' },
    { name: 'Agència Tributària de Catalunya', url: 'https://atc.gencat.cat/' },
    { name: 'Seguridad Social', url: 'https://www.seg-social.es/' },
  ],
};
