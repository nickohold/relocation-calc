import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  TrendingUp,
  ShieldCheck,
  Wallet,
  Zap,
  Target,
  Lock,
  HelpCircle,
  LayoutGrid,
  Sun,
  ChevronDown,
  ChevronRight,
  Coffee,
} from 'lucide-react';
import { runEngine, LOCATIONS, CONSTANTS } from './calc';
import { formatMoney } from './formatMoney';

const CURRENCY_STORAGE_KEY = 'relocation-calc:displayCurrency';

const LOCATION_ENTRIES = Object.entries(LOCATIONS);

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

    totalPillCard: 'bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-2xl text-left md:text-right shadow-sm w-full md:w-auto',
    totalPillLabel: 'text-[10px] text-slate-400 uppercase font-black block mb-1',
    totalPillValue: 'text-xl sm:text-2xl font-black text-orange-500 flex items-center md:justify-end gap-2',
    totalPillSuffix: 'text-xs font-bold text-slate-400',

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
    ilHeading: 'text-orange-600 text-xs font-black uppercase flex items-center gap-2 mb-4',
    usHeading: 'text-blue-600 text-xs font-black uppercase flex items-center gap-2 mb-4',
    locTabBar: 'flex gap-2 p-1 bg-slate-200/50 rounded-xl overflow-x-auto no-scrollbar',
    locTabActive: 'bg-white text-blue-600 shadow-sm border border-slate-200/50',
    locTabInactive: 'text-slate-500 hover:text-slate-700',

    inputLabel: 'text-[10px] text-slate-400 uppercase font-black tracking-widest block',
    inputBox: 'bg-white/60 border border-slate-200/80 rounded-xl px-4 py-3 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 w-full text-sm font-bold transition-all',
    inputDisabled: 'opacity-60 bg-slate-200/50 cursor-not-allowed',
    tooltipIcon: 'text-slate-400 cursor-help hover:text-orange-500 transition-colors',
    tooltipBox: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl z-50 normal-case tracking-normal',
    tooltipArrow: 'absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800',

    severanceBox: 'flex items-start gap-2 text-[11px] text-slate-600 font-medium leading-snug cursor-pointer mt-2 p-2 bg-white/40 border border-slate-200/60 rounded-lg hover:bg-white/70 transition-colors',
    severanceCheck: 'mt-0.5 accent-orange-500',
    severanceSub: 'block text-slate-500 font-normal',

    tableShell: 'bg-slate-50 border border-slate-200/80 rounded-3xl overflow-x-auto shadow-sm',
    tableHead: 'bg-slate-100/60 text-slate-500 uppercase font-black text-[10px] sm:text-xs border-b border-slate-200/80',
    tableDivide: 'divide-y divide-slate-200/40',

    bankRow: 'bg-orange-50/50 border-t-2 border-orange-200/80 cursor-pointer hover:bg-orange-100/50 transition-colors',
    bankRowLabel: 'p-3 pl-4 sm:p-5 sm:pl-6 font-black text-orange-800 uppercase text-[10px] sm:text-xs tracking-widest',
    bankRowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-orange-700',
    bankRowIL: 'p-3 sm:p-5 text-slate-500 font-bold',
    bankRowUS: 'p-3 sm:p-5 text-orange-600 font-black',
    bankDeltaPos: 'text-emerald-600',
    bankDeltaNeg: 'text-rose-600',

    netRow: 'bg-slate-100/70',
    netRowLabel: 'p-3 pl-4 sm:p-4 sm:pl-6 text-sm font-semibold text-slate-700',
    netRowIL: 'p-3 sm:p-4 text-sm font-semibold text-slate-600',
    netRowUS: 'p-3 sm:p-4 text-sm font-semibold text-slate-800',

    savingsRow: 'bg-indigo-50/60 border-t-2 border-indigo-200/80 cursor-pointer hover:bg-indigo-100/50 transition-colors',
    savingsRowLabel: 'p-3 pl-4 sm:p-5 sm:pl-6 font-black text-indigo-800 uppercase text-[10px] sm:text-xs tracking-widest',
    savingsRowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-indigo-700',
    savingsRowIL: 'p-3 sm:p-5 text-slate-500 font-bold',
    savingsRowUS: 'p-3 sm:p-5 text-indigo-700 font-black',
    savingsDeltaPos: 'text-indigo-600',
    savingsDeltaNeg: 'text-rose-600',

    sectionRowBg: 'bg-slate-100/50',
    rowHoverExpandable: 'hover:bg-slate-200/50',
    rowHover: 'hover:bg-slate-100/40',
    rowSectionLabel: 'uppercase tracking-widest text-[10px] font-black text-slate-700',
    rowSubLabel: 'text-xs text-slate-500 font-medium',
    rowLeafLabel: 'text-sm text-slate-700 font-bold',
    rowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-slate-400',
    rowSectionIL: 'text-sm font-bold text-slate-600',
    rowSectionUS: 'text-sm font-black text-slate-900',
    rowSubILBase: 'text-xs font-medium text-slate-400',
    rowSubUSBase: 'text-xs font-semibold text-slate-600',
    rowLeafILExpense: 'text-sm font-medium text-slate-400',
    rowLeafILIncome: 'text-sm font-medium text-slate-500',
    rowLeafUSExpense: 'text-sm font-bold text-slate-600',
    rowLeafUSIncome: 'text-sm font-bold text-slate-800',
    deltaPos: 'text-emerald-600',
    deltaNeg: 'text-rose-500',
    deltaNeutral: 'text-slate-400',

    lockedHint: 'flex items-start gap-3 bg-slate-50/80 border border-slate-200/60 rounded-2xl px-4 py-3 shadow-sm',
    lockedHintIcon: 'text-orange-500',
    lockedHintText: 'text-xs text-slate-600 font-medium leading-relaxed',
    lockedHintHighlight: 'text-orange-600 font-bold',

    wealthGapShell: 'bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 sm:p-6 shadow-sm',
    wealthGapIcon: 'bg-rose-200 p-2.5 sm:p-3 rounded-2xl text-rose-700 flex-shrink-0',
    wealthGapTitle: 'text-sm font-black uppercase text-rose-800 mb-1',
    wealthGapText: 'text-xs text-rose-700 font-medium leading-relaxed',
    wealthGapPrefix: '⚠ ',
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

    totalPillCard: 'bg-white/5 border border-white/10 p-3 sm:p-4 rounded-2xl text-left md:text-right shadow-2xl backdrop-blur-xl w-full md:w-auto',
    totalPillLabel: 'text-[10px] text-slate-400 uppercase font-black block mb-1',
    totalPillValue: 'text-xl sm:text-2xl font-black text-white flex items-center md:justify-end gap-2',
    totalPillSuffix: 'text-xs font-bold text-slate-500',

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
    ilHeading: 'text-indigo-300 text-xs font-black uppercase flex items-center gap-2 mb-4',
    usHeading: 'text-cyan-300 text-xs font-black uppercase flex items-center gap-2 mb-4',
    locTabBar: 'flex gap-2 p-1 bg-black/20 rounded-xl overflow-x-auto no-scrollbar',
    locTabActive: 'bg-white/10 text-white shadow',
    locTabInactive: 'text-slate-500 hover:text-slate-300',

    inputLabel: 'text-[10px] text-slate-500 uppercase font-black tracking-widest block',
    inputBox: 'bg-black/20 border border-white/5 rounded-xl px-4 py-3 focus:border-indigo-500 focus:bg-white/5 outline-none text-white w-full text-sm font-bold transition-all',
    inputDisabled: 'opacity-60 bg-black/40 cursor-not-allowed',
    tooltipIcon: 'text-slate-500 cursor-help hover:text-indigo-400 transition-colors',
    tooltipBox: 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2.5 bg-slate-900 border border-white/10 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl z-50 normal-case tracking-normal',
    tooltipArrow: 'absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900',

    severanceBox: 'flex items-start gap-2 text-[11px] text-slate-300 font-medium leading-snug cursor-pointer mt-2 p-2 bg-black/20 border border-white/5 rounded-lg hover:bg-black/30 transition-colors',
    severanceCheck: 'mt-0.5 accent-indigo-500',
    severanceSub: 'block text-slate-500 font-normal',

    tableShell: 'bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-x-auto shadow-2xl',
    tableHead: 'bg-white/[0.03] text-slate-500 uppercase font-black text-[10px] sm:text-xs border-b border-white/5',
    tableDivide: 'divide-y divide-white/5',

    bankRow: 'bg-yellow-400/5 border-t-2 border-yellow-400/30 cursor-pointer hover:bg-yellow-400/10 transition-colors',
    bankRowLabel: 'p-3 pl-4 sm:p-5 sm:pl-6 font-black text-yellow-300 uppercase text-[10px] sm:text-xs tracking-widest',
    bankRowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-yellow-400',
    bankRowIL: 'p-3 sm:p-5 text-slate-500 font-bold',
    bankRowUS: 'p-3 sm:p-5 text-yellow-300 font-black',
    bankDeltaPos: 'text-emerald-400',
    bankDeltaNeg: 'text-rose-400',

    netRow: 'bg-white/[0.03]',
    netRowLabel: 'p-3 pl-4 sm:p-4 sm:pl-6 text-sm font-semibold text-slate-300',
    netRowIL: 'p-3 sm:p-4 text-sm font-semibold text-slate-400',
    netRowUS: 'p-3 sm:p-4 text-sm font-semibold text-slate-200',

    savingsRow: 'bg-indigo-500/10 border-t-2 border-indigo-500/30 cursor-pointer hover:bg-indigo-500/15 transition-colors',
    savingsRowLabel: 'p-3 pl-4 sm:p-5 sm:pl-6 font-black text-indigo-200 uppercase text-[10px] sm:text-xs tracking-widest',
    savingsRowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-indigo-300',
    savingsRowIL: 'p-3 sm:p-5 text-slate-500 font-bold',
    savingsRowUS: 'p-3 sm:p-5 text-indigo-300 font-black',
    savingsDeltaPos: 'text-indigo-400',
    savingsDeltaNeg: 'text-rose-400',

    sectionRowBg: 'bg-white/[0.03]',
    rowHoverExpandable: 'hover:bg-white/10',
    rowHover: 'hover:bg-white/5',
    rowSectionLabel: 'uppercase tracking-widest text-[10px] font-black text-slate-300',
    rowSubLabel: 'text-xs text-slate-500 font-medium',
    rowLeafLabel: 'text-sm text-slate-300 font-bold',
    rowChevron: 'inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-slate-500',
    rowSectionIL: 'text-sm font-bold text-slate-400',
    rowSectionUS: 'text-sm font-black text-white',
    rowSubILBase: 'text-xs font-medium text-slate-500',
    rowSubUSBase: 'text-xs font-semibold text-slate-400',
    rowLeafILExpense: 'text-sm font-medium text-slate-500',
    rowLeafILIncome: 'text-sm font-medium text-slate-400',
    rowLeafUSExpense: 'text-sm font-bold text-slate-400',
    rowLeafUSIncome: 'text-sm font-bold text-slate-200',
    deltaPos: 'text-emerald-400',
    deltaNeg: 'text-rose-400',
    deltaNeutral: 'text-slate-500',

    lockedHint: 'flex items-start gap-3 bg-white/[0.03] border border-white/5 rounded-2xl px-4 py-3 shadow-2xl',
    lockedHintIcon: 'text-indigo-400',
    lockedHintText: 'text-xs text-slate-300 font-medium leading-relaxed',
    lockedHintHighlight: 'text-indigo-300 font-bold',

    wealthGapShell: 'bg-rose-500/10 border border-rose-500/30 rounded-[2rem] p-4 sm:p-6 shadow-2xl',
    wealthGapIcon: 'bg-rose-500/20 p-2.5 sm:p-3 rounded-2xl text-rose-300 flex-shrink-0',
    wealthGapTitle: 'text-sm font-black uppercase text-rose-300 mb-1',
    wealthGapText: 'text-xs text-rose-200/80 font-medium leading-relaxed',
    wealthGapPrefix: '⚠ ',
  },
};

