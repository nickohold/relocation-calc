// US tax engine — single filer, 2026 tax year (post-OBBBA).
// Sources:
//   - Federal: https://www.irs.gov/ (2026 brackets, std deduction, 401k limit)
//   - SSA: https://www.ssa.gov/oact/cola/cbb.html (wage base $184,500)
//   - NY: https://www.tax.ny.gov/
//   - NJ: https://www.nj.gov/treasury/taxation/
//   - CA FTB: https://www.ftb.ca.gov/
//   - MA DOR: https://www.mass.gov/orgs/massachusetts-department-of-revenue
//   - DC OTR: https://otr.cfo.dc.gov/
//   - GA DOR: https://dor.georgia.gov/
//   - AZ DOR: https://azdor.gov/
//   - IL Revenue: https://tax.illinois.gov/
//   - CO Revenue: https://tax.colorado.gov/
//   - Tax Foundation: https://taxfoundation.org/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

// ── Federal brackets (single, 2026 post-OBBBA) ──
export const FED_BRACKETS = [
  { max: 12400, rate: 0.10 },
  { max: 50400, rate: 0.12 },
  { max: 105700, rate: 0.22 },
  { max: 201775, rate: 0.24 },
  { max: 256225, rate: 0.32 },
  { max: 640600, rate: 0.35 },
  { max: Infinity, rate: 0.37 },
];

// ── NY State (single, 2026) ──
export const NY_STATE_BRACKETS = [
  { max: 8500, rate: 0.039 },
  { max: 11700, rate: 0.044 },
  { max: 13900, rate: 0.0515 },
  { max: 80650, rate: 0.054 },
  { max: 215400, rate: 0.059 },
  { max: 1077550, rate: 0.0685 },
  { max: 5000000, rate: 0.0965 },
  { max: 25000000, rate: 0.103 },
  { max: Infinity, rate: 0.109 },
];

// ── NYC local (single, 2026) ──
export const NYC_LOCAL_BRACKETS = [
  { max: 12000, rate: 0.03078 },
  { max: 25000, rate: 0.03762 },
  { max: 50000, rate: 0.03819 },
  { max: Infinity, rate: 0.03876 },
];

// ── CA (single, 2026 FTB) ──
export const CA_STATE_BRACKETS = [
  { max: 11079, rate: 0.01 },
  { max: 26264, rate: 0.02 },
  { max: 41452, rate: 0.04 },
  { max: 57542, rate: 0.06 },
  { max: 72724, rate: 0.08 },
  { max: 371479, rate: 0.093 },
  { max: 445771, rate: 0.103 },
  { max: 742953, rate: 0.113 },
  { max: Infinity, rate: 0.123 },
];

// ── NJ (single, 2026) ──
export const NJ_STATE_BRACKETS = [
  { max: 20000, rate: 0.014 },
  { max: 35000, rate: 0.0175 },
  { max: 40000, rate: 0.035 },
  { max: 75000, rate: 0.05525 },
  { max: 500000, rate: 0.0637 },
  { max: 1000000, rate: 0.0897 },
  { max: Infinity, rate: 0.1075 },
];

// ── DC (single, 2026) ──
export const DC_BRACKETS = [
  { max: 10000, rate: 0.04 },
  { max: 40000, rate: 0.06 },
  { max: 60000, rate: 0.065 },
  { max: 250000, rate: 0.085 },
  { max: 500000, rate: 0.0925 },
  { max: 1000000, rate: 0.0975 },
  { max: Infinity, rate: 0.1075 },
];

export const CONSTANTS = {
  IRS_401K_LIMIT_ANNUAL: 24500,
  FED_STANDARD_DEDUCTION_SINGLE: 16100,
  SS_WAGE_BASE: 184500,
  SS_RATE: 0.062,
  MEDICARE_RATE: 0.0145,
  ADDITIONAL_MEDICARE_THRESHOLD_SINGLE: 200000,
  ADDITIONAL_MEDICARE_RATE: 0.009,
  NY_STD_DEDUCTION_SINGLE: 8000,
  NJ_PERSONAL_EXEMPTION: 1000,
  CA_STD_DEDUCTION_SINGLE: 5706,
  // New states 2026
  MA_FLAT_RATE: 0.05,
  MA_SURTAX_THRESHOLD: 1107750,
  MA_SURTAX_RATE: 0.04,
  MA_PERSONAL_EXEMPTION: 4400,
  IL_FLAT_RATE: 0.0495,
  IL_PERSONAL_EXEMPTION: 2925,
  CO_FLAT_RATE: 0.044,
  DC_STD_DEDUCTION: 16100,
  GA_FLAT_RATE: 0.0519,            // TY2026 — DOR confirms rate "remains at 5.19%" (HB 463 cut not signed/effective)
  GA_STD_DEDUCTION: 12000,         // TY2026 — DOR std deduction page tops out at $12k; $15k change is 2027
  AZ_FLAT_RATE: 0.025,
  AZ_STD_DEDUCTION: 15750,
};

