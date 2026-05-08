import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FX_USD_PER_UNIT } from '../fx.js';
import { fmtAmount } from './formatCurrency.js';

// Sum the source/dest breakdown items that match the predicate; convert each to USD.
const sumByKind = (result, predicate) => {
  if (!result) return 0;
  const fx = FX_USD_PER_UNIT[result.currency] ?? 1;
  return (result.breakdown ?? [])
    .filter(predicate)
    .reduce((a, b) => a + (b.amount * fx), 0);
};

const itemsByKind = (result, predicate) => {
  if (!result) return [];
  const fx = FX_USD_PER_UNIT[result.currency] ?? 1;
  return (result.breakdown ?? [])
    .filter(predicate)
    .map((b) => ({ label: b.label, amountUSD: b.amount * fx, kind: b.kind }));
};

// Merge a list of source-items and dest-items by label (insertion order preserved).
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

const fmtCell = (v, displayCurrency) =>
  v == null ? <span className="opacity-30">—</span> : fmtAmount(v, displayCurrency);

const fmtDelta = (delta, displayCurrency, isExpense = false) => {
  if (delta == null || delta === 0) return <span className="opacity-30">—</span>;
  // For expenses, smaller (more negative) absolute spend is "better" — but we display raw signed delta.
  const cls = delta > 0
    ? (isExpense ? 'text-rose-500' : 'text-emerald-500')
    : (isExpense ? 'text-emerald-500' : 'text-rose-500');
  return (
    <span className={cls}>
      {delta > 0 ? '+' : ''}{fmtAmount(delta, displayCurrency)}
    </span>
  );
};

const TopRow = ({ label, sourceUSD, destUSD, displayCurrency, open, onToggle, accentBg, accentText, deltaPosClass, deltaNegClass }) => {
  const delta = (destUSD ?? 0) - (sourceUSD ?? 0);
  return (
    <tr className={`${accentBg} cursor-pointer transition-colors`} onClick={onToggle}>
      <td className="p-3 pl-4 sm:pl-6">
        <span className={`inline-flex items-center justify-center w-4 h-4 mr-2 align-middle ${accentText}`}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        <span className={`font-black uppercase text-[10px] sm:text-xs tracking-widest ${accentText}`}>{label}</span>
      </td>
      <td className="p-3 sm:p-4 text-slate-500 font-bold">{fmtCell(sourceUSD, displayCurrency)}</td>
      <td className={`p-3 sm:p-4 font-black ${accentText}`}>{fmtCell(destUSD, displayCurrency)}</td>
      <td className={`p-3 pr-4 sm:pr-6 text-right font-black ${delta >= 0 ? deltaPosClass : deltaNegClass}`}>
        {delta === 0 ? <span className="opacity-30">—</span> : `${delta > 0 ? '+' : ''}${fmtAmount(delta, displayCurrency)}`}
      </td>
    </tr>
  );
};

