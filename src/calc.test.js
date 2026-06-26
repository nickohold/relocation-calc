import { describe, it, expect } from 'vitest';
import {
  calcBrackets, calcBTL, calcPensionCredit, calcIL, calcUS, runEngine, runComparison,
  FED_BRACKETS, NY_STATE_BRACKETS,
  LOCATIONS, CONSTANTS, COUNTRIES, MULTI_LOCATIONS, FX_USD_PER_UNIT,
} from './calc.js';
import { fromUSD } from './fx.js';
import { calcESt2026 } from './countries/DE.js';
import { calcUKTax } from './countries/UK.js';
import { IT_NATIONAL_BRACKETS_2026 } from './countries/IT.js';
import { CH_FEDERAL_BRACKETS_SINGLE } from './countries/CH.js';
import {
  JP_INHABITANT_BASIC_DEDUCTION, JP_BASIC_DEDUCTION,
  JP_EMPLOYMENT_INCOME_DEDUCTION_CAP, JP_INHABITANT_FLAT_RATE, JP_INHABITANT_PER_CAPITA,
} from './countries/JP.js';
import { ES_STATE_BRACKETS, ES_MAD_BRACKETS, ES_PERSONAL_ALLOWANCE } from './countries/ES.js';
import { NO_G_2025 } from './countries/NO.js';

describe('calcBrackets — progressive bracket math', () => {
  it('returns 0 for zero income', () => {
    expect(calcBrackets(0, FED_BRACKETS)).toBe(0);
  });

  it('charges only first bracket if income is below threshold', () => {
    expect(calcBrackets(10000, FED_BRACKETS)).toBe(1000); // 10% × 10000
  });

  it('handles income exactly at first bracket boundary (2026: $12,400)', () => {
    expect(calcBrackets(12400, FED_BRACKETS)).toBe(1240);
  });

  it('charges across multiple brackets (single filer fed at $50k, 2026)', () => {
    // 12,400×0.10 + (50,000−12,400)×0.12 = 1240 + 4512 = 5752
    expect(calcBrackets(50000, FED_BRACKETS)).toBeCloseTo(5752, 0);
  });

  it('caps at top bracket for very high income', () => {
    // At $1M, should clearly hit the 35% bracket
    expect(calcBrackets(1_000_000, FED_BRACKETS)).toBeGreaterThan(290_000);
    expect(calcBrackets(1_000_000, FED_BRACKETS)).toBeLessThan(330_000);
  });
});

describe('calcBTL — BTL + Health Tax (2026 rates)', () => {
  it('is 0 at 0 gross', () => {
    expect(calcBTL(0)).toBe(0);
  });

  it('charges combined 4.27% (1.04% BTL + 3.23% Health) below threshold', () => {
    expect(calcBTL(5000)).toBeCloseTo(5000 * 0.0427, 2);
  });

  it('charges combined 12.17% (7% BTL + 5.17% Health) above threshold', () => {
    // 7703×0.0427 + (15000−7703)×0.1217 = 328.92 + 887.36 = 1216.28
    expect(calcBTL(15000)).toBeCloseTo(7703 * 0.0427 + (15000 - 7703) * 0.1217, 2);
  });

  it('caps at the 51,910 ILS ceiling', () => {
    const atCap = calcBTL(51910);
    const above = calcBTL(80000);
    expect(above).toBeCloseTo(atCap, 2);
  });

  it('matches real payslip: BTL+Health on taxable ₪34,296 = ₪3,565', () => {
    // Reference 2026 payslip: BTL ₪1,941.65 + Health ₪1,623.69 = ₪3,565.34
    expect(calcBTL(34296)).toBeCloseTo(3565.34, 0);
  });
});

describe('calcPensionCredit — Israeli 35% pension tax credit', () => {
  it('is 0 when EE pension is 0', () => {
    expect(calcPensionCredit(15000, 0)).toBe(0);
  });

  it('returns 35% × actual contribution when below the 7% cap', () => {
    // gross 15000, EE pension 6% = 900 ILS contrib
    // cap = min(15000, 9684) × 7% = 677.88
    // eligible = min(900, 677.88) = 677.88
    // credit = 677.88 × 0.35 = 237.258
    expect(calcPensionCredit(15000, 6)).toBeCloseTo(237.258, 2);
  });

  it('caps at 7% of the insured-salary cap (9,684 ILS)', () => {
    // EE pension 20% = 3000 ILS — way above cap
    const credit = calcPensionCredit(15000, 20);
    expect(credit).toBeCloseTo(9684 * 0.07 * 0.35, 2); // ~237.258
  });

  it('uses gross when below the insured-salary cap', () => {
    // gross 5000 (below 9684 cap), 7% = 350; credit = 350 × 0.35 = 122.5
    expect(calcPensionCredit(5000, 7)).toBeCloseTo(122.5, 2);
  });
});

