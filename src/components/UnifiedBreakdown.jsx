import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FX_USD_PER_UNIT } from '../fx.js';
import { fmtAmount } from './formatCurrency.js';
import BreakdownRow from './BreakdownRow.jsx';

// Convert each breakdown entry of a side into USD.
const itemsByKind = (result, predicate) => {
  if (!result) return [];
  const fx = FX_USD_PER_UNIT[result.currency] ?? 1;
  return (result.breakdown ?? [])
    .filter(predicate)
    .map((b) => ({ label: b.label, amountUSD: b.amount * fx, kind: b.kind }));
};

// Merge source-items and dest-items by label, source-first insertion order.
// Missing side stays undefined (rendered as —).
const mergeItems = (sourceItems, destItems) => {
  const order = [];
  const sMap = {};
  const dMap = {};
  for (const it of sourceItems) {
    if (!order.includes(it.label)) order.push(it.label);
    sMap[it.label] = (sMap[it.label] ?? 0) + it.amountUSD;
  }
  for (const it of destItems) {
    if (!order.includes(it.label)) order.push(it.label);
    dMap[it.label] = (dMap[it.label] ?? 0) + it.amountUSD;
  }
  return order.map((label) => ({
    label,
    sourceUSD: sMap[label],
    destUSD: dMap[label],
  }));
};

const PERIOD_STORAGE = 'relocation-calc:breakdownPeriod';

