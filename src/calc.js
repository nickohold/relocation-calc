// Tax engine for IL → US relocation calculator.
// Pure functions, no React. Testable in isolation.

// ── 2024 US Federal income tax brackets (single filer) ──
export const FED_BRACKETS = [
  { max: 11600, rate: 0.10 },
  { max: 47150, rate: 0.12 },
  { max: 100525, rate: 0.22 },
  { max: 191950, rate: 0.24 },
  { max: 243725, rate: 0.32 },
  { max: 609350, rate: 0.35 },
  { max: Infinity, rate: 0.37 },
];

// ── 2024 NY State brackets (single filer) ──
export const NY_STATE_BRACKETS = [
  { max: 8500, rate: 0.04 },
  { max: 11700, rate: 0.045 },
  { max: 13900, rate: 0.0525 },
  { max: 80650, rate: 0.0585 },
  { max: 215400, rate: 0.0597 },
  { max: 1077550, rate: 0.0685 },
  { max: Infinity, rate: 0.109 },
];

// ── 2024 NYC local tax brackets (single filer) ──
export const NYC_LOCAL_BRACKETS = [
  { max: 12000, rate: 0.03078 },
  { max: 25000, rate: 0.03762 },
  { max: 50000, rate: 0.03819 },
  { max: Infinity, rate: 0.03876 },
];

// ── 2024 NJ State brackets (single filer) ──
export const NJ_STATE_BRACKETS = [
  { max: 20000, rate: 0.014 },
  { max: 35000, rate: 0.0175 },
  { max: 40000, rate: 0.035 },
  { max: 75000, rate: 0.05525 },
  { max: 500000, rate: 0.0637 },
  { max: 1000000, rate: 0.0897 },
  { max: Infinity, rate: 0.1075 },
];

export const LOCATIONS = {
  NYC: { name: 'Manhattan (UWS)', state: 'NY', city: 'NYC', defaultRent: 4500 },
  NJ:  { name: 'Hoboken/JC',      state: 'NJ', city: null,  defaultRent: 3900 },
  WNY: { name: 'West NY/Guttenberg', state: 'NJ', city: null, defaultRent: 2900 },
  ATX: { name: 'Austin, TX',      state: 'TX', city: null,  defaultRent: 2600 },
  HOU: { name: 'Houston, TX',     state: 'TX', city: null,  defaultRent: 2200 },
};

export const CONSTANTS = {
  // US
  IRS_401K_LIMIT_ANNUAL: 23500,
  FED_STANDARD_DEDUCTION_SINGLE_2024: 14600,
  SS_WAGE_BASE_2024: 168600,
  SS_RATE: 0.062,
  MEDICARE_RATE: 0.0145,
  ADDITIONAL_MEDICARE_THRESHOLD_SINGLE: 200000,
  ADDITIONAL_MEDICARE_RATE: 0.009,
  NY_STD_DEDUCTION_SINGLE: 8000,
  NJ_PERSONAL_EXEMPTION: 1000,

  // Israel — 2026 figures from btl.gov.il
  BTL_THRESHOLD: 7703,        // 60% of average wage; switch from reduced to regular rate
  BTL_CAP: 51910,             // monthly ceiling for BTL+Health (no contribution above this)
  BTL_LOW_RATE: 0.0104,       // employee BTL on income ≤ threshold
  BTL_HIGH_RATE: 0.07,        // employee BTL on income > threshold (≤ cap)
  HEALTH_LOW_RATE: 0.0323,    // employee Health (Mas Briut) on income ≤ threshold
  HEALTH_HIGH_RATE: 0.0517,   // employee Health on income > threshold (≤ cap)
  CREDIT_POINT_VALUE_ILS: 242,
  PENSION_CREDIT_RATE: 0.35,
  PENSION_CREDIT_INCOME_CAP: 9684,
  PENSION_CREDIT_PCT_CAP: 0.07,
  KEREN_HISHTALMUT_SALARY_CAP: 15712,  // monthly insured-salary cap for tax-favored keren contribs
};

