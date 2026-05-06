# Relocation Architect — Logic Specification

**Source of truth for all calculations.** If the code disagrees with this document, one of them is wrong — file an issue.

Last reviewed: 2026-05-06 · Tax year basis: **2024** (US) / **2026** (Israel)

---

## 0. Purpose

Compare the financial reality of staying in **Israel** versus moving to a **US** metro (NYC, NJ Hoboken/JC, NJ West NY, Austin, Houston). Tracks two distinct dimensions:

1. **Liquid Cash Flow** — money left over after taxes, mandatory savings, rent, and lifestyle burn
2. **Wealth Accumulation** — money flowing into long-term retirement vehicles (pension, keren, 401k)

A move is only a "win" if both dimensions hold. The tool will flag a **Wealth Gap** when the US side cannot keep up with Israeli forced-savings velocity.

---

## 1. Global Constants

All values live in `src/calc.js → CONSTANTS`.

| Constant | Value | Source / Year |
|---|---|---|
| FX rate (default) | 1 ILS = 0.27 USD | Editable in UI; static default. **Not live.** |
| US 401(k) elective deferral limit | $23,500/yr | IRS 2024/2025 (under 50) |
| Federal standard deduction (single) | $14,600 | IRS 2024 |
| Social Security wage base | $168,600 | SSA 2024 |
| Social Security rate | 6.2% | FICA |
| Medicare rate | 1.45% | FICA |
| Additional Medicare threshold (single) | $200,000 | IRS |
| Additional Medicare rate | 0.9% | IRS |
| NY state std deduction (single) | $8,000 | NY DTF 2024 |
| NJ personal exemption | $1,000 | NJ Treasury 2024 |
| BTL low/high threshold | ₪7,703/mo | btl.gov.il (2026) |
| BTL ceiling (no contribs above) | ₪51,910/mo | btl.gov.il (2026) |
| BTL employee rate (low) | 1.04% | btl.gov.il (2026) |
| BTL employee rate (high) | 7.0% | btl.gov.il (2026) |
| Health employee rate (low) | 3.23% | btl.gov.il (2026) |
| Health employee rate (high) | 5.17% | btl.gov.il (2026) |
| Israeli credit point value | ₪242/mo | MOF 2026 |
| Pension tax credit rate | 35% | Israeli tax law |
| Pension credit insured-salary cap | ₪9,684/mo | MOF 2026 |
| Pension credit % cap | 7% of insured salary | — |
| Keren Hishtalmut salary cap | ₪15,712/mo | MOF 2026 (Harel) |

Update these together when refreshing for a new tax year.

---

## 2. Israel Engine (`calcIL`)

### 2.1 Bituach Leumi (BTL) + Health Tax (Mas Briut) — `calcBTL`

Two-tier on monthly gross. **Combined** = BTL + Mas Briut (the slip shows them on separate lines but they share the same threshold/ceiling and the model returns the sum).

```
low_base  = min(gross, 7,703)
high_base = max(0, min(gross, 51,910) − 7,703)

BTL    = low_base × 1.04% + high_base × 7.00%
Health = low_base × 3.23% + high_base × 5.17%
total  = BTL + Health
```
No contributions above ₪51,910/mo. Verified against a real 4/2026 payslip (taxable ₪34,296 → ₪3,565.34, exact match).

### 2.2 Mas Hachnasa (Income Tax)

Progressive monthly brackets (2024):

| Width (ILS) | Rate |
|---|---|
| First 7,010 | 10% |
| Next 3,050 | 14% |
| Next 8,940 | 20% |
| Next 6,100 | 31% |
| Next 21,590 | 35% |
| Next 13,440 | 47% |
| Above 60,130 | 50% |

```
gross_tax       = sum across brackets
credit_offset   = 2.25 × ₪242 = ₪544.50
pension_credit  = calcPensionCredit(gross, EE_pension_pct)
mas_hachnasa    = max(0, gross_tax − credit_offset − pension_credit)
```

#### 2.2.1 Pension Tax Credit — `calcPensionCredit`

Bug fix introduced 2026-05: previously omitted, overstating IL tax by ~₪200/mo.

```
insured_salary    = min(gross, 9,684)
eligible_contrib  = min(EE_pension_contrib, insured_salary × 7%)
credit            = eligible_contrib × 35%
```
Non-refundable — capped at the income tax owed.

