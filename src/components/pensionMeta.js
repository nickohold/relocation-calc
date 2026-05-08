// Per-country labels and tooltips for the EE pension/retirement input.
// Each entry tells the UI what to call the field, the typical default, and how the
// engine treats it. The engine itself (in src/countries/<CC>.js) enforces legal caps;
// these are user-facing strings only.

export const PENSION_META = {
  US: {
    label: '401(k) EE %',
    hint: 'Pre-tax 401(k) employee contribution as % of gross. IRS cap $24,500/yr (2026). Reduces federal + most states + NJ taxable wages.',
    defaultPct: 6,
    secondary: { key: 'matchLimitPct', label: '401(k) Match %', hint: 'Employer match cap as % of gross. Default 6% is typical. Match is added to your savings; not taxable to you.', defaultPct: 6 },
  },
  IL: {
    label: 'EE Pension %',
    hint: 'Israeli pension (Pensiya) employee contribution. Standard 6%. Eligible for 35% tax credit on first 7% (capped at insured-salary cap).',
    defaultPct: 6,
  },
  UK: {
    label: 'Workplace Pension %',
    hint: 'Employee pension contribution. Net-pay or salary-sacrifice arrangement reduces income-tax (NI relief only with salary sacrifice). Annual allowance £60,000.',
    defaultPct: 5,
  },
  IE: {
    label: 'PRSA / Occupational %',
    hint: 'Pre-tax pension contribution. Reduces income tax (NOT USC or PRSI). Age-based cap on % of earnings: <30: 15%, 30-39: 20%, 40-49: 25%, 50-54: 30%, 55-59: 35%, 60+: 40%. Earnings cap €115,000.',
    defaultPct: 5,
  },
  DE: {
    label: 'Rürup / bAV %',
    hint: 'Rürup (Basisrente) is fully deductible up to €30,826/yr. bAV (Direktversicherung §3 Nr. 63 EStG) tax-free + SV-free up to lower caps. Treated here as Rürup for simplicity.',
    defaultPct: 5,
  },
  FR: {
    label: 'PER %',
    hint: 'Plan d\'Épargne Retraite — individual pre-tax retirement contribution. Cap: 10% of gross (min €4,710, max €37,680). Reduces income tax base. Mandatory cotisations are already in the engine.',
    defaultPct: 5,
  },
  NL: {
    label: 'Pensioenpremie %',
    hint: '2nd-pillar pensioenpremie deducted from gross before box-1 IT. Pensioengevend salaris cap €137,800. Treated as fully pre-tax.',
    defaultPct: 7,
  },
  CH: {
    label: 'Säule 3a %',
    hint: '3rd-pillar (gebundene Vorsorge) — fully deductible up to CHF 7,258/yr (with PK, 2026). 2nd-pillar (BVG) is employer-mandated and modeled separately.',
    defaultPct: 5,
  },
  CA: {
    label: 'RRSP %',
    hint: 'Registered Retirement Savings Plan — 18% of prior-year earned income, max $33,810 (2026). Pre-tax federal + provincial. Quebec uses QPP; same RRSP rules apply.',
    defaultPct: 6,
  },
  AU: {
    label: 'Salary-Sacrifice Super %',
    hint: 'Above-and-beyond the mandatory 12% Super Guarantee (employer-paid, off-payroll). Salary-sacrificed super reduces taxable income; concessional cap A$30,000/yr including SG. Div 293 surcharge above $250k income.',
    defaultPct: 0,
  },
  SG: {
    label: 'SRS %',
    hint: 'Supplementary Retirement Scheme — voluntary pre-tax contribution. Cap: S$15,300 (citizen/PR), S$35,700 (foreigner). CPF (20% of OW up to $8k/mo cap) is mandatory and modeled separately.',
    defaultPct: 5,
  },
  JP: {
    label: 'iDeCo %',
    hint: 'Individual-type Defined Contribution Pension. Fully deductible (小規模企業共済等掛金控除). Default cap ¥276,000/yr for employees with no corporate pension.',
    defaultPct: 5,
  },
  ES: {
    label: 'Plan de Pensiones %',
    hint: 'Individual plan: only €1,500/yr deductible (post-2022 reform). Combined with employer plan up to €10,000. Marginal benefit at high incomes.',
    defaultPct: 1,
  },
  IT: {
    label: 'Fondo Pensione %',
    hint: 'Pension fund contribution — deductible up to €5,300/yr (raised from €5,164.57 in 2026). Combined employee + employer.',
    defaultPct: 3,
  },
  PT: {
    label: 'PPR %',
    hint: 'Plano Poupança Reforma — 20% tax credit on contribution, capped by age (€400 credit/€2k contribution if under 35; lower for older). Treated here for under-35 default.',
    defaultPct: 3,
  },
  SE: {
    label: 'Pensionsavgift (info only) %',
    hint: 'Allmän pensionsavgift (7%) is automatic and credited back as tax reduction — net-zero effect on take-home. Private deduction was abolished 2016. Tjänstepension is employer-funded only.',
    defaultPct: 0,
  },
  DK: {
    label: 'Ratepension %',
    hint: 'Ratepension + ophørende livrente combined cap DKK 68,700/yr deductible. Livrente (lifetime) is unlimited. 2026 also has bonus credit (12% if >15 yrs to retirement, 32% if ≤15).',
    defaultPct: 5,
  },
  NO: {
    label: 'IPS %',
    hint: 'Individuell pensjonssparing — NOK 25,000/yr max (raised from 15k in 2026). 22% tax saving = NOK 5,500 max. Withdrawals taxed at 22% (deferred).',
    defaultPct: 3,
  },
  AE: {
    label: 'Retirement % (none)',
    hint: 'No mandatory or tax-advantaged retirement system for non-GCC expatriates in the UAE. Field has no effect on taxes. Private savings are taxable in your destination country if you repatriate.',
    defaultPct: 0,
  },
  PL: {
    label: 'PPK %',
    hint: 'Pracownicze Plany Kapitałowe — employee default 2% (range 0.5–4%). NOT pre-tax (taken from net salary). Employer PPK contribution (1.5–4%) is taxable to you. Marginal tax benefit only via tax credit.',
    defaultPct: 2,
  },
};