// Apply progressive tax brackets.
export const calcBrackets = (income, brackets) => {
  let tax = 0;
  let prev = 0;
  for (const b of brackets) {
    if (income <= prev) break;
    tax += (Math.min(income, b.max) - prev) * b.rate;
    prev = b.max;
  }
  return tax;
};

// Bituach Leumi (BTL) + Health Tax (Mas Briut) on monthly gross — combined.
// 2026 employee rates: BTL 1.04% + Health 3.23% = 4.27% below threshold;
// BTL 7.0% + Health 5.17% = 12.17% above threshold (up to ceiling).
export const calcBTL = (gross) => {
  const {
    BTL_THRESHOLD, BTL_CAP,
    BTL_LOW_RATE, BTL_HIGH_RATE,
    HEALTH_LOW_RATE, HEALTH_HIGH_RATE,
  } = CONSTANTS;
  const lowBase = Math.min(gross, BTL_THRESHOLD);
  const highBase = Math.max(0, Math.min(gross, BTL_CAP) - BTL_THRESHOLD);
  const btl = lowBase * BTL_LOW_RATE + highBase * BTL_HIGH_RATE;
  const health = lowBase * HEALTH_LOW_RATE + highBase * HEALTH_HIGH_RATE;
  return btl + health;
};

// 2024 Israeli monthly income tax brackets (Mas Hachnasa).
const IL_TAX_BRACKETS = [
  { width: 7010,  rate: 0.10 },
  { width: 3050,  rate: 0.14 },
  { width: 8940,  rate: 0.20 },
  { width: 6100,  rate: 0.31 },
  { width: 21590, rate: 0.35 },
  { width: 13440, rate: 0.47 },
  { width: Infinity, rate: 0.50 },
];

const calcILGrossTax = (gross) => {
  let tax = 0;
  let remaining = gross;
  for (const b of IL_TAX_BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, b.width);
    tax += slice * b.rate;
    remaining -= slice;
  }
  return tax;
};

// Israeli pension tax credit: 35% × min(EE_pension, 7% × min(gross, 9684)).
// This reduces income tax owed.
export const calcPensionCredit = (gross, eePensionPct) => {
  const { PENSION_CREDIT_RATE, PENSION_CREDIT_INCOME_CAP, PENSION_CREDIT_PCT_CAP } = CONSTANTS;
  const insuredSalary = Math.min(gross, PENSION_CREDIT_INCOME_CAP);
  const eligibleContrib = Math.min(
    gross * (eePensionPct / 100),
    insuredSalary * PENSION_CREDIT_PCT_CAP,
  );
  return eligibleContrib * PENSION_CREDIT_RATE;
};

