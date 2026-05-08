import React from 'react';
import { TrendingUp, Wallet } from 'lucide-react';
import { fmtAmount, fmtPct } from './formatCurrency.js';

const CompareSummary = ({ theme, comparison, displayCurrency, sourceCurrency, destCurrency }) => {
  const { source, dest, liquidDeltaUSD, savingsDeltaUSD, takeHomeDeltaPctOfGross, liquidDeltaCOLAdjustedUSD } = comparison;

  const netDeltaUSD = (dest?.netUSD ?? 0) - (source?.netUSD ?? 0);
  const netDeltaPct = source?.netUSD ? netDeltaUSD / source.netUSD : 0;

  const liquidPos = liquidDeltaUSD >= 0;
  const colPos = liquidDeltaCOLAdjustedUSD >= 0;
  const savingsPos = savingsDeltaUSD >= 0;

  let verdict;
  if (liquidDeltaCOLAdjustedUSD > 5000 && savingsDeltaUSD > 0) {
    verdict = 'Strong upgrade — more take-home AND more savings, even after cost-of-living.';
  } else if (liquidDeltaCOLAdjustedUSD > 0 && savingsDeltaUSD >= 0) {
    verdict = 'Net positive after cost-of-living adjustment.';
  } else if (liquidDeltaCOLAdjustedUSD < 0 && savingsDeltaUSD < 0) {
    verdict = 'Lifestyle and savings both down — destination loses on every axis.';
  } else if (liquidDeltaCOLAdjustedUSD < 0) {
    verdict = 'Lower lifestyle after COL adjustment, even if nominal savings rise.';
  } else {
    verdict = 'Mixed: savings differ from take-home — consider priorities.';
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${theme.kpiCardBase} ${liquidPos ? theme.kpiPositive : theme.kpiNegative}`}>
          <div className={theme.kpiLabel}>
            <span className="flex items-center gap-1"><Wallet size={14} /> Net Take-Home Δ</span>
          </div>
          <div className={`text-2xl sm:text-4xl font-black tracking-tighter ${liquidPos ? theme.kpiValuePositive : theme.kpiValueNegative}`}>
            {netDeltaUSD >= 0 ? '+' : ''}{fmtAmount(netDeltaUSD, displayCurrency)}
          </div>
          <div className="text-xs font-bold mt-1 opacity-70">
            {netDeltaPct >= 0 ? '+' : ''}{fmtPct(netDeltaPct)} vs source
          </div>
        </div>

        <div className={`${theme.kpiCardBase} ${savingsPos ? theme.kpiPositive : theme.kpiNegative}`}>
          <div className={theme.kpiLabel}>
            <span className="flex items-center gap-1"><TrendingUp size={14} /> Savings Δ</span>
          </div>
          <div className={`text-2xl sm:text-4xl font-black tracking-tighter ${savingsPos ? theme.kpiValuePositive : theme.kpiValueNegative}`}>
            {savingsDeltaUSD >= 0 ? '+' : ''}{fmtAmount(savingsDeltaUSD, displayCurrency)}
          </div>
          <div className="text-xs font-bold mt-1 opacity-70">Annual</div>
        </div>

        <div className={`${theme.kpiCardBase} ${colPos ? theme.kpiAccent : theme.kpiNegative}`}>
          <div className={theme.kpiLabel}>
            <span className="flex items-center gap-1"><TrendingUp size={14} className={theme.kpiTrendIcon} /> Liquid (COL-adj) Δ</span>
          </div>
          <div className={`text-2xl sm:text-4xl font-black tracking-tighter ${colPos ? theme.kpiValueAccent : theme.kpiValueNegative}`}>
            {liquidDeltaCOLAdjustedUSD >= 0 ? '+' : ''}{fmtAmount(liquidDeltaCOLAdjustedUSD, displayCurrency)}
          </div>
          <div className="text-xs font-bold mt-1 opacity-70">
            Raw liquid Δ: {liquidDeltaUSD >= 0 ? '+' : ''}{fmtAmount(liquidDeltaUSD, displayCurrency)}
          </div>
        </div>
      </div>

      <div className={`${theme.sectionCard} grid grid-cols-1 sm:grid-cols-3 gap-4`}>
        <div>
          <div className={theme.kpiLabel}><span>Source effective tax</span></div>
          <div className="text-xl font-black">{fmtPct(source?.effectiveTaxRate ?? 0)}</div>
          <div className="text-xs opacity-60 mt-1">{sourceCurrency}</div>
        </div>
        <div>
          <div className={theme.kpiLabel}><span>Dest effective tax</span></div>
          <div className="text-xl font-black">{fmtPct(dest?.effectiveTaxRate ?? 0)}</div>
          <div className="text-xs opacity-60 mt-1">{destCurrency}</div>
        </div>
        <div>
          <div className={theme.kpiLabel}><span>Take-home Δ (% of gross)</span></div>
          <div className="text-xl font-black">{takeHomeDeltaPctOfGross >= 0 ? '+' : ''}{fmtPct(takeHomeDeltaPctOfGross)}</div>
        </div>
      </div>

      <div className={theme.lockedHint}>
        <TrendingUp size={14} className={`flex-shrink-0 mt-0.5 ${theme.lockedHintIcon}`} />
        <p className={theme.lockedHintText}><span className={theme.lockedHintHighlight}>Verdict:</span> {verdict}</p>
      </div>

      {comparison.warnings && comparison.warnings.length > 0 && (
        <div className={theme.lockedHint}>
          <p className={theme.lockedHintText}>
            {comparison.warnings.map((w, i) => <span key={i}>{w} </span>)}
          </p>
        </div>
      )}
    </div>
  );
};

export default CompareSummary;
