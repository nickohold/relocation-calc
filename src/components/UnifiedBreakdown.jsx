import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { FX_USD_PER_UNIT } from '../fx.js';
import { fmtAmount } from './formatCurrency.js';

// One row per line item; source and dest can each contribute lines.
// Labels are merged in the order they first appear in source then dest.
const buildRows = (sourceResult, destResult) => {
  const labelOrder = [];
  const sourceMap = {};
  const destMap = {};

  if (sourceResult) {
    for (const b of sourceResult.breakdown ?? []) {
      if (!labelOrder.includes(b.label)) labelOrder.push(b.label);
      sourceMap[b.label] = (sourceMap[b.label] ?? 0) + b.amount;
    }
  }
  if (destResult) {
    for (const b of destResult.breakdown ?? []) {
      if (!labelOrder.includes(b.label)) labelOrder.push(b.label);
      destMap[b.label] = (destMap[b.label] ?? 0) + b.amount;
    }
  }

  return labelOrder.map((label) => {
    const sourceAmt = sourceMap[label];
    const destAmt = destMap[label];
    const sourceFx = sourceResult ? FX_USD_PER_UNIT[sourceResult.currency] : 1;
    const destFx = destResult ? FX_USD_PER_UNIT[destResult.currency] : 1;
    return {
      label,
      sourceUSD: sourceAmt != null ? sourceAmt * sourceFx : null,
      destUSD: destAmt != null ? destAmt * destFx : null,
      kind: sourceResult?.breakdown.find((b) => b.label === label)?.kind
        ?? destResult?.breakdown.find((b) => b.label === label)?.kind,
    };
  });
};

const Row = ({ theme, label, sourceUSD, destUSD, displayCurrency, bold }) => {
  const delta = (destUSD ?? 0) - (sourceUSD ?? 0);
  const deltaClass = delta > 0 ? 'text-emerald-500' : delta < 0 ? 'text-rose-500' : 'opacity-60';
  return (
    <tr className={bold ? 'font-bold' : ''}>
      <td className="p-2 pl-3">{label}</td>
      <td className="p-2 text-right tabular-nums">
        {sourceUSD != null ? fmtAmount(sourceUSD, displayCurrency) : <span className="opacity-30">—</span>}
      </td>
      <td className="p-2 text-right tabular-nums">
        {destUSD != null ? fmtAmount(destUSD, displayCurrency) : <span className="opacity-30">—</span>}
      </td>
      <td className={`p-2 pr-3 text-right tabular-nums ${deltaClass}`}>
        {delta === 0 || (sourceUSD == null && destUSD == null)
          ? <span className="opacity-30">—</span>
          : `${delta > 0 ? '+' : ''}${fmtAmount(delta, displayCurrency)}`}
      </td>
    </tr>
  );
};

const UnifiedBreakdown = ({ theme, comparison, displayCurrency }) => {
  const [open, setOpen] = useState(false);
  const { source, dest } = comparison ?? {};

  const rows = useMemo(() => buildRows(source, dest), [source, dest]);

  if (!source && !dest) return null;

  const sourceFx = source ? FX_USD_PER_UNIT[source.currency] : 1;
  const destFx = dest ? FX_USD_PER_UNIT[dest.currency] : 1;
  const grossSourceUSD = source ? source.grossLocal * sourceFx : null;
  const grossDestUSD = dest ? dest.grossLocal * destFx : null;
  const netSourceUSD = source?.netUSD ?? null;
  const netDestUSD = dest?.netUSD ?? null;
  const rentSourceUSD = source ? source.rentLocal * sourceFx : null;
  const rentDestUSD = dest ? dest.rentLocal * destFx : null;
  const burnSourceUSD = source ? source.miscBurnLocal * sourceFx : null;
  const burnDestUSD = dest ? dest.miscBurnLocal * destFx : null;
  const liquidSourceUSD = source?.liquidUSD ?? null;
  const liquidDestUSD = dest?.liquidUSD ?? null;
  const savingsSourceUSD = source?.totalSavingsUSD ?? null;
  const savingsDestUSD = dest?.totalSavingsUSD ?? null;

  return (
    <section className={theme.sectionCard}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-200 transition-colors"
        aria-expanded={open}
      >
        {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        {open ? 'Hide full breakdown' : 'Show full breakdown'}
      </button>

      {open && (
        <div className={`${theme.tableShell} mt-3`}>
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className={theme.tableHead}>
              <tr>
                <th className="p-2 pl-3">Annual line item</th>
                <th className="p-2 text-right">Source</th>
                <th className="p-2 text-right">Destination</th>
                <th className="p-2 pr-3 text-right">Δ (Dest − Source)</th>
              </tr>
            </thead>
            <tbody className={theme.tableDivide}>
              <Row theme={theme} label="Gross" sourceUSD={grossSourceUSD} destUSD={grossDestUSD} displayCurrency={displayCurrency} bold />
              {rows.map((r) => (
                <Row key={r.label} theme={theme} label={r.label} sourceUSD={r.sourceUSD} destUSD={r.destUSD} displayCurrency={displayCurrency} />
              ))}
              <Row theme={theme} label="Net Take-Home" sourceUSD={netSourceUSD} destUSD={netDestUSD} displayCurrency={displayCurrency} bold />
              <Row theme={theme} label="Rent (annual)" sourceUSD={rentSourceUSD != null ? -rentSourceUSD : null} destUSD={rentDestUSD != null ? -rentDestUSD : null} displayCurrency={displayCurrency} />
              <Row theme={theme} label="Misc burn (annual)" sourceUSD={burnSourceUSD != null ? -burnSourceUSD : null} destUSD={burnDestUSD != null ? -burnDestUSD : null} displayCurrency={displayCurrency} />
              <Row theme={theme} label="Liquid (after rent + burn)" sourceUSD={liquidSourceUSD} destUSD={liquidDestUSD} displayCurrency={displayCurrency} bold />
              <Row theme={theme} label="Total Savings" sourceUSD={savingsSourceUSD} destUSD={savingsDestUSD} displayCurrency={displayCurrency} bold />
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
};

export default UnifiedBreakdown;
