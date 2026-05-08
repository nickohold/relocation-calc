import React, { useMemo } from 'react';
import { HelpCircle } from 'lucide-react';
import { COUNTRIES, LOCATIONS } from '../countries.js';
import { FX_USD_PER_UNIT } from '../fx.js';
import { fmtAmount, fmtPct } from './formatCurrency.js';

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
const ComparePanel = ({ theme, side, payload, setPayload, result, displayCurrency, headingClass, headingLabel, headingIcon }) => {
  const country = COUNTRIES[payload.countryCode];
  const ui = getCountryUI(payload.countryCode);

  const countryOptions = useMemo(
    () => Object.entries(COUNTRIES).map(([code, c]) => [code, c.name]),
    [],
  );
  const cityOptions = useMemo(() => {
    return (country?.locations || [])
      .map((key) => [key, LOCATIONS[key].name]);
  }, [country]);

  const handleCountry = (code) => {
    const c = COUNTRIES[code];
    const firstLoc = c?.locations?.[0];
    const loc = firstLoc ? LOCATIONS[firstLoc] : null;
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

        <Field
          theme={theme}
          label={`Annual Gross (${country?.currency})`}
          hint="Annual salary before tax, in local currency."
        >
          <NumInput
            theme={theme}
            value={payload.grossLocal}
            onChange={(v) => setField('grossLocal', v)}
            step={1000}
          />
        </Field>

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
              <Field theme={theme} label="ER Pension %"><NumInput theme={theme} value={payload.erPensionPct ?? 6.5} onChange={(v) => setField('erPensionPct', v)} step={0.1} /></Field>
              <Field theme={theme} label="ER Severance %"><NumInput theme={theme} value={payload.erSeverancePct ?? 8.33} onChange={(v) => setField('erSeverancePct', v)} step={0.1} /></Field>
              <Field theme={theme} label="ER Keren %"><NumInput theme={theme} value={payload.erKerenPct ?? 7.5} onChange={(v) => setField('erKerenPct', v)} step={0.1} /></Field>
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

        {ui.kind === 'GENERIC' && (
          <Field theme={theme} label="Pension %" hint="Generic employee pension/social-supplement contribution.">
            <NumInput theme={theme} value={payload.eePensionPct} onChange={(v) => setField('eePensionPct', v)} step={0.5} />
          </Field>
        )}

        <Field theme={theme} label={`Monthly Rent (${country?.currency})`} hint="Default pre-filled from city; override if needed.">
          <NumInput theme={theme} value={payload.rentLocal} onChange={(v) => setField('rentLocal', v)} step={50} />
        </Field>
        <Field theme={theme} label={`Monthly Misc Burn (${country?.currency})`} hint="Food, transit, leisure, utilities not in rent.">
          <NumInput theme={theme} value={payload.miscBurnLocal} onChange={(v) => setField('miscBurnLocal', v)} step={50} />
        </Field>

        {/* Headline numbers */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
          <div>
            <div className={theme.kpiLabel}><span>Gross (USD)</span></div>
            <div className="text-lg font-black">{fmtAmount(grossUSD, displayCurrency)}</div>
          </div>
          <div>
            <div className={theme.kpiLabel}><span>Net Take-Home</span></div>
            <div className="text-lg font-black">{fmtAmount(netUSD, displayCurrency)}</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className={theme.kpiLabel}><span>Effective Tax</span></div>
            <div className="text-base font-bold">{fmtPct(result?.effectiveTaxRate ?? 0)}</div>
          </div>
          <div>
            <div className={theme.kpiLabel}><span>Liquid (after rent+burn)</span></div>
            <div className="text-base font-bold">{fmtAmount(result?.liquidUSD ?? 0, displayCurrency)}</div>
          </div>
        </div>

      </div>
    </section>
  );
};

export default ComparePanel;
