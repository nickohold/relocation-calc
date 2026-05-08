// Destination Explorer — multi-country relocation leaderboard.
// User picks ONE source location + gross + lifestyle inputs; the grid ranks
// every other destination by liquid delta (and other metrics) vs source.

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  TrendingUp, ChevronDown, ChevronRight, ChevronUp, Sun, LayoutGrid,
  HelpCircle, Search, ArrowUpDown, Coffee, Sparkles, Trophy,
} from 'lucide-react';
import {
  runComparison, COUNTRIES, MULTI_LOCATIONS, FX_USD_PER_UNIT,
} from './calc';
import { formatUSD, formatLocal } from './formatMoney';
import {
  COUNTRY_FLAG, COUNTRY_REGION, REGIONS, regionForLocation, flagForLocation,
} from './regions';

// ── localStorage keys ──
const LS_SOURCE         = 'explorer:sourceKey';
const LS_GROSS          = 'explorer:sourceGrossLocal';
const LS_CURRENCY_MODE  = 'explorer:currencyMode';   // 'source' | 'usd'
const LS_SORT_KEY       = 'explorer:sortKey';
const LS_SORT_DIR       = 'explorer:sortDir';        // 'asc' | 'desc'
const LS_THEME          = 'explorer:theme';          // 'sunrise' | 'bento'
const LS_GROSS_MODE     = 'explorer:grossMode';      // 'usd-nominal' | 'ppp-match'

// ── Default inputs ──
const DEFAULT_SOURCE_KEY = 'IL-TLV';
const DEFAULT_SOURCE_GROSS_ILS = 384000; // ₪384,000/yr

const lsGet = (k, fallback) => {
  if (typeof window === 'undefined') return fallback;
  const v = window.localStorage.getItem(k);
  return v ?? fallback;
};
const lsSet = (k, v) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(k, String(v));
};

