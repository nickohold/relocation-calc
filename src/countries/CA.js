// Canada tax engine — single, employee, 2026. ON / BC / QC.
// Sources:
//   - https://www.canada.ca/en/revenue-agency.html (federal)
//   - https://www.ontario.ca/page/personal-income-tax
//   - https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal
//   - https://www.revenuquebec.ca/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const CA_FEDERAL_BRACKETS = [
  { max: 58523, rate: 0.14 },
  { max: 117045, rate: 0.205 },
  { max: 181440, rate: 0.26 },
  { max: 258482, rate: 0.29 },
  { max: Infinity, rate: 0.33 },
];
export const CA_FEDERAL_BPA = 16452;

export const CA_ON_BRACKETS = [
  { max: 53891, rate: 0.0505 }, { max: 107785, rate: 0.0915 },
  { max: 150000, rate: 0.1116 }, { max: 220000, rate: 0.1216 }, { max: Infinity, rate: 0.1316 },
];
export const CA_ON_BPA = 12989;

export const CA_BC_BRACKETS = [
  // 2026 (gov.bc.ca/taxes/income-taxes/personal/tax-rates) — bracket 1 raised 5.06% → 5.60%
  { max: 50363, rate: 0.056 }, { max: 100728, rate: 0.077 }, { max: 115648, rate: 0.105 },
  { max: 140430, rate: 0.1229 }, { max: 190405, rate: 0.147 }, { max: 265545, rate: 0.168 },
  { max: Infinity, rate: 0.205 },
];
export const CA_BC_BPA = 13216;  // 2026 — gov.bc.ca/taxes/income-taxes/personal/credits/basic

export const CA_QC_BRACKETS = [
  { max: 54345, rate: 0.14 }, { max: 108680, rate: 0.19 },
  { max: 132245, rate: 0.24 }, { max: Infinity, rate: 0.2575 },
];
export const CA_QC_BPA = 18952;
export const CA_QC_FEDERAL_ABATEMENT = 0.165;

export const CA_CPP = {
  ympe: 74600, basicExemption: 3500, rate: 0.0595,
  yampe: 85000, cpp2Rate: 0.04,
};
export const CA_QPP = { rate: 0.063, qpp2Rate: 0.04 };  // 2026: 5.3% base + 1.0% enhancement (retraitequebec.gouv.qc.ca)
export const CA_EI = {
  rest: { rate: 0.0163, mie: 68900 },
  qc: { rate: 0.013, mie: 68900 },
};
export const CA_QPIP = { rate: 0.00455, mie: 103000 };  // 2026: rate cut + MIE raised (rqap.gouv.qc.ca)
export const CA_RRSP_MAX = 33810;

const onSurtax = (onTax) => {
  let sur = 0;
  if (onTax > 5818) sur += (onTax - 5818) * 0.20;
  if (onTax > 7446) sur += (onTax - 7446) * 0.36;
  return sur;
};

export const compute = ({
  grossLocal,
  rrspPct = 10,
  erRrspMatchPct = 3,
  tfsaAmt = 7000,
  rentLocal = 0,
  miscBurnLocal = 0,
  locationKey,
}) => {
  const rrspMax = Math.min(grossLocal * 0.18, CA_RRSP_MAX);
  const rrspContribution = Math.min(grossLocal * (rrspPct / 100), rrspMax);
  const erRrspContribution = grossLocal * (erRrspMatchPct / 100);
  const tfsa = Math.max(0, tfsaAmt);
  const eePension = rrspContribution; // pre-tax
  const taxable = Math.max(0, grossLocal - eePension);

  const fedGross = calcBrackets(taxable, CA_FEDERAL_BRACKETS);
  const fedBPACredit = CA_FEDERAL_BPA * 0.14;
  let fed = Math.max(0, fedGross - fedBPACredit);

  const isQC = locationKey === 'CA-MTL';
  let provBrackets = CA_ON_BRACKETS;
  let provBPA = CA_ON_BPA;
  if (locationKey === 'CA-VAN') { provBrackets = CA_BC_BRACKETS; provBPA = CA_BC_BPA; }
  else if (isQC) { provBrackets = CA_QC_BRACKETS; provBPA = CA_QC_BPA; }

  const provGross = calcBrackets(taxable, provBrackets);
  const provBPACredit = provBPA * provBrackets[0].rate;
  let prov = Math.max(0, provGross - provBPACredit);

  if (locationKey === 'CA-TOR') prov += onSurtax(prov);
  if (isQC) fed = fed * (1 - CA_QC_FEDERAL_ABATEMENT);

  const cpp = isQC
    ? Math.max(0, Math.min(grossLocal, CA_CPP.ympe) - CA_CPP.basicExemption) * CA_QPP.rate
      + Math.max(0, Math.min(grossLocal, CA_CPP.yampe) - CA_CPP.ympe) * CA_QPP.qpp2Rate
    : Math.max(0, Math.min(grossLocal, CA_CPP.ympe) - CA_CPP.basicExemption) * CA_CPP.rate
      + Math.max(0, Math.min(grossLocal, CA_CPP.yampe) - CA_CPP.ympe) * CA_CPP.cpp2Rate;
  const ei = isQC
    ? Math.min(grossLocal, CA_EI.qc.mie) * CA_EI.qc.rate
    : Math.min(grossLocal, CA_EI.rest.mie) * CA_EI.rest.rate;
  const qpip = isQC ? Math.min(grossLocal, CA_QPIP.mie) * CA_QPIP.rate : 0;
  const socialSec = cpp + ei + qpip;

  const incomeTax = fed;
  const localTax = prov;
  const netLocal = grossLocal - incomeTax - localTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const totalSavingsLocal = rrspContribution + erRrspContribution + tfsa;
  const fx = FX_USD_PER_UNIT.CAD;
  return {
    countryCode: 'CA', currency: 'CAD',
    grossLocal, incomeTax, socialSec, localTax,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: erRrspContribution, totalSavingsLocal,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: totalSavingsLocal * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + localTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Federal', amount: fed, kind: 'tax' },
      { label: 'Provincial', amount: prov, kind: 'tax' },
      { label: 'CPP/QPP + EI + QPIP', amount: socialSec, kind: 'social' },
      { label: 'RRSP EE', amount: rrspContribution, kind: 'pension' },
      { label: 'RRSP/DPSP ER match', amount: erRrspContribution, kind: 'pension' },
      ...(tfsa > 0 ? [{ label: 'TFSA', amount: tfsa, kind: 'pension' }] : []),
    ],
  };
};

