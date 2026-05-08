// Tax engine — multi-country dispatcher + legacy IL→US runEngine.
// New code should use `runComparison({ source, dest, options })`.
// Legacy IL→US `runEngine(inputs)` is preserved for the existing UI and tests.

import { CONSTANTS as US_CONSTANTS, calcUS } from './countries/US.js';
import { CONSTANTS as IL_CONSTANTS, calcIL } from './countries/IL.js';
import { COUNTRIES, LOCATIONS as MULTI_LOCATIONS } from './countries.js';
import { FX_USD_PER_UNIT } from './fx.js';

// ── Re-exports for backwards compat ──
export { calcBrackets } from './bracketUtils.js';
export {
  FED_BRACKETS, NY_STATE_BRACKETS, NJ_STATE_BRACKETS, NYC_LOCAL_BRACKETS, CA_STATE_BRACKETS,
  calcUS,
} from './countries/US.js';
export { calcBTL, calcPensionCredit, calcIL, IL_TAX_BRACKETS } from './countries/IL.js';
export { COUNTRIES, LOCATIONS as MULTI_LOCATIONS } from './countries.js';
export { FX_USD_PER_UNIT } from './fx.js';

// Combined CONSTANTS — preserves legacy keys (US + IL flattened together).
export const CONSTANTS = { ...US_CONSTANTS, ...IL_CONSTANTS };

// ── Legacy LOCATIONS (IL→US) — must keep these short keys so App.jsx & tests pass. ──
export const LOCATIONS = {
  NYC: { name: 'Manhattan (UWS)', state: 'NY', city: 'NYC', defaultRent: 4500 },
  NJ:  { name: 'Hoboken/JC',      state: 'NJ', city: null,  defaultRent: 3900 },
  WNY: { name: 'West NY/Guttenberg', state: 'NJ', city: null, defaultRent: 2900 },
  ATX: { name: 'Austin, TX',      state: 'TX', city: null,  defaultRent: 2600 },
  HOU: { name: 'Houston, TX',     state: 'TX', city: null,  defaultRent: 2200 },
  SF:  { name: 'San Francisco',   state: 'CA', city: null,  defaultRent: 3500 },
  MIA: { name: 'Miami, FL',       state: 'FL', city: null,  defaultRent: 2800 },
};

// Legacy end-to-end engine: IL source → US dest, monthly basis. Unchanged signature.
export const runEngine = (inputs) => {
  const {
    ilGross, ilEEPension, ilEEKeren,
    ilERPension, ilERSeverance, ilERKeren,
    ilRent, ilBurn,
    fxRate,
    selectedLoc,
    usGrossAnnual, usRent, us401kMatchLimit, usMiscBurn,
    includeSeveranceInSavings = true,
    creditPoints = 2.25,
    ilImputedBenefits = 0,
  } = inputs;

  const il = calcIL({
    gross: ilGross,
    eePensionPct: ilEEPension, eeKerenPct: ilEEKeren,
    erPensionPct: ilERPension, erSeverancePct: ilERSeverance, erKerenPct: ilERKeren,
    rent: ilRent, burn: ilBurn,
    creditPoints,
    includeSeveranceInSavings,
    imputedBenefits: ilImputedBenefits,
  });

  const targetSavingsUSD = il.totalSavingsILS * fxRate;
  const ilBurnUSD = ilBurn * fxRate;
  const location = LOCATIONS[selectedLoc] || LOCATIONS.NYC;

  const us = calcUS({
    grossAnnual: usGrossAnnual,
    rent: usRent, miscBurn: usMiscBurn,
    matchLimitPct: us401kMatchLimit,
    targetSavingsUSD,
    ilBurnUSD,
    location,
  });

  const ilLiquidUSD = il.liquidILS * fxRate;
  const liquidDelta = us.liquidCashFlow - ilLiquidUSD;
  const totalILSPct = ilEEPension + ilEEKeren + ilERPension
    + (includeSeveranceInSavings ? ilERSeverance : 0) + ilERKeren;

  return {
    ilNet: il.net,
    ilBTL: il.btl,
    ilMasHachnasa: il.masHachnasa,
    ilPensionCredit: il.pensionCredit,
    ilEEMatchILS: il.eeSavingsILS,
    ilERMatchILS: il.erSavingsILS,
    ilLiquidILS: il.liquidILS,

    ilGrossUSD: ilGross * fxRate,
    ilNetUSD: il.net * fxRate,
    ilBTLUSD: il.btl * fxRate,
    ilMasHachnasaUSD: il.masHachnasa * fxRate,
    ilEEMatchUSD: il.eeSavingsILS * fxRate,
    ilERMatchUSD: il.erSavingsILS * fxRate,
    ilHousingUSD: ilRent * fxRate,
    ilLifestyleUSD: ilBurn * fxRate,
    ilTotalOutUSD: (ilRent + ilBurn) * fxRate,
    ilLiquidFlowUSD: ilLiquidUSD,

    targetSavingsUSD,
    totalILSPct,

    usGrossMonthly: us.grossMonthly,
    personalUSD: us.personal,
    employerUSD: us.employer,
    totalInvested: us.totalInvested,
    wealthGapUSD: us.wealthGap,
    netTakeHome: us.netTakeHome,
    usFedMonthly: us.fedMonthly,
    usFICAMonthly: us.ficaMonthly,
    usStateMonthly: us.stateMonthly,
    usCityMonthly: us.cityMonthly,
    usRentUSD: usRent,
    usMiscBurnUSD: usMiscBurn,
    usLifestyleUSD: ilBurnUSD,
    usTotalOutUSD: us.totalOut,
    liquidCashFlow: us.liquidCashFlow,

    liquidDelta,
    optimalPct: us.grossMonthly > 0 ? (us.personal / us.grossMonthly) * 100 : 0,
  };
};

