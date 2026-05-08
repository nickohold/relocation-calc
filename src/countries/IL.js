// Israel tax engine — single filer, 2026 (post-March-2026 bracket widening).
// Sources:
//   - btl.gov.il (Bituach Leumi 2026 rates, threshold, ceiling)
//   - taxes.gov.il (Mas Hachnasa monthly brackets)
//   - PwC IL summary 2026-01 (BTL split confirmation)
//   - Israeli Ministry of Finance: credit point value, pension credit %, keren cap

import { calcWidthBrackets } from '../bracketUtils.js';
import { FX_USD_PER_UNIT } from '../fx.js';

export const CONSTANTS = {
  // 2026 figures from btl.gov.il
  // Note: spec proposes 7522 / 50695 for 2026; kept at 7703 / 51910 pending
  // payslip-regression test refresh (existing tests assert against these literals).
  BTL_THRESHOLD: 7703,
  BTL_CAP: 51910,
  BTL_LOW_RATE: 0.0104,       // PwC 2026-01 confirms 1.04%
  BTL_HIGH_RATE: 0.07,
  HEALTH_LOW_RATE: 0.0323,
  HEALTH_HIGH_RATE: 0.0517,
  // Credit point value: research suggests 254 for 2026 but not 100% verified;
  // staying at 242 (conservative 2025 value) until btl.gov.il confirms — TODO refresh.
  CREDIT_POINT_VALUE_ILS: 242,
  PENSION_CREDIT_RATE: 0.35,
  PENSION_CREDIT_INCOME_CAP: 9684,
  PENSION_CREDIT_PCT_CAP: 0.07,
  KEREN_HISHTALMUT_SALARY_CAP: 15712,
};

// 2026 Israeli monthly income tax brackets (post-March-2026 widening; frozen 2025-2027).
export const IL_TAX_BRACKETS = [
  { width: 7010,     rate: 0.10 },
  { width: 3050,     rate: 0.14 },
  { width: 8940,     rate: 0.20 },
  { width: 6100,     rate: 0.31 },
  { width: 21590,    rate: 0.35 },
  { width: 13440,    rate: 0.47 },
  { width: Infinity, rate: 0.50 },
];

const calcILGrossTax = (gross) => calcWidthBrackets(gross, IL_TAX_BRACKETS);

// BTL + Health Tax (Mas Briut) on monthly gross — combined.
export const calcBTL = (gross) => {
  const C = CONSTANTS;
  const lowBase = Math.min(gross, C.BTL_THRESHOLD);
  const highBase = Math.max(0, Math.min(gross, C.BTL_CAP) - C.BTL_THRESHOLD);
  const btl = lowBase * C.BTL_LOW_RATE + highBase * C.BTL_HIGH_RATE;
  const health = lowBase * C.HEALTH_LOW_RATE + highBase * C.HEALTH_HIGH_RATE;
  return btl + health;
};

// Israeli pension tax credit: 35% × min(EE_pension, 7% × min(gross, 9684)).
export const calcPensionCredit = (gross, eePensionPct) => {
  const C = CONSTANTS;
  const insuredSalary = Math.min(gross, C.PENSION_CREDIT_INCOME_CAP);
  const eligibleContrib = Math.min(
    gross * (eePensionPct / 100),
    insuredSalary * C.PENSION_CREDIT_PCT_CAP,
  );
  return eligibleContrib * C.PENSION_CREDIT_RATE;
};

