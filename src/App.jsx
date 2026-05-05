import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp,
  MapPin,
  ShieldCheck,
  Calculator,
  Wallet,
  Zap,
  Target,
  Info,
  Lock,
  HelpCircle,
  LayoutGrid,
  Sun,
  LayoutTemplate
} from 'lucide-react';

const FED_BRACKETS = [
  { max: 11600, rate: 0.10 }, { max: 47150, rate: 0.12 }, { max: 100525, rate: 0.22 },
  { max: 191950, rate: 0.24 }, { max: 243725, rate: 0.32 }, { max: 609350, rate: 0.35 },
  { max: Infinity, rate: 0.37 }
];

const NY_STATE_BRACKETS = [
  { max: 8500, rate: 0.04 }, { max: 11700, rate: 0.045 }, { max: 13900, rate: 0.0525 },
  { max: 80650, rate: 0.0585 }, { max: 215400, rate: 0.0597 }, { max: 1077550, rate: 0.0685 },
  { max: Infinity, rate: 0.109 }
];

const NYC_LOCAL_BRACKETS = [
  { max: 12000, rate: 0.03078 }, { max: 25000, rate: 0.03762 },
  { max: 50000, rate: 0.03819 }, { max: Infinity, rate: 0.03876 }
];

const NJ_STATE_BRACKETS = [
  { max: 20000, rate: 0.014 }, { max: 35000, rate: 0.0175 }, { max: 40000, rate: 0.035 },
  { max: 75000, rate: 0.05525 }, { max: 500000, rate: 0.0637 }, { max: 1000000, rate: 0.0897 },
  { max: Infinity, rate: 0.1075 }
];

const LOCATIONS = {
  'NYC': { name: 'Manhattan (UWS)', state: 'NY', city: 'NYC', defaultRent: 4500 },
  'NJ': { name: 'Hoboken/JC', state: 'NJ', city: null, defaultRent: 3900 },
  'WNY': { name: 'West NY/Guttenberg', state: 'NJ', city: null, defaultRent: 2900 },
  'ATX': { name: 'Austin, TX', state: 'TX', city: null, defaultRent: 2600 },
  'HOU': { name: 'Houston, TX', state: 'TX', city: null, defaultRent: 2200 },
};