describe('calcIL — Israel engine', () => {
  const baseIL = {
    gross: 15000,
    eePensionPct: 6, eeKerenPct: 2.5,
    erPensionPct: 6.5, erSeverancePct: 8.33, erKerenPct: 7.5,
    rent: 8650, burn: 9000,
  };

  it('produces sensible net for default inputs', () => {
    const r = calcIL(baseIL);
    // Net should be positive and less than gross
    expect(r.net).toBeGreaterThan(0);
    expect(r.net).toBeLessThan(baseIL.gross);
    // Sanity: net ≈ gross − BTL − tax − EE pension − EE keren
    const reconstructed = baseIL.gross - r.btl - r.masHachnasa - r.eePensionILS - r.eeKerenILS;
    expect(r.net).toBeCloseTo(reconstructed, 2);
  });

  it('subtracts the pension tax credit from income tax', () => {
    const withPension = calcIL(baseIL);
    const withoutPension = calcIL({ ...baseIL, eePensionPct: 0 });
    // Without EE pension, no credit — tax owed on gross is higher (no offset)
    // (But also fewer deductions from net.) We're checking the credit shows up.
    expect(withPension.pensionCredit).toBeGreaterThan(0);
    expect(withoutPension.pensionCredit).toBe(0);
  });

  it('includes severance in savings when toggle is true (default)', () => {
    const r = calcIL(baseIL);
    // ER savings = pension+severance+keren = 6.5+8.33+7.5 = 22.33% × 15000 = 3349.5
    expect(r.erSavingsILS).toBeCloseTo(15000 * 0.2233, 1);
  });

  it('excludes severance from savings when toggle is false (BUG FIX)', () => {
    const r = calcIL({ ...baseIL, includeSeveranceInSavings: false });
    // ER savings = pension+keren only = 6.5+7.5 = 14% × 15000 = 2100
    expect(r.erSavingsILS).toBeCloseTo(15000 * 0.14, 1);
    // EE savings still includes pension+keren
    expect(r.eeSavingsILS).toBeCloseTo(15000 * 0.085, 1); // 6+2.5
  });

  it('liquid ILS = net − rent − burn', () => {
    const r = calcIL(baseIL);
    expect(r.liquidILS).toBeCloseTo(r.net - baseIL.rent - baseIL.burn, 2);
  });

  it('handles zero gross gracefully', () => {
    const r = calcIL({ ...baseIL, gross: 0 });
    expect(r.btl).toBe(0);
    expect(r.masHachnasa).toBe(0);
    expect(r.net).toBe(0);
  });

  it('caps EE keren at the ₪15,712/mo statutory base (2026)', () => {
    // At gross ₪32,000, EE keren is on min(32000, 15712) = 15712
    // EE keren 2.5% = ₪392.80, NOT 2.5% × 32000 = ₪800
    const r = calcIL({ ...baseIL, gross: 32000 });
    expect(r.eeKerenILS).toBeCloseTo(15712 * 0.025, 2); // ₪392.80
  });

  it('caps ER keren at the ₪15,712/mo statutory base (2026)', () => {
    // ER keren 7.5% × 15,712 = ₪1,178.40
    const r = calcIL({ ...baseIL, gross: 32000 });
    // Expect the ER keren component of erSavingsILS to reflect the cap
    // erSavings = ER pension (full gross) + ER keren (capped) + ER severance (full gross)
    const expectedERPension = 32000 * (baseIL.erPensionPct / 100);
    const expectedERKeren = 15712 * (baseIL.erKerenPct / 100);
    const expectedERSeverance = 32000 * (baseIL.erSeverancePct / 100);
    expect(r.erSavingsILS).toBeCloseTo(
      expectedERPension + expectedERKeren + expectedERSeverance, 1,
    );
  });

  it('does NOT cap pension contributions (only keren is capped)', () => {
    // EE pension stays at 6% × full gross
    const r = calcIL({ ...baseIL, gross: 32000 });
    expect(r.eePensionILS).toBeCloseTo(32000 * 0.06, 2); // ₪1,920
  });

  it('imputed benefits default to 0 — current callers see no behavior change', () => {
    const noImputed = calcIL(baseIL);
    const explicitZero = calcIL({ ...baseIL, imputedBenefits: 0 });
    expect(noImputed.net).toBe(explicitZero.net);
    expect(noImputed.btl).toBe(explicitZero.btl);
    expect(noImputed.masHachnasa).toBe(explicitZero.masHachnasa);
  });

  it('imputed benefits inflate BTL and income tax base', () => {
    const without = calcIL(baseIL);
    const withPerks = calcIL({ ...baseIL, imputedBenefits: 1000 });
    expect(withPerks.btl).toBeGreaterThan(without.btl);
    expect(withPerks.masHachnasa).toBeGreaterThan(without.masHachnasa);
  });

  it('imputed benefits do NOT enter cash net (no cash crosses hands)', () => {
    const without = calcIL(baseIL);
    const withPerks = calcIL({ ...baseIL, imputedBenefits: 1000 });
    // Net is LOWER because tax/BTL paid on extra base, but no extra cash inflow.
    expect(withPerks.net).toBeLessThan(without.net);
  });

  it('imputed benefits do NOT change pension or keren contributions', () => {
    const without = calcIL(baseIL);
    const withPerks = calcIL({ ...baseIL, imputedBenefits: 5000 });
    expect(withPerks.eePensionILS).toBe(without.eePensionILS);
    expect(withPerks.eeKerenILS).toBe(without.eeKerenILS);
  });
});