// ── New symmetric engine: any country → any country ──
//
// SidePayload = {
//   countryCode, locationKey,
//   grossLocal,         // ANNUAL in local currency
//   eePensionPct, eeOtherPct,
//   rentLocal,          // monthly
//   miscBurnLocal,      // monthly
//   matchLimitPct,      // US-only
//   // IL extras: erPensionPct, erSeverancePct, erKerenPct, creditPoints,
//   //            includeSeveranceInSavings, imputedBenefits
// }
//
// Returns { source, dest, liquidDeltaUSD, savingsDeltaUSD, takeHomeDeltaPctOfGross,
//           liquidDeltaCOLAdjustedUSD, warnings }
export const runComparison = ({ source, dest, options = {} }) => {
  const warnings = [];
  const computeSide = (payload) => {
    const country = COUNTRIES[payload.countryCode];
    if (!country) {
      warnings.push(`Unknown country: ${payload.countryCode}`);
      return null;
    }
    return country.compute({
      grossLocal: payload.grossLocal,
      eePensionPct: payload.eePensionPct ?? 0,
      eeOtherPct: payload.eeOtherPct ?? 0,
      rentLocal: payload.rentLocal ?? 0,
      miscBurnLocal: payload.miscBurnLocal ?? 0,
      locationKey: payload.locationKey,
      matchLimitPct: payload.matchLimitPct ?? 0,
      // IL extras passed through; ignored by other countries
      erPensionPct: payload.erPensionPct,
      erSeverancePct: payload.erSeverancePct,
      erKerenPct: payload.erKerenPct,
      creditPoints: payload.creditPoints,
      includeSeveranceInSavings: payload.includeSeveranceInSavings,
      imputedBenefits: payload.imputedBenefits,
    });
  };

  const srcResult = computeSide(source);
  let dstResult = computeSide(dest);

  // Optional: rebalance dest's eePensionPct so dest savings (USD) ≥ source savings (USD).
  // Linear extrapolation from a one-shot baseline; capped at MAX_PENSION_PCT_BY_COUNTRY.
  // Surface wealthGapUSD when uncoverable.
  let wealthGapUSD = 0;
  if (options.matchSourceSavings && srcResult && dstResult) {
    const targetSavingsUSD = srcResult.totalSavingsUSD;
    const currentSavingsUSD = dstResult.totalSavingsUSD;
    const currentPct = Number(dest.eePensionPct ?? 0);
    if (targetSavingsUSD > currentSavingsUSD && currentPct >= 0) {
      // Probe a 1pp delta (or use the baseline if pct is 0)
      const probePct = currentPct === 0 ? 1 : currentPct + 1;
      const probe = computeSide({ ...dest, eePensionPct: probePct });
      const savingsPerPctUSD = probe ? (probe.totalSavingsUSD - currentSavingsUSD) / (probePct - currentPct) : 0;
      let neededPct = currentPct;
      if (savingsPerPctUSD > 0) {
        neededPct = currentPct + (targetSavingsUSD - currentSavingsUSD) / savingsPerPctUSD;
      }
      const maxPct = MAX_PENSION_PCT_BY_COUNTRY[dest.countryCode] ?? 100;
      const clampedPct = Math.min(neededPct, maxPct);
      if (clampedPct > currentPct) {
        const matched = computeSide({ ...dest, eePensionPct: clampedPct });
        if (matched) dstResult = matched;
      }
      wealthGapUSD = Math.max(0, targetSavingsUSD - dstResult.totalSavingsUSD);
    }
  }

  const liquidDeltaUSD = (dstResult?.liquidUSD ?? 0) - (srcResult?.liquidUSD ?? 0);
  const savingsDeltaUSD = (dstResult?.totalSavingsUSD ?? 0) - (srcResult?.totalSavingsUSD ?? 0);

  const srcGrossUSD = (srcResult?.grossLocal ?? 0) * (FX_USD_PER_UNIT[srcResult?.currency] ?? 0);
  const dstGrossUSD = (dstResult?.grossLocal ?? 0) * (FX_USD_PER_UNIT[dstResult?.currency] ?? 0);
  const srcTakePct = srcGrossUSD > 0 ? (srcResult.netUSD / srcGrossUSD) : 0;
  const dstTakePct = dstGrossUSD > 0 ? (dstResult.netUSD / dstGrossUSD) : 0;
  const takeHomeDeltaPctOfGross = dstTakePct - srcTakePct;

  // COL adjustment: liquid_USD * (sourceCOL / destCOL)
  const srcLoc = MULTI_LOCATIONS[source.locationKey];
  const dstLoc = MULTI_LOCATIONS[dest.locationKey];
  let liquidDeltaCOLAdjustedUSD = liquidDeltaUSD;
  if (srcLoc?.colIndex && dstLoc?.colIndex && dstResult && srcResult) {
    const dstAdjusted = dstResult.liquidUSD * (srcLoc.colIndex / dstLoc.colIndex);
    liquidDeltaCOLAdjustedUSD = dstAdjusted - srcResult.liquidUSD;
  }

  if (dest.countryCode === 'CH' && dest.locationKey === 'CH-GVA') {
    warnings.push('Geneva ICC modeled approximately; verify on ge.ch.');
  }

  return {
    source: srcResult,
    dest: dstResult,
    liquidDeltaUSD,
    savingsDeltaUSD,
    takeHomeDeltaPctOfGross,
    liquidDeltaCOLAdjustedUSD,
    wealthGapUSD,
    warnings,
    options,
  };
};

// Country-specific soft cap on EE pension contribution % (used by matchSourceSavings).
// Most countries are bounded internally by their compute() (legal caps). These are guard rails.
const MAX_PENSION_PCT_BY_COUNTRY = {
  US: 100, // 401(k) capped by IRS dollar limit inside compute
  IL: 7,   // pension credit caps at 7%
  UK: 80,  // generous; pension allowance £60k caps it inside compute
  IE: 40,  // age-based reckonable %, max 40% for 60+
  DE: 25,
  FR: 20,
  NL: 30,
  CH: 15,  // Säule 3a CHF 7,258 caps inside compute
  CA: 18,
  AU: 30,
  SG: 30,
  JP: 25,
  ES: 5,   // €1,500 cap
  IT: 10,  // €5,300 cap
  PT: 10,  // PPR €2k cap
  SE: 7,   // pensionsavgift wash
  DK: 25,
  NO: 25,
  AE: 0,   // no retirement system modeled
  PL: 5,   // PPK
};