// Compute state + city annual tax for a given location and pre-401k gross.
// `personalAnnual` is the employee 401k contribution; treated pre-tax for state in
// every state we model (incl. NJ — NJ DOES exclude 401(k) employee contributions per
// NJ Division of Taxation GIT-1&2 January 2026: "Since January 1, 1984, employee
// contributions to 401(k) Plans are excluded from taxable wages when earned").
const calcStateCityTax = (grossAnnual, personalAnnual, location) => {
  const stateOrRegion = location.stateOrRegion ?? location.state;
  const subRegion = location.subRegion ?? location.city;
  const C = CONSTANTS;
  let stateAnnual = 0;
  let cityAnnual = 0;

  if (stateOrRegion === 'NY') {
    const taxable = Math.max(0, grossAnnual - personalAnnual - C.NY_STD_DEDUCTION_SINGLE);
    stateAnnual = calcBrackets(taxable, NY_STATE_BRACKETS);
    if (subRegion === 'NYC') cityAnnual = calcBrackets(taxable, NYC_LOCAL_BRACKETS);
  } else if (stateOrRegion === 'NJ') {
    // NJ conforms to federal on 401(k) pre-tax (NJ Div. of Taxation GIT-1&2 Jan 2026).
    // 403(b)/457/IRA contributions remain taxable for NJ — out of scope here.
    const taxable = Math.max(0, grossAnnual - personalAnnual - C.NJ_PERSONAL_EXEMPTION);
    stateAnnual = calcBrackets(taxable, NJ_STATE_BRACKETS);
  } else if (stateOrRegion === 'CA') {
    const taxable = Math.max(0, grossAnnual - personalAnnual - C.CA_STD_DEDUCTION_SINGLE);
    stateAnnual = calcBrackets(taxable, CA_STATE_BRACKETS);
  } else if (stateOrRegion === 'MA') {
    // 5% flat + 4% surtax on income > $1,107,750. Personal exemption $4,400. No std deduction.
    const taxable = Math.max(0, grossAnnual - personalAnnual - C.MA_PERSONAL_EXEMPTION);
    stateAnnual = taxable * C.MA_FLAT_RATE
      + Math.max(0, taxable - C.MA_SURTAX_THRESHOLD) * C.MA_SURTAX_RATE;
  } else if (stateOrRegion === 'IL') {
    // IL state (Chicago) — federal-conforming, 401k pre-tax. Personal exemption phased out >$250k.
    const exemption = grossAnnual > 250000 ? 0 : C.IL_PERSONAL_EXEMPTION;
    const taxable = Math.max(0, grossAnnual - personalAnnual - exemption);
    stateAnnual = taxable * C.IL_FLAT_RATE;
  } else if (stateOrRegion === 'CO') {
    // CO uses federal taxable income as base — 401k pre-tax. No state std deduction.
    const taxable = Math.max(0, grossAnnual - personalAnnual - C.FED_STANDARD_DEDUCTION_SINGLE);
    stateAnnual = taxable * C.CO_FLAT_RATE;
  } else if (stateOrRegion === 'DC') {
    const taxable = Math.max(0, grossAnnual - personalAnnual - C.DC_STD_DEDUCTION);
    stateAnnual = calcBrackets(taxable, DC_BRACKETS);
  } else if (stateOrRegion === 'GA') {
    const taxable = Math.max(0, grossAnnual - personalAnnual - C.GA_STD_DEDUCTION);
    stateAnnual = taxable * C.GA_FLAT_RATE;
  } else if (stateOrRegion === 'AZ') {
    const taxable = Math.max(0, grossAnnual - personalAnnual - C.AZ_STD_DEDUCTION);
    stateAnnual = taxable * C.AZ_FLAT_RATE;
  }
  // TX, FL, WA: no state income tax.
  return { stateAnnual, cityAnnual };
};