const calcBrackets = (income, brackets) => {
  let tax = 0;
  let previousMax = 0;
  for (const b of brackets) {
    if (income > previousMax) {
      const taxableInBracket = Math.min(income, b.max) - previousMax;
      tax += taxableInBracket * b.rate;
      previousMax = b.max;
    } else break;
  }
  return tax;
};

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

  const calc = useMemo(() => {
    const _ilGross = Number(ilGross) || 0;
    const _ilERPension = Number(ilERPension) || 0;
    const _ilERSeverance = Number(ilERSeverance) || 0;
    const _ilERKeren = Number(ilERKeren) || 0;
    const _ilEEPension = Number(ilEEPension) || 0;
    const _ilEEKeren = Number(ilEEKeren) || 0;
    const _ilRent = Number(ilRent) || 0;
    const _ilBurn = Number(ilBurn) || 0;
    const _fxRate = Number(fxRate) || 0.27;
    const _usGrossAnnual = Number(usGrossAnnual) || 0;
    const _usRent = Number(usRent) || 0;
    const _us401kMatchLimit = Number(us401kMatchLimit) || 0;
    const _usMiscBurn = Number(usMiscBurn) || 0;

    const totalILSPct = _ilEEPension + _ilEEKeren + _ilERPension + _ilERSeverance + _ilERKeren;

    // Israel: Bituach Leumi (Social Security)
    const btlThreshold = 7703;
    const btlLow = Math.min(_ilGross, btlThreshold) * 0.035;
    const btlHigh = Math.max(0, Math.min(_ilGross, 49030) - btlThreshold) * 0.12;
    const ilBTL = btlLow + btlHigh;

    // Israel: Mas Hachnasa (Income Tax) — 2024 monthly brackets
    let tax = 0;
    if (_ilGross > 0) tax += Math.min(_ilGross, 7010) * 0.10;
    if (_ilGross > 7010) tax += Math.min(_ilGross - 7010, 3050) * 0.14;
    if (_ilGross > 10060) tax += Math.min(_ilGross - 10060, 8940) * 0.20;
    if (_ilGross > 19000) tax += Math.min(_ilGross - 19000, 6100) * 0.31;
    if (_ilGross > 25100) tax += Math.min(_ilGross - 25100, 21590) * 0.35;
    if (_ilGross > 46690) tax += Math.min(_ilGross - 46690, 13440) * 0.47;
    if (_ilGross > 60130) tax += (_ilGross - 60130) * 0.50;
    const creditPointsValue = 2.25 * 242; // 2.25 standard credit points
    const ilMasHachnasa = Math.max(0, tax - creditPointsValue);

    const ilEEPensionILS = _ilGross * (_ilEEPension / 100);
    const ilEEKerenILS = _ilGross * (_ilEEKeren / 100);
    const ilNet = _ilGross - ilBTL - ilMasHachnasa - ilEEPensionILS - ilEEKerenILS;

    const ilTotalOutUSD = (_ilRent + _ilBurn) * _fxRate;
    const ilLiquidFlowUSD = ilNet * _fxRate - ilTotalOutUSD;

    const ilERMatchUSD = _ilGross * ((_ilERPension + _ilERSeverance + _ilERKeren) / 100) * _fxRate;
    const ilEEMatchUSD = (ilEEPensionILS + ilEEKerenILS) * _fxRate;
    const targetSavingsUSD = ilERMatchUSD + ilEEMatchUSD;

    // US calc
    const locData = LOCATIONS[selectedLoc] || LOCATIONS['NYC'];
    const usGrossMonthly = _usGrossAnnual / 12;
    const usBurnUSD = _ilBurn * _fxRate;
    const usTotalOutUSD = _usRent + _usMiscBurn + usBurnUSD;
    const maxERMatchUSD = usGrossMonthly * (_us401kMatchLimit / 100);

    // 401k strategy: capture full employer match, then top up personal to hit IL target
    let employerUSD = maxERMatchUSD;
    let personalUSD = maxERMatchUSD;
    let totalInvested = employerUSD + personalUSD;
    if (totalInvested < targetSavingsUSD) {
      personalUSD += targetSavingsUSD - totalInvested;
      totalInvested = personalUSD + employerUSD;
    }
    const optimalPct = usGrossMonthly > 0 ? (personalUSD / usGrossMonthly) * 100 : 0;
    const personalAnnual = personalUSD * 12;

    // FICA: SS (capped) + Medicare + Additional Medicare on income > $200k
    const ssTaxAnnual = Math.min(_usGrossAnnual, 168600) * 0.062;
    const medTaxAnnual = _usGrossAnnual * 0.0145 + (_usGrossAnnual > 200000 ? (_usGrossAnnual - 200000) * 0.009 : 0);
    const usFICAAnnual = ssTaxAnnual + medTaxAnnual;

    // Federal income tax
    const fedStandardDeduction = 14600;
    const fedTaxable = Math.max(0, _usGrossAnnual - personalAnnual - fedStandardDeduction);
    const usFedAnnual = calcBrackets(fedTaxable, FED_BRACKETS);

    // State + City
    let usStateAnnual = 0;
    let usCityAnnual = 0;
    if (locData.state === 'NY') {
      const nyTaxable = Math.max(0, _usGrossAnnual - personalAnnual - 8000);
      usStateAnnual = calcBrackets(nyTaxable, NY_STATE_BRACKETS);
      if (locData.city === 'NYC') {
        usCityAnnual = calcBrackets(nyTaxable, NYC_LOCAL_BRACKETS);
      }
    } else if (locData.state === 'NJ') {
      const njTaxable = Math.max(0, _usGrossAnnual - personalAnnual - 1000);
      usStateAnnual = calcBrackets(njTaxable, NJ_STATE_BRACKETS);
    }

    const usTaxesAnnual = usFICAAnnual + usFedAnnual + usStateAnnual + usCityAnnual;
    const usTaxesMonthly = usTaxesAnnual / 12;
    const netTakeHome = usGrossMonthly - personalUSD - usTaxesMonthly;
    const liquidCashFlow = netTakeHome - usTotalOutUSD;
    const liquidDelta = liquidCashFlow - ilLiquidFlowUSD;

    return {
      targetSavingsUSD,
      optimalPct,
      totalILSPct,
      ilNet,
      ilLiquidFlowUSD,
      ilERMatchUSD,
      ilEEMatchUSD,
      usTotalOutUSD,
      usBurnUSD,
      personalUSD,
      employerUSD,
      totalInvested,
      netTakeHome,
      liquidCashFlow,
      liquidDelta,
      ilGrossUSD: _ilGross * _fxRate,
      usGrossMonthly,
      ilMasHachnasaUSD: ilMasHachnasa * _fxRate,
      ilBTLUSD: ilBTL * _fxRate,
      usFedMonthly: usFedAnnual / 12,
      usFICAMonthly: usFICAAnnual / 12,
      usStateMonthly: usStateAnnual / 12,
      usCityMonthly: usCityAnnual / 12,
      ilHousingUSD: _ilRent * _fxRate,
      usRentUSD: _usRent,
      usMiscBurnUSD: _usMiscBurn,
      ilLifestyleUSD: _ilBurn * _fxRate,
      usLifestyleUSD: usBurnUSD,
      ilTotalOutUSD,
      ilNetUSD: ilNet * _fxRate
    };
  }, [ilGross, ilERPension, ilERSeverance, ilERKeren, ilEEPension, ilEEKeren, ilRent, ilBurn, fxRate, selectedLoc, usGrossAnnual, usRent, us401kMatchLimit, usMiscBurn]);

  useEffect(() => {
    setUsRent(LOCATIONS[selectedLoc]?.defaultRent?.toString() || "4500");
  }, [selectedLoc]);

  const coreState = { ...calc, ilGross, setIlGross, ilERPension, setIlERPension, ilERSeverance, setIlERSeverance, ilERKeren, setIlERKeren, ilEEPension, setIlEEPension, ilEEKeren, setIlEEKeren, ilRent, setIlRent, ilBurn, setIlBurn, selectedLoc, setSelectedLoc, usGrossAnnual, setUsGrossAnnual, usRent, setUsRent, us401kMatchLimit, setUs401kMatchLimit, usMiscBurn, setUsMiscBurn, calc };

  return (
    <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${activeLayout === 'sunrise' ? 'bg-slate-100' : 'bg-[#0B0F19]'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-center mb-8">
          <div className={`flex p-1 rounded-lg border ${activeLayout === 'sunrise' ? 'bg-slate-200/50 border-slate-300/50' : 'bg-white/5 border-white/10'}`}>
            <LayoutButton icon={<Sun size={16}/>} label="Sunrise" id="sunrise" active={activeLayout} set={setActiveLayout} />
            <LayoutButton icon={<LayoutGrid size={16}/>} label="Bento Grid" id="bento" active={activeLayout} set={setActiveLayout} />
          </div>
        </div>
        {activeLayout === 'sunrise' ? <LayoutSunrise {...coreState} /> : <LayoutBento {...coreState} />}
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
      <td className="p-4 pl-6 text-slate-300 font-medium">{label}</td>
      <td className="p-4 text-slate-500">{formatValue(il)}</td>
      <td className="p-4 text-slate-200 font-bold">{formatValue(us)}</td>
      <td className={`p-4 pr-6 text-right font-bold ${isPositive ? 'text-emerald-400' : 'text-slate-500'}`}>{isPositive ? '+' : ''}{formatValue(delta)}</td>
    </tr>
  );
};