// ── Theme tokens — reuse the dual sunrise/bento aesthetic from the previous UI. ──
const THEMES = {
  sunrise: {
    name: 'Sunrise',
    pageBg: 'bg-slate-100',
    rootText: 'text-slate-800',
    switcherShell: 'bg-slate-200/50 border-slate-300/50',
    footerText: 'text-slate-400',
    kofiBtn: 'bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600',
    titleText: 'text-slate-900',
    titleAccent: 'text-orange-500',
    brandPill: 'text-xs bg-orange-100/80 text-orange-600 px-2 py-1 rounded-full border border-orange-200/50',
    sectionCard: 'bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm',
    inputLabel: 'text-[10px] text-slate-400 uppercase font-black tracking-widest block',
    inputBox: 'bg-white border border-slate-200/80 rounded-xl px-3 py-2.5 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 w-full text-sm font-bold transition-all',
    selectBox: 'bg-white border border-slate-200/80 rounded-xl px-3 py-2.5 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 w-full text-sm font-bold transition-all appearance-none pr-9',
    chipActive: 'bg-orange-500 text-white border-orange-500',
    chipInactive: 'bg-white text-slate-600 border-slate-200 hover:border-orange-300',
    chip: 'px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer',
    pickCard: 'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200/80 rounded-2xl p-4 shadow-sm',
    pickLabel: 'text-[10px] uppercase font-black tracking-widest text-orange-600',
    pickValue: 'text-2xl sm:text-3xl font-black text-slate-900 mt-1',
    pickCity: 'text-sm font-bold text-slate-700',
    pickFlag: 'text-2xl',
    grid: 'bg-slate-50 border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden',
    headRow: 'bg-slate-100/80 border-b border-slate-200/80 text-slate-500 uppercase text-[10px] font-black tracking-widest',
    headCell: 'p-3 text-left cursor-pointer hover:text-orange-600 transition-colors select-none',
    bodyRow: 'border-b border-slate-200/60 hover:bg-orange-50/40 transition-colors cursor-pointer',
    bodyRowExpanded: 'bg-orange-50/60',
    cell: 'p-3 text-sm font-bold text-slate-700',
    cellMuted: 'p-3 text-sm font-medium text-slate-500',
    deltaPos: 'text-emerald-600',
    deltaNeg: 'text-rose-500',
    deltaNeutral: 'text-slate-400',
    detailBox: 'bg-white border-x border-b border-orange-200/60 rounded-b-xl p-4 sm:p-6 mb-2',
    detailLabel: 'text-[10px] uppercase font-black tracking-widest text-slate-400',
    detailValue: 'text-base font-black text-slate-900',
    btn: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
    btnPrimary: 'bg-orange-500 text-white hover:bg-orange-600',
    btnGhost: 'bg-white border border-slate-200 text-slate-600 hover:border-orange-300',
    advancedShell: 'border-t border-slate-200/80 mt-4 pt-4',
  },
  bento: {
    name: 'Bento Grid',
    pageBg: 'bg-[#0B0F19]',
    rootText: 'text-slate-200',
    switcherShell: 'bg-white/5 border-white/10',
    footerText: 'text-slate-600',
    kofiBtn: 'bg-indigo-500 text-white shadow-indigo-500/30 hover:bg-indigo-600',
    titleText: 'text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400',
    titleAccent: 'text-indigo-400',
    brandPill: 'text-xs bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30',
    sectionCard: 'bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border border-white/5 rounded-[1.5rem] p-4 sm:p-6 shadow-2xl',
    inputLabel: 'text-[10px] text-slate-500 uppercase font-black tracking-widest block',
    inputBox: 'bg-black/30 border border-white/5 rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:bg-white/5 outline-none text-white w-full text-sm font-bold transition-all',
    selectBox: 'bg-black/30 border border-white/5 rounded-xl px-3 py-2.5 focus:border-indigo-500 focus:bg-white/5 outline-none text-white w-full text-sm font-bold transition-all appearance-none pr-9',
    chipActive: 'bg-indigo-500 text-white border-indigo-500',
    chipInactive: 'bg-white/5 text-slate-300 border-white/10 hover:border-indigo-400/60',
    chip: 'px-3 py-1 rounded-full border text-xs font-bold transition-all cursor-pointer',
    pickCard: 'bg-gradient-to-br from-indigo-900/30 to-[#0F131D] border border-indigo-500/30 rounded-2xl p-4 shadow-2xl',
    pickLabel: 'text-[10px] uppercase font-black tracking-widest text-indigo-300',
    pickValue: 'text-2xl sm:text-3xl font-black text-white mt-1',
    pickCity: 'text-sm font-bold text-slate-300',
    pickFlag: 'text-2xl',
    grid: 'bg-white/[0.02] border border-white/5 rounded-2xl shadow-2xl overflow-hidden',
    headRow: 'bg-white/[0.04] border-b border-white/5 text-slate-500 uppercase text-[10px] font-black tracking-widest',
    headCell: 'p-3 text-left cursor-pointer hover:text-indigo-300 transition-colors select-none',
    bodyRow: 'border-b border-white/5 hover:bg-white/[0.04] transition-colors cursor-pointer',
    bodyRowExpanded: 'bg-indigo-500/5',
    cell: 'p-3 text-sm font-bold text-slate-200',
    cellMuted: 'p-3 text-sm font-medium text-slate-500',
    deltaPos: 'text-emerald-400',
    deltaNeg: 'text-rose-400',
    deltaNeutral: 'text-slate-500',
    detailBox: 'bg-black/30 border-x border-b border-indigo-500/20 rounded-b-xl p-4 sm:p-6 mb-2',
    detailLabel: 'text-[10px] uppercase font-black tracking-widest text-slate-500',
    detailValue: 'text-base font-black text-white',
    btn: 'px-3 py-1.5 rounded-lg text-xs font-bold transition-all',
    btnPrimary: 'bg-indigo-500 text-white hover:bg-indigo-600',
    btnGhost: 'bg-white/5 border border-white/10 text-slate-300 hover:border-indigo-400/60',
    advancedShell: 'border-t border-white/5 mt-4 pt-4',
  },
};