// Legacy calcUS — kept verbatim for backwards compat with existing tests/runEngine.
export const calcUS = ({
  grossAnnual,
  rent, miscBurn,
  matchLimitPct,
  targetSavingsUSD,
  ilBurnUSD,
  location,
}) => {
  const C = CONSTANTS;
  const grossMonthly = grossAnnual / 12;
  const totalOut = rent + miscBurn + ilBurnUSD;

  const employer = grossMonthly * (matchLimitPct / 100);
  const required = Math.max(0, targetSavingsUSD - employer);
  const personal = Math.min(required, C.IRS_401K_LIMIT_ANNUAL / 12);
  const wealthGap = Math.max(0, required - personal);
  const totalInvested = employer + personal;
  const personalAnnual = personal * 12;

  const ssTax = Math.min(grossAnnual, C.SS_WAGE_BASE) * C.SS_RATE;
  const medTax = grossAnnual * C.MEDICARE_RATE
    + Math.max(0, grossAnnual - C.ADDITIONAL_MEDICARE_THRESHOLD_SINGLE) * C.ADDITIONAL_MEDICARE_RATE;
  const ficaAnnual = ssTax + medTax;

  const fedTaxable = Math.max(0, grossAnnual - personalAnnual - C.FED_STANDARD_DEDUCTION_SINGLE);
  const fedAnnual = calcBrackets(fedTaxable, FED_BRACKETS);

  const { stateAnnual, cityAnnual } = calcStateCityTax(grossAnnual, personalAnnual, location);

  const taxesAnnual = ficaAnnual + fedAnnual + stateAnnual + cityAnnual;
  const taxesMonthly = taxesAnnual / 12;
  const netTakeHome = grossMonthly - personal - taxesMonthly;
  const liquidCashFlow = netTakeHome - totalOut;

  return {
    grossMonthly,
    employer, personal, totalInvested, wealthGap,
    fedMonthly: fedAnnual / 12,
    ficaMonthly: ficaAnnual / 12,
    stateMonthly: stateAnnual / 12,
    cityMonthly: cityAnnual / 12,
    taxesMonthly,
    netTakeHome,
    totalOut,
    liquidCashFlow,
  };
};

// Generic LOCATIONS lookup helper for the new compute() interface.
const US_LOCATION_TABLE = {
  'US-NYC':  { stateOrRegion: 'NY', subRegion: 'NYC' },
  'US-NJ-HOB': { stateOrRegion: 'NJ', subRegion: null },
  'US-NJ-WNY': { stateOrRegion: 'NJ', subRegion: null },
  'US-ATX':  { stateOrRegion: 'TX', subRegion: null },
  'US-HOU':  { stateOrRegion: 'TX', subRegion: null },
  'US-SF':   { stateOrRegion: 'CA', subRegion: null },
  'US-SD':   { stateOrRegion: 'CA', subRegion: null },
  'US-MIA':  { stateOrRegion: 'FL', subRegion: null },
  'US-BOS':  { stateOrRegion: 'MA', subRegion: null },
  'US-SEA':  { stateOrRegion: 'WA', subRegion: null },
  'US-CHI':  { stateOrRegion: 'IL', subRegion: null },
  'US-DEN':  { stateOrRegion: 'CO', subRegion: null },
  'US-DC':   { stateOrRegion: 'DC', subRegion: null },
  'US-ATL':  { stateOrRegion: 'GA', subRegion: null },
  'US-PHX':  { stateOrRegion: 'AZ', subRegion: null },
};