describe('calcUS — US engine', () => {
  const baseUS = {
    grossAnnual: 180000,
    rent: 4500, miscBurn: 900,
    matchLimitPct: 6,
    targetSavingsUSD: 1249,
    ilBurnUSD: 2430,
    location: LOCATIONS.NYC,
  };

  it('FICA: Social Security capped at $184,500 wage base (2026)', () => {
    const high = calcUS({ ...baseUS, grossAnnual: 500000 });
    // SS portion is capped: 184500 × 0.062 = 11439.00
    // Plus medicare 1.45% on 500k = 7250
    // Plus additional medicare 0.9% on (500k−200k) = 2700
    // Total = 21389.00 → /12 = 1782.42
    expect(high.ficaMonthly).toBeCloseTo(21389 / 12, 1);
  });

  it('FICA: Additional Medicare 0.9% kicks in only above $200k', () => {
    const just_under = calcUS({ ...baseUS, grossAnnual: 200000 });
    const just_over = calcUS({ ...baseUS, grossAnnual: 200001 });
    // Just over threshold should add ~$0.009/12 ≈ negligible — but no jump:
    // additional medicare grows continuously from $200k.
    expect(just_over.ficaMonthly).toBeGreaterThan(just_under.ficaMonthly);
    expect(just_over.ficaMonthly - just_under.ficaMonthly).toBeLessThan(0.01);
  });

  it('NY: 401k IS pre-tax for state and city tax', () => {
    const ny_no401k = calcUS({ ...baseUS, targetSavingsUSD: 0, matchLimitPct: 0, location: LOCATIONS.NYC });
    const ny_with401k = calcUS({ ...baseUS, targetSavingsUSD: 12000, matchLimitPct: 0, location: LOCATIONS.NYC });
    // NY+NYC tax should drop when 401k is contributed (pre-tax)
    const taxesNo = ny_no401k.stateMonthly + ny_no401k.cityMonthly;
    const taxesWith = ny_with401k.stateMonthly + ny_with401k.cityMonthly;
    expect(taxesWith).toBeLessThan(taxesNo);
  });

  it('NJ: 401k IS pre-tax for state tax (per NJ Div. of Taxation GIT-1&2 Jan 2026)', () => {
    const nj_no401k = calcUS({ ...baseUS, targetSavingsUSD: 0, matchLimitPct: 0, location: LOCATIONS.NJ });
    const nj_with401k = calcUS({ ...baseUS, targetSavingsUSD: 12000, matchLimitPct: 0, location: LOCATIONS.NJ });
    // NJ excludes 401(k) employee contributions from taxable wages — state tax must drop with contribution
    expect(nj_with401k.stateMonthly).toBeLessThan(nj_no401k.stateMonthly);
  });

  it('TX: no state or city tax', () => {
    const tx = calcUS({ ...baseUS, location: LOCATIONS.ATX });
    expect(tx.stateMonthly).toBe(0);
    expect(tx.cityMonthly).toBe(0);
  });

  it('Wealth Gap is 0 when target is reachable', () => {
    const r = calcUS(baseUS);
    expect(r.wealthGap).toBe(0);
    expect(r.totalInvested).toBeCloseTo(baseUS.targetSavingsUSD, 1);
  });

  it('Wealth Gap is positive when target exceeds IRS limit + employer match', () => {
    // Target $50k/mo is impossible to hit even with full employer match + IRS cap
    const r = calcUS({ ...baseUS, targetSavingsUSD: 50000 });
    expect(r.wealthGap).toBeGreaterThan(0);
    // Personal contribution capped at 24500/12 (2026 IRS limit)
    expect(r.personal).toBeCloseTo(24500 / 12, 2);
  });

  it('personal contribution is monotonic in employer match (no U-curve regression)', () => {
    const at0 = calcUS({ ...baseUS, matchLimitPct: 0 }).personal;
    const at4 = calcUS({ ...baseUS, matchLimitPct: 4 }).personal;
    const at6 = calcUS({ ...baseUS, matchLimitPct: 6 }).personal;
    // More employer match → less personal contribution required
    expect(at0).toBeGreaterThan(at4);
    expect(at4).toBeGreaterThan(at6);
  });

  it('liquidCashFlow = netTakeHome − rent − miscBurn − ilBurnUSD', () => {
    const r = calcUS(baseUS);
    expect(r.liquidCashFlow).toBeCloseTo(
      r.netTakeHome - baseUS.rent - baseUS.miscBurn - baseUS.ilBurnUSD,
      2,
    );
  });
});

describe('runEngine — end-to-end', () => {
  const defaults = {
    ilGross: 15000,
    ilEEPension: 6, ilEEKeren: 2.5,
    ilERPension: 6.5, ilERSeverance: 8.33, ilERKeren: 7.5,
    ilRent: 8650, ilBurn: 9000,
    fxRate: 0.27,
    selectedLoc: 'NYC',
    usGrossAnnual: 180000,
    usRent: 4500, us401kMatchLimit: 6, usMiscBurn: 900,
  };

  it('produces no NaNs anywhere with default inputs', () => {
    const r = runEngine(defaults);
    for (const [k, v] of Object.entries(r)) {
      expect(Number.isFinite(v), `${k} is NaN: ${v}`).toBe(true);
    }
  });

  it('handles 0 gross without crashing', () => {
    const r = runEngine({ ...defaults, ilGross: 0, usGrossAnnual: 0 });
    expect(Number.isFinite(r.liquidDelta)).toBe(true);
  });

  it('totalILSPct excludes severance when toggle is off', () => {
    const on = runEngine({ ...defaults, includeSeveranceInSavings: true });
    const off = runEngine({ ...defaults, includeSeveranceInSavings: false });
    expect(on.totalILSPct - off.totalILSPct).toBeCloseTo(defaults.ilERSeverance, 2);
  });

  it('switching from NYC to ATX increases liquidCashFlow (no state/city tax + cheap rent)', () => {
    const nyc = runEngine({ ...defaults, selectedLoc: 'NYC' });
    const atx = runEngine({ ...defaults, selectedLoc: 'ATX', usRent: 2600 });
    expect(atx.liquidCashFlow).toBeGreaterThan(nyc.liquidCashFlow);
  });

  it('higher employer match never decreases lifestyle (no U-curve)', () => {
    const points = [0, 2, 4, 6, 8, 10].map(pct =>
      runEngine({ ...defaults, us401kMatchLimit: pct }).liquidCashFlow
    );
    for (let i = 1; i < points.length; i++) {
      expect(points[i]).toBeGreaterThanOrEqual(points[i - 1] - 0.01);
    }
  });

  it('disabling severance reduces savings target (and may flip the answer)', () => {
    const on = runEngine({ ...defaults, includeSeveranceInSavings: true });
    const off = runEngine({ ...defaults, includeSeveranceInSavings: false });
    expect(off.targetSavingsUSD).toBeLessThan(on.targetSavingsUSD);
    // With less mandatory savings, lifestyle improves
    expect(off.liquidCashFlow).toBeGreaterThan(on.liquidCashFlow);
  });
});