const UnifiedBreakdown = ({
  theme, comparison, displayCurrency,
  displayMode, setDisplayMode, sourceCurrency, destCurrency,
}) => {
  // Defaults match main: all closed initially.
  const [bankOpen, setBankOpen] = useState(false);
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(false);
  const [period, setPeriod] = useState(() => {
    if (typeof window === 'undefined') return 'annual';
    return window.localStorage.getItem(PERIOD_STORAGE) === 'monthly' ? 'monthly' : 'annual';
  });
  React.useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem(PERIOD_STORAGE, period);
  }, [period]);

  const { source, dest } = comparison ?? {};
  if (!source && !dest) return null;

  // FX → USD per side. All amounts below are in USD; `fmt` maps USD → displayCurrency.
  const sourceFx = source ? (FX_USD_PER_UNIT[source.currency] ?? 1) : 1;
  const destFx = dest ? (FX_USD_PER_UNIT[dest.currency] ?? 1) : 1;

  const periodDivisor = period === 'monthly' ? 12 : 1;
  const periodLabel = period === 'monthly' ? 'Monthly' : 'Annual';

  const fmt = (usd) => fmtAmount((usd ?? 0) / periodDivisor, displayCurrency);
  const cell = (usd) => (usd == null ? <span className="opacity-30">—</span> : fmtAmount(usd / periodDivisor, displayCurrency));

  // Aggregates (USD).
  const grossSource = source ? source.grossLocal * sourceFx : 0;
  const grossDest = dest ? dest.grossLocal * destFx : 0;
  const netSource = source?.netUSD ?? 0;
  const netDest = dest?.netUSD ?? 0;
  const liquidSource = source?.liquidUSD ?? null;
  const liquidDest = dest?.liquidUSD ?? null;
  const savingsSource = source?.totalSavingsUSD ?? null;
  const savingsDest = dest?.totalSavingsUSD ?? null;

  const taxItems = useMemo(() => mergeItems(
    itemsByKind(source, (b) => b.kind === 'tax' || b.kind === 'social'),
    itemsByKind(dest, (b) => b.kind === 'tax' || b.kind === 'social'),
  ), [source, dest]);

  const pensionItems = useMemo(() => mergeItems(
    itemsByKind(source, (b) => b.kind === 'pension'),
    itemsByKind(dest, (b) => b.kind === 'pension'),
  ), [source, dest]);

  // Sums for the expandable section "header" rows.
  const taxesSource = taxItems.reduce((a, it) => a + (it.sourceUSD ?? 0), 0);
  const taxesDest = taxItems.reduce((a, it) => a + (it.destUSD ?? 0), 0);

  const rentSource = source ? source.rentLocal * sourceFx : 0;
  const rentDest = dest ? dest.rentLocal * destFx : 0;
  const miscSource = source ? source.miscBurnLocal * sourceFx : 0;
  const miscDest = dest ? dest.miscBurnLocal * destFx : 0;
  const expensesSource = rentSource + miscSource;
  const expensesDest = rentDest + miscDest;

  // Top-row deltas (raw signed: dest − source).
  const liquidDelta = (liquidDest ?? 0) - (liquidSource ?? 0);
  const savingsDelta = (savingsDest ?? 0) - (savingsSource ?? 0);
  const netDelta = netDest - netSource;

  const isLight = theme.name === 'Sunrise';
  const activeCls = isLight ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' : 'bg-indigo-500 text-white shadow';
  const inactiveCls = isLight ? 'text-slate-500 hover:text-slate-800' : 'text-slate-500 hover:text-slate-300';
  const shellCls = isLight ? 'bg-slate-200/50 border border-slate-300/50' : 'bg-white/5 border border-white/10';

  const currencyBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setDisplayMode?.(id)}
      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${displayMode === id ? activeCls : inactiveCls}`}
      aria-pressed={displayMode === id}
    >{label}</button>
  );
  const periodBtn = (id, label) => (
    <button
      type="button"
      onClick={() => setPeriod(id)}
      className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${period === id ? activeCls : inactiveCls}`}
      aria-pressed={period === id}
    >{label}</button>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-3">
        {setDisplayMode && (
          <div className="flex flex-col items-end gap-0.5">
            <div className={`flex p-1 rounded-lg ${shellCls}`}>
              {currencyBtn('source', `Source (${sourceCurrency})`)}
              {currencyBtn('dest', `Dest (${destCurrency})`)}
            </div>
            <span className="text-[9px] uppercase tracking-widest font-black opacity-50">Display currency</span>
          </div>
        )}
        <div className="flex flex-col items-end gap-0.5">
          <div className={`flex p-1 rounded-lg ${shellCls}`}>
            {periodBtn('annual', 'Yr')}
            {periodBtn('monthly', 'Mo')}
          </div>
          <span className="text-[9px] uppercase tracking-widest font-black opacity-50">Period</span>
        </div>
      </div>

      <div className={theme.tableShell}>
        <table className="w-full text-left text-xs sm:text-sm min-w-[560px]">
          <thead className={theme.tableHead}>
            <tr>
              <th className="p-3 pl-4 sm:p-4 sm:pl-6">{periodLabel} Breakdown ({displayCurrency})</th>
              <th className="p-3 sm:p-4">Source</th>
              <th className="p-3 sm:p-4">Destination</th>
              <th className="p-3 pr-4 sm:p-4 sm:pr-6 text-right">Δ (Dest − Source)</th>
            </tr>
          </thead>
        <tbody className={theme.tableDivide}>
          {/* Bank balance roll-up */}
          <tr className={theme.bankRow} onClick={() => setBankOpen(!bankOpen)}>
            <td className={theme.bankRowLabel}>
              <span className={theme.bankRowChevron}>
                {bankOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              {periodLabel} Liquid (Bank balance)
            </td>
            <td className={theme.bankRowSource}>{cell(liquidSource)}</td>
            <td className={theme.bankRowDest}>{cell(liquidDest)}</td>
            <td className={`p-3 pr-4 sm:p-5 sm:pr-6 text-right font-black ${liquidDelta >= 0 ? theme.bankDeltaPos : theme.bankDeltaNeg}`}>
              {liquidDelta > 0 ? '+' : ''}{fmt(liquidDelta)}
            </td>
          </tr>
          {bankOpen && (
            <>
              <BreakdownRow theme={theme} fmt={fmt} label="Gross Pay" source={grossSource} dest={grossDest} />

              <BreakdownRow
                theme={theme}
                fmt={fmt}
                label="Taxes & Social"
                source={-taxesSource}
                dest={-taxesDest}
                isExpense
                expandable
                expanded={taxesOpen}
                onToggle={() => setTaxesOpen(!taxesOpen)}
              />
              {taxesOpen && taxItems.map((it) => (
                <BreakdownRow
                  key={`tax-${it.label}`}
                  theme={theme}
                  fmt={fmt}
                  label={it.label}
                  source={it.sourceUSD == null ? 0 : -it.sourceUSD}
                  dest={it.destUSD == null ? 0 : -it.destUSD}
                  isExpense
                  variant="sub"
                />
              ))}

              <tr className={theme.netRow}>
                <td className={theme.netRowLabel}>
                  <span className="inline-flex items-center justify-center w-4 h-4 mr-2 align-middle" />
                  Net Take-Home
                </td>
                <td className={theme.netRowSource}>{fmt(netSource)}</td>
                <td className={theme.netRowDest}>{fmt(netDest)}</td>
                <td className={`p-3 pr-4 sm:p-4 sm:pr-6 text-right text-sm font-semibold ${netDelta >= 0 ? theme.deltaPos : theme.deltaNeg}`}>
                  {netDelta > 0 ? '+' : ''}{fmt(netDelta)}
                </td>
              </tr>

              <BreakdownRow
                theme={theme}
                fmt={fmt}
                label="Living Expenses"
                source={-expensesSource}
                dest={-expensesDest}
                isExpense
                expandable
                expanded={expensesOpen}
                onToggle={() => setExpensesOpen(!expensesOpen)}
              />
              {expensesOpen && (
                <>
                  <BreakdownRow
                    theme={theme}
                    fmt={fmt}
                    label="Rent"
                    source={-rentSource}
                    dest={-rentDest}
                    isExpense
                    variant="sub"
                  />
                  <BreakdownRow
                    theme={theme}
                    fmt={fmt}
                    label="Misc burn"
                    source={-miscSource}
                    dest={-miscDest}
                    isExpense
                    variant="sub"
                  />
                </>
              )}
            </>
          )}

          {/* Savings roll-up */}
          <tr className={theme.savingsRow} onClick={() => setSavingsOpen(!savingsOpen)}>
            <td className={theme.savingsRowLabel}>
              <span className={theme.savingsRowChevron}>
                {savingsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              {periodLabel} Savings
            </td>
            <td className={theme.savingsRowSource}>{cell(savingsSource)}</td>
            <td className={theme.savingsRowDest}>{cell(savingsDest)}</td>
            <td className={`p-3 pr-4 sm:p-5 sm:pr-6 text-right font-black ${savingsDelta >= 0 ? theme.savingsDeltaPos : theme.savingsDeltaNeg}`}>
              {savingsDelta > 0 ? '+' : ''}{fmt(savingsDelta)}
            </td>
          </tr>
          {savingsOpen && pensionItems.length > 0 && pensionItems.map((it) => (
            <BreakdownRow
              key={`pension-${it.label}`}
              theme={theme}
              fmt={fmt}
              label={it.label}
              source={it.sourceUSD ?? 0}
              dest={it.destUSD ?? 0}
            />
          ))}
          {savingsOpen && pensionItems.length === 0 && (
            <tr><td colSpan={4} className="p-3 pl-8 text-sm opacity-50 italic">No pension/retirement contributions configured for either side.</td></tr>
          )}
        </tbody>
        </table>
      </div>
    </div>
  );
};

export default UnifiedBreakdown;