// Symmetric compute() — the new multi-country interface.
// Input shape: { grossLocal, eePensionPct, eeOtherPct, rentLocal, miscBurnLocal, locationKey, matchLimitPct }
// Returns CountrySideResult.
export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,           // unused in US standalone; kept for shape symmetry
  rentLocal = 0,
  miscBurnLocal = 0,
  locationKey,
  matchLimitPct = 6,           // Default: typical US tech employer matches up to 6% (UI no longer exposes this)
}) => {
  void eeOtherPct;
  const C = CONSTANTS;
  const grossAnnual = grossLocal;
  const location = US_LOCATION_TABLE[locationKey] ?? { stateOrRegion: 'NY', subRegion: 'NYC' };

  // Employee 401k contribution (pre-tax federal & all modeled states; NJ DOES conform).
  const personalAnnual = Math.min(grossAnnual * (eePensionPct / 100), C.IRS_401K_LIMIT_ANNUAL);
  // Employer match is dollar-for-dollar up to matchLimitPct of gross — capped by what
  // the employee actually contributes. (Conventional "X% match" semantics.)
  const employerAnnual = grossAnnual * (Math.min(eePensionPct, matchLimitPct) / 100);

  // FICA
  const ssTax = Math.min(grossAnnual, C.SS_WAGE_BASE) * C.SS_RATE;
  const medTax = grossAnnual * C.MEDICARE_RATE
    + Math.max(0, grossAnnual - C.ADDITIONAL_MEDICARE_THRESHOLD_SINGLE) * C.ADDITIONAL_MEDICARE_RATE;
  const ficaAnnual = ssTax + medTax;

  // Federal
  const fedTaxable = Math.max(0, grossAnnual - personalAnnual - C.FED_STANDARD_DEDUCTION_SINGLE);
  const fedAnnual = calcBrackets(fedTaxable, FED_BRACKETS);

  // State + City
  const { stateAnnual, cityAnnual } = calcStateCityTax(grossAnnual, personalAnnual, location);

  const incomeTax = fedAnnual;
  const localTax = stateAnnual + cityAnnual;
  const socialSec = ficaAnnual;

  const eePensionLocal = personalAnnual;
  const eeOtherDeductions = 0;
  const netLocal = grossAnnual - incomeTax - socialSec - localTax - eePensionLocal - eeOtherDeductions;

  const erContributions = employerAnnual;
  const totalSavingsLocal = eePensionLocal + erContributions;

  const liquidLocalAnnual = netLocal - rentLocal * 12 - miscBurnLocal * 12;

  const fx = FX_USD_PER_UNIT.USD;
  return {
    countryCode: 'US',
    currency: 'USD',
    grossLocal: grossAnnual,
    incomeTax,
    socialSec,
    localTax,
    eePensionLocal,
    eeOtherDeductions,
    netLocal,
    erContributions,
    totalSavingsLocal,
    rentLocal: rentLocal * 12,
    miscBurnLocal: miscBurnLocal * 12,
    liquidLocal: liquidLocalAnnual,
    netUSD: netLocal * fx,
    totalSavingsUSD: totalSavingsLocal * fx,
    liquidUSD: liquidLocalAnnual * fx,
    effectiveTaxRate: grossAnnual > 0 ? (incomeTax + socialSec + localTax) / grossAnnual : 0,
    breakdown: [
      { label: 'Federal', amount: fedAnnual, kind: 'tax' },
      { label: 'FICA', amount: ficaAnnual, kind: 'social' },
      { label: 'State', amount: stateAnnual, kind: 'tax' },
      { label: 'City', amount: cityAnnual, kind: 'tax' },
      { label: '401(k) EE', amount: eePensionLocal, kind: 'pension' },
      { label: '401(k) ER match', amount: erContributions, kind: 'pension' },
    ],
  };
};