const App = () => {
  const [activeLayout, setActiveLayout] = useState('sunrise');
  const [ilGross, setIlGross] = useState("15000");
  const [ilERPension, setIlERPension] = useState("6.5");
  const [ilERSeverance, setIlERSeverance] = useState("8.33");
  const [ilERKeren, setIlERKeren] = useState("7.5");
  const [ilEEPension, setIlEEPension] = useState("6.0");
  const [ilEEKeren, setIlEEKeren] = useState("2.5");
  const [ilRent, setIlRent] = useState("8650");
  const [ilBurn, setIlBurn] = useState("9000");
  const [fxRate, setFxRate] = useState("0.27");
  const [selectedLoc, setSelectedLoc] = useState('NYC');
  const [usGrossAnnual, setUsGrossAnnual] = useState("180000");
  const [usRent, setUsRent] = useState("4500");
  const [us401kMatchLimit, setUs401kMatchLimit] = useState("6");
  const [usMiscBurn, setUsMiscBurn] = useState("900");
  const [includeSeverance, setIncludeSeverance] = useState(true);
  const [ilImputed, setIlImputed] = useState("0");
  const [displayCurrency, setDisplayCurrency] = useState(() => {
    if (typeof window === 'undefined') return 'USD';
    const stored = window.localStorage.getItem(CURRENCY_STORAGE_KEY);
    return stored === 'ILS' ? 'ILS' : 'USD';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(CURRENCY_STORAGE_KEY, displayCurrency);
    }
  }, [displayCurrency]);

  const calc = useMemo(() => runEngine({
    ilGross: Number(ilGross) || 0,
    ilEEPension: Number(ilEEPension) || 0,
    ilEEKeren: Number(ilEEKeren) || 0,
    ilERPension: Number(ilERPension) || 0,
    ilERSeverance: Number(ilERSeverance) || 0,
    ilERKeren: Number(ilERKeren) || 0,
    ilRent: Number(ilRent) || 0,
    ilBurn: Number(ilBurn) || 0,
    fxRate: Number(fxRate) || 0.27,
    selectedLoc,
    usGrossAnnual: Number(usGrossAnnual) || 0,
    usRent: Number(usRent) || 0,
    us401kMatchLimit: Number(us401kMatchLimit) || 0,
    usMiscBurn: Number(usMiscBurn) || 0,
    includeSeveranceInSavings: includeSeverance,
    ilImputedBenefits: Number(ilImputed) || 0,
  }), [ilGross, ilEEPension, ilEEKeren, ilERPension, ilERSeverance, ilERKeren,
       ilRent, ilBurn, fxRate, selectedLoc, usGrossAnnual, usRent,
       us401kMatchLimit, usMiscBurn, includeSeverance, ilImputed]);

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

  const selectLocation = useCallback((key) => {
    setSelectedLoc(key);
    setUsRent(LOCATIONS[key]?.defaultRent?.toString() || "4500");
  }, []);

  const theme = THEMES[activeLayout];

  const fxRateNum = Number(fxRate) || 0.27;
  const fmt = useCallback(
    (usdAmount) => formatMoney(usdAmount, displayCurrency, fxRateNum),
    [displayCurrency, fxRateNum],
  );

  const coreState = {
    ...calc,
    ilGross, setIlGross, ilERPension, setIlERPension, ilERSeverance, setIlERSeverance,
    ilERKeren, setIlERKeren, ilEEPension, setIlEEPension, ilEEKeren, setIlEEKeren,
    ilRent, setIlRent, ilBurn, setIlBurn, selectedLoc, selectLocation,
    usGrossAnnual, setUsGrossAnnual, usRent, setUsRent,
    us401kMatchLimit, setUs401kMatchLimit, usMiscBurn, setUsMiscBurn,
    includeSeverance, setIncludeSeverance,
    ilImputed, setIlImputed,
    displayCurrency, setDisplayCurrency,
    fmt,
    calc,
  };

  return (
    <div className={`min-h-screen p-3 sm:p-4 md:p-8 transition-colors duration-300 ${theme.pageBg}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className={`flex p-1 rounded-lg border ${theme.switcherShell}`}>
            <LayoutButton icon={<Sun size={16}/>} label="Sunrise" id="sunrise" active={activeLayout} set={setActiveLayout} />
            <LayoutButton icon={<LayoutGrid size={16}/>} label="Bento Grid" id="bento" active={activeLayout} set={setActiveLayout} />
          </div>
        </div>
        <Layout theme={theme} {...coreState} />
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

const CurrencyToggle = ({ theme, displayCurrency, setDisplayCurrency }) => {
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
      onClick={() => setDisplayCurrency(id)}
      className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
        displayCurrency === id ? activeCls : inactiveCls
      }`}
      aria-pressed={displayCurrency === id}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-col items-start md:items-end gap-1">
      <div className="flex items-center gap-1.5">
        <div className={`flex p-1 rounded-lg ${shellCls}`}>
          {btn('USD', '$ USD')}
          {btn('ILS', '₪ ILS')}
        </div>
        <div className="relative group inline-block">
          <HelpCircle size={12} className={theme.tooltipIcon} />
          <div className={theme.tooltipBox}>
            Numbers are converted using a flat exchange rate — that&apos;s not what your money actually buys. ₪9,000/mo in Tel Aviv funds a very different lifestyle than $2,430/mo in NYC.
            <div className={theme.tooltipArrow}></div>
          </div>
        </div>
      </div>
      <span className={`text-[10px] uppercase tracking-widest font-bold ${captionCls}`}>Exchange rate only</span>
    </div>
  );
};

