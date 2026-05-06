import React, { useState, useEffect, useMemo } from 'react';
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
} from 'lucide-react';
import { runEngine, LOCATIONS } from './calc';

const formatValue = (val) => val === 0 ? '--' : `${val < 0 ? '-' : ''}$${Math.abs(Math.round(val)).toLocaleString()}`;

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

  useEffect(() => {
    setUsRent(LOCATIONS[selectedLoc]?.defaultRent?.toString() || "4500");
  }, [selectedLoc]);

  const coreState = {
    ...calc,
    ilGross, setIlGross, ilERPension, setIlERPension, ilERSeverance, setIlERSeverance,
    ilERKeren, setIlERKeren, ilEEPension, setIlEEPension, ilEEKeren, setIlEEKeren,
    ilRent, setIlRent, ilBurn, setIlBurn, selectedLoc, setSelectedLoc,
    usGrossAnnual, setUsGrossAnnual, usRent, setUsRent,
    us401kMatchLimit, setUs401kMatchLimit, usMiscBurn, setUsMiscBurn,
    includeSeverance, setIncludeSeverance,
    ilImputed, setIlImputed,
    calc,
  };

  return (
    <div className={`min-h-screen p-3 sm:p-4 md:p-8 transition-colors duration-300 ${activeLayout === 'sunrise' ? 'bg-slate-100' : 'bg-[#0B0F19]'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-center mb-6 sm:mb-8">
          <div className={`flex p-1 rounded-lg border ${activeLayout === 'sunrise' ? 'bg-slate-200/50 border-slate-300/50' : 'bg-white/5 border-white/10'}`}>
            <LayoutButton icon={<Sun size={16}/>} label="Sunrise" id="sunrise" active={activeLayout} set={setActiveLayout} />
            <LayoutButton icon={<LayoutGrid size={16}/>} label="Bento Grid" id="bento" active={activeLayout} set={setActiveLayout} />
          </div>
        </div>
        {activeLayout === 'sunrise' ? <LayoutSunrise {...coreState} /> : <LayoutBento {...coreState} />}
        <footer className={`pt-8 pb-4 text-center space-y-2 ${activeLayout === 'sunrise' ? 'text-slate-400' : 'text-slate-600'}`}>
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

const BentoInput = ({ label, value, onChange, step = 1 }) => (
  <div>
    <label className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-1.5 block">{label}</label>
    <input type="number" value={value} step={step} onChange={(e) => onChange(e.target.value)} className="bg-black/20 border border-white/5 rounded-xl px-4 py-3 focus:border-indigo-500 focus:bg-white/5 outline-none text-white w-full text-sm font-bold transition-all" />
  </div>
);

const BentoStat = ({ label, val, color }) => (
  <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
    <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest block mb-1">{label}</span>
    <span className={`text-lg font-black ${color || 'text-white'}`}>${Math.round(val || 0).toLocaleString()}</span>
  </div>
);

const BentoRow = ({ label, il, us }) => {
  const delta = us - il;
  const isPositive = delta > 0;
  return (
    <tr className="hover:bg-white/5 transition-colors">
      <td className="p-3 pl-4 sm:p-4 sm:pl-6 text-slate-300 font-medium">{label}</td>
      <td className="p-3 sm:p-4 text-slate-500">{formatValue(il)}</td>
      <td className="p-3 sm:p-4 text-slate-200 font-bold">{formatValue(us)}</td>
      <td className={`p-3 pr-4 sm:p-4 sm:pr-6 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-slate-500'}`}>{isPositive ? '+' : ''}{formatValue(delta)}</td>
    </tr>
  );
};