// ── Sortable column descriptors ──
const COLUMNS = [
  { key: 'city',       label: 'Destination',            align: 'left',  numeric: false },
  { key: 'grossLocal', label: 'Gross (local)',          align: 'right', numeric: true  },
  { key: 'netUSD',     label: 'Net (USD/yr)',           align: 'right', numeric: true  },
  { key: 'savingsUSD', label: 'Savings (USD/yr)',       align: 'right', numeric: true  },
  { key: 'liquidUSD',  label: 'Liquid (USD/yr)',        align: 'right', numeric: true  },
  { key: 'liquidDelta',label: 'Δ Liquid vs Source',     align: 'right', numeric: true  },
  { key: 'colDelta',   label: 'Δ COL-adj.',             align: 'right', numeric: true  },
  { key: 'effRate',    label: 'Eff. Tax %',             align: 'right', numeric: true  },
];

const App = () => {
  // ── theme ──
  const [theme, setTheme] = useState(() => lsGet(LS_THEME, 'sunrise'));
  useEffect(() => lsSet(LS_THEME, theme), [theme]);
  const t = THEMES[theme] ?? THEMES.sunrise;

  // ── source selection ──
  const [sourceKey, setSourceKey] = useState(() => {
    const v = lsGet(LS_SOURCE, DEFAULT_SOURCE_KEY);
    return MULTI_LOCATIONS[v] ? v : DEFAULT_SOURCE_KEY;
  });
  useEffect(() => lsSet(LS_SOURCE, sourceKey), [sourceKey]);

  const sourceLoc = MULTI_LOCATIONS[sourceKey];
  const sourceCountry = COUNTRIES[sourceLoc.country];

  // Country dropdown -> filter cities
  const sourceCountryCode = sourceLoc.country;
  const setSourceCountry = (code) => {
    // Pick the first location of that country.
    const firstKey = Object.keys(MULTI_LOCATIONS).find((k) => MULTI_LOCATIONS[k].country === code);
    if (firstKey) setSourceKey(firstKey);
  };

  // ── source gross (annual, in source local currency) ──
  const [grossLocal, setGrossLocal] = useState(() => {
    const v = Number(lsGet(LS_GROSS, ''));
    return Number.isFinite(v) && v > 0 ? v : DEFAULT_SOURCE_GROSS_ILS;
  });
  useEffect(() => lsSet(LS_GROSS, grossLocal), [grossLocal]);

  // When source country changes, reset gross to a sensible default for that currency.
  // Default = ~$100k USD in local currency, rounded.
  useEffect(() => {
    // only auto-adjust if user hasn't typed (sentinel: no LS_GROSS yet for this source)
  }, [sourceKey]);

  // ── source advanced inputs (kept simple — single-source assumption) ──
  const [eePensionPct, setEePensionPct] = useState(6);
  const [eeOtherPct, setEeOtherPct]     = useState(2.5);   // IL: keren
  const [erPensionPct, setErPensionPct] = useState(6.5);
  const [erKerenPct, setErKerenPct]     = useState(7.5);
  const [erSeverancePct, setErSeverancePct] = useState(8.33);
  const [includeSeveranceInSavings, setIncludeSeveranceInSavings] = useState(true);
  const [rentLocal, setRentLocal]       = useState(sourceLoc.defaultRent);
  const [miscBurnLocal, setMiscBurnLocal] = useState(0);
  const [matchLimitPct, setMatchLimitPct] = useState(6); // dest US-only
  const [showAdvanced, setShowAdvanced] = useState(false);

  // When source changes, reset rent default for that city.
  useEffect(() => {
    setRentLocal(MULTI_LOCATIONS[sourceKey]?.defaultRent ?? 0);
  }, [sourceKey]);

  // ── currency display mode ──
  const [currencyMode, setCurrencyMode] = useState(() => lsGet(LS_CURRENCY_MODE, 'usd'));
  useEffect(() => lsSet(LS_CURRENCY_MODE, currencyMode), [currencyMode]);

  // ── gross-equivalence mode (how to assign dest gross) ──
  const [grossMode, setGrossMode] = useState(() => lsGet(LS_GROSS_MODE, 'usd-nominal'));
  useEffect(() => lsSet(LS_GROSS_MODE, grossMode), [grossMode]);

  // ── sorting ──
  const [sortKey, setSortKey] = useState(() => lsGet(LS_SORT_KEY, 'liquidDelta'));
  const [sortDir, setSortDir] = useState(() => lsGet(LS_SORT_DIR, 'desc'));
  useEffect(() => lsSet(LS_SORT_KEY, sortKey), [sortKey]);
  useEffect(() => lsSet(LS_SORT_DIR, sortDir), [sortDir]);

  // ── filters ──
  const [activeRegions, setActiveRegions] = useState(() => new Set(REGIONS));
  const [search, setSearch] = useState('');

  // ── expanded row ──
  const [expandedKey, setExpandedKey] = useState(null);

  // ── Run comparison for ALL destinations ──
  // This is the hot path — memoize aggressively.
  const sourceFx = FX_USD_PER_UNIT[sourceCountry.currency];
  const sourceGrossUSD = grossLocal * sourceFx;

  const destinations = useMemo(() => {
    const sourcePayload = {
      countryCode: sourceLoc.country,
      locationKey: sourceKey,
      grossLocal,
      eePensionPct,
      eeOtherPct,
      rentLocal,
      miscBurnLocal,
      matchLimitPct,
      erPensionPct,
      erSeverancePct,
      erKerenPct,
      includeSeveranceInSavings,
    };

    const rows = [];
    for (const [destKey, destLoc] of Object.entries(MULTI_LOCATIONS)) {
      if (destKey === sourceKey) continue;
      const destCountry = COUNTRIES[destLoc.country];
      const destFx = FX_USD_PER_UNIT[destCountry.currency];

      // Decide dest gross.
      let destGrossLocal;
      if (grossMode === 'ppp-match') {
        // sourceGross_USD × (sourceCOL / destCOL), back to dest currency.
        const ppp = sourceGrossUSD * ((sourceLoc.colIndex ?? 100) / (destLoc.colIndex ?? 100));
        destGrossLocal = ppp / destFx;
      } else {
        // Same nominal USD: convert source gross to USD, then to dest currency.
        destGrossLocal = sourceGrossUSD / destFx;
      }

      const destPayload = {
        countryCode: destLoc.country,
        locationKey: destKey,
        grossLocal: destGrossLocal,
        eePensionPct,
        eeOtherPct,
        rentLocal: destLoc.defaultRent ?? 0,
        miscBurnLocal: 0,
        matchLimitPct,
        // IL extras passed through (only used if dest is IL, harmless otherwise)
        erPensionPct,
        erSeverancePct,
        erKerenPct,
        includeSeveranceInSavings,
      };

      const cmp = runComparison({ source: sourcePayload, dest: destPayload });
      if (!cmp.dest || !cmp.source) continue;

      rows.push({
        key: destKey,
        loc: destLoc,
        country: destCountry,
        region: regionForLocation(destLoc),
        flag: flagForLocation(destLoc),
        cmp,
        // sort fields:
        city:       destLoc.name,
        grossLocal: cmp.dest.grossLocal,
        netUSD:     cmp.dest.netUSD,
        savingsUSD: cmp.dest.totalSavingsUSD,
        liquidUSD:  cmp.dest.liquidUSD,
        liquidDelta:cmp.liquidDeltaUSD,
        colDelta:   cmp.liquidDeltaCOLAdjustedUSD,
        effRate:    cmp.dest.effectiveTaxRate,
        sourceLiquidUSD: cmp.source.liquidUSD,
      });
    }
    return rows;
  }, [
    sourceKey, grossLocal, sourceGrossUSD, sourceLoc, grossMode,
    eePensionPct, eeOtherPct, rentLocal, miscBurnLocal,
    matchLimitPct, erPensionPct, erSeverancePct, erKerenPct, includeSeveranceInSavings,
  ]);

  // ── Filter + sort ──
  const filteredSorted = useMemo(() => {
    const q = search.trim().toLowerCase();
    let xs = destinations.filter((r) => activeRegions.has(r.region));
    if (q) xs = xs.filter((r) => r.city.toLowerCase().includes(q) || r.country.name.toLowerCase().includes(q));
    const dir = sortDir === 'asc' ? 1 : -1;
    xs = [...xs].sort((a, b) => {
      const va = a[sortKey];
      const vb = b[sortKey];
      if (typeof va === 'string' && typeof vb === 'string') return va.localeCompare(vb) * dir;
      return ((va ?? 0) - (vb ?? 0)) * dir;
    });
    return xs;
  }, [destinations, activeRegions, search, sortKey, sortDir]);

  // ── Top picks ──
  const topPicks = useMemo(() => {
    if (destinations.length === 0) return null;
    const byField = (field) => [...destinations].sort((a, b) => (b[field] ?? 0) - (a[field] ?? 0))[0];
    const bestLiquid = byField('liquidDelta');
    const bestCOL = byField('colDelta');
    // Best take-home %: dest.netUSD / dest.grossUSD
    const withTake = destinations.map((d) => {
      const grossUSD = d.cmp.dest.grossLocal * (FX_USD_PER_UNIT[d.cmp.dest.currency] ?? 1);
      return { d, take: grossUSD > 0 ? d.netUSD / grossUSD : 0 };
    }).sort((a, b) => b.take - a.take);
    const bestTake = withTake[0]?.d;
    return { bestLiquid, bestCOL, bestTake, bestTakePct: withTake[0]?.take ?? 0 };
  }, [destinations]);

  // ── Formatters ──
  // For display: "USD" mode → numbers in USD. "Source" mode → in source currency.
  const fmt = useCallback((usdAmount, { signed = false } = {}) => {
    if (currencyMode === 'usd') return formatUSD(usdAmount, { signed });
    // source currency
    if (usdAmount === 0 || usdAmount == null || Number.isNaN(usdAmount)) return signed ? '0' : '--';
    const local = usdAmount / sourceFx;
    const sign = local < 0 ? '-' : (signed ? '+' : '');
    const sym = sourceCountry.currency === 'USD' ? '$' :
      (sourceCountry.currency === 'ILS' ? '₪' :
        (sourceCountry.currency === 'GBP' ? '£' :
          (sourceCountry.currency === 'EUR' ? '€' : `${sourceCountry.currency} `)));
    return `${sign}${sym}${Math.abs(Math.round(local)).toLocaleString()}`;
  }, [currencyMode, sourceFx, sourceCountry]);

  // ── Header sort handler ──
  const handleSort = useCallback((key) => {
    setSortKey((prev) => {
      if (prev === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      // numeric default desc, string default asc.
      const col = COLUMNS.find((c) => c.key === key);
      setSortDir(col?.numeric ? 'desc' : 'asc');
      return key;
    });
  }, []);

  // ── Region chip toggle ──
  const toggleRegion = (r) => {
    setActiveRegions((prev) => {
      const next = new Set(prev);
      if (next.has(r)) next.delete(r); else next.add(r);
      // never empty — if user tries to clear all, restore all.
      if (next.size === 0) return new Set(REGIONS);
      return next;
    });
  };

  return (
    <div className={`min-h-screen p-3 sm:p-4 md:p-8 transition-colors duration-300 ${t.pageBg} ${t.rootText}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Top bar ── */}
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3 ${t.titleText}`}>
            <Sparkles className={t.titleAccent} size={28} strokeWidth={3} />
            <span>Destination Explorer</span>
            <span className={t.brandPill}>{t.name}</span>
          </h1>
          <div className="flex items-center gap-2">
            <ThemeSwitch theme={theme} setTheme={setTheme} t={t} />
            <CurrencyModeSwitch
              mode={currencyMode}
              setMode={setCurrencyMode}
              sourceCurrency={sourceCountry.currency}
              t={t}
            />
          </div>
        </header>

        {/* ── Source configuration ── */}
        <section className={t.sectionCard}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <label className={t.inputLabel}>Source country</label>
              <div className="relative mt-1.5">
                <select
                  className={t.selectBox}
                  value={sourceCountryCode}
                  onChange={(e) => setSourceCountry(e.target.value)}
                >
                  {Object.entries(COUNTRIES).map(([code, c]) => (
                    <option key={code} value={code}>
                      {COUNTRY_FLAG[code] ?? ''} {c.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className={t.inputLabel}>Source city</label>
              <div className="relative mt-1.5">
                <select
                  className={t.selectBox}
                  value={sourceKey}
                  onChange={(e) => setSourceKey(e.target.value)}
                >
                  {sourceCountry.locations.map((key) => (
                    <option key={key} value={key}>{MULTI_LOCATIONS[key].name}</option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            </div>
            <div className="md:col-span-3">
              <label className={t.inputLabel}>Annual gross ({sourceCountry.currency})</label>
              <input
                type="number"
                className={`${t.inputBox} mt-1.5`}
                value={grossLocal}
                step={1000}
                onChange={(e) => setGrossLocal(Number(e.target.value) || 0)}
              />
            </div>
            <div className="md:col-span-3">
              <label className={t.inputLabel}>Dest gross =</label>
              <div className="relative mt-1.5">
                <select
                  className={t.selectBox}
                  value={grossMode}
                  onChange={(e) => setGrossMode(e.target.value)}
                >
                  <option value="usd-nominal">Same nominal USD</option>
                  <option value="ppp-match">PPP-match (source COL ÷ dest COL)</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button
              className={`${t.btn} ${t.btnGhost} flex items-center gap-1.5`}
              onClick={() => setShowAdvanced((v) => !v)}
            >
              {showAdvanced ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              Advanced
            </button>
            <span className="text-[11px] text-slate-400 italic">
              Source gross ≈ {formatUSD(sourceGrossUSD)} USD ·
              {' '}{COUNTRY_FLAG[sourceCountryCode]} {sourceLoc.name}
            </span>
          </div>

          {showAdvanced && (
            <div className={t.advancedShell}>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                <NumInput t={t} label="EE Pension %"      value={eePensionPct}    onChange={setEePensionPct} step={0.5} />
                <NumInput t={t} label="EE Other %"        value={eeOtherPct}      onChange={setEeOtherPct} step={0.5}
                          tooltip="IL: Keren Hishtalmut. Other countries: ignored." />
                <NumInput t={t} label="ER Pension %"      value={erPensionPct}    onChange={setErPensionPct} step={0.5} />
                <NumInput t={t} label="ER Keren %"        value={erKerenPct}      onChange={setErKerenPct} step={0.5}
                          tooltip="IL only." />
                <NumInput t={t} label="ER Severance %"    value={erSeverancePct}  onChange={setErSeverancePct} step={0.5}
                          tooltip="IL only." />
                <NumInput t={t} label="US 401k Match %"   value={matchLimitPct}   onChange={setMatchLimitPct} step={0.5}
                          tooltip="Used for any US destination." />
                <NumInput t={t} label="Source rent (mo, local)" value={rentLocal} onChange={setRentLocal} step={100} />
                <NumInput t={t} label="Source misc burn (mo, local)" value={miscBurnLocal} onChange={setMiscBurnLocal} step={100} />
                <label className="flex items-center gap-2 text-xs text-slate-500 col-span-2 mt-2">
                  <input
                    type="checkbox"
                    checked={includeSeveranceInSavings}
                    onChange={(e) => setIncludeSeveranceInSavings(e.target.checked)}
                  />
                  Count IL severance as savings
                </label>
              </div>
            </div>
          )}
        </section>

        {/* ── Top picks ── */}
        {topPicks && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <PickCard
              t={t}
              icon={<Trophy size={16} />}
              title="Best raw liquid Δ"
              row={topPicks.bestLiquid}
              valueText={formatUSD(topPicks.bestLiquid.liquidDelta, { signed: true }) + '/yr'}
            />
            <PickCard
              t={t}
              icon={<TrendingUp size={16} />}
              title="Best COL-adj. liquid Δ"
              row={topPicks.bestCOL}
              valueText={formatUSD(topPicks.bestCOL.colDelta, { signed: true }) + '/yr'}
            />
            <PickCard
              t={t}
              icon={<Sparkles size={16} />}
              title="Best take-home %"
              row={topPicks.bestTake}
              valueText={(topPicks.bestTakePct * 100).toFixed(1) + '% net/gross'}
            />
          </section>
        )}

        {/* ── Filters ── */}
        <section className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <button
                key={r}
                onClick={() => toggleRegion(r)}
                className={`${t.chip} ${activeRegions.has(r) ? t.chipActive : t.chipInactive}`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="relative md:w-72">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              className={`${t.inputBox} pl-8`}
              placeholder="Search city or country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </section>

        {/* ── Grid ── */}
        <section className={t.grid}>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[900px]">
              <thead>
                <tr className={t.headRow}>
                  {COLUMNS.map((col) => (
                    <th
                      key={col.key}
                      className={`${t.headCell} ${col.align === 'right' ? 'text-right' : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.label}
                        {sortKey === col.key
                          ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />)
                          : <ArrowUpDown size={12} className="opacity-30" />}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredSorted.map((row) => (
                  <React.Fragment key={row.key}>
                    <tr
                      className={`${t.bodyRow} ${expandedKey === row.key ? t.bodyRowExpanded : ''}`}
                      onClick={() => setExpandedKey(expandedKey === row.key ? null : row.key)}
                    >
                      <td className={t.cell}>
                        <span className="inline-flex items-center gap-2">
                          {expandedKey === row.key ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          <span className="text-lg">{row.flag}</span>
                          <span>{row.city}</span>
                          <span className="text-slate-400 font-medium hidden sm:inline">· {row.country.name}</span>
                        </span>
                      </td>
                      <td className={`${t.cell} text-right`}>
                        {formatLocal(row.grossLocal, row.cmp.dest.currency)}
                      </td>
                      <td className={`${t.cell} text-right`}>{fmt(row.netUSD)}</td>
                      <td className={`${t.cell} text-right`}>{fmt(row.savingsUSD)}</td>
                      <td className={`${t.cell} text-right`}>{fmt(row.liquidUSD)}</td>
                      <td className={`${t.cell} text-right ${
                        row.liquidDelta > 0 ? t.deltaPos : (row.liquidDelta < 0 ? t.deltaNeg : t.deltaNeutral)
                      }`}>
                        {fmt(row.liquidDelta, { signed: true })}
                      </td>
                      <td className={`${t.cell} text-right ${
                        row.colDelta > 0 ? t.deltaPos : (row.colDelta < 0 ? t.deltaNeg : t.deltaNeutral)
                      }`}>
                        {fmt(row.colDelta, { signed: true })}
                      </td>
                      <td className={`${t.cell} text-right`}>{(row.effRate * 100).toFixed(1)}%</td>
                    </tr>
                    {expandedKey === row.key && (
                      <tr>
                        <td colSpan={COLUMNS.length} className="p-0">
                          <RowDetail t={t} row={row} fmt={fmt} sourceLabel={sourceLoc.name} sourceFlag={COUNTRY_FLAG[sourceLoc.country]} />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
                {filteredSorted.length === 0 && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="p-8 text-center text-slate-400 italic">
                      No destinations match those filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <footer className={`pt-4 pb-2 text-center text-[11px] ${t.footerText}`}>
          {filteredSorted.length} destination{filteredSorted.length === 1 ? '' : 's'} ·
          ranking estimates only · not financial advice ·
          <a href="/disclaimer.html" className="underline ml-1">disclaimer</a>
        </footer>
      </div>

      <a
        href="https://ko-fi.com/nickholden"
        target="_blank" rel="noopener noreferrer"
        aria-label="Buy me a coffee on Ko-fi"
        className={`fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold shadow-lg transition-transform hover:scale-110 ${t.kofiBtn}`}
      >
        <Coffee size={14} /> <span className="hidden sm:inline">Buy me a coffee</span>
      </a>
    </div>
  );
};

// ── Sub-components ──

const ThemeSwitch = ({ theme, setTheme, t }) => {
  const isLight = t.name === 'Sunrise';
  const activeCls = isLight ? 'bg-orange-500 text-white' : 'bg-indigo-500 text-white';
  const inactive = isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200';
  const btn = (id, icon, label) => (
    <button
      onClick={() => setTheme(id)}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${theme === id ? activeCls : inactive}`}
      aria-pressed={theme === id}
    >
      {icon} {label}
    </button>
  );
  return (
    <div className={`flex p-1 rounded-lg border ${t.switcherShell}`}>
      {btn('sunrise', <Sun size={14} />, 'Sunrise')}
      {btn('bento', <LayoutGrid size={14} />, 'Bento')}
    </div>
  );
};

const CurrencyModeSwitch = ({ mode, setMode, sourceCurrency, t }) => {
  const isLight = t.name === 'Sunrise';
  const activeCls = isLight ? 'bg-orange-500 text-white' : 'bg-indigo-500 text-white';
  const inactive = isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-400 hover:text-slate-200';
  const btn = (id, label) => (
    <button
      onClick={() => setMode(id)}
      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${mode === id ? activeCls : inactive}`}
      aria-pressed={mode === id}
    >
      {label}
    </button>
  );
  return (
    <div className={`flex p-1 rounded-lg border ${t.switcherShell}`}>
      {btn('usd', '$ USD')}
      {btn('source', sourceCurrency)}
    </div>
  );
};

const NumInput = ({ t, label, value, onChange, step = 1, tooltip }) => (
  <div>
    <div className="flex items-center gap-1 mb-1.5">
      <label className={t.inputLabel}>{label}</label>
      {tooltip && (
        <span className="relative group">
          <HelpCircle size={11} className="opacity-50 cursor-help" />
          <span className="absolute z-50 bottom-full left-0 mb-1 hidden group-hover:block w-44 p-2 bg-slate-800 text-white text-[10px] rounded shadow normal-case">{tooltip}</span>
        </span>
      )}
    </div>
    <input
      type="number"
      className={t.inputBox}
      value={value}
      step={step}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
    />
  </div>
);

const PickCard = ({ t, icon, title, row, valueText }) => (
  <div className={t.pickCard}>
    <div className={`flex items-center gap-1.5 ${t.pickLabel}`}>{icon} {title}</div>
    <div className="flex items-center gap-2 mt-1">
      <span className={t.pickFlag}>{row.flag}</span>
      <div>
        <div className={t.pickCity}>{row.city}, {row.country.name}</div>
        <div className={t.pickValue}>{valueText}</div>
      </div>
    </div>
  </div>
);

const RowDetail = ({ t, row, fmt, sourceLabel, sourceFlag }) => {
  const d = row.cmp.dest;
  const s = row.cmp.source;
  const grossUSD = d.grossLocal * (FX_USD_PER_UNIT[d.currency] ?? 1);
  return (
    <div className={t.detailBox}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat t={t} label="Gross (local)"     value={formatLocal(d.grossLocal, d.currency)} />
        <Stat t={t} label="Gross (USD)"       value={formatUSD(grossUSD)} />
        <Stat t={t} label="Income tax"        value={formatLocal(d.incomeTax, d.currency)} />
        <Stat t={t} label="Social security"   value={formatLocal(d.socialSec, d.currency)} />
        <Stat t={t} label="Local/state tax"   value={formatLocal(d.localTax, d.currency)} />
        <Stat t={t} label="EE pension/401k"   value={formatLocal(d.eePensionLocal, d.currency)} />
        <Stat t={t} label="ER contributions"  value={formatLocal(d.erContributions, d.currency)} />
        <Stat t={t} label="Effective tax %"   value={`${(d.effectiveTaxRate * 100).toFixed(1)}%`} />
        <Stat t={t} label="Net take-home"     value={fmt(d.netUSD)} />
        <Stat t={t} label="Total savings"     value={fmt(d.totalSavingsUSD)} />
        <Stat t={t} label="Liquid (after rent+burn)" value={fmt(d.liquidUSD)} />
        <Stat t={t} label="Δ vs source liquid"
              value={fmt(row.liquidDelta, { signed: true })}
              valueClass={row.liquidDelta >= 0 ? t.deltaPos : t.deltaNeg} />
      </div>
      <div className="mt-4 pt-4 border-t border-slate-200/40 flex flex-wrap gap-x-6 gap-y-1 text-[11px] text-slate-500">
        <span>Source: {sourceFlag} {sourceLabel} · liquid {fmt(s.liquidUSD)}/yr · net {fmt(s.netUSD)}/yr</span>
        <span>COL index: {row.loc.colIndex ?? '—'} (source: {MULTI_LOCATIONS[row.cmp.source.locationKey ?? '']?.colIndex ?? '—'})</span>
        {row.cmp.warnings?.length > 0 && (
          <span className="text-amber-600 font-bold">⚠ {row.cmp.warnings.join(' · ')}</span>
        )}
      </div>
    </div>
  );
};

const Stat = ({ t, label, value, valueClass }) => (
  <div>
    <div className={t.detailLabel}>{label}</div>
    <div className={`${t.detailValue} ${valueClass ?? ''}`}>{value}</div>
  </div>
);

export default App;