// Reference-payslip regression: a known-good 2026 Israeli slip, gross ₪32,000.
// Anonymized real-world vector — locks the engine to verified deduction figures.
describe('Reference payslip — 2026', () => {
  const slip = calcIL({
    gross: 32000,
    eePensionPct: 6, eeKerenPct: 2.5,
    erPensionPct: 6.5, erSeverancePct: 8.33, erKerenPct: 7.5,
    rent: 0, burn: 0,
  });

  it('EE pension matches slip (₪1,920)', () => {
    expect(slip.eePensionILS).toBeCloseTo(1920, 0);
  });

  it('EE keren matches slip (₪392.80)', () => {
    expect(slip.eeKerenILS).toBeCloseTo(392.80, 1);
  });

  it('BTL+Health gap vs slip equals (imputed benefits × 12.17%) — within ₪10 of ₪279', () => {
    // Slip's taxable was 34,296 (incl. ₪2,296 of imputed benefits not in our model).
    // Gap should equal 2,296 × 12.17% ≈ ₪279.42.
    const slipTotal = 1941.65 + 1623.69; // 3565.34
    expect(slipTotal - slip.btl).toBeCloseTo(2296 * 0.1217, -1); // within ~₪10
  });

  it('feeding ACTUAL taxable (₪34,296) into calcBTL matches slip exactly', () => {
    // Direct: shows the engine itself is correct; the gap above is only because
    // the model doesn't auto-add imputed benefits to gross.
    const directBTL = calcIL({
      gross: 34296,
      eePensionPct: 6, eeKerenPct: 2.5,
      erPensionPct: 6.5, erSeverancePct: 8.33, erKerenPct: 7.5,
      rent: 0, burn: 0,
    }).btl;
    expect(directBTL).toBeCloseTo(3565.34, 0);
  });

  it('income tax — within ₪500 of the ₪5,983.61 on slip (residual gap = section 47 deduction nuance)', () => {
    // Slip shows ₪5,983.61. Our model is slightly higher because Section 47
    // pension deduction interplay is not fully modeled. Documented in LOGIC.md §5.1.
    expect(slip.masHachnasa).toBeGreaterThan(5500);
    expect(slip.masHachnasa).toBeLessThan(6500);
  });
});

describe('Constants & metadata', () => {
  it('IRS 401k limit matches 2026 figure', () => {
    expect(CONSTANTS.IRS_401K_LIMIT_ANNUAL).toBe(24500);
  });

  it('all locations have a defaultRent', () => {
    for (const [key, loc] of Object.entries(LOCATIONS)) {
      expect(typeof loc.defaultRent, `${key} missing defaultRent`).toBe('number');
      expect(loc.defaultRent).toBeGreaterThan(0);
    }
  });

  it('NY brackets are sorted ascending', () => {
    let prev = 0;
    for (const b of NY_STATE_BRACKETS) {
      expect(b.max).toBeGreaterThan(prev);
      prev = b.max;
    }
  });
});

// ── Multi-country sanity tests (Phase 1 refactor) ──
//
// Each country's effective-tax-rate band at ~$120k USD-equivalent gross.
// REGRESSION LOCK: the windows below were tightened to ~±2pp around the CURRENT
// engine output (computed and sanity-checked against the documented primary-source
// bands, which were wider). These intentionally pin current behavior so a future
// coefficient regression (wrong bracket, dropped deduction, FX shift) fails the suite,
// rather than silently passing inside a 12-point window. Do NOT loosen these bands.
// Comment shows the measured engine value the band brackets.
describe('Multi-country effective tax bands at ~$120k USD equivalent', () => {
  const cases = [
    // [code, locationKey, minPct, maxPct]  // measured engine output
    ['UK', 'UK-LON', 27, 31],   // 29.04
    ['IE', 'IE-DUB', 32, 36],   // 33.81
    ['DE', 'DE-BER', 47, 51],   // 48.64
    ['FR', 'FR-PAR', 36, 40],   // 37.57
    ['NL', 'NL-AMS', 32, 37],   // 34.26
    ['CH', 'CH-ZRH', 16, 19],   // 17.05
    ['CA', 'CA-TOR', 26, 30],   // 27.77
    ['AU', 'AU-SYD', 27, 31],   // 29.25
    ['SG', 'SG-SIN', 18, 22],   // 19.69
    ['JP', 'JP-TYO', 32, 36],   // 33.84
    ['ES', 'ES-MAD', 33, 37],   // 35.14
    ['IT', 'IT-MIL', 41, 45],   // 43.02
    ['PT', 'PT-LIS', 44, 48],   // 45.78
    ['SE', 'SE-STO', 32, 36],   // 33.86
    ['DK', 'DK-CPH', 35, 39],   // 36.74
    ['NO', 'NO-OSL', 30, 34],   // 32.20
    ['AE', 'AE-DXB', 0, 0.5],   // 0.03 (no income tax; already tight)
    ['PL', 'PL-WAW', 38, 42],   // 40.40
  ];

  for (const [code, locationKey, minPct, maxPct] of cases) {
    it(`${code}: effective tax rate at $120k USD-equiv is in [${minPct}%, ${maxPct}%]`, () => {
      const country = COUNTRIES[code];
      const gross = fromUSD(120000, country.currency);
      const r = country.compute({ grossLocal: gross, locationKey });
      const pct = r.effectiveTaxRate * 100;
      expect(pct).toBeGreaterThanOrEqual(minPct);
      expect(pct).toBeLessThanOrEqual(maxPct);
      expect(Number.isFinite(r.netLocal)).toBe(true);
      expect(Number.isFinite(r.netUSD)).toBe(true);
    });
  }
});

describe('Multi-country registry integrity', () => {
  it('every LOCATIONS entry has a country in COUNTRIES', () => {
    for (const [key, loc] of Object.entries(MULTI_LOCATIONS)) {
      expect(COUNTRIES[loc.country], `${key} has unknown country ${loc.country}`).toBeDefined();
    }
  });

  it('every LOCATIONS entry has a defaultRent and name', () => {
    for (const [key, loc] of Object.entries(MULTI_LOCATIONS)) {
      expect(typeof loc.defaultRent, `${key} missing defaultRent`).toBe('number');
      expect(loc.defaultRent).toBeGreaterThan(0);
      expect(typeof loc.name).toBe('string');
    }
  });

  it('FX_USD_PER_UNIT covers all currencies in COUNTRIES', () => {
    for (const [code, country] of Object.entries(COUNTRIES)) {
      expect(FX_USD_PER_UNIT[country.currency], `${code} currency ${country.currency} missing FX`).toBeGreaterThan(0);
    }
  });

  it('every country in COUNTRIES has at least one location', () => {
    for (const [code, country] of Object.entries(COUNTRIES)) {
      expect(country.locations.length, `${code} has no locations`).toBeGreaterThan(0);
    }
  });
});

