import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import {
  ShieldCheck,
  Target,
  HelpCircle,
  LayoutGrid,
  Sun,
  Coffee,
  ArrowLeftRight,
} from 'lucide-react';
import { runComparison } from './calc';
import { LOCATIONS, COUNTRIES } from './countries.js';
import { FX_USD_PER_UNIT } from './fx.js';
import ComparePanel from './components/ComparePanel.jsx';
import CompareSummary from './components/CompareSummary.jsx';
import UnifiedBreakdown from './components/UnifiedBreakdown.jsx';
import { pickDisplayCurrency } from './components/formatCurrency.js';

const SOURCE_KEY_STORAGE = 'relocation-calc:sourceKey';
const DEST_KEY_STORAGE = 'relocation-calc:destKey';
const DISPLAY_MODE_STORAGE = 'relocation-calc:displayMode'; // 'source' | 'dest' | 'USD'
const THEME_STORAGE = 'relocation-calc:theme';

const THEMES = {
  sunrise: {
    name: 'Sunrise',
    pageBg: 'bg-slate-100',
    rootText: 'text-slate-800',
    switcherShell: 'bg-slate-200/50 border-slate-300/50',
    footerText: 'text-slate-400',
    kofiBtn: 'bg-orange-500 text-white shadow-orange-500/30 hover:bg-orange-600',

    headerBorder: 'border-b border-orange-200/50 pb-6',
    h1Text: 'text-xl sm:text-2xl font-black flex flex-wrap items-center gap-2 text-slate-900',
    h1Icon: <Sun className="text-orange-500 flex-shrink-0" strokeWidth={3} />,
    brandPill: 'text-xs bg-orange-100/80 text-orange-600 px-2 py-1 rounded-full border border-orange-200/50',
    subTitle: 'text-slate-500 text-xs sm:text-sm mt-1 uppercase tracking-widest font-bold',

    kpiPositive: 'bg-emerald-50/50 border-emerald-200/80',
    kpiNegative: 'bg-rose-50/50 border-rose-200/80',
    kpiAccent: 'bg-orange-50/50 border-orange-200/80',
    kpiCardBase: 'p-4 sm:p-6 rounded-3xl border shadow-sm',
    kpiLabel: 'flex justify-between items-center mb-2 text-[10px] uppercase font-black text-slate-500',
    kpiValuePositive: 'text-emerald-600',
    kpiValueNegative: 'text-rose-600',
    kpiValueAccent: 'text-orange-600',
    kpiTrendIcon: 'text-orange-500',

    sectionCard: 'bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm',
    sourceHeading: 'text-orange-600 text-xs font-black uppercase flex items-center gap-2 mb-4',
    destHeading: 'text-blue-600 text-xs font-black uppercase flex items-center gap-2 mb-4',

    inputLabel: 'text-[10px] text-slate-400 uppercase font-black tracking-widest block',
    inputBox: 'bg-white/60 border border-slate-200/80 rounded-xl px-4 py-3 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 w-full text-sm font-bold transition-all',
    inputDisabled: 'opacity-60 bg-slate-200/50 cursor-not-allowed',
    tooltipIcon: 'text-slate-400 cursor-help hover:text-orange-500 transition-colors',
    tooltipBox: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl z-50 normal-case tracking-normal',
    tooltipArrow: 'absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800',

    severanceBox: 'flex items-start gap-2 text-[11px] text-slate-600 font-medium leading-snug cursor-pointer p-2 bg-white/40 border border-slate-200/60 rounded-lg hover:bg-white/70 transition-colors',
    severanceCheck: 'mt-0.5 accent-orange-500',
    severanceSub: 'block text-slate-500 font-normal',

    tableShell: 'bg-slate-50 border border-slate-200/80 rounded-3xl overflow-x-auto shadow-sm',
    tableHead: 'bg-slate-100/60 text-slate-500 uppercase font-black text-[10px] sm:text-xs border-b border-slate-200/80',
    tableDivide: 'divide-y divide-slate-200/40',
    bankRow: 'bg-orange-50/50 border-t-2 border-orange-200/80 cursor-pointer hover:bg-orange-100/50 transition-colors',
    bankRowLabel: 'p-3 pl-4 sm:p-5 sm:pl-6 font-black text-orange-800 uppercase text-[10px] sm:text-xs tracking-widest',
    bankRowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-orange-700',
    bankRowSource: 'p-3 sm:p-5 text-slate-500 font-bold',
    bankRowDest: 'p-3 sm:p-5 text-orange-600 font-black',
    bankDeltaPos: 'text-emerald-600',
    bankDeltaNeg: 'text-rose-600',
    netRow: 'bg-slate-100/70',
    netRowLabel: 'p-3 pl-4 sm:p-4 sm:pl-6 text-sm font-semibold text-slate-700',
    netRowSource: 'p-3 sm:p-4 text-sm font-semibold text-slate-600',
    netRowDest: 'p-3 sm:p-4 text-sm font-semibold text-slate-800',
    savingsRow: 'bg-indigo-50/60 border-t-2 border-indigo-200/80 cursor-pointer hover:bg-indigo-100/50 transition-colors',
    savingsRowLabel: 'p-3 pl-4 sm:p-5 sm:pl-6 font-black text-indigo-800 uppercase text-[10px] sm:text-xs tracking-widest',
    savingsRowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-indigo-700',
    savingsRowSource: 'p-3 sm:p-5 text-slate-500 font-bold',
    savingsRowDest: 'p-3 sm:p-5 text-indigo-700 font-black',
    savingsDeltaPos: 'text-indigo-600',
    savingsDeltaNeg: 'text-rose-600',
    sectionRowBg: 'bg-slate-100/50',
    rowHoverExpandable: 'hover:bg-slate-200/50',
    rowHover: 'hover:bg-slate-100/40',
    rowSectionLabel: 'uppercase tracking-widest text-[10px] font-black text-slate-700',
    rowSubLabel: 'text-xs text-slate-500 font-medium',
    rowLeafLabel: 'text-sm text-slate-700 font-bold',
    rowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-slate-400',
    rowSectionSource: 'text-sm font-bold text-slate-600',
    rowSectionDest: 'text-sm font-black text-slate-900',
    rowSubSourceBase: 'text-xs font-medium text-slate-400',
    rowSubDestBase: 'text-xs font-semibold text-slate-600',
    rowLeafSourceExpense: 'text-sm font-medium text-slate-400',
    rowLeafSourceIncome: 'text-sm font-medium text-slate-500',
    rowLeafDestExpense: 'text-sm font-bold text-slate-600',
    rowLeafDestIncome: 'text-sm font-bold text-slate-800',
    deltaPos: 'text-emerald-600',
    deltaNeg: 'text-rose-500',
    deltaNeutral: 'text-slate-400',

    lockedHint: 'flex items-start gap-3 bg-slate-50/80 border border-slate-200/60 rounded-2xl px-4 py-3 shadow-sm',
    lockedHintIcon: 'text-orange-500',
    lockedHintText: 'text-xs text-slate-600 font-medium leading-relaxed',
    lockedHintHighlight: 'text-orange-600 font-bold',

    swapBtn: 'inline-flex items-center justify-center w-12 h-12 rounded-full bg-orange-500 text-white shadow-lg shadow-orange-500/30 hover:bg-orange-600 hover:scale-110 transition-all',
  },
  bento: {
    name: 'Bento Grid',
    pageBg: 'bg-[#0B0F19]',
    rootText: 'text-slate-200',
    switcherShell: 'bg-white/5 border-white/10',
    footerText: 'text-slate-600',
    kofiBtn: 'bg-indigo-500 text-white shadow-indigo-500/30 hover:bg-indigo-600',

    headerBorder: 'border-b border-white/10 pb-6',
    h1Text: 'text-xl sm:text-2xl font-black flex flex-wrap items-center gap-2 text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter',
    h1Icon: <Sun className="text-indigo-400 flex-shrink-0" strokeWidth={3} />,
    brandPill: 'text-xs bg-indigo-500/10 text-indigo-300 px-2 py-1 rounded-full border border-indigo-500/30',
    subTitle: 'text-slate-400 text-xs sm:text-sm mt-1 uppercase tracking-widest font-bold',

    kpiPositive: 'bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border-white/5 relative overflow-hidden',
    kpiNegative: 'bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border-rose-500/20 relative overflow-hidden',
    kpiAccent: 'bg-gradient-to-br from-indigo-900/40 to-[#0F131D] border-indigo-500/20 relative overflow-hidden',
    kpiCardBase: 'p-5 sm:p-8 rounded-[2rem] border shadow-2xl',
    kpiLabel: 'flex justify-between items-center mb-2 text-[10px] uppercase font-black text-slate-500',
    kpiValuePositive: 'text-white',
    kpiValueNegative: 'text-rose-400',
    kpiValueAccent: 'text-white',
    kpiTrendIcon: 'text-indigo-400',

    sectionCard: 'bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border border-white/5 rounded-[2rem] p-5 sm:p-8 shadow-2xl',
    sourceHeading: 'text-indigo-300 text-xs font-black uppercase flex items-center gap-2 mb-4',
    destHeading: 'text-cyan-300 text-xs font-black uppercase flex items-center gap-2 mb-4',

    inputLabel: 'text-[10px] text-slate-500 uppercase font-black tracking-widest block',
    inputBox: 'bg-black/20 border border-white/5 rounded-xl px-4 py-3 focus:border-indigo-500 focus:bg-white/5 outline-none text-white w-full text-sm font-bold transition-all',
    inputDisabled: 'opacity-60 bg-black/40 cursor-not-allowed',
    tooltipIcon: 'text-slate-500 cursor-help hover:text-indigo-400 transition-colors',
    tooltipBox: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2.5 bg-slate-900 border border-white/10 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl z-50 normal-case tracking-normal',
    tooltipArrow: 'absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900',

    severanceBox: 'flex items-start gap-2 text-[11px] text-slate-300 font-medium leading-snug cursor-pointer p-2 bg-black/20 border border-white/5 rounded-lg hover:bg-black/30 transition-colors',
    severanceCheck: 'mt-0.5 accent-indigo-500',
    severanceSub: 'block text-slate-500 font-normal',

    tableShell: 'bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-x-auto shadow-2xl',
    tableHead: 'bg-white/[0.03] text-slate-500 uppercase font-black text-[10px] sm:text-xs border-b border-white/5',
    tableDivide: 'divide-y divide-white/5',
    bankRow: 'bg-yellow-400/5 border-t-2 border-yellow-400/30 cursor-pointer hover:bg-yellow-400/10 transition-colors',
    bankRowLabel: 'p-3 pl-4 sm:p-5 sm:pl-6 font-black text-yellow-300 uppercase text-[10px] sm:text-xs tracking-widest',
    bankRowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-yellow-400',
    bankRowSource: 'p-3 sm:p-5 text-slate-500 font-bold',
    bankRowDest: 'p-3 sm:p-5 text-yellow-300 font-black',
    bankDeltaPos: 'text-emerald-400',
    bankDeltaNeg: 'text-rose-400',
    netRow: 'bg-white/[0.03]',
    netRowLabel: 'p-3 pl-4 sm:p-4 sm:pl-6 text-sm font-semibold text-slate-300',
    netRowSource: 'p-3 sm:p-4 text-sm font-semibold text-slate-400',
    netRowDest: 'p-3 sm:p-4 text-sm font-semibold text-slate-200',
    savingsRow: 'bg-indigo-500/10 border-t-2 border-indigo-500/30 cursor-pointer hover:bg-indigo-500/15 transition-colors',
    savingsRowLabel: 'p-3 pl-4 sm:p-5 sm:pl-6 font-black text-indigo-200 uppercase text-[10px] sm:text-xs tracking-widest',
    savingsRowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-indigo-300',
    savingsRowSource: 'p-3 sm:p-5 text-slate-500 font-bold',
    savingsRowDest: 'p-3 sm:p-5 text-indigo-300 font-black',
    savingsDeltaPos: 'text-indigo-400',
    savingsDeltaNeg: 'text-rose-400',
    sectionRowBg: 'bg-white/[0.04]',
    rowHoverExpandable: 'hover:bg-white/[0.04]',
    rowHover: 'hover:bg-white/[0.02]',
    rowSectionLabel: 'uppercase tracking-widest text-[10px] font-black text-slate-300',
    rowSubLabel: 'text-xs text-slate-500 font-medium',
    rowLeafLabel: 'text-sm text-slate-300 font-bold',
    rowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-slate-500',
    rowSectionSource: 'text-sm font-bold text-slate-400',
    rowSectionDest: 'text-sm font-black text-white',
    rowSubSourceBase: 'text-xs font-medium text-slate-500',
    rowSubDestBase: 'text-xs font-semibold text-slate-400',
    rowLeafSourceExpense: 'text-sm font-medium text-slate-500',
    rowLeafSourceIncome: 'text-sm font-medium text-slate-400',
    rowLeafDestExpense: 'text-sm font-bold text-slate-400',
    rowLeafDestIncome: 'text-sm font-bold text-slate-200',
    deltaPos: 'text-emerald-400',
    deltaNeg: 'text-rose-400',
    deltaNeutral: 'text-slate-500',

    lockedHint: 'flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 shadow-2xl',
    lockedHintIcon: 'text-indigo-400',
    lockedHintText: 'text-xs text-slate-300 font-medium leading-relaxed',
    lockedHintHighlight: 'text-indigo-300 font-bold',

    swapBtn: 'inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-600 hover:scale-110 transition-all',
  },
};