const LayoutBento = ({ calc, ...s }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans tracking-tight">
      <header className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 tracking-tighter">Relocation Architect</h1>
          <p className="text-slate-400 text-sm font-medium">Savings-Matched Calculator</p>
        </div>
        <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-full backdrop-blur-xl shadow-xl flex items-center gap-3">
          <Lock size={16} className="text-indigo-400" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-widest">Total IL Savings Rate ({calc.totalILSPct.toFixed(1)}%)</span>
          <span className="text-xl font-black text-white">${Math.round(calc.targetSavingsUSD).toLocaleString()}</span>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-2xl flex items-center justify-center mb-6 border border-indigo-500/30"><ShieldCheck className="text-indigo-400" size={20} /></div>
            <h3 className="text-lg font-black text-white mb-6">Israel (Current Setup)</h3>
            <div className="space-y-4">
              <BentoInput label="Gross Pay (ILS)" value={s.ilGross} onChange={s.setIlGross} />
              <div className="grid grid-cols-2 gap-4">
                <BentoInput label="Your Pension %" value={s.ilEEPension} onChange={s.setIlEEPension} step={0.1} />
                <BentoInput label="Your Keren %" value={s.ilEEKeren} onChange={s.setIlEEKeren} step={0.1} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <BentoInput label="Employer Pension %" value={s.ilERPension} onChange={s.setIlERPension} step={0.1} />
                <BentoInput label="Employer Severance %" value={s.ilERSeverance} onChange={s.setIlERSeverance} step={0.1} />
                <BentoInput label="Employer Keren %" value={s.ilERKeren} onChange={s.setIlERKeren} step={0.1} />
              </div>
              <BentoInput label="Rent + Bills (ILS)" value={s.ilRent} onChange={s.setIlRent} />
              <BentoInput label="Food, Fun & Living (ILS)" value={s.ilBurn} onChange={s.setIlBurn} />
            </div>
          </div>
          <div className="bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <div className="w-10 h-10 bg-cyan-500/20 rounded-2xl flex items-center justify-center mb-6 border border-cyan-500/30"><Target className="text-cyan-400" size={20} /></div>
            <h3 className="text-lg font-black text-white mb-6">US Offer & Costs</h3>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-black/20 rounded-xl overflow-x-auto no-scrollbar">
                {Object.keys(LOCATIONS).map((key) => (
                  <button key={key} onClick={() => s.setSelectedLoc(key)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${s.selectedLoc === key ? 'bg-white/10 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}>{key}</button>
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
            <div className="bg-gradient-to-br from-[#1A1F2E] to-[#0F131D] border border-white/5 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${calc.liquidCashFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 block">Cash Leftover</span>
              <div className={`text-5xl font-black tracking-tighter ${calc.liquidCashFlow >= 0 ? 'text-white' : 'text-rose-400'}`}>{formatValue(calc.liquidCashFlow)}</div>
            </div>
            <div className="bg-gradient-to-br from-indigo-900/40 to-[#0F131D] border border-indigo-500/20 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden group">
              <div className={`absolute top-0 right-0 w-32 h-32 blur-3xl opacity-20 group-hover:opacity-40 transition-opacity ${calc.liquidDelta >= 0 ? 'bg-indigo-500' : 'bg-rose-500'}`}></div>
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-widest mb-2 block">True Lifestyle Change</span>
              <div className="text-5xl font-black text-white tracking-tighter">{calc.liquidDelta > 0 ? '+' : ''}{formatValue(calc.liquidDelta)}</div>
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <Zap className="text-yellow-400" size={24} />
              <h3 className="text-lg font-black text-white">Matching Your Israeli Savings</h3>
              <div className="ml-auto px-4 py-1.5 bg-yellow-400/10 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/20">{calc.optimalPct.toFixed(2)}% Required</div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <BentoStat label="Net Take-Home" val={calc.netTakeHome} />
              <BentoStat label="Total Expenses" val={calc.usTotalOutUSD} />
              <BentoStat label="You Pay (401k)" val={calc.personalUSD} />
              <BentoStat label="Employer Pays" val={calc.employerUSD} color="text-indigo-400" />
            </div>
          </div>
          <div className="bg-white/[0.02] border border-white/5 rounded-[2rem] overflow-hidden shadow-2xl p-2">
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                <tr><th className="p-4 pl-6">Monthly Breakdown</th><th className="p-4">Israel</th><th className="p-4">US</th><th className="p-4 pr-6 text-right">Difference</th></tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <BentoRow label="Gross Pay" il={calc.ilGrossUSD} us={calc.usGrossMonthly} />
                <BentoRow label="Taxes & Deductions" il={-(calc.ilMasHachnasaUSD + calc.ilBTLUSD + calc.ilEEMatchUSD)} us={-(calc.usFedMonthly + calc.usFICAMonthly + calc.usStateMonthly + calc.usCityMonthly + calc.personalUSD)} />
                <BentoRow label="Total Expenses" il={-calc.ilTotalOutUSD} us={-calc.usTotalOutUSD} />
                <BentoRow label="Retirement Savings" il={calc.targetSavingsUSD} us={calc.totalInvested} />
                <tr className="bg-indigo-500/10">
                  <td className="p-4 pl-6 font-bold text-indigo-300">Leftover Cash</td>
                  <td className="p-4 text-slate-400 font-medium">{formatValue(calc.ilLiquidFlowUSD)}</td>
                  <td className="p-4 text-white font-black">{formatValue(calc.liquidCashFlow)}</td>
                  <td className={`p-4 pr-6 text-right font-black ${calc.liquidDelta >= 0 ? 'text-indigo-400' : 'text-rose-500'}`}>{calc.liquidDelta > 0 ? '+' : ''}{formatValue(calc.liquidDelta)}</td>
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

const SunriseRow = ({ label, il, us, isExpense, sub, bg, bold }) => {
  const delta = us - il;
  let deltaColor = 'text-slate-400';
  if (delta > 0) deltaColor = 'text-emerald-600';
  if (delta < 0) deltaColor = 'text-rose-500';

  let baseClass = `hover:bg-slate-100/40 transition-colors ${bg || ''}`;
  let labelClass = `text-slate-600 ${sub ? 'pl-10 text-xs' : 'font-bold'} ${bold ? 'uppercase tracking-widest text-[10px]' : ''}`;
  let valClassIL = `${isExpense ? 'text-slate-400' : 'text-slate-500'} ${bold ? 'font-bold text-slate-600' : 'font-medium'}`;
  let valClassUS = `${isExpense ? 'text-slate-600' : 'text-slate-800'} ${bold ? 'font-black' : 'font-bold'}`;
  let deltaClass = `font-black ${deltaColor} ${bold ? 'text-sm' : ''}`;

  return (
    <tr className={baseClass}>
      <td className={`p-4 pl-6 ${labelClass}`}>{label}</td>
      <td className={`p-4 ${valClassIL}`}>{formatValue(il)}</td>
      <td className={`p-4 ${valClassUS}`}>{formatValue(us)}</td>
      <td className={`p-4 pr-6 text-right ${deltaClass}`}>{delta > 0 ? '+' : ''}{formatValue(delta)}</td>
    </tr>
  );
};

const LayoutSunrise = ({ calc, ...s }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500 text-slate-800">
      <header className="border-b border-orange-200/50 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2 text-slate-900"><Sun className="text-orange-500" strokeWidth={3} /> RELOCATION ARCHITECT <span className="text-xs bg-orange-100/80 text-orange-600 px-2 py-1 rounded-full border border-orange-200/50">Sunrise</span></h1>
          <p className="text-slate-500 text-sm mt-1 uppercase tracking-widest font-bold">Savings-Matched Calculator</p>
        </div>
        <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl text-right shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase font-black block mb-1">Total IL Savings Rate ({calc.totalILSPct.toFixed(1)}%)</span>
          <div className="text-2xl font-black text-orange-500 flex items-center justify-end gap-2"><Lock size={18} /> ${Math.round(calc.targetSavingsUSD).toLocaleString()} <span className="text-xs font-bold text-slate-400">/mo</span></div>
        </div>
      </header>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-orange-600 text-xs font-black uppercase flex items-center gap-2 mb-4"><ShieldCheck size={16} /> Israel (Current Setup)</h3>
            <div className="space-y-4">
              <SunriseInput label="Gross Pay (ILS)" value={s.ilGross} onChange={s.setIlGross} tooltip="Total monthly salary before taxes." />
              <SunriseInput label="Net Take-Home (Auto-Calc)" value={Math.round(calc.ilNet)} onChange={() => {}} disabled={true} tooltip="Cash that hits your checking account after taxes and deductions." />
              <div className="grid grid-cols-2 gap-3">
                <SunriseInput label="Your Pension %" value={s.ilEEPension} onChange={s.setIlEEPension} step={0.1} tooltip="The percentage YOU pay into your pension (usually 6%)." />
                <SunriseInput label="Your Keren %" value={s.ilEEKeren} onChange={s.setIlEEKeren} step={0.1} tooltip="The percentage YOU pay into Keren Hishtalmut (usually 2.5%)." />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <SunriseInput label="Employer Pension %" value={s.ilERPension} onChange={s.setIlERPension} step={0.1} tooltip="Employer Pension match (usually 6.5%)." />
                <SunriseInput label="Employer Severance %" value={s.ilERSeverance} onChange={s.setIlERSeverance} step={0.1} tooltip="Employer Severance/Pitzuim (usually 8.33%)." />
                <SunriseInput label="Employer Keren %" value={s.ilERKeren} onChange={s.setIlERKeren} step={0.1} tooltip="Employer Keren Hishtalmut (usually 7.5%)." />
              </div>
              <SunriseInput label="Rent + Bills (ILS)" value={s.ilRent} onChange={s.setIlRent} tooltip="Monthly housing and utilities." />
              <SunriseInput label="Food, Fun & Living (ILS)" value={s.ilBurn} onChange={s.setIlBurn} tooltip="Remaining monthly spending. We convert this to USD to ensure your lifestyle doesn't drop." />
            </div>
          </section>
          <section className="bg-slate-50 border border-slate-200/80 rounded-2xl p-6 shadow-sm">
            <h3 className="text-blue-600 text-xs font-black uppercase flex items-center gap-2 mb-4"><Target size={16} /> US Offer & Costs</h3>
            <div className="space-y-4">
              <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl overflow-x-auto no-scrollbar">
                {Object.keys(LOCATIONS).map((key) => (
                  <button key={key} onClick={() => s.setSelectedLoc(key)} className={`flex-1 px-2 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${s.selectedLoc === key ? 'bg-white text-blue-600 shadow-sm border border-slate-200/50' : 'text-slate-500 hover:text-slate-700'}`}>{key}</button>
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
            <div className={`p-6 rounded-3xl border ${calc.liquidCashFlow >= 0 ? 'bg-emerald-50/50 border-emerald-200/80' : 'bg-rose-50/50 border-rose-200/80'} shadow-sm`}>
              <div className="flex justify-between items-center mb-2 text-[10px] uppercase font-black text-slate-500"><span className="flex items-center gap-1"><Wallet size={14} /> Cash Leftover</span></div>
              <div className={`text-5xl font-black tracking-tighter ${calc.liquidCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatValue(calc.liquidCashFlow)}</div>
            </div>
            <div className="p-6 rounded-3xl border bg-orange-50/50 border-orange-200/80 shadow-sm">
              <div className="flex justify-between items-center mb-2 text-[10px] uppercase font-black text-slate-500"><span className="flex items-center gap-1"><TrendingUp size={14} className="text-orange-500" /> True Lifestyle Change</span></div>
              <div className="text-5xl font-black text-orange-600 tracking-tighter">{calc.liquidDelta > 0 ? '+' : ''}{formatValue(calc.liquidDelta)}</div>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl p-6 relative shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="bg-orange-100/80 p-3 rounded-2xl text-orange-600"><Lock size={24} /></div>
              <div>
                <h4 className="text-sm font-black uppercase text-slate-900">Matching Your Israeli Savings</h4>
                <p className="text-xs text-slate-500 mt-1 font-medium">We locked your US savings to match your total Israeli savings rate. You need to contribute <span className="text-orange-600 font-bold">{calc.optimalPct.toFixed(2)}%</span> to break even on wealth building.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-200/60 pt-6">
              <SunriseStat label="Net Take-Home" val={calc.netTakeHome} />
              <SunriseStat label="Total Expenses" val={calc.usTotalOutUSD} color="text-rose-500" />
              <SunriseStat label="You Pay (401k)" val={calc.personalUSD} color="text-blue-600" />
              <SunriseStat label="Employer Pays" val={calc.employerUSD} color="text-emerald-600" />
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-3xl overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100/60 text-slate-500 uppercase font-black text-xs border-b border-slate-200/80">
                <tr><th className="p-4 pl-6">Monthly Breakdown (USD)</th><th className="p-4">Israel (Current)</th><th className="p-4">US (Offer)</th><th className="p-4 pr-6 text-right">Difference</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200/40">
                <SunriseRow label="Gross Pay" il={calc.ilGrossUSD} us={calc.usGrossMonthly} bold />
                <SunriseRow label="Retirement Savings" il={-calc.ilEEMatchUSD} us={-calc.personalUSD} isExpense />
                <SunriseRow label="Income Tax" il={-calc.ilMasHachnasaUSD} us={-calc.usFedMonthly} isExpense sub />
                <SunriseRow label="Social Sec. & Health" il={-calc.ilBTLUSD} us={-calc.usFICAMonthly} isExpense sub />
                <SunriseRow label="State Tax" il={0} us={-calc.usStateMonthly} isExpense sub />
                <SunriseRow label="City Tax" il={0} us={-calc.usCityMonthly} isExpense sub />
                <SunriseRow label="Net Take-Home Pay" il={calc.ilNetUSD} us={calc.netTakeHome} bg="bg-slate-100/60" bold />
                <SunriseRow label="Rent & Utilities" il={-calc.ilHousingUSD} us={-calc.usRentUSD} isExpense />
                <SunriseRow label="US Transit & Extras" il={0} us={-calc.usMiscBurnUSD} isExpense />
                <SunriseRow label="Food, Fun & Living" il={-calc.ilLifestyleUSD} us={-calc.usLifestyleUSD} isExpense />
                <SunriseRow label="Total Expenses" il={-calc.ilTotalOutUSD} us={-calc.usTotalOutUSD} isExpense bg="bg-slate-100/60" bold />
                <SunriseRow label="Employer Match" il={calc.ilERMatchUSD} us={calc.employerUSD} />
                <SunriseRow label="Your Contribution" il={calc.ilEEMatchUSD} us={calc.personalUSD} />
                <SunriseRow label="Total Monthly Savings" il={calc.targetSavingsUSD} us={calc.totalInvested} bg="bg-slate-100/60" bold />
                <tr className="bg-orange-50/50 border-t-2 border-orange-200/80">
                  <td className="p-5 pl-6 font-black text-orange-800 uppercase text-xs tracking-widest">True Lifestyle Change</td>
                  <td className="p-5 text-slate-500 font-bold">{formatValue(calc.ilLiquidFlowUSD)}</td>
                  <td className="p-5 text-orange-600 font-black">{formatValue(calc.liquidCashFlow)}</td>
                  <td className={`p-5 pr-6 text-right font-black ${calc.liquidDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{calc.liquidDelta > 0 ? '+' : ''}{formatValue(calc.liquidDelta)}</td>
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