const LayoutBento = ({ calc, ...s }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans tracking-tight">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 sm:mb-8">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter">Relocation Architect</h1>
          <p className="text-slate-400 text-xs sm:text-sm font-medium">Savings-Matched Calculator</p>
        </div>
        <div className="bg-white/5 border border-white/10 px-4 sm:px-6 py-3 rounded-2xl md:rounded-full backdrop-blur-xl shadow-xl flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <Lock size={16} className="text-indigo-400 flex-shrink-0" />
          <span className="text-[10px] sm:text-xs text-slate-400 font-medium uppercase tracking-widest">Total IL Savings Rate ({calc.totalILSPct.toFixed(1)}%)</span>
          <span className="text-lg sm:text-xl font-black text-white ml-auto md:ml-0">${Math.round(calc.targetSavingsUSD).toLocaleString()}</span>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border border-white/5 rounded-[2rem] p-5 sm:p-8 shadow-2xl">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30"><ShieldCheck className="text-indigo-400" size={20} /></div>
            <h3 className="text-lg font-black text-white mb-6">Israel (Current Setup)</h3>
            <div className="space-y-4">
              <BentoInput label="Gross Pay (ILS)" value={s.ilGross} onChange={s.setIlGross} />
              <div className="grid grid-cols-2 gap-4">
                <BentoInput label="Your Pension %" value={s.ilEEPension} onChange={s.setIlEEPension} step={0.1} />
                <BentoInput label="Your Keren %" value={s.ilEEKeren} onChange={s.setIlEEKeren} step={0.1} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <BentoInput label="Employer Pension %" value={s.ilERPension} onChange={s.setIlERPension} step={0.1} />
                <BentoInput label="Employer Severance %" value={s.ilERSeverance} onChange={s.setIlERSeverance} step={0.1} />
                <BentoInput label="Employer Keren %" value={s.ilERKeren} onChange={s.setIlERKeren} step={0.1} />
              </div>
              <BentoInput label="Rent + Bills (ILS)" value={s.ilRent} onChange={s.setIlRent} />
              <BentoInput label="Food, Fun & Living (ILS)" value={s.ilBurn} onChange={s.setIlBurn} />
              <BentoInput label="Imputed Benefits (ILS)" value={s.ilImputed} onChange={s.setIlImputed} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border border-white/5 rounded-[2rem] p-5 sm:p-8 shadow-2xl">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30"><Target className="text-cyan-400" size={20} /></div>
            <h3 className="text-lg font-black text-white mb-6">US Offer & Costs</h3>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-black/20 rounded-xl overflow-x-auto no-scrollbar">
                {Object.entries(LOCATIONS).map(([key, loc]) => (
                  <button key={key} onClick={() => s.setSelectedLoc(key)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${s.selectedLoc === key ? 'bg-white/10 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>{loc.name}</button>
                ))}
              </div>
              <BentoInput label="Annual Salary ($)" value={s.usGrossAnnual} onChange={s.setUsGrossAnnual} step={5000} />
              <BentoInput label="Monthly Rent ($)" value={s.usRent} onChange={s.setUsRent} step={100} />
              <div className="grid grid-cols-2 gap-4">
                <BentoInput label="401k Match Limit %" value={s.us401kMatchLimit} onChange={s.setUs401kMatchLimit} step={0.5} />
                <BentoInput label="Other Expenses ($)" value={s.usMiscBurn} onChange={s.setUsMiscBurn} />
              </div>
            </div>
          </div>
        </div>
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border border-white/5 rounded-[2rem] p-5 sm:p-8 shadow-2xl relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${calc.liquidCashFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Cash Leftover</span>
              <div className={`text-3xl sm:text-5xl font-black tracking-tighter ${calc.liquidCashFlow >= 0 ? 'text-white' : 'text-rose-400'}`}>{formatValue(calc.liquidCashFlow)}</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-900/40 to-[#0F131D] border border-indigo-500/20 rounded-[2rem] p-5 sm:p-8 shadow-2xl relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${calc.liquidDelta >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 block">True Lifestyle Change</span>
              <div className="text-3xl sm:text-5xl font-black text-white tracking-tighter">{calc.liquidDelta > 0 ? '+' : ''}{formatValue(calc.liquidDelta)}</div>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-5 sm:p-8 shadow-2xl">
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
              <Zap className="text-yellow-400 flex-shrink-0" size={24} />
              <h3 className="text-base sm:text-lg font-black text-white">Matching Your Israeli Savings</h3>
              <div className="ml-auto px-3 sm:px-4 py-1.5 bg-yellow-400/10 text-yellow-400 text-[10px] sm:text-xs font-bold rounded-full border border-yellow-400/20 whitespace-nowrap">{calc.optimalPct.toFixed(2)}% Required</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BentoStat label="Net Take-Home" val={calc.netTakeHome} />
              <BentoStat label="Total Expenses" val={calc.usTotalOutUSD} />
              <BentoStat label="You Pay (401k)" val={calc.personalUSD} />
              <BentoStat label="Employer Pays" val={calc.employerUSD} color="text-indigo-400" />
            </div>
          </div>
          {calc.wealthGapUSD > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-[2rem] p-6 shadow-2xl">
              <div className="flex items-start gap-4">
                <Lock className="text-rose-400 flex-shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="text-sm font-black uppercase text-rose-300 mb-1">Wealth Gap: ${Math.round(calc.wealthGapUSD).toLocaleString()}/mo</h4>
                  <p className="text-xs text-rose-200/80 font-medium leading-relaxed">
                    Hitting your Israeli savings target requires <span className="font-bold">${Math.round(calc.wealthGapUSD).toLocaleString()}/mo more</span> than the IRS 401(k) limit allows ($23,500/yr). This move is a net-worth loss vs staying unless offset by RSUs / taxable brokerage.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-x-auto shadow-2xl p-2">
            <table className="w-full text-left text-xs sm:text-sm min-w-[520px]">
              <thead className="text-[10px] sm:text-xs text-slate-500 uppercase tracking-widest font-bold">
                <tr><th className="p-3 pl-4 sm:p-4 sm:pl-6">Monthly Breakdown</th><th className="p-3 sm:p-4">Israel</th><th className="p-3 sm:p-4">US</th><th className="p-3 pr-4 sm:p-4 sm:pr-6 text-right">Difference</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <BentoRow label="Gross Pay" il={calc.ilGrossUSD} us={calc.usGrossMonthly} />
                <BentoRow label="Taxes & Deductions" il={-(calc.ilMasHachnasaUSD + calc.ilBTLUSD + calc.ilEEMatchUSD)} us={-(calc.usFedMonthly + calc.usFICAMonthly + calc.usStateMonthly + calc.usCityMonthly + calc.personalUSD)} />
                <BentoRow label="Total Expenses" il={-calc.ilTotalOutUSD} us={-calc.usTotalOutUSD} />
                <BentoRow label="Retirement Savings" il={calc.targetSavingsUSD} us={calc.totalInvested} />
                <tr className="bg-indigo-500/10">
                  <td className="p-3 pl-4 sm:p-4 sm:pl-6 font-bold text-indigo-300">Leftover Cash</td>
                  <td className="p-3 sm:p-4 text-slate-400 font-medium">{formatValue(calc.ilLiquidFlowUSD)}</td>
                  <td className="p-3 sm:p-4 text-white font-black">{formatValue(calc.liquidCashFlow)}</td>
                  <td className={`p-3 pr-4 sm:p-4 sm:pr-6 text-right font-black ${calc.liquidDelta >= 0 ? 'text-indigo-400' : 'text-rose-500'}`}>{calc.liquidDelta > 0 ? '+' : ''}{formatValue(calc.liquidDelta)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const SunriseInput = ({ label, value, onChange, step = 1, disabled = false, tooltip = null }) => (
  <div>
    <div className="flex items-center mb-1.5 gap-1">
      <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">{label}</label>
      {tooltip && (
        <div className="relative group inline-block">
          <HelpCircle size={12} className="text-slate-400 cursor-help hover:text-orange-500 transition-colors" />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl z-50 normal-case tracking-normal">
            {tooltip}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
          </div>
        </div>
      )}
    </div>
    <input type="number" value={value} step={step} disabled={disabled} onChange={(e) => !disabled && onChange(e.target.value)} className={`bg-white/60 border border-slate-200/80 rounded-xl px-4 py-3 focus:bg-white focus:border-orange-400 focus:ring-2 focus:ring-orange-100 outline-none text-slate-900 w-full text-sm font-bold transition-all ${disabled ? 'opacity-60 bg-slate-200/50 cursor-not-allowed' : ''}`} />
  </div>
);

const SunriseStat = ({ label, val, color }) => (
  <div>
    <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block mb-1">{label}</span>
    <span className={`text-xl font-black ${color || 'text-slate-900'}`}>${Math.round(val || 0).toLocaleString()}</span>
  </div>
);

const SunriseRow = ({ label, il, us, isExpense, variant = 'leaf', bg, expandable, expanded, onToggle }) => {
  const delta = us - il;
  let deltaColor = 'text-slate-400';
  if (delta > 0) deltaColor = 'text-emerald-600';
  if (delta < 0) deltaColor = 'text-rose-500';

  const isSection = variant === 'section';
  const isSub = variant === 'sub';

  const rowBg = bg || (isSection ? 'bg-slate-100/50' : '');
  const hoverBg = expandable ? 'hover:bg-slate-200/50' : 'hover:bg-slate-100/40';
  const baseClass = `${rowBg} ${hoverBg} transition-colors ${expandable ? 'cursor-pointer' : ''}`;

  let labelClass;
  if (isSection) {
    labelClass = 'uppercase tracking-widest text-[10px] font-black text-slate-700';
  } else if (isSub) {
    labelClass = 'text-xs text-slate-500 font-medium';
  } else {
    labelClass = 'text-sm text-slate-700 font-bold';
  }

  let valClassIL;
  let valClassUS;
  let deltaClass;
  if (isSection) {
    valClassIL = 'text-sm font-bold text-slate-600';
    valClassUS = 'text-sm font-black text-slate-900';
    deltaClass = `text-sm font-black ${deltaColor}`;
  } else if (isSub) {
    valClassIL = 'text-xs font-medium text-slate-400';
    valClassUS = 'text-xs font-semibold text-slate-600';
    deltaClass = `text-xs font-bold ${deltaColor}`;
  } else {
    valClassIL = `text-sm font-medium ${isExpense ? 'text-slate-400' : 'text-slate-500'}`;
    valClassUS = `text-sm font-bold ${isExpense ? 'text-slate-600' : 'text-slate-800'}`;
    deltaClass = `text-sm font-black ${deltaColor}`;
  }

  const labelCellPadding = isSub ? 'p-2 pl-10 sm:p-3 sm:pl-14' : 'p-3 pl-4 sm:p-4 sm:pl-6';
  const valCellPadding = isSub ? 'p-2 sm:p-3' : 'p-3 sm:p-4';
  const lastCellPadding = isSub ? 'p-2 pr-4 sm:p-3 sm:pr-6' : 'p-3 pr-4 sm:p-4 sm:pr-6';

  return (
    <tr className={baseClass} onClick={expandable ? onToggle : undefined}>
      <td className={`${labelCellPadding} ${labelClass}`}>
        {!isSub && (
          <span className="inline-flex items-center justify-center w-4 h-4 mr-2 align-middle text-slate-400">
            {expandable ? (expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />) : null}
          </span>
        )}
        {label}
      </td>
      <td className={`${valCellPadding} ${valClassIL}`}>{formatValue(il)}</td>
      <td className={`${valCellPadding} ${valClassUS}`}>{formatValue(us)}</td>
      <td className={`${lastCellPadding} text-right ${deltaClass}`}>{delta > 0 ? '+' : ''}{formatValue(delta)}</td>
    </tr>
  );
};

const LayoutSunrise = ({ calc, ...s }) => {
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-800">
      <header className="border-b border-orange-200/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black flex flex-wrap items-center gap-2 text-slate-900"><Sun className="text-orange-500 flex-shrink-0" strokeWidth={3} /> <span>RELOCATION ARCHITECT</span> <span className="text-xs bg-orange-100/80 text-orange-600 px-2 py-1 rounded-full border border-orange-200/50">Sunrise</span></h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-1 uppercase tracking-widest font-bold">Savings-Matched Calculator</p>
        </div>
        <div className="bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-2xl text-left md:text-right shadow-sm w-full md:w-auto">
          <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">Total IL Savings Rate ({calc.totalILSPct.toFixed(1)}%)</span>
          <div className="text-xl sm:text-2xl font-black text-orange-500 flex items-center md:justify-end gap-2"><Lock size={18} /> ${Math.round(calc.targetSavingsUSD).toLocaleString()} <span className="text-xs font-bold text-slate-400">/mo</span></div>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-orange-600 text-xs font-black uppercase flex items-center gap-2 mb-4"><ShieldCheck size={16} /> Israel (Current Setup)</h3>
            <div className="space-y-4">
              <SunriseInput label="Gross Pay (ILS)" value={s.ilGross} onChange={s.setIlGross} tooltip="Total monthly salary before taxes." />
              <SunriseInput label="Net Take-Home (Auto-Calc)" value={Math.round(calc.ilNet)} onChange={() => {}} disabled={true} tooltip="Cash that hits your checking account after taxes and deductions." />
              <div className="grid grid-cols-2 gap-3">
                <SunriseInput label="Your Pension %" value={s.ilEEPension} onChange={s.setIlEEPension} step={0.1} tooltip="The percentage YOU pay into your pension (usually 6%)." />
                <SunriseInput label="Your Keren %" value={s.ilEEKeren} onChange={s.setIlEEKeren} step={0.1} tooltip="The percentage YOU pay into Keren Hishtalmut (usually 2.5%)." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <SunriseInput label="Employer Pension %" value={s.ilERPension} onChange={s.setIlERPension} step={0.1} tooltip="Employer Pension match (usually 6.5%)." />
                <SunriseInput label="Employer Severance %" value={s.ilERSeverance} onChange={s.setIlERSeverance} step={0.1} tooltip="Employer Severance/Pitzuim (usually 8.33%)." />
                <SunriseInput label="Employer Keren %" value={s.ilERKeren} onChange={s.setIlERKeren} step={0.1} tooltip="Employer Keren Hishtalmut (usually 7.5%)." />
              </div>
              <SunriseInput label="Rent + Bills (ILS)" value={s.ilRent} onChange={s.setIlRent} tooltip="Monthly housing and utilities." />
              <SunriseInput label="Food, Fun & Living (ILS)" value={s.ilBurn} onChange={s.setIlBurn} tooltip="Remaining monthly spending. We convert this to USD to ensure your lifestyle doesn't drop." />
              <SunriseInput label="Imputed Benefits (ILS)" value={s.ilImputed} onChange={s.setIlImputed} tooltip="Non-cash perks taxed as income (שווי): meal vouchers, holiday gifts, sport benefit, gross-ups (גילום). Inflates BTL+tax base; does NOT add to your cash net. Default 0. Find on payslip as 'שווי' lines." />
              <label className="flex items-start gap-2 text-[11px] text-slate-600 font-medium leading-snug cursor-pointer mt-2 p-2 bg-white/40 border border-slate-200/60 rounded-lg hover:bg-white/70 transition-colors">
                <input
                  type="checkbox"
                  checked={s.includeSeverance}
                  onChange={(e) => s.setIncludeSeverance(e.target.checked)}
                  className="mt-0.5 accent-orange-500"
                />
                <span>
                  Count <span className="font-bold">severance</span> ({s.ilERSeverance}%) as savings.
                  <span className="block text-slate-500 font-normal">On if rolled into pension on exit. Off if you spend it.</span>
                </span>
              </label>
            </div>
          </section>
          <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-6 shadow-sm">
            <h3 className="text-blue-600 text-xs font-black uppercase flex items-center gap-2 mb-4"><Target size={16} /> US Offer & Costs</h3>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl overflow-x-auto no-scrollbar">
                {Object.entries(LOCATIONS).map(([key, loc]) => (
                  <button key={key} onClick={() => s.setSelectedLoc(key)} className={`flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${s.selectedLoc === key ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>{loc.name}</button>
                ))}
              </div>
              <SunriseInput label="Annual Salary ($)" value={s.usGrossAnnual} onChange={s.setUsGrossAnnual} step={5000} tooltip="Your target yearly US offer." />
              <SunriseInput label="Monthly Rent ($)" value={s.usRent} onChange={s.setUsRent} step={100} tooltip="Estimated base rent for the US." />
              <SunriseInput label="401k Match Limit %" value={s.us401kMatchLimit} onChange={s.setUs401kMatchLimit} step={0.5} tooltip="The maximum percentage the US employer will match in your 401k." />
              <SunriseInput label="Other Expenses ($)" value={s.usMiscBurn} onChange={s.setUsMiscBurn} tooltip="Extra US costs like transit, health premiums, and utilities." />
            </div>
          </section>
        </div>
        <div className="lg:col-span-8 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className={`p-4 sm:p-6 rounded-3xl border ${calc.liquidCashFlow >= 0 ? 'bg-emerald-50/50 border-emerald-200/80' : 'bg-rose-50/50 border-rose-200/80'} shadow-sm`}>
              <div className="flex justify-between items-center mb-2 text-[10px] uppercase font-black text-slate-500"><span className="flex items-center gap-1"><Wallet size={14} /> Cash Leftover</span></div>
              <div className={`text-3xl sm:text-5xl font-black tracking-tighter ${calc.liquidCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatValue(calc.liquidCashFlow)}</div>
            </div>
            <div className="p-4 sm:p-6 rounded-3xl border bg-orange-50/50 border-orange-200/80 shadow-sm">
              <div className="flex justify-between items-center mb-2 text-[10px] uppercase font-black text-slate-500"><span className="flex items-center gap-1"><TrendingUp size={14} className="text-orange-500" /> True Lifestyle Change</span></div>
              <div className="text-3xl sm:text-5xl font-black text-orange-600 tracking-tighter">{calc.liquidDelta > 0 ? '+' : ''}{formatValue(calc.liquidDelta)}</div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-4 sm:p-6 relative shadow-sm">
            <div className="flex items-center gap-3 sm:gap-4 mb-6">
              <div className="bg-orange-100/80 p-2.5 sm:p-3 rounded-2xl text-orange-600 flex-shrink-0"><Lock size={20} /></div>
              <div className="min-w-0">
                <h4 className="text-sm font-black uppercase text-slate-900">Matching Your Israeli Savings</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">We locked your US savings to match your total Israeli savings rate. You need to contribute <span className="text-orange-600 font-bold">{calc.optimalPct.toFixed(2)}%</span> to break even on wealth building.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 border-t border-slate-200/60 pt-6">
              <SunriseStat label="Net Take-Home" val={calc.netTakeHome} />
              <SunriseStat label="Total Expenses" val={calc.usTotalOutUSD} color="text-rose-500" />
              <SunriseStat label="You Pay (401k)" val={calc.personalUSD} color="text-blue-600" />
              <SunriseStat label="Employer Pays" val={calc.employerUSD} color="text-emerald-600" />
            </div>
          </div>
          {calc.wealthGapUSD > 0 && (
            <div className="bg-rose-50 border-2 border-rose-300 rounded-3xl p-4 sm:p-6 shadow-sm">
              <div className="flex items-start gap-3 sm:gap-4">
                <div className="bg-rose-200 p-2.5 sm:p-3 rounded-2xl text-rose-700 flex-shrink-0">
                  <Lock size={20} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-black uppercase text-rose-800 mb-1">⚠ Wealth Gap: ${Math.round(calc.wealthGapUSD).toLocaleString()}/mo</h4>
                  <p className="text-xs text-rose-700 font-medium leading-relaxed">
                    Hitting your Israeli savings target requires <span className="font-bold">${Math.round(calc.wealthGapUSD).toLocaleString()}/mo more</span> than the IRS 401(k) limit allows ($23,500/yr). Even with positive lifestyle delta, this move is a <span className="font-bold">net-worth loss</span> versus staying — unless offset by RSUs, taxable brokerage, or other vehicles not modeled here.
                  </p>
                </div>
              </div>
            </div>
          )}
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl overflow-x-auto shadow-sm">
            <table className="w-full text-left text-xs sm:text-sm min-w-[560px]">
              <thead className="bg-slate-100/60 text-slate-500 uppercase font-black text-[10px] sm:text-xs border-b border-slate-200/80">
                <tr><th className="p-3 pl-4 sm:p-4 sm:pl-6">Monthly Breakdown (USD)</th><th className="p-3 sm:p-4">Israel (Current)</th><th className="p-3 sm:p-4">US (Offer)</th><th className="p-3 pr-4 sm:p-4 sm:pr-6 text-right">Difference</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40">
                <SunriseRow label="Gross Pay" il={calc.ilGrossUSD} us={calc.usGrossMonthly} variant="section" />
                <SunriseRow label="Taxes" il={-(calc.ilMasHachnasaUSD + calc.ilBTLUSD)} us={-(calc.usFedMonthly + calc.usFICAMonthly + calc.usStateMonthly + calc.usCityMonthly)} isExpense variant="section" expandable expanded={taxesOpen} onToggle={() => setTaxesOpen(!taxesOpen)} />
                {taxesOpen && (
                  <>
                    <SunriseRow label="Income Tax" il={-calc.ilMasHachnasaUSD} us={-calc.usFedMonthly} isExpense variant="sub" />
                    <SunriseRow label="Social Sec. & Health" il={-calc.ilBTLUSD} us={-calc.usFICAMonthly} isExpense variant="sub" />
                    <SunriseRow label="State Tax" il={0} us={-calc.usStateMonthly} isExpense variant="sub" />
                    <SunriseRow label="City Tax" il={0} us={-calc.usCityMonthly} isExpense variant="sub" />
                  </>
                )}
                <SunriseRow label="Retirement Contribution" il={-calc.ilEEMatchUSD} us={-calc.personalUSD} isExpense />
                <SunriseRow label="Net Take-Home Pay" il={calc.ilNetUSD} us={calc.netTakeHome} variant="section" />
                <SunriseRow label="Total Expenses" il={-calc.ilTotalOutUSD} us={-calc.usTotalOutUSD} isExpense variant="section" expandable expanded={expensesOpen} onToggle={() => setExpensesOpen(!expensesOpen)} />
                {expensesOpen && (
                  <>
                    <SunriseRow label="Rent & Utilities" il={-calc.ilHousingUSD} us={-calc.usRentUSD} isExpense variant="sub" />
                    <SunriseRow label="US Transit & Extras" il={0} us={-calc.usMiscBurnUSD} isExpense variant="sub" />
                    <SunriseRow label="Food, Fun & Living" il={-calc.ilLifestyleUSD} us={-calc.usLifestyleUSD} isExpense variant="sub" />
                  </>
                )}
                <SunriseRow label="Total Monthly Savings" il={calc.targetSavingsUSD} us={calc.totalInvested} variant="section" expandable expanded={savingsOpen} onToggle={() => setSavingsOpen(!savingsOpen)} />
                {savingsOpen && (
                  <>
                    <SunriseRow label="Your Contribution" il={calc.ilEEMatchUSD} us={calc.personalUSD} variant="sub" />
                    <SunriseRow label="Employer Match" il={calc.ilERMatchUSD} us={calc.employerUSD} variant="sub" />
                  </>
                )}
                <tr className="bg-orange-50/50 border-t-2 border-orange-200/80">
                  <td className="p-3 pl-4 sm:p-5 sm:pl-6 font-black text-orange-800 uppercase text-[10px] sm:text-xs tracking-widest">True Lifestyle Change</td>
                  <td className="p-3 sm:p-5 text-slate-500 font-bold">{formatValue(calc.ilLiquidFlowUSD)}</td>
                  <td className="p-3 sm:p-5 text-orange-600 font-black">{formatValue(calc.liquidCashFlow)}</td>
                  <td className={`p-3 pr-4 sm:p-5 sm:pr-6 text-right font-black ${calc.liquidDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{calc.liquidDelta > 0 ? '+' : ''}{formatValue(calc.liquidDelta)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