// ── DE §32a EStG 2026 piecewise tariff ──
//
// Reference figures from the published 2026 Grundtabelle (Bundesfinanzministerium /
// finanz-tools.de Einkommensteuer-Berechnung 2026). Tolerance 1%.
describe('DE — §32a EStG 2026 ESt vs published Grundtabelle', () => {
  const within1pct = (actual, expected) =>
    Math.abs(actual - expected) / expected < 0.01;

  // Assert against the SHIPPED calcESt2026 (imported from DE.js) — not an inline copy — so a
  // wrong coefficient in the real §32a tariff fails the suite. Expected values are independent
  // published Grundtabelle 2026 entries (Bundesfinanzministerium / finanz-tools.de).
  it('zone-2 reference: zvE €15,000 → ESt ≈ €435 (Grundtabelle 2026)', () => {
    expect(within1pct(calcESt2026(15000), 435)).toBe(true);
  });
  it('zone-3 reference: zvE €50,000 → ESt ≈ €10,548 (Grundtabelle 2026)', () => {
    expect(within1pct(calcESt2026(50000), 10548)).toBe(true);
  });
  it('zone-4 reference: zvE €80,000 → ESt ≈ €22,464', () => {
    expect(within1pct(calcESt2026(80000), 22464)).toBe(true);
  });
  it('zone-4 reference: zvE €150,000 → ESt ≈ €51,864', () => {
    expect(within1pct(calcESt2026(150000), 51864)).toBe(true);
  });

  // End-to-end via compute(): no bAV, no Riester, just §32a + soli + social.
  // Net should be lower than gross by a sensible margin (40-50% all-in at €100k).
  it('compute() at €100k gross: incomeTax (ESt+Soli) is plausible', () => {
    const r = COUNTRIES.DE.compute({
      grossLocal: 100000, bavPct: 0, erBavPct: 0, riesterFlag: false,
    });
    // taxable = 100000 - 1230 = 98770 → ESt ≈ 0.42 × 98770 - 11135.63 = 30347.77
    // Soli kicks in (>20350) → ESt × 0.055 = 1669.13
    // Total IT ≈ 32016
    expect(r.incomeTax).toBeGreaterThan(30000);
    expect(r.incomeTax).toBeLessThan(34000);
  });
});

// ── SE jobbskatteavdrag + grundavdrag 2026 piecewise (SKV 433) ──
describe('SE — 2026 jobbskatteavdrag/grundavdrag vs SKV 433 examples', () => {
  // SKV 433 worked example 1: AI 90,000, KI 32.84% → JSA = 11,976 SEK
  // SKV 433 worked example 2: AI 240,000, KI 32.84% → JSA = 26,083 SEK
  // Stockholm KI = 30.55%, so we recompute expected at Stockholm rate too.
  it('matches SKV 433 worked example 1 at AI 90,000 with KI 32.84%', async () => {
    const SE = await import('./countries/SE.js');
    const reduction = SE.calcJobbskatteavdrag2026(90000, 0.34); // 0.34 - 0.0116 = 0.3284
    expect(Math.abs(reduction - 11976)).toBeLessThan(2);
  });

  it('matches SKV 433 worked example 2 at AI 240,000 with KI 32.84%', async () => {
    const SE = await import('./countries/SE.js');
    const reduction = SE.calcJobbskatteavdrag2026(240000, 0.34); // 0.34 - 0.0116 = 0.3284
    expect(Math.abs(reduction - 26083)).toBeLessThan(2);
  });

  it('grundavdrag at FFI 120,000 = 37,400 (SKV 433 example 1)', async () => {
    const SE = await import('./countries/SE.js');
    expect(SE.calcGrundavdrag2026(120000)).toBe(37400);
  });

  it('grundavdrag at FFI 324,000 = 31,600 (SKV 433 example 2)', async () => {
    const SE = await import('./countries/SE.js');
    expect(SE.calcGrundavdrag2026(324000)).toBe(31600);
  });

  // End-to-end compute() spot checks — Stockholm.
  it('SE compute() incomeTax is sensible at SEK 400k, 700k, 1.2M', () => {
    const r400 = COUNTRIES.SE.compute({ grossLocal: 400000, eeSalaryExchangePct: 0 });
    const r700 = COUNTRIES.SE.compute({ grossLocal: 700000, eeSalaryExchangePct: 0 });
    const r1200 = COUNTRIES.SE.compute({ grossLocal: 1200000, eeSalaryExchangePct: 0 });
    // Effective rate increases monotonically.
    expect(r400.effectiveTaxRate).toBeLessThan(r700.effectiveTaxRate);
    expect(r700.effectiveTaxRate).toBeLessThan(r1200.effectiveTaxRate);
    // Sanity bands (excluding employer arbetsgivaravgift by design):
    // SEK 400k Stockholm ≈ 18-22% effective (after JSA), 1.2M ≈ 35-45% (statlig kicks in).
    expect(r400.effectiveTaxRate * 100).toBeGreaterThan(15);
    expect(r400.effectiveTaxRate * 100).toBeLessThan(24);
    expect(r1200.effectiveTaxRate * 100).toBeGreaterThan(33);
    expect(r1200.effectiveTaxRate * 100).toBeLessThan(48);
  });
});

// ── FR cadre vs non-cadre toggle ──
describe('FR — cadre/non-cadre cotisation toggle', () => {
  it('cadre default produces higher cotisations than non-cadre at €90k', () => {
    const cadre = COUNTRIES.FR.compute({ grossLocal: 90000, perPct: 5, erPerPct: 3, isCadre: true });
    const noncadre = COUNTRIES.FR.compute({ grossLocal: 90000, perPct: 5, erPerPct: 3, isCadre: false });
    // Contributory rate: cadre 15% − non-cadre 11.5% = 3.5% × €90k = €3,150 extra cotisations.
    // CSG/CRDS are identical on both sides, so the whole delta is contributory.
    expect(cadre.socialSec - noncadre.socialSec).toBeCloseTo(0.035 * 90000, 0);
    // Net is lower under cadre (more taken).
    expect(cadre.netLocal).toBeLessThan(noncadre.netLocal);
  });

  it('default isCadre = true via PENSION_META metaDefaults', async () => {
    const meta = await import('./components/pensionMeta.js');
    const fr = meta.PENSION_META.FR;
    const cadreField = fr.fields.find((f) => f.key === 'isCadre');
    expect(cadreField).toBeDefined();
    expect(cadreField.default).toBe(true);
    expect(cadreField.kind).toBe('toggle');
  });
});