const Input = ({ theme, label, value, onChange, step = 1, disabled = false, tooltip = null }) => (
  <div>
    <div className="flex items-center mb-1.5 gap-1">
      <label className={theme.inputLabel}>{label}</label>
      {tooltip && (
        <div className="relative group inline-block">
          <HelpCircle size={12} className={theme.tooltipIcon} />
          <div className={theme.tooltipBox}>
            {tooltip}
            <div className={theme.tooltipArrow}></div>
          </div>
        </div>
      )}
    </div>
    <input
      type="number"
      value={value}
      step={step}
      disabled={disabled}
      onChange={(e) => !disabled && onChange(e.target.value)}
      className={`${theme.inputBox} ${disabled ? theme.inputDisabled : ''}`}
    />
  </div>
);

const Row = ({ theme, fmt, label, il, us, isExpense, variant = 'leaf', bg, expandable, expanded, onToggle }) => {
  const delta = us - il;
  let deltaColor = theme.deltaNeutral;
  if (delta > 0) deltaColor = theme.deltaPos;
  if (delta < 0) deltaColor = theme.deltaNeg;

  const isSection = variant === 'section';
  const isSub = variant === 'sub';

  const rowBg = bg || (isSection ? theme.sectionRowBg : '');
  const hoverBg = expandable ? theme.rowHoverExpandable : theme.rowHover;
  const baseClass = `${rowBg} ${hoverBg} transition-colors ${expandable ? 'cursor-pointer' : ''}`;

  let labelClass;
  if (isSection) labelClass = theme.rowSectionLabel;
  else if (isSub) labelClass = theme.rowSubLabel;
  else labelClass = theme.rowLeafLabel;

  let valClassIL;
  let valClassUS;
  let deltaClass;
  if (isSection) {
    valClassIL = theme.rowSectionIL;
    valClassUS = theme.rowSectionUS;
    deltaClass = `text-sm font-black ${deltaColor}`;
  } else if (isSub) {
    valClassIL = theme.rowSubILBase;
    valClassUS = theme.rowSubUSBase;
    deltaClass = `text-xs font-bold ${deltaColor}`;
  } else {
    valClassIL = isExpense ? theme.rowLeafILExpense : theme.rowLeafILIncome;
    valClassUS = isExpense ? theme.rowLeafUSExpense : theme.rowLeafUSIncome;
    deltaClass = `text-sm font-black ${deltaColor}`;
  }

  const labelCellPadding = isSub ? 'p-2 pl-10 sm:p-3 sm:pl-14' : 'p-3 pl-4 sm:p-4 sm:pl-6';
  const valCellPadding = isSub ? 'p-2 sm:p-3' : 'p-3 sm:p-4';
  const lastCellPadding = isSub ? 'p-2 pr-4 sm:p-3 sm:pr-6' : 'p-3 pr-4 sm:p-4 sm:pr-6';

  return (
    <tr className={baseClass} onClick={expandable ? onToggle : undefined}>
      <td className={`${labelCellPadding} ${labelClass}`}>
        {!isSub && (
          <span className={theme.rowChevron}>
            {expandable ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
          </span>
        )}
        {label}
      </td>
      <td className={`${valCellPadding} ${valClassIL}`}>{fmt(il)}</td>
      <td className={`${valCellPadding} ${valClassUS}`}>{fmt(us)}</td>
      <td className={`${lastCellPadding} text-right ${deltaClass}`}>{delta > 0 ? '+' : ''}{fmt(delta)}</td>
    </tr>
  );
};

const Layout = ({ theme, calc, fmt, displayCurrency, setDisplayCurrency, ...s }) => {
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);

  const cashLeftoverPositive = calc.liquidCashFlow >= 0;
  const cashLeftoverCardClass = `${theme.kpiCardBase} ${cashLeftoverPositive ? theme.kpiPositive : theme.kpiNegative}`;
  const cashLeftoverValueClass = cashLeftoverPositive ? theme.kpiValuePositive : theme.kpiValueNegative;

  return (
    <div className={`space-y-6 animate-in fade-in duration-500 ${theme.rootText}`}>
      <header className={`${theme.headerBorder} flex flex-col md:flex-row justify-between items-start md:items-center gap-4`}>
        <div className="min-w-0">
          <h1 className={theme.h1Text}>
            {theme.h1Icon}
            <span>RELOCATION ARCHITECT</span>
            <span className={theme.brandPill}>{theme.name}</span>
          </h1>
          <p className={theme.subTitle}>Savings-Matched Calculator</p>
        </div>
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 w-full md:w-auto">
          <CurrencyToggle theme={theme} displayCurrency={displayCurrency} setDisplayCurrency={setDisplayCurrency} />
          <div className={theme.totalPillCard}>
            <span className={theme.totalPillLabel}>Total IL Savings Rate ({calc.totalILSPct.toFixed(1)}%)</span>
            <div className={theme.totalPillValue}>
              <Lock size={18} /> {fmt(calc.targetSavingsUSD)}{' '}
              <span className={theme.totalPillSuffix}>/mo</span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className={cashLeftoverCardClass}>
            <div className={theme.kpiLabel}>
              <span className="flex items-center gap-1"><Wallet size={14} /> Cash Leftover</span>
            </div>
            <div className={`text-3xl sm:text-5xl font-black tracking-tighter ${cashLeftoverValueClass}`}>
              {fmt(calc.liquidCashFlow)}
            </div>
          </div>
          <div className={`${theme.kpiCardBase} ${theme.kpiAccent}`}>
            <div className={theme.kpiLabel}>
              <span className="flex items-center gap-1"><TrendingUp size={14} className={theme.kpiTrendIcon} /> True Lifestyle Change</span>
            </div>
            <div className={`text-3xl sm:text-5xl font-black tracking-tighter ${theme.kpiValueAccent}`}>
              {calc.liquidDelta > 0 ? '+' : ''}{fmt(calc.liquidDelta)}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <section className={theme.sectionCard}>
            <h3 className={theme.ilHeading}><ShieldCheck size={16} /> Israel (Current Setup)</h3>
            <div className="space-y-4">
              <Input theme={theme} label="Gross Pay (ILS)" value={s.ilGross} onChange={s.setIlGross} tooltip="Total monthly salary before taxes." />
              <Input theme={theme} label="Net Take-Home (Auto-Calc)" value={Math.round(calc.ilNet)} onChange={() => {}} disabled={true} tooltip="Cash that hits your checking account after taxes and deductions." />
              <div className="grid grid-cols-2 gap-3">
                <Input theme={theme} label="Your Pension %" value={s.ilEEPension} onChange={s.setIlEEPension} step={0.1} tooltip="The percentage YOU pay into your pension (usually 6%)." />
                <Input theme={theme} label="Your Keren %" value={s.ilEEKeren} onChange={s.setIlEEKeren} step={0.1} tooltip="The percentage YOU pay into Keren Hishtalmut (usually 2.5%)." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input theme={theme} label="Employer Pension %" value={s.ilERPension} onChange={s.setIlERPension} step={0.1} tooltip="Employer Pension match (usually 6.5%)." />
                <Input theme={theme} label="Employer Severance %" value={s.ilERSeverance} onChange={s.setIlERSeverance} step={0.1} tooltip="Employer Severance/Pitzuim (usually 8.33%)." />
                <Input theme={theme} label="Employer Keren %" value={s.ilERKeren} onChange={s.setIlERKeren} step={0.1} tooltip="Employer Keren Hishtalmut (usually 7.5%)." />
              </div>
              <Input theme={theme} label="Rent + Bills (ILS)" value={s.ilRent} onChange={s.setIlRent} tooltip="Monthly housing and utilities." />
              <Input theme={theme} label="Food, Fun & Living (ILS)" value={s.ilBurn} onChange={s.setIlBurn} tooltip="Remaining monthly spending. We convert this to USD to ensure your lifestyle doesn't drop." />
              <Input theme={theme} label="Imputed Benefits (ILS)" value={s.ilImputed} onChange={s.setIlImputed} tooltip="Non-cash perks taxed as income (שווי): meal vouchers, holiday gifts, sport benefit, gross-ups (גילום). Inflates BTL+tax base; does NOT add to your cash net. Default 0. Find on payslip as 'שווי' lines." />
              <label className={theme.severanceBox}>
                <input
                  type="checkbox"
                  checked={s.includeSeverance}
                  onChange={(e) => s.setIncludeSeverance(e.target.checked)}
                  className={theme.severanceCheck}
                />
                <span>
                  Count <span className="font-bold">severance</span> ({s.ilERSeverance}%) as savings.
                  <span className={theme.severanceSub}>On if rolled into pension on exit. Off if you spend it.</span>
                </span>
              </label>
            </div>
          </section>
          <section className={theme.sectionCard}>
            <h3 className={theme.usHeading}><Target size={16} /> US Offer & Costs</h3>
            <div className="space-y-4">
              <div className={theme.locTabBar}>
                {LOCATION_ENTRIES.map(([key, loc]) => (
                  <button
                    key={key}
                    onClick={() => s.selectLocation(key)}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${s.selectedLoc === key ? theme.locTabActive : theme.locTabInactive}`}
                  >
                    {loc.name}
                  </button>
                ))}
              </div>
              <Input theme={theme} label="Annual Salary ($)" value={s.usGrossAnnual} onChange={s.setUsGrossAnnual} step={5000} tooltip="Your target yearly US offer." />
              <Input theme={theme} label="Monthly Rent ($)" value={s.usRent} onChange={s.setUsRent} step={100} tooltip="Estimated base rent for the US." />
              <Input theme={theme} label="401k Match Limit %" value={s.us401kMatchLimit} onChange={s.setUs401kMatchLimit} step={0.5} tooltip="The maximum percentage the US employer will match in your 401k." />
              <Input theme={theme} label="Other Expenses ($)" value={s.usMiscBurn} onChange={s.setUsMiscBurn} tooltip="Extra US costs like transit, health premiums, and utilities." />
            </div>
          </section>
        </div>

        <div className={theme.tableShell}>
          <table className="w-full text-left text-xs sm:text-sm min-w-[560px]">
            <thead className={theme.tableHead}>
              <tr>
                <th className="p-3 pl-4 sm:p-4 sm:pl-6">Monthly Breakdown ({displayCurrency})</th>
                <th className="p-3 sm:p-4">Israel (Current)</th>
                <th className="p-3 sm:p-4">US (Offer)</th>
                <th className="p-3 pr-4 sm:p-4 sm:pr-6 text-right">Difference</th>
              </tr>
            </thead>
            <tbody className={theme.tableDivide}>
              <tr className={theme.bankRow} onClick={() => setBankOpen(!bankOpen)}>
                <td className={theme.bankRowLabel}>
                  <span className={theme.bankRowChevron}>
                    {bankOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  Monthly Bank Balance
                </td>
                <td className={theme.bankRowIL}>{fmt(calc.ilLiquidFlowUSD)}</td>
                <td className={theme.bankRowUS}>{fmt(calc.liquidCashFlow)}</td>
                <td className={`p-3 pr-4 sm:p-5 sm:pr-6 text-right font-black ${calc.liquidDelta >= 0 ? theme.bankDeltaPos : theme.bankDeltaNeg}`}>
                  {calc.liquidDelta > 0 ? '+' : ''}{fmt(calc.liquidDelta)}
                </td>
              </tr>
              {bankOpen && (
                <>
                  <Row theme={theme} fmt={fmt} label="Gross Pay" il={calc.ilGrossUSD} us={calc.usGrossMonthly} />
                  <Row theme={theme} fmt={fmt} label="Taxes" il={-(calc.ilMasHachnasaUSD + calc.ilBTLUSD)} us={-(calc.usFedMonthly + calc.usFICAMonthly + calc.usStateMonthly + calc.usCityMonthly)} isExpense expandable expanded={taxesOpen} onToggle={() => setTaxesOpen(!taxesOpen)} />
                  {taxesOpen && (
                    <>
                      <Row theme={theme} fmt={fmt} label="Income Tax" il={-calc.ilMasHachnasaUSD} us={-calc.usFedMonthly} isExpense variant="sub" />
                      <Row theme={theme} fmt={fmt} label="Social Sec. & Health" il={-calc.ilBTLUSD} us={-calc.usFICAMonthly} isExpense variant="sub" />
                      <Row theme={theme} fmt={fmt} label="State Tax" il={0} us={-calc.usStateMonthly} isExpense variant="sub" />
                      <Row theme={theme} fmt={fmt} label="City Tax" il={0} us={-calc.usCityMonthly} isExpense variant="sub" />
                    </>
                  )}
                  <tr className={theme.netRow}>
                    <td className={theme.netRowLabel}>
                      <span className="inline-flex items-center justify-center w-4 h-4 mr-2 align-middle" />
                      Net Take-Home Pay
                    </td>
                    <td className={theme.netRowIL}>{fmt(calc.ilNetUSD)}</td>
                    <td className={theme.netRowUS}>{fmt(calc.netTakeHome)}</td>
                    <td className={`p-3 pr-4 sm:p-4 sm:pr-6 text-right text-sm font-semibold ${(calc.netTakeHome - calc.ilNetUSD) >= 0 ? theme.deltaPos : theme.deltaNeg}`}>
                      {(calc.netTakeHome - calc.ilNetUSD) > 0 ? '+' : ''}{fmt(calc.netTakeHome - calc.ilNetUSD)}
                    </td>
                  </tr>
                  <Row theme={theme} fmt={fmt} label="Living Expenses" il={-calc.ilTotalOutUSD} us={-calc.usTotalOutUSD} isExpense expandable expanded={expensesOpen} onToggle={() => setExpensesOpen(!expensesOpen)} />
                  {expensesOpen && (
                    <>
                      <Row theme={theme} fmt={fmt} label="Rent & Utilities" il={-calc.ilHousingUSD} us={-calc.usRentUSD} isExpense variant="sub" />
                      <Row theme={theme} fmt={fmt} label="US Transit & Extras" il={0} us={-calc.usMiscBurnUSD} isExpense variant="sub" />
                      <Row theme={theme} fmt={fmt} label="Food, Fun & Living" il={-calc.ilLifestyleUSD} us={-calc.usLifestyleUSD} isExpense variant="sub" />
                    </>
                  )}
                </>
              )}
              <tr className={theme.savingsRow} onClick={() => setSavingsOpen(!savingsOpen)}>
                <td className={theme.savingsRowLabel}>
                  <span className={theme.savingsRowChevron}>
                    {savingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                  Monthly Savings
                </td>
                <td className={theme.savingsRowIL}>{fmt(calc.targetSavingsUSD)}</td>
                <td className={theme.savingsRowUS}>{fmt(calc.totalInvested)}</td>
                <td className={`p-3 pr-4 sm:p-5 sm:pr-6 text-right font-black ${(calc.totalInvested - calc.targetSavingsUSD) >= 0 ? theme.savingsDeltaPos : theme.savingsDeltaNeg}`}>
                  {(calc.totalInvested - calc.targetSavingsUSD) > 0 ? '+' : ''}{fmt(calc.totalInvested - calc.targetSavingsUSD)}
                </td>
              </tr>
              {savingsOpen && (
                <>
                  <Row theme={theme} fmt={fmt} label="Your Contribution" il={calc.ilEEMatchUSD} us={calc.personalUSD} />
                  <Row theme={theme} fmt={fmt} label="Employer Match" il={calc.ilERMatchUSD} us={calc.employerUSD} />
                </>
              )}
            </tbody>
          </table>
        </div>

        <div className={theme.lockedHint}>
          <Lock size={14} className={`flex-shrink-0 mt-0.5 ${theme.lockedHintIcon}`} />
          <p className={theme.lockedHintText}>
            Savings rate locked. Your US contribution is set to{' '}
            <span className={theme.lockedHintHighlight}>{calc.optimalPct.toFixed(2)}%</span>{' '}
            of gross to match your Israeli savings rate.
          </p>
        </div>

        {calc.wealthGapUSD > 0 && (
          <div className={theme.wealthGapShell}>
            <div className="flex items-start gap-3 sm:gap-4">
              <div className={theme.wealthGapIcon}>
                <Lock size={20} />
              </div>
              <div className="min-w-0">
                <h4 className={theme.wealthGapTitle}>{theme.wealthGapPrefix}Wealth Gap: {fmt(calc.wealthGapUSD)}/mo</h4>
                <p className={theme.wealthGapText}>
                  Hitting your Israeli savings target requires <span className="font-bold">{fmt(calc.wealthGapUSD)}/mo more</span> than the IRS 401(k) limit allows (${CONSTANTS.IRS_401K_LIMIT_ANNUAL.toLocaleString()}/yr). Even with positive lifestyle delta, this move is a <span className="font-bold">net-worth loss</span> versus staying — unless offset by RSUs, taxable brokerage, or other vehicles not modeled here.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