### 2.3 Imputed Benefits (שווי / non-cash perks)

Israeli payslips show `שווי` lines for non-cash taxable benefits — meal vouchers, holiday gifts, sport benefit, gross-ups (גילום) — which inflate the income-tax and BTL base without adding cash to the employee's pocket.

Optional `imputedBenefits` input (default 0). When set:
- Adds to BTL base AND to income-tax base
- Does NOT add to net (no cash crosses hands)
- Does NOT change pension or keren contributions (perks aren't pensionable)

```
taxable_base = gross + imputed_benefits
BTL          = calcBTL(taxable_base)
mas_hachnasa = brackets(taxable_base) − credit_points − pension_credit
```

### 2.4 Net Take-Home

```
EE_pension_ILS = gross × EE_pension_pct%                          # uncapped — applies to full gross
keren_base     = min(gross, 15,712)                               # ← statutory keren salary cap
EE_keren_ILS   = keren_base × EE_keren_pct%
net_IL = gross − BTL − mas_hachnasa − EE_pension_ILS − EE_keren_ILS
```

**Keren Hishtalmut cap (₪15,712/mo, 2026):** Above this insured-salary base, contributions either stop entirely or become taxable. Most employers stop at the cap. Pension contributions are NOT capped this way — only keren is.

### 2.4 Wealth Accumulation

Total monthly money flowing into long-term vehicles:

```
EE_savings   = EE_pension_ILS + EE_keren_ILS                              # keren capped at ₪15,712
ER_pension   = gross × ER_pension_pct%                                    # uncapped
ER_keren     = min(gross, 15,712) × ER_keren_pct%                         # capped
ER_severance = gross × ER_severance_pct% (only if severance toggle ON)    # uncapped
ER_savings   = ER_pension + ER_keren + ER_severance
total_IL_savings = EE_savings + ER_savings
```

**Severance toggle (`includeSeveranceInSavings`):** Pitzuim (8.33%) is only "savings" if rolled into pension on job exit. If you spend it, it's a job-change bonus, not retirement savings. Toggle defaults ON; turn off for conservative modeling.

### 2.5 Israel Liquid Cash Flow

```
liquid_IL = net_IL − rent − burn          # in ILS
liquid_IL_USD = liquid_IL × FX            # for comparison
```

This is the baseline the US side must meet or beat.

---

## 3. US Engine (`calcUS`)

### 3.1 401(k) Strategy

Goal: minimize personal contribution while hitting the IL savings target. **Capture full employer match for free; top up personal only if needed.**

```
employer = gross_monthly × match_limit_pct%
required_personal = max(0, target_savings_USD − employer)
personal = min(required_personal, IRS_LIMIT/12)
wealth_gap = max(0, required_personal − personal)
total_invested = employer + personal
```

**Wealth Gap** triggers when IL savings target cannot be matched even with employer match + IRS-capped personal contribution. UI shows a red warning. This means: even if cash flow improves, **the move loses you wealth versus staying** unless offset by RSUs / brokerage / other vehicles outside this model.

### 3.2 FICA

```
SS_tax        = min(gross_annual, 168,600) × 6.2%
medicare      = gross_annual × 1.45%
add_medicare  = max(0, gross_annual − 200,000) × 0.9%
FICA_annual   = SS_tax + medicare + add_medicare
```

### 3.3 Federal Income Tax

**401(k) is pre-tax federal.**

```
fed_taxable = max(0, gross_annual − personal_annual − std_deduction)
fed_annual  = progressive_brackets(fed_taxable, FED_BRACKETS)
```

### 3.4 State + City Tax

Branches by `location.state`:

#### NY (NYC, future Yonkers)

NY conforms to federal — **401(k) IS pre-tax** for NY state and NYC local.

```
ny_taxable    = max(0, gross_annual − personal_annual − 8,000)
state_annual  = progressive_brackets(ny_taxable, NY_STATE_BRACKETS)
city_annual   = (location.city == 'NYC')
              ? progressive_brackets(ny_taxable, NYC_LOCAL_BRACKETS)
              : 0
```

#### NJ (Hoboken/JC, West NY/Guttenberg)

**NJ does NOT conform — 401(k) is NOT pre-tax for NJ state.** This was a bug previously; fixed 2026-05.

```
nj_taxable   = max(0, gross_annual − 1,000)         # personal_annual NOT subtracted
state_annual = progressive_brackets(nj_taxable, NJ_STATE_BRACKETS)
city_annual  = 0
```

#### TX (Austin, Houston) and other no-income-tax states

```
state_annual = 0
city_annual  = 0
```

### 3.5 Net Take-Home

```
taxes_monthly = (FICA + fed + state + city) / 12
net_take_home = gross_monthly − personal − taxes_monthly
```

### 3.6 US Liquid Cash Flow

```
us_total_out = us_rent + us_misc_burn + (il_burn × FX)
liquid_US    = net_take_home − us_total_out
```

`il_burn × FX` is the **lifestyle-lock assumption** — see §5.2.

---

## 4. Output Metrics

| Metric | Formula | Meaning |
|---|---|---|
| Liquid Cash Flow (US) | `net_take_home − us_total_out` | Money left over each month |
| Liquid Delta | `liquid_US − liquid_IL_USD` | Lifestyle change vs Israel |
| Optimal % | `personal / gross_monthly × 100` | Required EE 401(k) % to hit target |
| Wealth Gap | `max(0, required_personal − IRS_cap)` | Unrecoverable savings shortfall |
| True Lifestyle Change | = Liquid Delta | Headline "is the move worth it" number |

**Win condition:** Liquid Delta > 0 **AND** Wealth Gap = 0.
**Mixed result:** Liquid Delta > 0 but Wealth Gap > 0 → "more pocket money, less wealth"; net-worth loss vs staying unless filled by RSUs/brokerage.
**Loss condition:** Liquid Delta ≤ 0.

---

## 5. Known Simplifications & Assumptions

The model is **directional**, not a tax filing. These are the explicit gaps:

### 5.1 Israel side
- **Filing status:** single only. No couples / dependents.
- **Olim chadashim 10-year tax break:** not modeled. If you qualify, IL tax is dramatically lower.
- **Section 102 RSU treatment:** not modeled.
- **Section 47 ניכוי (deduction):** Researched 2026-05. **Does not apply to typical salaried employees** with employer pension contributions — only to self-employed and "uninsured salary" earners (e.g. side gigs without pension coverage), and even then only when insured salary is below ₪24,250/mo. Salaried employees only get the Section 45A 35% credit, which the engine already implements. The "פטור ס' 47" line on payslips refers to the employer-side exemption (employer pension contributions are exempt from being imputed as taxable income to the employee), which the engine already handles by default since it doesn't add employer contributions to taxable income.
- **Pitzuim withdrawal tax:** assumes severance is rolled over (when toggle is on). Cash withdrawal would be partially taxed.
- **Keren Hishtalmut withdrawal tax:** assumes 6-year hold; no tax on withdrawal.
- **PAYE smoothing:** Israeli employer withholding uses YTD averaging across the calendar year. The engine computes monthly steady-state, so a single month's payslip can diverge by several hundred shekels from the engine's output (in either direction). The annual total reconciles.

### 5.2 US side
- **Filing status:** single only. Standard deduction is single-filer 2024.
- **Equity comp / RSUs:** **not modeled.** This is the biggest blind spot for a tech offer — total comp in NYC tech is often 30–50% RSUs.
- **Health insurance premium:** not modeled. Typical US employer plan: $150–400/mo pre-tax payroll deduction. Net take-home is overstated.
- **HSA / FSA / commuter benefits:** not modeled.
- **Itemizing / SALT cap / mortgage interest:** assumes standard deduction.
- **Catch-up contributions (50+):** not modeled. Nick is under 50.
- **State residency edge cases:** assumes you're a resident of the displayed state. Doesn't handle NY non-resident / part-year.

### 5.3 Comparison framing
- **Lifestyle-lock assumption:** We assume Tel Aviv lifestyle in ILS, converted at FX, equals an equivalent US lifestyle. This is **PPP-naive** — a ₪9,000/mo Tel Aviv lifestyle is realistically more like $4,500–5,500/mo NYC, not $2,430. The "Other Expenses ($)" input is a partial offset for this.
- **FX is static.** No live rate. Stale defaults silently lie when the rate drifts.
- **Withdrawal tax not modeled.** $1 in keren ≠ $1 in 401(k). Different ages, tax rates, liquidity at distribution.
- **One-time move costs:** visa, NY broker fee, security deposit, shipping, COBRA gap — not modeled.

---

## 6. Connections / Dependency Graph

```
ilGross ─┬─→ BTL ──────────────┐
         ├─→ Mas Hachnasa ─────┤
         ├─→ EE pension ───────┼─→ ilNet ──→ ilLiquid_USD ──┐
         ├─→ EE keren ─────────┘                            │
         └─→ ER savings (incl. severance toggle) ──→ targetSavingsUSD
                                                           │            │
matchLimitPct ─→ employer ─────┐                           │            │
usGrossAnnual ──┬──────────────┼──→ personal ─→ wealthGap  │            │
                ├─→ FICA       │                           │            │
                ├─→ Federal ←──┘ (401k pre-tax)            │            │
                ├─→ State ←──── NY: pre-tax / NJ: NOT      │            │
                └─→ City  ←──── NYC: pre-tax               │            │
                                                           │            │
all combined ─→ netTakeHome ─→ liquidCashFlow ─→ liquidDelta ←──────────┘
```

When you change a top-level input, follow the arrows to predict downstream effects.

---

## 7. Bug History (so we don't regress)

| Date | Bug | Fix |
|---|---|---|
| 2026-05-06 | NaN in US tax columns — `usFICAMonthly` etc. were referenced but never computed | Added FICA / state / city to `useMemo` return |
| 2026-05-06 | Lifestyle had a non-monotonic "U-curve" — at 4% match the answer peaked, but went down both above and below | Removed forced "match employer dollar-for-dollar" strategy; now `personal = max(0, target − employer)` |
| 2026-05-06 | NJ state tax incorrectly treated 401k as pre-tax (NJ does not conform to federal) | NJ taxable now uses gross with no `personal_annual` subtraction |
| 2026-05-06 | Israeli pension tax credit (35% × min(EE, 7%)) was missing — overstated IL tax | Added `calcPensionCredit` |
| 2026-05-06 | Severance pitzuim (8.33%) always counted as savings, inflating US 401k target | Added `includeSeveranceInSavings` toggle |
| 2026-05-06 | No IRS $23,500 cap on personal 401k contribution | Cap enforced; surplus surfaces as `wealthGap` with UI warning |
| 2026-05-06 | BTL+Health used 3.5%/12.0% combined rates (off-by-0.27%); ceiling was ₪49,030 (2024 figure) | Split into BTL (1.04%/7.0%) and Health (3.23%/5.17%) per btl.gov.il; ceiling raised to ₪51,910. Verified against real 4/2026 payslip. |
| 2026-05-06 | Keren Hishtalmut applied to full gross — overstated EE keren by 2-3× at high incomes | Keren base now capped at ₪15,712/mo for both EE and ER per Israeli tax law. Matches real payslip exactly. |
| 2026-05-06 | Single `gross` input couldn't represent payslips with non-cash שווי (meal/gift/sport/gross-up) lines, causing BTL/tax to under-shoot for users with imputed perks | Added optional `imputedBenefits` input (default 0). Inflates BTL+tax base without affecting net cash, pension, or keren. |

---

## 8. Test Coverage

`src/calc.test.js` locks the above. Run `npm test`. Specific guarantees:

- Bracket math (zero, single bracket, multiple, top bracket)
- BTL two-tier with cap behavior
- Pension credit (zero EE, capped, uncapped)
- Israel net reconstruction
- Severance toggle effect on `erSavingsILS` and `totalILSPct`
- FICA wage base cap + Additional Medicare threshold
- NY 401k pre-tax behavior
- **NJ 401k NOT pre-tax** (regression test for the bug)
- TX no-income-tax
- Wealth Gap triggers above IRS cap
- 401k personal contribution monotonic in employer match (regression test for U-curve bug)
- End-to-end: no NaN at default inputs
- End-to-end: ATX > NYC lifestyle (sanity)

If any of these fail, the model has drifted from this spec.

---

## 9. When to update this document

Update **before** changing logic, not after. PR template:

1. Describe the new behavior in plain English here
2. Update `CONSTANTS` with citations if rates changed
3. Add or update tests in `calc.test.js`
4. Implement in `calc.js`
5. Append to "Bug History" if it was a fix

If the change is a modeling judgment call (e.g., RSU treatment), document the **alternatives considered** and why this one was chosen. Future-you will thank you.