// ── Tax-accuracy batch 2: locks corrected engine values ──
describe('UK — 45% additional-rate band under PA taper', () => {
  it('does not start the 45% band before £125,140 once PA is tapered', () => {
    // £120k: pa = 12,570 − (120,000−100,000)/2 = 2,570 → aboveAllowance = 117,430.
    // 20% × 37,700 = 7,540; 40% × (117,430 − 37,700) = 31,892; 45% × 0 (117,430 < 122,570) = 0.
    // Correct income tax = £39,432. The old code (40% ceiling 112,570) charged £39,675 —
    // £243 too much here, up to ~£628 just below £125,140.
    expect(calcUKTax(120000)).toBeCloseTo(39432, 2);
  });

  it('45% applies only above £125,140 of total income (PA fully tapered)', () => {
    // At £125,140, pa = 0 → aboveAllowance = 125,140. 40% band runs to 125,140 − 0.
    // 7,540 + 40% × 87,440 = 7,540 + 34,976 = 42,516. No 45% yet.
    expect(calcUKTax(125140)).toBeCloseTo(42516, 2);
  });

  it('is unchanged below £100k (full PA, no taper)', () => {
    // £88,261: pa = 12,570 → aboveAllowance = 75,691. 7,540 + 40% × 37,991 = 22,736.4.
    expect(calcUKTax(88261)).toBeCloseTo(7540 + 0.40 * (75691 - 37700), 2);
  });
});

describe('NO — employer OTP upper-band rate is the input (capped at 18.1%)', () => {
  const G = NO_G_2025;
  const tier1Base = 7.1 * G - G;       // 1G..7.1G
  const tier2Base = 12 * G - 7.1 * G;  // 7.1G..12G

  it('uses the actual 5% input on the 7.1G–12G band, not a forced 18.1%', () => {
    const r = COUNTRIES.NO.compute({ grossLocal: 12 * G, erOtpPct: 5, eeOtpPct: 0, ipsAmt: 0 });
    // tier1 × 5% + tier2 × 5% — NOT tier2 × 18.1% (which booked phantom pension).
    expect(r.erContributions).toBeCloseTo((tier1Base + tier2Base) * 0.05, 1);
  });

  it('caps the upper-band employer rate at the 18.1% legal maximum', () => {
    const r = COUNTRIES.NO.compute({ grossLocal: 12 * G, erOtpPct: 20, eeOtpPct: 0, ipsAmt: 0 });
    expect(r.erContributions).toBeCloseTo(tier1Base * 0.20 + tier2Base * 0.181, 1);
  });
});

describe('IT — second IRPEF band is 35% (3-rate schedule)', () => {
  it('taxes the €28k–€50k band at 35%, not 33%', () => {
    expect(IT_NATIONAL_BRACKETS_2026[1].rate).toBe(0.35);
    // brackets(50,000) = 28,000 × 23% + 22,000 × 35% = 6,440 + 7,700 = 14,140.
    expect(calcBrackets(50000, IT_NATIONAL_BRACKETS_2026)).toBeCloseTo(14140, 2);
  });
});

describe('CH — AHV/ALV social contributions deducted from the taxable base', () => {
  it('nets out socialSec (not just pension) before the federal tariff', () => {
    const r = COUNTRIES.CH.compute({ grossLocal: 150000, age: 35, locationKey: 'CH-ZRH' });
    const correctBase = 150000 - r.eePensionLocal - r.socialSec;
    expect(r.incomeTax).toBeCloseTo(calcBrackets(correctBase, CH_FEDERAL_BRACKETS_SINGLE), 2);
    // Strictly lower than the old base (pension only), proving socialSec is now deducted.
    const oldBase = 150000 - r.eePensionLocal;
    expect(r.incomeTax).toBeLessThan(calcBrackets(oldBase, CH_FEDERAL_BRACKETS_SINGLE));
  });
});

describe('JP — inhabitant tax uses the ¥430k residence basic deduction', () => {
  it('computes residence-tax base with ¥430k, not the national ¥580k', () => {
    const r = COUNTRIES.JP.compute({ grossLocal: 18000000, iDecoMonthlyJpy: 23000, dcCorpMonthlyJpy: 0, age: 35 });
    const inhabitantBase = 18000000 - JP_EMPLOYMENT_INCOME_DEDUCTION_CAP
      - JP_INHABITANT_BASIC_DEDUCTION - r.socialSec - r.eePensionLocal;
    const expected = inhabitantBase * JP_INHABITANT_FLAT_RATE + JP_INHABITANT_PER_CAPITA;
    expect(r.localTax).toBeCloseTo(expected, 2);
    // Higher than the old (national 580k) base by exactly (580k−430k)×10% = ¥15,000.
    const oldBase = 18000000 - JP_EMPLOYMENT_INCOME_DEDUCTION_CAP
      - JP_BASIC_DEDUCTION - r.socialSec - r.eePensionLocal;
    const oldInhabitant = oldBase * JP_INHABITANT_FLAT_RATE + JP_INHABITANT_PER_CAPITA;
    expect(r.localTax - oldInhabitant).toBeCloseTo(15000, 2);
  });
});

describe('ES — mínimo personal applied as a bottom-rate credit', () => {
  it('credits the mínimo at the lowest bracket rate, not as a base deduction', () => {
    const r = COUNTRIES.ES.compute({ grossLocal: 111000, planPensionesAmt: 1500, erPlanEmpleoAmt: 0, locationKey: 'ES-MAD' });
    const ss = Math.min(111000, 61214.40) * 0.065;
    const base = 111000 - 1500 - ss; // mínimo NOT subtracted from base
    const expected =
      Math.max(0, calcBrackets(base, ES_STATE_BRACKETS) - calcBrackets(ES_PERSONAL_ALLOWANCE, ES_STATE_BRACKETS))
      + Math.max(0, calcBrackets(base, ES_MAD_BRACKETS) - calcBrackets(ES_PERSONAL_ALLOWANCE, ES_MAD_BRACKETS));
    expect(r.incomeTax).toBeCloseTo(expected, 2);
    // Credit relief (~bottom-rate) is smaller than the old base-deduction relief
    // (~marginal), so corrected tax is strictly higher.
    const oldBase = base - ES_PERSONAL_ALLOWANCE;
    const oldTax = calcBrackets(oldBase, ES_STATE_BRACKETS) + calcBrackets(oldBase, ES_MAD_BRACKETS);
    expect(r.incomeTax).toBeGreaterThan(oldTax);
  });
});

