// Portugal tax engine — regular resident, single, employee, 2026. NOT IFICI/RNH 2.0.
// Sources:
//   - https://www.portaldasfinancas.gov.pt/
//   - https://www.seg-social.pt/

import { calcBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const PT_BRACKETS_2026 = [
  { max: 8342,  rate: 0.1197 },
  { max: 12587, rate: 0.1486 },
  { max: 17838, rate: 0.1755 },
  { max: 23089, rate: 0.1957 },
  { max: 29397, rate: 0.2377 },
  { max: 41952, rate: 0.2611 },
  { max: 44987, rate: 0.3196 },
  { max: 81199, rate: 0.3735 },
  { max: Infinity, rate: 0.48 },
];

export const PT_SOLIDARITY_SURCHARGE = [
  { max: 80000, rate: 0.00 },
  { max: 250000, rate: 0.025 },
  { max: Infinity, rate: 0.05 },
];

export const PT_DEDUCAO_ESPECIFICA = 4587;
export const PT_SOCIAL_SECURITY_RATE = 0.11;
export const PT_PPR_CREDIT_AGE_LT35 = 400;
export const PT_PPR_CONTRIB_AGE_LT35 = 2000;

export const compute = ({
  grossLocal,
  eePensionPct = 0,
  eeOtherPct = 0,
  rentLocal = 0,
  miscBurnLocal = 0,
}) => {
  void eeOtherPct;
  const ss = grossLocal * PT_SOCIAL_SECURITY_RATE;
  const eePension = Math.min(grossLocal * (eePensionPct / 100), PT_PPR_CONTRIB_AGE_LT35);

  const taxable = Math.max(0, grossLocal - PT_DEDUCAO_ESPECIFICA);
  const grossIT = calcBrackets(taxable, PT_BRACKETS_2026);
  const solidarity = calcBrackets(taxable, PT_SOLIDARITY_SURCHARGE);
  const pprCredit = eePension > 0 ? PT_PPR_CREDIT_AGE_LT35 : 0;
  const incomeTax = Math.max(0, grossIT + solidarity - pprCredit);
  const socialSec = ss;

  const netLocal = grossLocal - incomeTax - socialSec - eePension;
  const liquidLocal = netLocal - rentLocal * 12 - miscBurnLocal * 12;
  const fx = FX_USD_PER_UNIT.EUR;
  return {
    countryCode: 'PT', currency: 'EUR',
    grossLocal, incomeTax, socialSec, localTax: 0,
    eePensionLocal: eePension, eeOtherDeductions: 0,
    netLocal, erContributions: 0, totalSavingsLocal: eePension,
    rentLocal: rentLocal * 12, miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx, totalSavingsUSD: eePension * fx, liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'IRS + Solidarity', amount: incomeTax, kind: 'tax' },
      { label: 'Segurança Social', amount: socialSec, kind: 'social' },
      { label: 'PPR', amount: eePension, kind: 'pension' },
    ],
  };
};