const SubGroupRow = ({ label, sourceUSD, destUSD, displayCurrency, open, onToggle, isExpense }) => {
  const delta = (destUSD ?? 0) - (sourceUSD ?? 0);
  return (
    <tr className="bg-slate-50/30 dark:bg-white/[0.01] cursor-pointer hover:bg-slate-100/50 dark:hover:bg-white/[0.03]" onClick={onToggle}>
      <td className="p-2.5 pl-8">
        <span className="inline-flex items-center justify-center w-3 h-3 mr-2 align-middle opacity-60">
          {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
        <span className="font-bold text-sm">{label}</span>
      </td>
      <td className="p-2.5 text-sm">{fmtCell(sourceUSD == null ? null : -sourceUSD, displayCurrency)}</td>
      <td className="p-2.5 text-sm">{fmtCell(destUSD == null ? null : -destUSD, displayCurrency)}</td>
      <td className="p-2.5 pr-4 sm:pr-6 text-right text-sm">
        {fmtDelta(-delta, displayCurrency, isExpense)}
      </td>
    </tr>
  );
};

const LeafRow = ({ label, sourceUSD, destUSD, displayCurrency, sub = false, isExpense = false }) => {
  const delta = (destUSD ?? 0) - (sourceUSD ?? 0);
  return (
    <tr className="hover:bg-slate-50/30 dark:hover:bg-white/[0.02]">
      <td className={`p-2 ${sub ? 'pl-12' : 'pl-8'} text-sm opacity-80`}>{label}</td>
      <td className="p-2 text-sm tabular-nums">{fmtCell(sourceUSD, displayCurrency)}</td>
      <td className="p-2 text-sm tabular-nums">{fmtCell(destUSD, displayCurrency)}</td>
      <td className="p-2 pr-4 sm:pr-6 text-right text-sm tabular-nums">
        {fmtDelta(delta, displayCurrency, isExpense)}
      </td>
    </tr>
  );
};

const NetRow = ({ label, sourceUSD, destUSD, displayCurrency }) => {
  const delta = (destUSD ?? 0) - (sourceUSD ?? 0);
  return (
    <tr className="bg-slate-100/70 dark:bg-white/[0.04] border-y border-slate-300/40 dark:border-white/10">
      <td className="p-3 pl-6 text-sm font-bold">{label}</td>
      <td className="p-3 text-sm font-bold tabular-nums">{fmtCell(sourceUSD, displayCurrency)}</td>
      <td className="p-3 text-sm font-bold tabular-nums">{fmtCell(destUSD, displayCurrency)}</td>
      <td className={`p-3 pr-4 sm:pr-6 text-right text-sm font-bold tabular-nums ${delta >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
        {delta === 0 ? <span className="opacity-30">—</span> : `${delta > 0 ? '+' : ''}${fmtAmount(delta, displayCurrency)}`}
      </td>
    </tr>
  );
};

const UnifiedBreakdown = ({ theme, comparison, displayCurrency }) => {
  const [bankOpen, setBankOpen] = useState(true);
  const [taxesOpen, setTaxesOpen] = useState(false);
  const [expensesOpen, setExpensesOpen] = useState(false);
  const [savingsOpen, setSavingsOpen] = useState(true);

  const { source, dest } = comparison ?? {};
  if (!source && !dest) return null;

  // Aggregates per side, all in USD.
  const sourceFx = source ? FX_USD_PER_UNIT[source.currency] : 1;
  const destFx = dest ? FX_USD_PER_UNIT[dest.currency] : 1;

  const grossSourceUSD = source ? source.grossLocal * sourceFx : null;
  const grossDestUSD = dest ? dest.grossLocal * destFx : null;
  const netSourceUSD = source?.netUSD ?? null;
  const netDestUSD = dest?.netUSD ?? null;
  const liquidSourceUSD = source?.liquidUSD ?? null;
  const liquidDestUSD = dest?.liquidUSD ?? null;
  const savingsSourceUSD = source?.totalSavingsUSD ?? null;
  const savingsDestUSD = dest?.totalSavingsUSD ?? null;

  const taxesSourceUSD = sumByKind(source, (b) => b.kind === 'tax' || b.kind === 'social');
  const taxesDestUSD = sumByKind(dest, (b) => b.kind === 'tax' || b.kind === 'social');

  const expensesSourceUSD = source ? (source.rentLocal + source.miscBurnLocal) * sourceFx : 0;
  const expensesDestUSD = dest ? (dest.rentLocal + dest.miscBurnLocal) * destFx : 0;

  const taxItems = useMemo(() => mergeItems(
    itemsByKind(source, (b) => b.kind === 'tax' || b.kind === 'social'),
    itemsByKind(dest, (b) => b.kind === 'tax' || b.kind === 'social'),
  ), [source, dest]);

  const pensionItems = useMemo(() => mergeItems(
    itemsByKind(source, (b) => b.kind === 'pension'),
    itemsByKind(dest, (b) => b.kind === 'pension'),
  ), [source, dest]);

  return (
    <div className={theme.tableShell}>
      <table className="w-full text-left text-xs sm:text-sm min-w-[560px]">
        <thead className={theme.tableHead}>
          <tr>
            <th className="p-3 pl-4 sm:pl-6">Annual Breakdown ({displayCurrency})</th>
            <th className="p-3 sm:p-4">Source</th>
            <th className="p-3 sm:p-4">Destination</th>
            <th className="p-3 pr-4 sm:pr-6 text-right">Δ (Dest − Source)</th>
          </tr>
        </thead>
        <tbody className={theme.tableDivide}>
          {/* Bank Balance roll-up */}
          <TopRow
            label="Annual Liquid (Bank balance)"
            sourceUSD={liquidSourceUSD}
            destUSD={liquidDestUSD}
            displayCurrency={displayCurrency}
            open={bankOpen}
            onToggle={() => setBankOpen(!bankOpen)}
            accentBg="bg-orange-50/50 dark:bg-yellow-400/5 border-t-2 border-orange-200/80 dark:border-yellow-400/30 hover:bg-orange-100/50"
            accentText="text-orange-800 dark:text-yellow-300"
            deltaPosClass="text-emerald-600 dark:text-emerald-400"
            deltaNegClass="text-rose-600 dark:text-rose-400"
          />
          {bankOpen && (
            <>
              <LeafRow label="Gross Pay" sourceUSD={grossSourceUSD} destUSD={grossDestUSD} displayCurrency={displayCurrency} />

              <SubGroupRow
                label="Taxes & Social"
                sourceUSD={taxesSourceUSD}
                destUSD={taxesDestUSD}
                displayCurrency={displayCurrency}
                open={taxesOpen}
                onToggle={() => setTaxesOpen(!taxesOpen)}
                isExpense
              />
              {taxesOpen && taxItems.map((it) => (
                <LeafRow
                  key={`tax-${it.label}`}
                  label={it.label}
                  sourceUSD={it.sourceUSD == null ? null : -it.sourceUSD}
                  destUSD={it.destUSD == null ? null : -it.destUSD}
                  displayCurrency={displayCurrency}
                  sub
                  isExpense
                />
              ))}

              <NetRow label="Net Take-Home" sourceUSD={netSourceUSD} destUSD={netDestUSD} displayCurrency={displayCurrency} />

              <SubGroupRow
                label="Living Expenses"
                sourceUSD={expensesSourceUSD}
                destUSD={expensesDestUSD}
                displayCurrency={displayCurrency}
                open={expensesOpen}
                onToggle={() => setExpensesOpen(!expensesOpen)}
                isExpense
              />
              {expensesOpen && (
                <>
                  <LeafRow
                    label="Rent (annual)"
                    sourceUSD={source ? -source.rentLocal * sourceFx : null}
                    destUSD={dest ? -dest.rentLocal * destFx : null}
                    displayCurrency={displayCurrency}
                    sub
                    isExpense
                  />
                  <LeafRow
                    label="Misc burn (annual)"
                    sourceUSD={source ? -source.miscBurnLocal * sourceFx : null}
                    destUSD={dest ? -dest.miscBurnLocal * destFx : null}
                    displayCurrency={displayCurrency}
                    sub
                    isExpense
                  />
                </>
              )}
            </>
          )}

          {/* Savings roll-up */}
          <TopRow
            label="Annual Savings"
            sourceUSD={savingsSourceUSD}
            destUSD={savingsDestUSD}
            displayCurrency={displayCurrency}
            open={savingsOpen}
            onToggle={() => setSavingsOpen(!savingsOpen)}
            accentBg="bg-indigo-50/60 dark:bg-indigo-400/5 border-t-2 border-indigo-200/80 dark:border-indigo-400/30 hover:bg-indigo-100/50"
            accentText="text-indigo-800 dark:text-indigo-300"
            deltaPosClass="text-emerald-600 dark:text-emerald-400"
            deltaNegClass="text-rose-600 dark:text-rose-400"
          />
          {savingsOpen && pensionItems.length > 0 && pensionItems.map((it) => (
            <LeafRow
              key={`pension-${it.label}`}
              label={it.label}
              sourceUSD={it.sourceUSD}
              destUSD={it.destUSD}
              displayCurrency={displayCurrency}
            />
          ))}
          {savingsOpen && pensionItems.length === 0 && (
            <tr><td colSpan={4} className="p-3 pl-8 text-sm opacity-50 italic">No pension/retirement contributions configured for either side.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default UnifiedBreakdown;
