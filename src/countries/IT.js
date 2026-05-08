// Italy tax engine — single, employee, 2026 (post-Bilancio 2026). Milan (LOM) and Rome (LAZ).
// Sources:
//   - https://www.agenziaentrate.gov.it/
//   - https://www.inps.it/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const IT_NATIONAL_BRACKETS_2026 = [
  { max: 28000, rate: 0.23 },
  { max: 50000, rate: 0.33 },
  { max: Infinity, rate: 0.43 },
];

export const IT_LOMBARDY_BRACKETS = [
  { max: 15000, rate: 0.0123 },
  { max: 28000, rate: 0.0158 },
  { max: 50000, rate: 0.0172 },
  { max: Infinity, rate: 0.0173 },
];

export const IT_LAZIO_BRACKETS = [
  { max: 28000, rate: 0.0173 },
  { max: Infinity, rate: 0.0333 },
];

export const IT_MILAN_COMMUNAL = 0.008;
export const IT_ROME_COMMUNAL = 0.009;

export const IT_INPS_BASE_RATE = 0.0919;
export const IT_INPS_ADD_RATE = 0.01;
export const IT_INPS_FIRST_CEILING = 56224;
export const IT_INPS_MASSIMALE = 122295;
export const IT_PENSION_DEDUCT_CAP = 5300;

export const IT_DETRAZIONE_LAVORO = (income) => {
  if (income <= 15000) return 1955;
  if (income <= 28000) return 1910 + 1190 * (28000 - income) / 13000;
  if (income <= 50000) return 1910 * (50000 - income) / 22000;
  return 0;
};

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
  locationKey,
}) => {
  void eeOtherPct;
  const eePension = Math.min(grossLocal * (eePensionPct / 100), IT_PENSION_DEDUCT_CAP);

  // INPS employee
  const inpsBase = Math.min(grossLocal, IT_INPS_FIRST_CEILING) * IT_INPS_BASE_RATE;
  const inpsAdd = Math.max(0, Math.min(grossLocal, IT_INPS_MASSIMALE) - IT_INPS_FIRST_CEILING)
    * (IT_INPS_BASE_RATE + IT_INPS_ADD_RATE);
  const inps = inpsBase + inpsAdd;

  const taxable = Math.max(0, grossLocal - inps - eePension);
  const grossIRPEF = calcBrackets(taxable, IT_NATIONAL_BRACKETS_2026);
  const detrazione = IT_DETRAZIONE_LAVORO(taxable);
  const irpef = Math.max(0, grossIRPEF - detrazione);

  let regional = 0, communal = 0;
  if (locationKey === 'IT-MIL') {
    regional = calcBrackets(taxable, IT_LOMBARDY_BRACKETS);
    communal = taxable * IT_MILAN_COMMUNAL;
  } else if (locationKey === 'IT-ROM') {
    regional = calcBrackets(taxable, IT_LAZIO_BRACKETS);
    communal = taxable * IT_ROME_COMMUNAL;
  }

  const incomeTax = irpef;
  const localTax = regional + communal;
  const socialSec = inps;

  const netLocal = grossLocal - incomeTax - localTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'IT', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: eePension,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: eePension * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + localTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'IRPEF', amount: incomeTax, kind: 'tax' },
      { label: 'Regional + Communal', amount: localTax, kind: 'tax' },
      { label: 'INPS', amount: socialSec, kind: 'social' },
      { label: 'Pension EE', amount: eePension, kind: 'pension' },
    ],
  };
};
