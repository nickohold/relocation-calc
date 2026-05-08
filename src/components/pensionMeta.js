// Per-country savings field metadata. Every country uses the same UI rendering loop;
// each entry describes the EE/ER/voluntary fields the UI should render.
//
// Field shape:
//   { key, label, default, step, kind: 'pct' | 'amount' | 'toggle', hint }
// `needsAge: true` hoists an age input to the side-panel (for IE, CH, SG, JP, PT).

export const PENSION_META = {
  US: {
    fields: [
      { key: 'eePensionPct', label: '401(k) %', default: 6, step: 0.5, kind: 'pct', hint: 'Your 401(k) employee contribution as % of gross. Pre-tax federal + all modeled states (incl. NJ). IRS cap $24,500/yr (2026). Engine assumes employer matches dollar-for-dollar up to 6% of gross (typical US tech default).' },
    ],
  },
  IL: {
    fields: [
      { key: 'eePensionPct', label: 'EE Pension %', default: 6, step: 0.1, kind: 'pct', hint: 'Israeli pension (Pensiya) employee contribution. Standard 6%. Eligible for 35% tax credit on first 7% (capped at insured-salary cap).' },
      { key: 'eeOtherPct', label: 'EE Keren %', default: 2.5, step: 0.1, kind: 'pct', hint: 'Your Keren Hishtalmut (study fund) contribution. Standard 2.5%. Tax-free vehicle, capped at ₪15,712/mo gross.' },
      { key: 'erPensionPct', label: 'ER Pension %', default: 6.5, step: 0.1, kind: 'pct', hint: 'Employer pension contribution. Standard 6.5% of gross. Counts toward your retirement savings.' },
      { key: 'erSeverancePct', label: 'ER Severance %', default: 8.33, step: 0.1, kind: 'pct', hint: 'Pitzuyim — severance fund contribution. Standard 8.33% (1/12 of monthly salary). Counts as savings only if rolled into pension at end of employment (see toggle below).' },
      { key: 'erKerenPct', label: 'ER Keren %', default: 7.5, step: 0.1, kind: 'pct', hint: 'Employer Keren Hishtalmut contribution. Standard 7.5%. Tax-free vehicle, capped at ₪15,712/mo gross.' },
      { key: 'creditPoints', label: 'Credit Points', default: 2.25, step: 0.25, kind: 'pct', hint: 'Nekudat Zikkui — Israeli tax-residency credit points. Resident male: 2.25. Resident female: 2.75. Each point = ₪242/mo off your income tax.' },
      { key: 'includeSeveranceInSavings', label: 'Count severance as savings', default: true, kind: 'toggle', hint: 'On if pitzuyim is rolled into pension at end of employment. Default on for tech employees.' },
    ],
  },

  UK: {
    fields: [
      { key: 'eePensionPct', label: 'Workplace pension EE %', default: 5, step: 0.5, kind: 'pct', hint: 'Auto-enrolment minimum on band earnings (£6,240–£50,270). Tax relief: yes (relief-at-source/net-pay).' },
      { key: 'erPensionPct', label: 'Workplace pension ER %', default: 3, step: 0.5, kind: 'pct', hint: 'Auto-enrolment minimum employer contribution. Counts toward your retirement.' },
      { key: 'salarySacrifice', label: 'Salary sacrifice', default: false, kind: 'toggle', hint: 'When on, EE contribution is reclassified as employer — saves NI for both sides.' },
    ],
  },

  IE: {
    needsAge: true,
    fields: [
      { key: 'eePensionPct', label: 'PRSA / Occupational EE %', default: 15, step: 1, kind: 'pct', hint: 'Tax relief age-banded: <30:15%, 30s:20%, 40s:25%, 50-54:30%, 55-59:35%, 60+:40%. Earnings cap €115,000.' },
      { key: 'erPensionPct', label: 'Employer PRSA/occupational %', default: 5, step: 0.5, kind: 'pct', hint: 'Since Jan 2025, employer can contribute up to 100% of salary to PRSA without BIK.' },
    ],
  },

  DE: {
    fields: [
      { key: 'bavPct', label: 'bAV (Entgeltumwandlung) %', default: 4, step: 0.5, kind: 'pct', hint: 'Salary conversion to occupational pension. Tax-free up to 8% × BBG (€8,112); SV-free up to 4% × BBG (€4,056).' },
      { key: 'erBavPct', label: 'Employer bAV match %', default: 0, step: 0.5, kind: 'pct', hint: 'Employers must match 15% of EE salary-sacrificed bAV; many add more.' },
      { key: 'riesterFlag', label: 'Include Riester (€2,100/yr)', default: false, kind: 'toggle', hint: 'Riester is €2,100/yr deductible; marginal at $100k+.' },
    ],
  },

  FR: {
    fields: [
      { key: 'perPct', label: 'PER (individual) %', default: 5, step: 0.5, kind: 'pct', hint: 'Pre-tax PER. Cap: min €4,710 / max €37,680 (2026, 10% × 8 × PASS).' },
      { key: 'erPerPct', label: 'PER Collectif/Obligatoire ER %', default: 3, step: 0.5, kind: 'pct', hint: 'Employer-funded retirement supplement (Article 83/PER Obligatoire).' },
    ],
  },

  NL: {
    fields: [
      { key: 'eePensionPct', label: '2nd-pillar EE % (of pension base)', default: 7.5, step: 0.5, kind: 'pct', hint: 'Pension base = gross − AOW franchise (€19,172) capped at €137,800. WTP DC system since Jul 2023.' },
      { key: 'erPensionPct', label: '2nd-pillar ER % (of pension base)', default: 15.9, step: 0.5, kind: 'pct', hint: 'Employer typically pays ~2/3 of total. WTP age-flat target around 30% combined.' },
      { key: 'lijfrenteAmt', label: 'Lijfrente (3rd pillar) annual €', default: 0, step: 100, kind: 'amount', hint: 'Tax-deductible annuity savings up to "jaarruimte" (~13.3% of income minus pension factor).' },
    ],
  },

  CH: {
    needsAge: true,
    fields: [
      { key: 'eeBvgPct', label: 'BVG/LPP EE % override', default: 0, step: 0.5, kind: 'pct', hint: '0 = use mandatory minimums by age (25-34: 7%, 35-44: 10%, 45-54: 15%, 55-65: 18%) split half/half EE/ER.' },
      { key: 'erBvgPct', label: 'BVG/LPP ER % override', default: 0, step: 0.5, kind: 'pct', hint: '0 = use mandatory minimums by age. Employer must pay ≥50% of total.' },
      { key: 'pillar3aAmt', label: 'Säule 3a annual contribution (CHF)', default: 7258, step: 100, kind: 'amount', hint: '2026 cap: CHF 7,258 with PK; CHF 36,288 (or 20% of net) without.' },
      { key: 'buyInsAmt', label: 'BVG voluntary buy-ins (CHF)', default: 0, step: 1000, kind: 'amount', hint: 'Fully deductible per pension-fund certificate.' },
    ],
  },

  CA: {
    fields: [
      { key: 'rrspPct', label: 'RRSP %', default: 10, step: 0.5, kind: 'pct', hint: 'Tax-deductible. Limit = 18% of prior-year earned, max $33,810 (2026), minus pension adjustment.' },
      { key: 'erRrspMatchPct', label: 'Employer RRSP/DPSP match %', default: 3, step: 0.5, kind: 'pct', hint: 'Group RRSP match common in tech.' },
      { key: 'tfsaAmt', label: 'TFSA contribution (CAD, after-tax)', default: 7000, step: 500, kind: 'amount', hint: '2026 limit ~$7,000. Post-tax bucket; growth tax-free.' },
    ],
  },

  AU: {
    fields: [
      { key: 'salarySacrificePct', label: 'Salary sacrifice (extra) %', default: 0, step: 0.5, kind: 'pct', hint: 'Pre-tax additional super on top of employer SG. Concessional cap A$32,500/yr (2026-27) including SG.' },
    ],
  },

  SG: {
    needsAge: true,
    fields: [
      { key: 'srsAmt', label: 'SRS contribution (SGD)', default: 0, step: 500, kind: 'amount', hint: 'Voluntary. Cap S$15,300 (citizen/PR), S$35,700 (foreigner). Tax-deductible.' },
      { key: 'isForeigner', label: 'Foreign worker (S-Pass/EP)', default: false, kind: 'toggle', hint: "Foreigners on EP/S-Pass don't pay CPF. Toggles off CPF and increases SRS cap." },
    ],
  },

  JP: {
    needsAge: true,
    fields: [
      { key: 'iDecoMonthlyJpy', label: 'iDeCo monthly contribution (¥)', default: 23000, step: 1000, kind: 'amount', hint: 'From Apr 2026: cap ¥62,000/mo (employees) or ¥75,000 (self-employed) minus DB equivalent. Fully deductible.' },
      { key: 'dcCorpMonthlyJpy', label: 'Corporate DC EE matching (¥/mo)', default: 0, step: 1000, kind: 'amount', hint: 'Apr 2026: removes restriction that EE ≤ ER. Fully deductible. Same ¥62k pool.' },
    ],
  },

  ES: {
    fields: [
      { key: 'planPensionesAmt', label: 'Plan de pensiones individual (€)', default: 1500, step: 100, kind: 'amount', hint: 'Cap €1,500/yr deductible. Severely cut from prior €8k cap.' },
      { key: 'erPlanEmpleoAmt', label: 'Employer plan de empleo (€)', default: 0, step: 500, kind: 'amount', hint: 'Up to €8,500/yr deductible jointly with employee.' },
    ],
  },

  IT: {
    fields: [
      { key: 'fondoPensioneEePct', label: 'Fondo pensione EE %', default: 1, step: 0.5, kind: 'pct', hint: 'Voluntary supplementary pension. Deductible to €5,164.57/yr (2026).' },
      { key: 'fondoPensioneErPct', label: 'Fondo pensione ER %', default: 1, step: 0.5, kind: 'pct', hint: 'Employer match (often via CCNL).' },
      { key: 'includeTfrInSavings', label: 'Count TFR as savings', default: true, kind: 'toggle', hint: "TFR (~6.91% of gross) is mandatory severance accrual — Italy's pitzuyim equivalent. Taxed at withdrawal." },
    ],
  },

  PT: {
    needsAge: true,
    fields: [
      { key: 'pprAmt', label: 'PPR (€)', default: 2000, step: 100, kind: 'amount', hint: '20% tax credit on PPR contributions, capped by age (€400 credit/€2k contribution if <35; less for older).' },
    ],
  },

  SE: {
    fields: [
      { key: 'eeSalaryExchangePct', label: 'Löneväxling %', default: 0, step: 0.5, kind: 'pct', hint: 'Salary exchange — pre-tax super-top-up. Tax-favorable above SEK 56,087/mo. Boosts ER tjänstepension.' },
    ],
  },

  DK: {
    fields: [
      { key: 'eePensionPct', label: 'Occupational pension EE %', default: 4, step: 0.5, kind: 'pct', hint: 'Typical 4-6% EE under most CBAs. Pre-tax.' },
      { key: 'erPensionPct', label: 'Occupational pension ER %', default: 8, step: 0.5, kind: 'pct', hint: 'Typical 8-12% ER.' },
      { key: 'aldersopsparingAmt', label: 'Aldersopsparing (DKK)', default: 0, step: 500, kind: 'amount', hint: 'Age-pension savings. Non-deductible but tax-free in retirement. Cap ~DKK 9,400/yr early career, ~DKK 58,900 last 7 yrs.' },
    ],
  },

  NO: {
    fields: [
      { key: 'erOtpPct', label: 'OTP employer %', default: 5, step: 0.5, kind: 'pct', hint: 'Mandatory ≥2% of salary 1G–12G. Most employers pay 5-7%. Above 7.1G can add up to 18.1%.' },
      { key: 'eeOtpPct', label: 'OTP voluntary EE %', default: 0, step: 0.5, kind: 'pct', hint: 'Some plans allow up to 4% EE match.' },
      { key: 'ipsAmt', label: 'IPS (NOK)', default: 0, step: 1000, kind: 'amount', hint: 'Individuell PensjonsSparing — deduction up to NOK 15,000/yr.' },
    ],
  },

  AE: {
    fields: [
      { key: 'basicPctOfGross', label: 'Basic salary as % of gross', default: 60, step: 5, kind: 'pct', hint: 'UAE salaries split into Basic + Allowances; gratuity is Basic-only.' },
      { key: 'yearsOfService', label: 'Years of service', default: 3, step: 1, kind: 'amount', hint: 'Drives 21 vs 30 days/yr accrual rate.' },
      { key: 'includeEosgInSavings', label: 'Count EOSG as savings', default: true, kind: 'toggle', hint: "End-of-Service Gratuity is mandatory employer-side severance — UAE's pitzuyim equivalent." },
    ],
  },

  PL: {
    fields: [
      { key: 'ppkEePct', label: 'PPK EE %', default: 2, step: 0.5, kind: 'pct', hint: 'Default 2% (range 0.5-4%). NOT pre-tax (taken from net).' },
      { key: 'ppkErPct', label: 'PPK ER %', default: 1.5, step: 0.5, kind: 'pct', hint: 'Mandatory 1.5% (can add up to 2.5%). State adds PLN 240/yr.' },
      { key: 'ikzeAmt', label: 'IKZE (PLN, deductible)', default: 0, step: 500, kind: 'amount', hint: 'Tax-deductible up to ~PLN 10,407/yr (2026 cap = 1.2× avg wage).' },
    ],
  },
};