// ── Reference vectors against published/derivable authoritative figures ──
//
// These assert the SHIPPED engine within ~1-2% of a number sourced from (or directly
// derivable from) the tax authority's own published rates. A wrong coefficient fails.
describe('Reference vectors — published authority figures', () => {
  it('UK HMRC: £50,000 salary → income tax £7,486 (2025/26 rUK)', () => {
    // PA £12,570; £37,430 of basic-rate band at 20% = £7,486. Matches HMRC
    // "Estimate your Income Tax" / gov.uk/income-tax-rates for a £50k earner.
    expect(calcUKTax(50000)).toBeCloseTo(7486, 2);
  });

  it('AU ATO: $100,000 income → income tax $20,788 + Medicare levy $2,000 (FY2025-26)', () => {
    // ATO resident rates: 16%×(45,000−18,200) + 30%×(100,000−45,000) = 4,288 + 16,500 = 20,788.
    // Medicare levy 2% × 100,000 = 2,000; MLS nil below $101k. Matches ATO simple tax calc.
    const r = COUNTRIES.AU.compute({ grossLocal: 100000, salarySacrificePct: 0 });
    expect(r.incomeTax).toBeCloseTo(20788, 0);
    expect(r.socialSec).toBeCloseTo(2000, 0);
  });

  it('US IRS: $100,000 single, 2026 → federal income tax $13,170', () => {
    // Std deduction $16,100 → taxable $83,900. 2026 brackets (Rev. Proc. 2025-32, post-OBBBA):
    // 10%×12,400 + 12%×(50,400−12,400) + 22%×(83,900−50,400) = 1,240 + 4,560 + 7,370 = 13,170.
    const taxable = 100000 - CONSTANTS.FED_STANDARD_DEDUCTION_SINGLE;
    expect(calcBrackets(taxable, FED_BRACKETS)).toBeCloseTo(13170, 0);
  });

  it('IT Agenzia delle Entrate: €60,000 IRPEF gross-bracket tax = €18,440 (2026 3-rate)', () => {
    // 23%×28,000 + 35%×(50,000−28,000) + 43%×(60,000−50,000) = 6,440 + 7,700 + 4,300 = 18,440.
    expect(calcBrackets(60000, IT_NATIONAL_BRACKETS_2026)).toBeCloseTo(18440, 2);
  });
});

describe('runComparison — unknown-country guard', () => {
  const goodDest = {
    countryCode: 'US', locationKey: 'US-NYC',
    grossLocal: 180000, eePensionPct: 6, matchLimitPct: 6,
    rentLocal: 4500, miscBurnLocal: 900,
  };

  it('returns null for the bad side and pushes an "Unknown country" warning', () => {
    const r = runComparison({
      source: { countryCode: 'ZZ', locationKey: 'ZZ-XXX', grossLocal: 100000 },
      dest: goodDest,
    });
    expect(r.source).toBeNull();
    expect(r.dest.countryCode).toBe('US');
    expect(r.warnings.some((w) => /Unknown country: ZZ/.test(w))).toBe(true);
  });

  it('does not crash and yields finite deltas when a side is unknown (null → 0 fallback)', () => {
    const r = runComparison({
      source: { countryCode: 'ZZ', locationKey: 'ZZ-XXX', grossLocal: 100000 },
      dest: goodDest,
    });
    // liquidDeltaUSD = dest.liquidUSD − (null ?? 0)
    expect(r.liquidDeltaUSD).toBeCloseTo(r.dest.liquidUSD, 6);
    expect(Number.isFinite(r.savingsDeltaUSD)).toBe(true);
    expect(Number.isFinite(r.takeHomeDeltaPctOfGross)).toBe(true);
  });

  it('warns for both sides when both countries are unknown', () => {
    const r = runComparison({
      source: { countryCode: 'ZZ', grossLocal: 100000 },
      dest: { countryCode: 'QQ', grossLocal: 100000 },
    });
    expect(r.source).toBeNull();
    expect(r.dest).toBeNull();
    expect(r.warnings.filter((w) => /Unknown country/.test(w)).length).toBe(2);
  });
});

describe('runComparison — matchSourceSavings dead-lever warning', () => {
  const source = {
    countryCode: 'IL', locationKey: 'IL-TLV',
    grossLocal: 50000 * 12, eePensionPct: 6, eeOtherPct: 2.5,
    rentLocal: 0, miscBurnLocal: 0,
    erPensionPct: 6.5, erSeverancePct: 8.33, erKerenPct: 7.5,
  };
  const dest = {
    countryCode: 'CH', locationKey: 'CH-ZRH',
    grossLocal: 80000, eePensionPct: 0,
    rentLocal: 0, miscBurnLocal: 0,
  };

  it('warns when the destination ignores the generic pension lever', () => {
    const r = runComparison({ source, dest, options: { matchSourceSavings: true } });
    expect(r.warnings.some((w) => /auto-match/i.test(w))).toBe(true);
  });

  it('adds no such warning when matchSourceSavings is off', () => {
    const r = runComparison({ source, dest });
    expect(r.warnings.some((w) => /auto-match/i.test(w))).toBe(false);
  });
});