export const meta = {
  countryCode: 'CA',
  countryName: 'Canada',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'Federal Income Tax (single)',
    brackets: CA_FEDERAL_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })),
    notes: [`Basic Personal Amount $${CA_FEDERAL_BPA.toLocaleString()} as a non-refundable credit at lowest rate.`],
  },
  socialSecurity: {
    label: 'CPP/QPP + EI + (QPIP for QC)',
    rates: [
      { label: 'CPP base', rate: CA_CPP.rate, threshold: `$${CA_CPP.basicExemption.toLocaleString()} – $${CA_CPP.ympe.toLocaleString()}` },
      { label: 'CPP2', rate: CA_CPP.cpp2Rate, threshold: `$${CA_CPP.ympe.toLocaleString()} – $${CA_CPP.yampe.toLocaleString()}` },
      { label: 'QPP base (QC only)', rate: CA_QPP.rate, threshold: `$${CA_CPP.basicExemption.toLocaleString()} – $${CA_CPP.ympe.toLocaleString()}` },
      { label: 'EI (rest of Canada)', rate: CA_EI.rest.rate, threshold: `up to $${CA_EI.rest.mie.toLocaleString()}` },
      { label: 'EI (QC)', rate: CA_EI.qc.rate, threshold: `up to $${CA_EI.qc.mie.toLocaleString()}` },
      { label: 'QPIP (QC only)', rate: CA_QPIP.rate, threshold: `up to $${CA_QPIP.mie.toLocaleString()}` },
    ],
  },
  deductions: [
    { label: 'Federal BPA', amount: CA_FEDERAL_BPA, currency: 'CAD' },
    { label: 'ON BPA', amount: CA_ON_BPA, currency: 'CAD' },
    { label: 'BC BPA', amount: CA_BC_BPA, currency: 'CAD' },
    { label: 'QC BPA', amount: CA_QC_BPA, currency: 'CAD' },
  ],
  retirementCaps: [
    { label: 'RRSP annual maximum', amount: CA_RRSP_MAX, currency: 'CAD', note: 'Or 18% of earned income, whichever is lower.' },
  ],
  localTax: {
    label: 'Provincial Income Tax',
    provinces: [
      { code: 'ON', label: 'Ontario', brackets: CA_ON_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })), note: 'ON surtax: +20% above $5,818 prov tax, +36% above $7,446.' },
      { code: 'BC', label: 'British Columbia', brackets: CA_BC_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })) },
      { code: 'QC', label: 'Quebec', brackets: CA_QC_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })), note: `Federal abatement of ${(CA_QC_FEDERAL_ABATEMENT * 100).toFixed(1)}%.` },
    ],
  },
  simplifications: [
    'Only ON / BC / QC provinces modeled.',
    'BPA modeled as credit at lowest bracket rate (federal taper above ~$173k not applied).',
    'TFSA modeled as already-taxed savings (no IT impact).',
  ],
  sources: [
    { name: 'CRA — federal', url: 'https://www.canada.ca/en/revenue-agency.html' },
    { name: 'Ontario Personal Income Tax', url: 'https://www.ontario.ca/page/personal-income-tax' },
    { name: 'BC Personal Income Tax', url: 'https://www2.gov.bc.ca/gov/content/taxes/income-taxes/personal' },
    { name: 'Revenu Québec', url: 'https://www.revenuquebec.ca/' },
  ],
};
