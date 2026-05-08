import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Ported verbatim from main's `Row` component, with IL→source / US→dest renames.
// Props:
//   theme       - theme object containing rowSection*, rowLeaf*, deltaPos/Neg/Neutral, sectionRowBg, rowHover*, rowChevron
//   fmt         - amount formatter (number) -> string
//   label       - row label
//   source      - source-side amount (number)
//   dest        - dest-side amount (number)
//   isExpense   - bool: when true, leaf rows pick the expense color variant
//   variant     - 'leaf' | 'sub' | 'section'
//   bg          - optional row background override
//   expandable  - bool: show chevron + cursor pointer; row is clickable
//   expanded    - bool: chevron direction
//   onToggle    - click handler when expandable
const BreakdownRow = ({
  theme,
  fmt,
  label,
  source,
  dest,
  isExpense,
  variant = 'leaf',
  bg,
  expandable,
  expanded,
  onToggle,
}) => {
  const delta = dest - source;
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

  let valClassSource;
  let valClassDest;
  let deltaClass;
  if (isSection) {
    valClassSource = theme.rowSectionSource;
    valClassDest = theme.rowSectionDest;
    deltaClass = `text-sm font-black ${deltaColor}`;
  } else if (isSub) {
    valClassSource = theme.rowSubSourceBase;
    valClassDest = theme.rowSubDestBase;
    deltaClass = `text-xs font-bold ${deltaColor}`;
  } else {
    valClassSource = isExpense ? theme.rowLeafSourceExpense : theme.rowLeafSourceIncome;
    valClassDest = isExpense ? theme.rowLeafDestExpense : theme.rowLeafDestIncome;
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
      <td className={`${valCellPadding} ${valClassSource}`}>{fmt(source)}</td>
      <td className={`${valCellPadding} ${valClassDest}`}>{fmt(dest)}</td>
      <td className={`${lastCellPadding} text-right ${deltaClass}`}>
        {delta > 0 ? '+' : ''}{fmt(delta)}
      </td>
    </tr>
  );
};

export default BreakdownRow;