describe('runComparison — symmetric IL→US sanity', () => {
  it('produces a result with source/dest CountrySideResult shape', () => {
    const r = runComparison({
      source: {
        countryCode: 'IL', locationKey: 'IL-TLV',
        grossLocal: 15000 * 12, eePensionPct: 6, eeOtherPct: 2.5,
        rentLocal: 8650, miscBurnLocal: 9000,
        erPensionPct: 6.5, erSeverancePct: 8.33, erKerenPct: 7.5,
      },
      dest: {
        countryCode: 'US', locationKey: 'US-NYC',
        grossLocal: 180000, eePensionPct: 6, matchLimitPct: 6,
        rentLocal: 4500, miscBurnLocal: 900,
      },
    });
    expect(r.source.countryCode).toBe('IL');
    expect(r.dest.countryCode).toBe('US');
    expect(Number.isFinite(r.liquidDeltaUSD)).toBe(true);
    expect(Number.isFinite(r.savingsDeltaUSD)).toBe(true);
    expect(Number.isFinite(r.liquidDeltaCOLAdjustedUSD)).toBe(true);
    expect(Array.isArray(r.warnings)).toBe(true);
  });

  it('IL liquid_USD is approximately consistent with legacy runEngine (within 5%)', () => {
    const fxRate = FX_USD_PER_UNIT.ILS; // ~0.344
    const legacy = runEngine({
      ilGross: 15000, ilEEPension: 6, ilEEKeren: 2.5,
      ilERPension: 6.5, ilERSeverance: 8.33, ilERKeren: 7.5,
      ilRent: 8650, ilBurn: 9000,
      fxRate,
      selectedLoc: 'NYC',
      usGrossAnnual: 180000, usRent: 4500, us401kMatchLimit: 6, usMiscBurn: 900,
    });
    const newR = runComparison({
      source: {
        countryCode: 'IL', locationKey: 'IL-TLV',
        grossLocal: 15000 * 12, eePensionPct: 6, eeOtherPct: 2.5,
        rentLocal: 8650, miscBurnLocal: 9000,
        erPensionPct: 6.5, erSeverancePct: 8.33, erKerenPct: 7.5,
      },
      dest: {
        countryCode: 'US', locationKey: 'US-NYC',
        grossLocal: 180000, eePensionPct: 6, matchLimitPct: 6,
        rentLocal: 4500, miscBurnLocal: 900,
      },
    });
    // legacy.ilLiquidFlowUSD is monthly; new is annual.
    const legacyAnnual = legacy.ilLiquidFlowUSD * 12;
    const denom = Math.abs(legacyAnnual) || 1;
    const diff = Math.abs(newR.source.liquidUSD - legacyAnnual) / denom;
    expect(diff).toBeLessThan(0.05);
  });
});

describe('Country savings sanity — non-US/IL', () => {
  const sane = (cc, payload, min, max) => {
    const r = COUNTRIES[cc].compute(payload);
    expect(r.totalSavingsLocal).toBeGreaterThan(min);
    expect(r.totalSavingsLocal).toBeLessThan(max);
  };

  it('UK at £80,000', () => sane('UK', { grossLocal: 80000, eePensionPct: 5, erPensionPct: 3, salarySacrifice: false }, 2000, 15000));
  it('IE at €100,000 age 35', () => sane('IE', { grossLocal: 100000, eePensionPct: 15, erPensionPct: 5, age: 35 }, 10000, 30000));
  it('DE at €110,000', () => sane('DE', { grossLocal: 110000, bavPct: 4, erBavPct: 0, riesterFlag: false }, 3000, 20000));
  it('FR at €100,000', () => sane('FR', { grossLocal: 100000, perPct: 5, erPerPct: 3 }, 5000, 20000));
  it('NL at €110,000', () => sane('NL', { grossLocal: 110000, eePensionPct: 7.5, erPensionPct: 15.9, lijfrenteAmt: 0 }, 10000, 35000));
  it('CH at CHF 130,000 age 40', () => sane('CH', { grossLocal: 130000, eeBvgPct: 0, erBvgPct: 0, pillar3aAmt: 7258, buyInsAmt: 0, age: 40, locationKey: 'CH-ZRH' }, 10000, 25000));
  it('CA at CAD 120,000', () => sane('CA', { grossLocal: 120000, rrspPct: 10, erRrspMatchPct: 3, tfsaAmt: 7000, locationKey: 'CA-TOR' }, 15000, 35000));
  it('AU at AUD 150,000', () => sane('AU', { grossLocal: 150000, salarySacrificePct: 0 }, 10000, 35000));
  it('SG at SGD 180,000 local age 35', () => sane('SG', { grossLocal: 180000, srsAmt: 0, isForeigner: false, age: 35 }, 15000, 50000));
  it('JP at ¥18,000,000', () => sane('JP', { grossLocal: 18000000, iDecoMonthlyJpy: 23000, dcCorpMonthlyJpy: 0, age: 35 }, 500000, 2500000));
  it('ES at €70,000', () => sane('ES', { grossLocal: 70000, planPensionesAmt: 1500, erPlanEmpleoAmt: 0, locationKey: 'ES-MAD' }, 500, 12000));
  it('IT at €60,000', () => sane('IT', { grossLocal: 60000, fondoPensioneEePct: 1, fondoPensioneErPct: 1, includeTfrInSavings: true, locationKey: 'IT-MIL' }, 3000, 15000));
  it('PT at €60,000 age 30', () => sane('PT', { grossLocal: 60000, pprAmt: 2000, age: 30 }, 500, 5000));
  it('SE at SEK 800,000', () => sane('SE', { grossLocal: 800000, eeSalaryExchangePct: 0 }, 30000, 200000));
  it('DK at DKK 600,000', () => sane('DK', { grossLocal: 600000, eePensionPct: 4, erPensionPct: 8, aldersopsparingAmt: 0 }, 50000, 120000));
  it('NO at NOK 900,000', () => sane('NO', { grossLocal: 900000, erOtpPct: 5, eeOtpPct: 0, ipsAmt: 0 }, 20000, 80000));
  it('AE at AED 400,000', () => sane('AE', { grossLocal: 400000, basicPctOfGross: 60, yearsOfService: 3, includeEosgInSavings: true }, 5000, 30000));
  it('PL at PLN 200,000', () => sane('PL', { grossLocal: 200000, ppkEePct: 2, ppkErPct: 1.5, ikzeAmt: 0 }, 5000, 15000));
});