// Build a default payload for a given location key.
function buildDefaultPayload(locationKey, overrides = {}) {
  const loc = LOCATIONS[locationKey];
  const country = loc?.country;
  const base = {
    countryCode: country,
    locationKey,
    grossLocal: 0,
    eePensionPct: 0,
    eeOtherPct: 0,
    matchLimitPct: 0,
    rentLocal: loc?.defaultRent ?? 0,
    miscBurnLocal: 0,
  };
  if (country === 'IL') {
    return {
      ...base,
      grossLocal: 384000,
      eePensionPct: 6,
      eeOtherPct: 2.5,
      erPensionPct: 6.5,
      erSeverancePct: 8.33,
      erKerenPct: 7.5,
      includeSeveranceInSavings: true,
      creditPoints: 2.25,
      miscBurnLocal: 9000,
      ...overrides,
    };
  }
  if (country === 'US') {
    return {
      ...base,
      grossLocal: 200000,
      eePensionPct: 6,
      matchLimitPct: 6,
      miscBurnLocal: 900,
      ...overrides,
    };
  }
  // Generic
  return {
    ...base,
    grossLocal: 80000,
    eePensionPct: 5,
    miscBurnLocal: 1000,
    ...overrides,
  };
}

const App = () => {
  const [activeLayout, setActiveLayout] = useState(() => {
    if (typeof window === 'undefined') return 'sunrise';
    const stored = window.localStorage.getItem(THEME_STORAGE);
    return stored === 'bento' ? 'bento' : 'sunrise';
  });

  const [sourcePayload, setSourcePayload] = useState(() => {
    const stored = (typeof window !== 'undefined') ? window.localStorage.getItem(SOURCE_KEY_STORAGE) : null;
    const key = (stored && LOCATIONS[stored]) ? stored : 'IL-TLV';
    return buildDefaultPayload(key);
  });
  const [destPayload, setDestPayload] = useState(() => {
    const stored = (typeof window !== 'undefined') ? window.localStorage.getItem(DEST_KEY_STORAGE) : null;
    const key = (stored && LOCATIONS[stored]) ? stored : 'US-NYC';
    return buildDefaultPayload(key);
  });
  const [displayMode, setDisplayMode] = useState(() => {
    if (typeof window === 'undefined') return 'USD';
    const stored = window.localStorage.getItem(DISPLAY_MODE_STORAGE);
    return ['source', 'dest', 'USD'].includes(stored) ? stored : 'USD';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(SOURCE_KEY_STORAGE, sourcePayload.locationKey || '');
    }
  }, [sourcePayload.locationKey]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DEST_KEY_STORAGE, destPayload.locationKey || '');
    }
  }, [destPayload.locationKey]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISPLAY_MODE_STORAGE, displayMode);
    }
  }, [displayMode]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(THEME_STORAGE, activeLayout);
    }
  }, [activeLayout]);

  // Coerce numeric fields before passing to engine.
  const coerce = useCallback((p) => {
    const out = { ...p };
    for (const k of ['grossLocal', 'eePensionPct', 'eeOtherPct', 'matchLimitPct', 'rentLocal', 'miscBurnLocal',
                     'erPensionPct', 'erSeverancePct', 'erKerenPct', 'creditPoints', 'imputedBenefits']) {
      if (out[k] !== undefined && out[k] !== null && out[k] !== '') {
        const n = Number(out[k]);
        out[k] = Number.isFinite(n) ? n : 0;
      }
    }
    return out;
  }, []);

  const comparison = useMemo(() => runComparison({
    source: coerce(sourcePayload),
    dest: coerce(destPayload),
  }), [sourcePayload, destPayload, coerce]);

  const sourceCurrency = COUNTRIES[sourcePayload.countryCode]?.currency || 'USD';
  const destCurrency = COUNTRIES[destPayload.countryCode]?.currency || 'USD';
  const displayCurrency = pickDisplayCurrency(displayMode, sourceCurrency, destCurrency);

  const swap = () => {
    setSourcePayload(destPayload);
    setDestPayload(sourcePayload);
  };

  const theme = THEMES[activeLayout];

  // Coffee giggle
  const [giggling, setGiggling] = useState(false);
  const giggledRef = useRef(false);
  useEffect(() => {
    const onScroll = () => {
      if (giggledRef.current) return;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      if (window.scrollY / max >= 0.75) {
        giggledRef.current = true;
        setGiggling(true);
        window.removeEventListener('scroll', onScroll);
        setTimeout(() => setGiggling(false), 900);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const link = document.querySelector('link[rel="icon"]');
    if (link) link.href = activeLayout === 'bento' ? '/favicon-bento.svg' : '/favicon.svg';
  }, [activeLayout]);

  return (
    <div className={`min-h-screen p-3 sm:p-4 md:p-8 transition-colors duration-300 ${theme.pageBg}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className={`flex p-1 rounded-lg border ${theme.switcherShell}`}>
            <LayoutButton icon={<Sun size={16}/>} label="Sunrise" id="sunrise" active={activeLayout} set={setActiveLayout} />
            <LayoutButton icon={<LayoutGrid size={16}/>} label="Bento Grid" id="bento" active={activeLayout} set={setActiveLayout} />
          </div>
        </div>

        <div className={`space-y-6 animate-in fade-in duration-500 ${theme.rootText}`}>
          <header className={`${theme.headerBorder} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
            <div className="min-w-0">
              <h1 className={theme.h1Text}>
                {theme.h1Icon}
                <span>RELOCATION ARCHITECT</span>
                <span className={theme.brandPill}>{theme.name}</span>
              </h1>
              <p className={theme.subTitle}>Compare Two — Multi-Country</p>
            </div>
            <CurrencyToggle
              theme={theme}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              sourceCurrency={sourceCurrency}
              destCurrency={destCurrency}
            />
          </header>

          {/* Two side-by-side panels with swap in middle */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-4 md:gap-2 items-start">
            <ComparePanel
              theme={theme}
              side="source"
              payload={sourcePayload}
              setPayload={setSourcePayload}
              result={comparison.source}
              displayCurrency={displayCurrency}
              headingClass={theme.sourceHeading}
              headingLabel="Source"
              headingIcon={<ShieldCheck size={16} />}
            />
            <div className="flex md:flex-col items-center justify-center gap-2 py-4 md:py-12">
              <button
                type="button"
                onClick={swap}
                className={theme.swapBtn}
                aria-label="Swap source and destination"
                title="Swap"
              >
                <ArrowLeftRight size={20} />
              </button>
              <span className="text-[10px] uppercase font-black tracking-widest opacity-50">Swap</span>
            </div>
            <ComparePanel
              theme={theme}
              side="dest"
              payload={destPayload}
              setPayload={setDestPayload}
              result={comparison.dest}
              displayCurrency={displayCurrency}
              headingClass={theme.destHeading}
              headingLabel="Destination"
              headingIcon={<Target size={16} />}
            />
          </div>

          <CompareSummary
            theme={theme}
            comparison={comparison}
            displayCurrency={displayCurrency}
            sourceCurrency={sourceCurrency}
            destCurrency={destCurrency}
          />

          <UnifiedBreakdown
            theme={theme}
            comparison={comparison}
            displayCurrency={displayCurrency}
          />

          <FXFooter theme={theme} sourceCurrency={sourceCurrency} destCurrency={destCurrency} />
        </div>

        <footer className={`pt-8 pb-4 text-center space-y-2 ${theme.footerText}`}>
          <div className="text-[11px] max-w-2xl mx-auto leading-relaxed">
            Estimates only. Not tax, legal, or financial advice. See{' '}
            <a href="/disclaimer.html" className="underline hover:text-orange-500">disclaimer</a>
            {' · '}
            <a href="/privacy.html" className="underline hover:text-orange-500">privacy</a>
            .
          </div>
          <a
            href={`https://github.com/nickohold/relocation-calc/commit/${__APP_SHA__}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono tracking-widest uppercase hover:underline"
          >
            {__APP_VERSION__} · {__APP_SHA__} · {__APP_BUILD_DATE__}
          </a>
        </footer>
      </div>
      <a
        href="https://ko-fi.com/nickholden"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Buy me a coffee on Ko-fi"
        className={`fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold shadow-lg transition-transform hover:scale-110 ${giggling ? 'animate-giggle' : ''} ${theme.kofiBtn}`}
      >
        <Coffee size={14} /> <span className="hidden sm:inline">Buy me a coffee</span>
      </a>
    </div>
  );
};

const LayoutButton = ({ icon, label, id, active, set }) => {
  const isLight = active === 'sunrise';
  const isActive = active === id;
  let baseClass = "flex items-center gap-2 px-4 py-2 rounded-md text-xs font-bold transition-all ";
  if (isActive) {
    if (id === 'sunrise') baseClass += "bg-orange-500 text-white shadow-md shadow-orange-500/20";
    else baseClass += "bg-blue-500 text-white shadow-lg";
  } else {
    if (isLight) baseClass += "text-slate-500 hover:text-slate-800 hover:bg-orange-100/50";
    else baseClass += "text-slate-500 hover:text-slate-300 hover:bg-white/5";
  }
  return <button onClick={() => set(id)} className={baseClass}>{icon} {label}</button>;
};

const CurrencyToggle = ({ theme, displayMode, setDisplayMode, sourceCurrency, destCurrency }) => {
  const isLight = theme.name === 'Sunrise';
  const activeCls = isLight
    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20'
    : 'bg-indigo-500 text-white shadow';
  const inactiveCls = isLight
    ? 'text-slate-500 hover:text-slate-800'
    : 'text-slate-500 hover:text-slate-300';
  const shellCls = isLight
    ? 'bg-slate-200/50 border border-slate-300/50'
    : 'bg-white/5 border border-white/10';
  const captionCls = isLight ? 'text-slate-400' : 'text-slate-500';

  const btn = (id, label) => (
    <button
      onClick={() => setDisplayMode(id)}
      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
        displayMode === id ? activeCls : inactiveCls
      }`}
      aria-pressed={displayMode === id}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-start md:items-end gap-1">
      <div className="flex items-center gap-1.5">
        <div className={`flex p-1 rounded-lg ${shellCls}`}>
          {btn('source', `Source (${sourceCurrency})`)}
          {btn('dest', `Dest (${destCurrency})`)}
          {btn('USD', '$ USD')}
        </div>
        <div className="relative group inline-block">
          <HelpCircle size={12} className={theme.tooltipIcon} />
          <div className={theme.tooltipBox}>
            All numbers are converted via flat FX rate. Cost-of-living differences are NOT reflected in the toggle — see the COL-adjusted delta below for that.
            <div className={theme.tooltipArrow}></div>
          </div>
        </div>
      </div>
      <span className={`text-[10px] uppercase tracking-widest font-bold ${captionCls}`}>Display currency</span>
    </div>
  );
};

const FXFooter = ({ theme, sourceCurrency, destCurrency }) => {
  const rates = [...new Set(['USD', sourceCurrency, destCurrency])]
    .filter((c) => c !== 'USD' && FX_USD_PER_UNIT[c]);
  return (
    <div className={`text-[10px] uppercase tracking-widest font-bold opacity-60 ${theme.footerText} flex flex-wrap gap-3 justify-center`}>
      <span>FX as of May 2026</span>
      {rates.map((c) => (
        <span key={c}>1 {c} = ${FX_USD_PER_UNIT[c].toFixed(4)} USD</span>
      ))}
    </div>
  );
};

export default App;
