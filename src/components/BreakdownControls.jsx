import React from 'react';
import { fmtAmount } from './formatCurrency.js';

// Three toggles previously embedded in UnifiedBreakdown's header.
// Lifted out so they can render above the comparison summary cards.
const BreakdownControls = ({
  theme,
  displayMode, setDisplayMode, sourceCurrency, destCurrency,
  period, setPeriod,
  matchSourceSavings, setMatchSourceSavings,
  wealthGapUSD, displayCurrency,
}) => {
  const isLight = theme.name === 'Sunrise';
  const activeCls = isLight ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-indigo-500 text-white shadow';
  const inactiveCls = isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-slate-300';
  const shellCls = isLight ? 'bg-slate-200/50 border border-slate-300/50' : 'bg-white/5 border border-white/10';

  const btn = (active, onClick, label, ariaLabel) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${active ? activeCls : inactiveCls}`}
      aria-pressed={active}
      aria-label={ariaLabel}
    >{label}</button>
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-start justify-start sm:justify-end gap-x-3 gap-y-2">
        {setDisplayMode && (
          <div className="flex flex-col items-start sm:items-end gap-0.5">
            <div className={`flex p-1 rounded-lg ${shellCls}`}>
              {btn(displayMode === 'source', () => setDisplayMode('source'), `Source (${sourceCurrency})`)}
              {btn(displayMode === 'dest', () => setDisplayMode('dest'), `Dest (${destCurrency})`)}
            </div>
            <span className="text-[9px] uppercase tracking-widest font-black opacity-50">Display currency</span>
          </div>
        )}
        {setPeriod && (
          <div className="flex flex-col items-start sm:items-end gap-0.5">
            <div className={`flex p-1 rounded-lg ${shellCls}`}>
              {btn(period === 'annual', () => setPeriod('annual'), 'Yr')}
              {btn(period === 'monthly', () => setPeriod('monthly'), 'Mo')}
            </div>
            <span className="text-[9px] uppercase tracking-widest font-black opacity-50">Period</span>
          </div>
        )}
        {setMatchSourceSavings && (
          <div className="flex flex-col items-start sm:items-end gap-0.5">
            <button
              type="button"
              onClick={() => setMatchSourceSavings(!matchSourceSavings)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-bold transition-all ${matchSourceSavings ? activeCls : `${inactiveCls} ${shellCls}`}`}
              aria-pressed={matchSourceSavings}
              title="Force destination 401(k)/pension EE % to match source's total savings (in USD). Surfaces a Wealth Gap if uncoverable."
            >
              {matchSourceSavings ? '✓ Match savings' : 'Match savings'}
            </button>
            <span className="text-[9px] uppercase tracking-widest font-black opacity-50">Savings lock</span>
          </div>
        )}
      </div>
      {matchSourceSavings && wealthGapUSD > 100 && (
        <div className={`px-4 py-2 rounded-lg text-xs leading-relaxed ${theme.name === 'Sunrise' ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-rose-500/10 text-rose-300 border border-rose-500/30'}`}>
          <strong>Wealth Gap:</strong> Match-savings is ON but the destination's legal pre-tax retirement cap (e.g., 401(k) $24,500/yr, Säule 3a CHF 7,258/yr, etc.) was reached before matching the source's full annual savings. Annual shortfall: <strong>{fmtAmount(wealthGapUSD, displayCurrency)}</strong>. To close it, the dest would need to save in taxable accounts (RSUs, brokerage) outside this engine.
        </div>
      )}
    </div>
  );
};

export default BreakdownControls;
