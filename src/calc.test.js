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

describe('calcBTL — Israeli social security', () => {
  it('is 0 at 0 gross', () => {
    expect(calcBTL(0)).toBe(0);
  });

  it('charges 3.5% below threshold', () => {
    expect(calcBTL(5000)).toBeCloseTo(175, 1); // 5000 × 0.035
  });

  it('charges 12% on income above 7,703 ILS', () => {
    // 7703×0.035 + (15000−7703)×0.12 = 269.605 + 875.64 = 1145.245
    expect(calcBTL(15000)).toBeCloseTo(1145.245, 2);
  });

  it('caps at the 49,030 ILS BTL ceiling', () => {
    const atCap = calcBTL(49030);
    const above = calcBTL(80000);
    expect(above).toBeCloseTo(atCap, 2);
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