export const meta = {
  countryCode: 'US',
  countryName: 'United States',
  taxYear: '2026',
  lastUpdated: '2026-05-08',
  incomeTax: {
    label: 'Federal Income Tax (single, post-OBBBA)',
    brackets: FED_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })),
    notes: ['Single filer. Standard deduction reduces taxable base before brackets apply.'],
  },
  socialSecurity: {
    label: 'FICA (Social Security + Medicare)',
    rates: [
      { label: 'Social Security', rate: CONSTANTS.SS_RATE, threshold: `up to wage base $${CONSTANTS.SS_WAGE_BASE.toLocaleString()}` },
      { label: 'Medicare', rate: CONSTANTS.MEDICARE_RATE, threshold: 'all wages' },
      { label: 'Additional Medicare', rate: CONSTANTS.ADDITIONAL_MEDICARE_RATE, threshold: `above $${CONSTANTS.ADDITIONAL_MEDICARE_THRESHOLD_SINGLE.toLocaleString()} (single)` },
    ],
  },
  deductions: [
    { label: 'Federal Standard Deduction (single)', amount: CONSTANTS.FED_STANDARD_DEDUCTION_SINGLE, currency: 'USD' },
  ],
  retirementCaps: [
    { label: '401(k) employee elective deferral', amount: CONSTANTS.IRS_401K_LIMIT_ANNUAL, currency: 'USD', note: '2026 IRS limit, under-50' },
  ],
  localTax: {
    label: 'State / Local taxes (varies by location)',
    note: 'TX, FL, WA: no state income tax.',
  },
  stateLocal: [
    { code: 'NY', label: 'New York State', kind: 'progressive', brackets: NY_STATE_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })), stdDeduction: CONSTANTS.NY_STD_DEDUCTION_SINGLE, note: '401(k) pre-tax. NYC residents add NYC local tax.' },
    { code: 'NYC', label: 'New York City (local, on top of NY)', kind: 'progressive', brackets: NYC_LOCAL_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })) },
    { code: 'NJ', label: 'New Jersey', kind: 'progressive', brackets: NJ_STATE_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })), exemption: CONSTANTS.NJ_PERSONAL_EXEMPTION, note: '401(k) EE excluded from NJ taxable wages per GIT-1&2 Jan 2026.' },
    { code: 'CA', label: 'California', kind: 'progressive', brackets: CA_STATE_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })), stdDeduction: CONSTANTS.CA_STD_DEDUCTION_SINGLE },
    { code: 'MA', label: 'Massachusetts', kind: 'flat', rate: CONSTANTS.MA_FLAT_RATE, exemption: CONSTANTS.MA_PERSONAL_EXEMPTION, note: `4% surtax on income above $${CONSTANTS.MA_SURTAX_THRESHOLD.toLocaleString()}.` },
    { code: 'WA', label: 'Washington', kind: 'none', note: 'No state income tax.' },
    { code: 'IL', label: 'Illinois', kind: 'flat', rate: CONSTANTS.IL_FLAT_RATE, exemption: CONSTANTS.IL_PERSONAL_EXEMPTION, note: 'Personal exemption phased out above $250k.' },
    { code: 'CO', label: 'Colorado', kind: 'flat', rate: CONSTANTS.CO_FLAT_RATE, note: 'Federal taxable income base; no state std deduction.' },
    { code: 'DC', label: 'District of Columbia', kind: 'progressive', brackets: DC_BRACKETS.map((b) => ({ upTo: b.max, rate: b.rate })), stdDeduction: CONSTANTS.DC_STD_DEDUCTION },
    { code: 'GA', label: 'Georgia', kind: 'flat', rate: CONSTANTS.GA_FLAT_RATE, stdDeduction: CONSTANTS.GA_STD_DEDUCTION, note: '2026 stepdown per HB 1437.' },
    { code: 'AZ', label: 'Arizona', kind: 'flat', rate: CONSTANTS.AZ_FLAT_RATE, stdDeduction: CONSTANTS.AZ_STD_DEDUCTION },
    { code: 'TX', label: 'Texas', kind: 'none', note: 'No state income tax.' },
    { code: 'FL', label: 'Florida', kind: 'none', note: 'No state income tax.' },
  ],
  simplifications: [
    'Single filer assumed. No itemized deductions modeled.',
    'NJ assumes 401(k) conformity (per GIT-1&2 Jan 2026); 403(b)/457/IRA out of scope.',
    'Employer match modeled as dollar-for-dollar up to matchLimitPct, capped by employee contribution.',
    'Geneva-style local taxes not applicable; only listed states/DC modeled.',
  ],
  sources: [
    { name: 'IRS — federal brackets, 401(k) limit, std deduction', url: 'https://www.irs.gov/' },
    { name: 'SSA — 2026 wage base', url: 'https://www.ssa.gov/oact/cola/cbb.html' },
    { name: 'NY Tax Department', url: 'https://www.tax.ny.gov/' },
    { name: 'NJ Division of Taxation', url: 'https://www.nj.gov/treasury/taxation/' },
    { name: 'California FTB', url: 'https://www.ftb.ca.gov/' },
    { name: 'Massachusetts DOR', url: 'https://www.mass.gov/orgs/massachusetts-department-of-revenue' },
    { name: 'DC Office of Tax & Revenue', url: 'https://otr.cfo.dc.gov/' },
    { name: 'Georgia DOR', url: 'https://dor.georgia.gov/' },
    { name: 'Arizona DOR', url: 'https://azdor.gov/' },
    { name: 'Illinois Revenue', url: 'https://tax.illinois.gov/' },
    { name: 'Colorado Revenue', url: 'https://tax.colorado.gov/' },
    { name: 'Tax Foundation', url: 'https://taxfoundation.org/' },
  ],
};
