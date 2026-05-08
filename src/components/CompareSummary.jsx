import React from 'react';
import { TrendingUp, Wallet } from 'lucide-react';
import { fmtAmount, fmtPct } from './formatCurrency.js';
import Tooltip from './Tooltip.jsx';

const Tip = ({ theme, text }) => <Tooltip theme={theme} text={text} iconSize={11} />;

const CompareSummary = ({ theme, comparison, displayCurrency, sourceCurrency, destCurrency, period = 'annual' }) => {
  const { source, dest, liquidDeltaUSD: rawLiquidDelta, savingsDeltaUSD: rawSavingsDelta, takeHomeDeltaPctOfGross, liquidDeltaCOLAdjustedUSD: rawColDelta } = comparison;
  const periodDivisor = period === 'monthly' ? 12 : 1;
  const periodSuffix = period === 'monthly' ? '/mo' : '/yr';
  const liquidDeltaUSD = rawLiquidDelta / periodDivisor;
  const savingsDeltaUSD = rawSavingsDelta / periodDivisor;
  const liquidDeltaCOLAdjustedUSD = rawColDelta / periodDivisor;

  const netDeltaUSD = ((dest?.netUSD ?? 0) - (source?.netUSD ?? 0)) / periodDivisor;
  const netDeltaPct = source?.netUSD ? (netDeltaUSD * periodDivisor) / source.netUSD : 0;

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
            <span className="flex items-center gap-1"><Wallet size={14} /> Net Take-Home Δ <Tip theme={theme} text="Destination's annual net take-home minus source's, in USD. Net = gross − tax − social security − pre-tax retirement. The % below is delta as a fraction of source's net." /></span>
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
            <span className="flex items-center gap-1"><TrendingUp size={14} /> Savings Δ <Tip theme={theme} text="Annual retirement savings delta in USD: dest total savings (EE + ER + severance where applicable) minus source total savings. Includes 401(k), pension, Säule 3a, iDeCo, EOSG, etc., per each country's vehicle." /></span>
          </div>
          <div className={`text-2xl sm:text-4xl font-black tracking-tighter ${savingsPos ? theme.kpiValuePositive : theme.kpiValueNegative}`}>
            {Math.abs(savingsDeltaUSD * periodDivisor) < 100
              ? <span className="opacity-70">Matched</span>
              : <>{savingsDeltaUSD >= 0 ? '+' : ''}{fmtAmount(savingsDeltaUSD, displayCurrency)}</>}
          </div>
          <div className="text-xs font-bold mt-1 opacity-70">{period === 'monthly' ? 'Monthly' : 'Annual'}</div>
        </div>

        <div className={`${theme.kpiCardBase} ${colPos ? theme.kpiAccent : theme.kpiNegative}`}>
          <div className={theme.kpiLabel}>
            <span className="flex items-center gap-1"><TrendingUp size={14} className={theme.kpiTrendIcon} /> Liquid (COL-adj) Δ <Tip theme={theme} text="Annual money left over after rent + misc burn, normalized for cost of living. Formula: dest_liquid × (sourceCOL/destCOL) − source_liquid. Higher = dest's leftover stretches further than source's. Raw (non-COL-adjusted) delta shown below." /></span>
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
          <div className={theme.kpiLabel}><span className="flex items-center gap-1">Source effective tax <Tip theme={theme} text="(Source income tax + social security + state/local tax) ÷ source gross. Excludes pension contributions." /></span></div>
          <div className="text-xl font-black">{fmtPct(source?.effectiveTaxRate ?? 0)}</div>
          <div className="text-xs opacity-60 mt-1">{sourceCurrency}</div>
        </div>
        <div>
          <div className={theme.kpiLabel}><span className="flex items-center gap-1">Dest effective tax <Tip theme={theme} text="(Dest income tax + social security + state/local tax) ÷ dest gross. Excludes pension contributions." /></span></div>
          <div className="text-xl font-black">{fmtPct(dest?.effectiveTaxRate ?? 0)}</div>
          <div className="text-xs opacity-60 mt-1">{destCurrency}</div>
        </div>
        <div>
          <div className={theme.kpiLabel}><span className="flex items-center gap-1">Take-home Δ (% of gross) <Tip theme={theme} text="(Dest take-home % of dest gross) − (source take-home % of source gross). Captures whether moving improves or worsens what fraction of your salary you keep, independent of absolute numbers." /></span></div>
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