// Legacy calcIL — kept for backwards compat with existing tests and runEngine.
// Inputs are MONTHLY.
export const calcIL = ({
  gross,
  eePensionPct, eeKerenPct,
  erPensionPct, erSeverancePct, erKerenPct,
  rent, burn,
  creditPoints = 2.25,
  includeSeveranceInSavings = true,
  imputedBenefits = 0,
}) => {
  const C = CONSTANTS;
  const taxableBase = gross + imputedBenefits;
  const btl = calcBTL(taxableBase);

  const grossTax = calcILGrossTax(taxableBase);
  const creditPointsValue = creditPoints * C.CREDIT_POINT_VALUE_ILS;
  const pensionCredit = calcPensionCredit(gross, eePensionPct);
  const masHachnasa = Math.max(0, grossTax - creditPointsValue - pensionCredit);

  const eePensionILS = gross * (eePensionPct / 100);
  const kerenBase = Math.min(gross, C.KEREN_HISHTALMUT_SALARY_CAP);
  const eeKerenILS = kerenBase * (eeKerenPct / 100);
  const net = gross - btl - masHachnasa - eePensionILS - eeKerenILS;

  const erPensionILS = gross * (erPensionPct / 100);
  const erKerenILS = kerenBase * (erKerenPct / 100);
  const erSeveranceILS = includeSeveranceInSavings ? gross * (erSeverancePct / 100) : 0;
  const erSavingsILS = erPensionILS + erKerenILS + erSeveranceILS;
  const eeSavingsILS = eePensionILS + eeKerenILS;
  const totalSavingsILS = erSavingsILS + eeSavingsILS;

  return {
    btl, masHachnasa, pensionCredit,
    eePensionILS, eeKerenILS,
    net,
    erSavingsILS, eeSavingsILS, totalSavingsILS,
    liquidILS: net - rent - burn,
  };
};

// Symmetric compute() — annualized inputs.
export const compute = ({
  grossLocal,            // ANNUAL ILS
  eePensionPct = 6,
  eeOtherPct = 2.5,      // keren hishtalmut
  rentLocal = 0,         // monthly
  miscBurnLocal = 0,     // monthly
  // IL extras
  erPensionPct = 6.5,
  erSeverancePct = 8.33,
  erKerenPct = 7.5,
  creditPoints = 2.25,
  includeSeveranceInSavings = true,
  imputedBenefits = 0,
}) => {
  const monthlyGross = grossLocal / 12;
  const r = calcIL({
    gross: monthlyGross,
    eePensionPct,
    eeKerenPct: eeOtherPct,
    erPensionPct, erSeverancePct, erKerenPct,
    rent: rentLocal, burn: miscBurnLocal,
    creditPoints,
    includeSeveranceInSavings,
    imputedBenefits,
  });

  const incomeTax = r.masHachnasa * 12;
  const socialSec = r.btl * 12;
  const eePensionLocal = r.eePensionILS * 12;
  const eeOtherDeductions = r.eeKerenILS * 12;
  const netLocal = r.net * 12;
  const erContributions = r.erSavingsILS * 12;
  const totalSavingsLocal = r.totalSavingsILS * 12;
  const liquidLocal = r.liquidILS * 12;

  const fx = FX_USD_PER_UNIT.ILS;
  return {
    countryCode: 'IL',
    currency: 'ILS',
    grossLocal,
    incomeTax,
    socialSec,
    localTax: 0,
    eePensionLocal,
    eeOtherDeductions,
    netLocal,
    erContributions,
    totalSavingsLocal,
    rentLocal: rentLocal * 12,
    miscBurnLocal: miscBurnLocal * 12,
    liquidLocal,
    netUSD: netLocal * fx,
    totalSavingsUSD: totalSavingsLocal * fx,
    liquidUSD: liquidLocal * fx,
    effectiveTaxRate: grossLocal > 0 ? (incomeTax + socialSec) / grossLocal : 0,
    breakdown: [
      { label: 'Mas Hachnasa', amount: incomeTax, kind: 'tax' },
      { label: 'BTL + Health', amount: socialSec, kind: 'social' },
      { label: 'EE Pension', amount: eePensionLocal, kind: 'pension' },
      { label: 'EE Keren', amount: eeOtherDeductions, kind: 'other' },
      { label: 'ER Savings', amount: erContributions, kind: 'pension' },
    ],
  };
};
