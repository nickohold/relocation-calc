import React, { useEffect, useMemo, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { COUNTRIES, LOCATIONS } from '../countries.js';
import { FX_USD_PER_UNIT } from '../fx.js';
import { fmtAmount, fmtLocal, fmtPct } from './formatCurrency.js';
import { PENSION_META } from './pensionMeta.js';

const KpiCell = ({ theme, label, hint, children }) => (
  <div>
    <div className={theme.kpiLabel}>
      <span className="flex items-center gap-1">
        <span>{label}</span>
        {hint && (
          <div className="relative group inline-block">
            <HelpCircle size={11} className={theme.tooltipIcon} />
            <div className={theme.tooltipBox}>
              {hint}
              <div className={theme.tooltipArrow}></div>
            </div>
          </div>
        )}
      </span>
    </div>
    {children}
  </div>
);

// Per-side gross salary input with annual ↔ monthly toggle. Stores annual in payload.
const SalaryInput = ({ theme, side, currency, annualValue, onAnnualChange, hint }) => {
  const storageKey = `relocation-calc:salaryMode:${side}`;
  const [mode, setMode] = useState(() => {
    if (typeof window === 'undefined') return 'annual';
    return window.localStorage.getItem(storageKey) === 'monthly' ? 'monthly' : 'annual';
  });
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(storageKey, mode);
  }, [mode, storageKey]);

  const annualNum = Number(annualValue) || 0;
  const isMonthly = mode === 'monthly';
  const displayed = isMonthly ? Math.round(annualNum / 12).toString() : String(annualValue);
  const step = isMonthly ? 500 : 5000;

  const isLight = theme.name === 'Sunrise';
  const activeCls = isLight ? 'bg-orange-500 text-white' : 'bg-indigo-500 text-white';
  const inactiveCls = isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-slate-300';
  const shellCls = isLight ? 'bg-slate-200/50 border border-slate-300/50' : 'bg-white/5 border border-white/10';

  const handleChange = (raw) => {
    if (isMonthly) {
      const m = Number(raw) || 0;
      onAnnualChange(String(Math.round(m * 12)));
    } else {
      onAnnualChange(raw);
    }
  };

  const modeBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setMode(id)}
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all ${mode === id ? activeCls : inactiveCls}`}
      aria-pressed={mode === id}
    >
      {label}
    </button>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <div className="flex items-center gap-1">
          <label className={theme.inputLabel}>
            {isMonthly ? `Monthly Gross (${currency})` : `Annual Gross (${currency})`}
          </label>
          {hint && (
            <div className="relative group inline-block">
              <HelpCircle size={12} className={theme.tooltipIcon} />
              <div className={theme.tooltipBox}>
                {hint}
                <div className={theme.tooltipArrow}></div>
              </div>
            </div>
          )}
        </div>
        <div className={`flex p-0.5 rounded-md ${shellCls}`}>
          {modeBtn('annual', 'Yr')}
          {modeBtn('monthly', 'Mo')}
        </div>
      </div>
      <input
        type="number"
        value={displayed}
        step={step}
        onChange={(e) => handleChange(e.target.value)}
        className={theme.inputBox}
      />
    </div>
  );
};

// Per-country UI hints for which optional fields to render.
function getCountryUI(code) {
  if (code === 'IL') return { kind: 'IL' };
  if (code === 'US') return { kind: 'US' };
  return { kind: 'GENERIC' };
}

const Field = ({ theme, label, children, hint }) => (
  <div>
    <div className="flex items-center mb-1.5 gap-1">
      <label className={theme.inputLabel}>{label}</label>
      {hint && (
        <div className="relative group inline-block">
          <HelpCircle size={12} className={theme.tooltipIcon} />
          <div className={theme.tooltipBox}>
            {hint}
            <div className={theme.tooltipArrow}></div>
          </div>
        </div>
      )}
    </div>
    {children}
  </div>
);

const NumInput = ({ theme, value, onChange, step = 1, suffix }) => (
  <div className="relative">
    <input
      type="number"
      value={value}
      step={step}
      onChange={(e) => onChange(e.target.value)}
      className={theme.inputBox}
    />
    {suffix && (
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] uppercase font-bold text-slate-400 pointer-events-none">
        {suffix}
      </span>
    )}
  </div>
);

// Render a single PENSION_META field by kind: pct/amount → NumInput, toggle → checkbox.
const FieldRenderer = ({ theme, field, payload, setField, setPayload }) => {
  const value = payload[field.key];
  if (field.kind === 'toggle') {
    return (
      <label className={theme.severanceBox}>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => setPayload({ ...payload, [field.key]: e.target.checked })}
          className={theme.severanceCheck}
        />
        <span>{field.label}{field.hint && <span className={theme.severanceSub}>{field.hint}</span>}</span>
      </label>
    );
  }
  return (
    <Field theme={theme} label={field.label} hint={field.hint}>
      <NumInput
        theme={theme}
        value={value ?? field.default ?? 0}
        onChange={(v) => setField(field.key, v)}
        step={field.step ?? 1}
      />
    </Field>
  );
};

const SelectBox = ({ theme, value, onChange, options }) => (
  <select
    value={value}
    onChange={(e) => onChange(e.target.value)}
    className={theme.inputBox}
  >
    {options.map(([val, label]) => (
      <option key={val} value={val}>{label}</option>
    ))}
  </select>
);

// payload shape:
// { countryCode, locationKey, grossLocal, eePensionPct, eeOtherPct,
//   matchLimitPct, rentLocal, miscBurnLocal,
//   erPensionPct, erSeverancePct, erKerenPct, includeSeveranceInSavings,
//   creditPoints, imputedBenefits }
const ComparePanel = ({ theme, side, payload, setPayload, result, headingClass, headingLabel, headingIcon }) => {
  // Each panel always renders its own local currency. Display-currency toggle only affects
  // the breakdown table and comparison-summary cards, not these per-side headlines.
  const localCurrency = COUNTRIES[payload.countryCode]?.currency || 'USD';
  const country = COUNTRIES[payload.countryCode];
  const ui = getCountryUI(payload.countryCode);

  const countryOptions = useMemo(
    () => Object.entries(COUNTRIES)
      .map(([code, c]) => [code, c.name])
      .sort((a, b) => a[1].localeCompare(b[1])),
    [],
  );
  const cityOptions = useMemo(() => {
    return (country?.locations || [])
      .map((key) => [key, LOCATIONS[key].name])
      .sort((a, b) => a[1].localeCompare(b[1]));
  }, [country]);

  const handleCountry = (code) => {
    const c = COUNTRIES[code];
    const firstLoc = c?.locations?.[0];
    const loc = firstLoc ? LOCATIONS[firstLoc] : null;
    const meta = PENSION_META[code];
    const metaDefaults = meta?.fields
      ? Object.fromEntries(meta.fields.map((f) => [f.key, f.default]))
      : {};
    setPayload({
      ...payload,
      countryCode: code,
      locationKey: firstLoc,
      rentLocal: loc?.defaultRent ?? 0,
      // reset country-specific fields to safe defaults
      eePensionPct: code === 'US' ? 6 : code === 'IL' ? 6 : 5,
      eeOtherPct: code === 'IL' ? 2.5 : 0,
      matchLimitPct: code === 'US' ? 6 : 0,
      erPensionPct: code === 'IL' ? 6.5 : undefined,
      erSeverancePct: code === 'IL' ? 8.33 : undefined,
      erKerenPct: code === 'IL' ? 7.5 : undefined,
      includeSeveranceInSavings: code === 'IL' ? true : undefined,
      creditPoints: code === 'IL' ? 2.25 : undefined,
      ...metaDefaults,
      ...(meta?.needsAge ? { age: payload.age ?? 35 } : {}),
    });
  };

  const handleCity = (key) => {
    const loc = LOCATIONS[key];
    setPayload({ ...payload, locationKey: key, rentLocal: loc?.defaultRent ?? payload.rentLocal });
  };

  const setField = (field, raw) => {
    const v = raw === '' ? '' : Number(raw);
    setPayload({ ...payload, [field]: Number.isNaN(v) ? raw : v });
  };

  const grossUSD = result ? (result.grossLocal * FX_USD_PER_UNIT[result.currency]) : 0;
  const netUSD = result?.netUSD ?? 0;

  return (
    <section className={theme.sectionCard}>
      <h3 className={headingClass}>{headingIcon} {headingLabel}</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field theme={theme} label="Country">
            <SelectBox
              theme={theme}
              value={payload.countryCode}
              onChange={handleCountry}
              options={countryOptions}
            />
          </Field>
          <Field theme={theme} label="City">
            <SelectBox
              theme={theme}
              value={payload.locationKey || ''}
              onChange={handleCity}
              options={cityOptions}
            />
          </Field>
        </div>

        <SalaryInput
          theme={theme}
          side={side}
          currency={country?.currency ?? ''}
          annualValue={payload.grossLocal}
          onAnnualChange={(v) => setField('grossLocal', v)}
          hint="Salary before tax, in local currency. Toggle Yr/Mo to enter as annual or monthly — both are equivalent and convert internally."
        />

        {ui.kind === 'US' && (
          <div className="grid grid-cols-2 gap-3">
            <Field theme={theme} label="401(k) EE %" hint="Your 401(k) contribution % of gross.">
              <NumInput theme={theme} value={payload.eePensionPct} onChange={(v) => setField('eePensionPct', v)} step={0.5} />
            </Field>
            <Field theme={theme} label="401(k) Match %" hint="Employer match cap, % of gross.">
              <NumInput theme={theme} value={payload.matchLimitPct} onChange={(v) => setField('matchLimitPct', v)} step={0.5} />
            </Field>
          </div>
        )}

        {ui.kind === 'IL' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Field theme={theme} label="EE Pension %" hint="Your pension contribution.">
                <NumInput theme={theme} value={payload.eePensionPct} onChange={(v) => setField('eePensionPct', v)} step={0.1} />
              </Field>
              <Field theme={theme} label="EE Keren %" hint="Your Keren Hishtalmut contribution.">
                <NumInput theme={theme} value={payload.eeOtherPct} onChange={(v) => setField('eeOtherPct', v)} step={0.1} />
              </Field>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field theme={theme} label="ER Pension %" hint="Employer pension contribution rate. Standard in Israel: 6.5% of gross. Counts toward your retirement savings.">
                <NumInput theme={theme} value={payload.erPensionPct ?? 6.5} onChange={(v) => setField('erPensionPct', v)} step={0.1} />
              </Field>
              <Field theme={theme} label="ER Severance %" hint="Pitzuim — severance fund contribution. Standard 8.33% (1/12 of monthly salary). Counts as savings only if rolled into pension at end of employment (see toggle below).">
                <NumInput theme={theme} value={payload.erSeverancePct ?? 8.33} onChange={(v) => setField('erSeverancePct', v)} step={0.1} />
              </Field>
              <Field theme={theme} label="ER Keren %" hint="Employer Keren Hishtalmut (study fund) contribution. Standard 7.5%. Tax-free vehicle, capped at ₪15,712/mo gross.">
                <NumInput theme={theme} value={payload.erKerenPct ?? 7.5} onChange={(v) => setField('erKerenPct', v)} step={0.1} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field theme={theme} label="Credit Points"><NumInput theme={theme} value={payload.creditPoints ?? 2.25} onChange={(v) => setField('creditPoints', v)} step={0.25} /></Field>
              <label className={theme.severanceBox}>
                <input
                  type="checkbox"
                  checked={!!payload.includeSeveranceInSavings}
                  onChange={(e) => setPayload({ ...payload, includeSeveranceInSavings: e.target.checked })}
                  className={theme.severanceCheck}
                />
                <span>Count severance as savings.<span className={theme.severanceSub}>On if rolled into pension.</span></span>
              </label>
            </div>
          </>
        )}

        {ui.kind === 'GENERIC' && (() => {
          const meta = PENSION_META[payload.countryCode];
          if (!meta?.fields) {
            return (
              <Field theme={theme} label={meta?.label ?? 'Pension %'} hint={meta?.hint}>
                <NumInput theme={theme} value={payload.eePensionPct} onChange={(v) => setField('eePensionPct', v)} step={0.5} />
              </Field>
            );
          }
          return (
            <>
              {meta.needsAge && (
                <Field theme={theme} label="Age" hint="Drives age-banded contribution rates.">
                  <NumInput theme={theme} value={payload.age ?? 35} onChange={(v) => setField('age', v)} step={1} />
                </Field>
              )}
              <div className="grid grid-cols-2 gap-3">
                {meta.fields.map((f) => (
                  <FieldRenderer
                    key={f.key}
                    theme={theme}
                    field={f}
                    payload={payload}
                    setField={setField}
                    setPayload={setPayload}
                  />
                ))}
              </div>
            </>
          );
        })()}

        <Field theme={theme} label={`Monthly Rent (${country?.currency})`} hint="Default pre-filled from city; override if needed.">
          <NumInput theme={theme} value={payload.rentLocal} onChange={(v) => setField('rentLocal', v)} step={50} />
        </Field>
        <Field theme={theme} label={`Monthly Misc Burn (${country?.currency})`} hint="Food, transit, leisure, utilities not in rent.">
          <NumInput theme={theme} value={payload.miscBurnLocal} onChange={(v) => setField('miscBurnLocal', v)} step={50} />
        </Field>

        {/* Headline numbers — always in this panel's local currency */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <KpiCell theme={theme} label={`Gross (${localCurrency})`} hint="Annual gross salary, in this panel's local currency.">
            <span className="text-lg font-black">{fmtLocal(result?.grossLocal ?? 0, localCurrency)}</span>
          </KpiCell>
          <KpiCell theme={theme} label="Net Take-Home" hint="Annual gross minus all income tax, social security/insurance, and your pre-tax retirement contributions. What hits your bank account.">
            <span className="text-lg font-black">{fmtLocal(result?.netLocal ?? 0, localCurrency)}</span>
          </KpiCell>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <KpiCell theme={theme} label="Effective Tax" hint="(Income tax + social security + state/local tax) ÷ gross. Excludes pension contributions, which reduce taxable income but aren't a tax.">
            <span className="text-base font-bold">{fmtPct(result?.effectiveTaxRate ?? 0)}</span>
          </KpiCell>
          <KpiCell theme={theme} label="Liquid (after rent+burn)" hint="Net take-home minus annual rent and misc burn. Whatever's left over for everything else (taxable savings, RSUs, fun, etc.).">
            <span className="text-base font-bold">{fmtLocal(result?.liquidLocal ?? 0, localCurrency)}</span>
          </KpiCell>
        </div>

      </div>
    </section>
  );
};

export default ComparePanel;
