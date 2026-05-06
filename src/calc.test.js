import { describe, it, expect } from 'vitest';
import {
  calcBrackets, calcBTL, calcPensionCredit, calcIL, calcUS, runEngine,
  FED_BRACKETS, NY_STATE_BRACKETS, NJ_STATE_BRACKETS, NYC_LOCAL_BRACKETS,
  LOCATIONS, CONSTANTS,
} from './calc.js';

// Tolerance helper for FP comparisons
const $close = (a, b, eps = 0.5) => Math.abs(a - b) < eps;

describe('calcBrackets — progressive bracket math', () => {
  it('returns 0 for zero income', () => {
    expect(calcBrackets(0, FED_BRACKETS)).toBe(0);
  });

  it('charges only first bracket if income is below threshold', () => {
    expect(calcBrackets(10000, FED_BRACKETS)).toBe(1000); // 10% × 10000
  });

  it('handles income exactly at first bracket boundary', () => {
    expect(calcBrackets(11600, FED_BRACKETS)).toBe(1160);
  });

  it('charges across multiple brackets (single filer fed at $50k)', () => {
    // 11,600×0.10 + (47,150−11,600)×0.12 + (50,000−47,150)×0.22
    // = 1160 + 4266 + 627 = 6053
    expect(calcBrackets(50000, FED_BRACKETS)).toBeCloseTo(6053, 0);
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

  it('FICA: Social Security capped at $168,600 wage base', () => {
    const high = calcUS({ ...baseUS, grossAnnual: 500000 });
    // SS portion is capped: 168600 × 0.062 = 10453.20
    // Plus medicare 1.45% on 500k = 7250
    // Plus additional medicare 0.9% on (500k−200k) = 2700
    // Total ≈ 20403.20 → /12 = 1700.27
    expect(high.ficaMonthly).toBeCloseTo(20403.2 / 12, 1);
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

  it('NJ: 401k is NOT pre-tax for state tax (BUG FIX)', () => {
    const nj_no401k = calcUS({ ...baseUS, targetSavingsUSD: 0, matchLimitPct: 0, location: LOCATIONS.NJ });
    const nj_with401k = calcUS({ ...baseUS, targetSavingsUSD: 12000, matchLimitPct: 0, location: LOCATIONS.NJ });
    // NJ state tax should be IDENTICAL with or without 401k contribution
    expect(nj_with401k.stateMonthly).toBeCloseTo(nj_no401k.stateMonthly, 2);
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
    // Personal contribution capped at 23500/12
    expect(r.personal).toBeCloseTo(23500 / 12, 2);
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

// Reference-payslip regression: a known-good 2026 Israeli slip, gross ₪32,000
// All deduction figures from the slip itself.
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
  it('IRS 401k limit matches 2024/2025 figure', () => {
    expect(CONSTANTS.IRS_401K_LIMIT_ANNUAL).toBe(23500);
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