export const calcIL = ({
  gross,
  eePensionPct, eeKerenPct,
  erPensionPct, erSeverancePct, erKerenPct,
  rent, burn,
  creditPoints = 2.25,
  includeSeveranceInSavings = true,
  // Non-cash taxable perks (meals, gifts, sport, gross-ups). Inflate BTL+tax base only;
  // do not appear in cash net and are not pension/keren-eligible. Default 0.
  imputedBenefits = 0,
}) => {
  // Tax/BTL base = cash gross + non-cash taxable perks (matches "חייב מ.ה." on payslips).
  const taxableBase = gross + imputedBenefits;
  const btl = calcBTL(taxableBase);

  const grossTax = calcILGrossTax(taxableBase);
  const creditPointsValue = creditPoints * CONSTANTS.CREDIT_POINT_VALUE_ILS;
  const pensionCredit = calcPensionCredit(gross, eePensionPct);
  const masHachnasa = Math.max(0, grossTax - creditPointsValue - pensionCredit);

  // Pension and keren are calculated on cash gross only — perks aren't pensionable.
  const eePensionILS = gross * (eePensionPct / 100);
  // Keren Hishtalmut: tax-favorable only on insured salary up to ₪15,712/mo (2026 cap).
  const kerenBase = Math.min(gross, CONSTANTS.KEREN_HISHTALMUT_SALARY_CAP);
  const eeKerenILS = kerenBase * (eeKerenPct / 100);
  // Net = cash gross − cash deductions. Imputed perks never enter cash flow.
  const net = gross - btl - masHachnasa - eePensionILS - eeKerenILS;

  // ER pension is on full gross; ER keren is capped at the keren salary cap.
  // ER severance (pitzuim) is only "savings" if rolled over on job exit.
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

export const calcUS = ({
  grossAnnual,
  rent, miscBurn,
  matchLimitPct,
  targetSavingsUSD,         // monthly target (typically IL totalSavings × FX)
  ilBurnUSD,                // IL lifestyle burn converted to USD (lifestyle-lock assumption)
  location,
}) => {
  const { IRS_401K_LIMIT_ANNUAL, FED_STANDARD_DEDUCTION_SINGLE_2024,
          SS_WAGE_BASE_2024, SS_RATE, MEDICARE_RATE,
          ADDITIONAL_MEDICARE_THRESHOLD_SINGLE, ADDITIONAL_MEDICARE_RATE,
          NY_STD_DEDUCTION_SINGLE, NJ_PERSONAL_EXEMPTION } = CONSTANTS;

  const grossMonthly = grossAnnual / 12;
  const totalOut = rent + miscBurn + ilBurnUSD;

  // 401k: take full employer match, top up personal to hit IL target,
  // capped at IRS limit. Anything beyond is unrecoverable "wealth gap".
  const employer = grossMonthly * (matchLimitPct / 100);
  const required = Math.max(0, targetSavingsUSD - employer);
  const personal = Math.min(required, IRS_401K_LIMIT_ANNUAL / 12);
  const wealthGap = Math.max(0, required - personal);
  const totalInvested = employer + personal;
  const personalAnnual = personal * 12;

  // FICA
  const ssTax = Math.min(grossAnnual, SS_WAGE_BASE_2024) * SS_RATE;
  const medTax = grossAnnual * MEDICARE_RATE
    + Math.max(0, grossAnnual - ADDITIONAL_MEDICARE_THRESHOLD_SINGLE) * ADDITIONAL_MEDICARE_RATE;
  const ficaAnnual = ssTax + medTax;

  // Federal: 401k is pre-tax federal
  const fedTaxable = Math.max(0, grossAnnual - personalAnnual - FED_STANDARD_DEDUCTION_SINGLE_2024);
  const fedAnnual = calcBrackets(fedTaxable, FED_BRACKETS);

  // State + city
  let stateAnnual = 0;
  let cityAnnual = 0;
  if (location.state === 'NY') {
    // NY conforms to federal: 401k is pre-tax.
    const nyTaxable = Math.max(0, grossAnnual - personalAnnual - NY_STD_DEDUCTION_SINGLE);
    stateAnnual = calcBrackets(nyTaxable, NY_STATE_BRACKETS);
    if (location.city === 'NYC') cityAnnual = calcBrackets(nyTaxable, NYC_LOCAL_BRACKETS);
  } else if (location.state === 'NJ') {
    // NJ does NOT allow pre-tax 401k. State-tax the full gross.
    const njTaxable = Math.max(0, grossAnnual - NJ_PERSONAL_EXEMPTION);
    stateAnnual = calcBrackets(njTaxable, NJ_STATE_BRACKETS);
  }
  // TX / other no-income-tax states: stateAnnual stays 0.

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

// End-to-end engine — what the React component calls.
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
    // raw IL
    ilNet: il.net,
    ilBTL: il.btl,
    ilMasHachnasa: il.masHachnasa,
    ilPensionCredit: il.pensionCredit,
    ilEEMatchILS: il.eeSavingsILS,
    ilERMatchILS: il.erSavingsILS,
    ilLiquidILS: il.liquidILS,

    // IL in USD
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

    // savings target
    targetSavingsUSD,
    totalILSPct,

    // US
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

    // verdict
    liquidDelta,
    optimalPct: us.grossMonthly > 0 ? (us.personal / us.grossMonthly) * 100 : 0,
  };
};
