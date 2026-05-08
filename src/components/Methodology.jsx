import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronDown, ChevronRight, ExternalLink, Info } from 'lucide-react';
import { META } from '../countries.js';
import { FX_USD_PER_UNIT } from '../fx.js';
import { fxStatus } from '../fxLive.js';

// ── Helpers ────────────────────────────────────────────────────────────────

const fmtPct = (rate) => {
  if (rate == null) return '—';
  return `${(rate * 100).toFixed(2).replace(/\.?0+$/, '')}%`;
};

const fmtMoney = (amount, currency) => {
  if (amount == null) return '—';
  if (currency === '%') return `${amount}%`;
  if (amount === Infinity) return '∞';
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount).toLocaleString()}`;
  }
};

const fmtUpTo = (upTo, currency) => {
  if (upTo === Infinity) return 'Above';
  return `Up to ${fmtMoney(upTo, currency)}`;
};

const fxSourceNote = () => {
  const { source, asOf } = fxStatus;
  if (source === 'live') return `Live · Frankfurter (ECB) · as of ${asOf || 'today'}.`;
  if (source === 'cache') return `Cached <24h · Frankfurter (ECB) · as of ${asOf || 'today'}.`;
  return 'Static fallback · May 2026 spot, ECB / oanda mid-market snapshot.';
};

// ── Building blocks ────────────────────────────────────────────────────────

const Section = ({ theme, title, defaultOpen = false, children }) => {
  const [open, setOpen] = useState(defaultOpen);
  const isLight = theme?.name === 'Sunrise';
  const headerCls = isLight
    ? 'flex items-center justify-between w-full text-left px-4 py-3 bg-slate-100/60 hover:bg-slate-200/60 border-b border-slate-200/60 transition-colors'
    : 'flex items-center justify-between w-full text-left px-4 py-3 bg-white/[0.03] hover:bg-white/[0.06] border-b border-white/5 transition-colors';
  const labelCls = isLight
    ? 'text-[11px] font-black uppercase tracking-widest text-slate-700'
    : 'text-[11px] font-black uppercase tracking-widest text-slate-200';
  const bodyCls = isLight
    ? 'px-4 py-3 bg-white/40 border-b border-slate-200/40'
    : 'px-4 py-3 bg-black/20 border-b border-white/5';

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className={headerCls} aria-expanded={open}>
        <span className={labelCls}>{title}</span>
        <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
      </button>
      {open && <div className={bodyCls}>{children}</div>}
    </div>
  );
};

const BracketTable = ({ theme, brackets, currency }) => {
  if (!brackets || brackets.length === 0) {
    return <div className="text-xs italic opacity-60">No data.</div>;
  }
  const isLight = theme?.name === 'Sunrise';
  const headCls = isLight ? 'text-[10px] uppercase font-black tracking-widest text-slate-500' : 'text-[10px] uppercase font-black tracking-widest text-slate-500';
  const cellCls = isLight ? 'text-xs text-slate-700 font-medium' : 'text-xs text-slate-300 font-medium';
  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th className={`${headCls} py-1.5 pr-2`}>Up to</th>
          <th className={`${headCls} py-1.5 px-2`}>Rate</th>
          <th className={`${headCls} py-1.5 pl-2`}>Note</th>
        </tr>
      </thead>
      <tbody className={isLight ? 'divide-y divide-slate-200/40' : 'divide-y divide-white/5'}>
        {brackets.map((b, i) => (
          <tr key={i}>
            <td className={`${cellCls} py-1.5 pr-2 whitespace-nowrap`}>{fmtUpTo(b.upTo, currency)}</td>
            <td className={`${cellCls} py-1.5 px-2 whitespace-nowrap font-bold`}>{fmtPct(b.rate)}</td>
            <td className={`${cellCls} py-1.5 pl-2 italic opacity-80`}>{b.note || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const RatesTable = ({ theme, rates }) => {
  if (!rates || rates.length === 0) {
    return <div className="text-xs italic opacity-60">No employee social charges modeled (or built into income tax).</div>;
  }
  const isLight = theme?.name === 'Sunrise';
  const headCls = 'text-[10px] uppercase font-black tracking-widest text-slate-500';
  const cellCls = isLight ? 'text-xs text-slate-700 font-medium' : 'text-xs text-slate-300 font-medium';
  return (
    <table className="w-full text-left">
      <thead>
        <tr>
          <th className={`${headCls} py-1.5 pr-2`}>Component</th>
          <th className={`${headCls} py-1.5 px-2`}>Rate</th>
          <th className={`${headCls} py-1.5 pl-2`}>Threshold</th>
        </tr>
      </thead>
      <tbody className={isLight ? 'divide-y divide-slate-200/40' : 'divide-y divide-white/5'}>
        {rates.map((r, i) => (
          <tr key={i}>
            <td className={`${cellCls} py-1.5 pr-2`}>{r.label}</td>
            <td className={`${cellCls} py-1.5 px-2 whitespace-nowrap font-bold`}>{r.rate ? fmtPct(r.rate) : '—'}</td>
            <td className={`${cellCls} py-1.5 pl-2 italic opacity-80`}>{r.threshold || ''}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const KeyValueList = ({ theme, items, defaultCurrency }) => {
  if (!items || items.length === 0) {
    return <div className="text-xs italic opacity-60">None.</div>;
  }
  const isLight = theme?.name === 'Sunrise';
  return (
    <ul className={isLight ? 'divide-y divide-slate-200/40' : 'divide-y divide-white/5'}>
      {items.map((item, i) => (
        <li key={i} className="py-2 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className={isLight ? 'text-xs font-bold text-slate-700' : 'text-xs font-bold text-slate-200'}>{item.label}</div>
            {item.note && (
              <div className={isLight ? 'text-[10px] text-slate-500 italic mt-0.5' : 'text-[10px] text-slate-500 italic mt-0.5'}>{item.note}</div>
            )}
          </div>
          <div className={`text-xs font-black whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-slate-100'}`}>
            {fmtMoney(item.amount, item.currency || defaultCurrency)}
          </div>
        </li>
      ))}
    </ul>
  );
};

const NotesList = ({ theme, notes }) => {
  if (!notes || notes.length === 0) return null;
  const isLight = theme?.name === 'Sunrise';
  return (
    <ul className={`mt-2 space-y-1 text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
      {notes.map((n, i) => (
        <li key={i} className="flex gap-1.5"><span className="opacity-50">•</span><span>{n}</span></li>
      ))}
    </ul>
  );
};

const SourcesList = ({ theme, sources }) => {
  if (!sources || sources.length === 0) {
    return <div className="text-xs italic opacity-60">No sources listed.</div>;
  }
  const isLight = theme?.name === 'Sunrise';
  const linkCls = isLight
    ? 'text-orange-600 hover:text-orange-700 hover:underline'
    : 'text-indigo-300 hover:text-indigo-200 hover:underline';
  return (
    <ul className="space-y-1.5">
      {sources.map((s, i) => (
        <li key={i} className="flex items-start gap-1.5 text-xs">
          <ExternalLink size={12} className={`flex-shrink-0 mt-0.5 ${isLight ? 'text-slate-400' : 'text-slate-500'}`} />
          <a href={s.url} target="_blank" rel="noopener noreferrer" className={`${linkCls} font-medium break-all`}>
            {s.name}
          </a>
        </li>
      ))}
    </ul>
  );
};

// State/local breakout rendering for US, CH, CA, ES, IT, JP localTax.
const LocalTaxBlock = ({ theme, meta }) => {
  // US uses meta.stateLocal. CH/CA/ES/IT use meta.localTax with cantons/provinces/regions.
  if (meta.countryCode === 'US' && meta.stateLocal) {
    return (
      <div className="space-y-3">
        <div className="text-[11px] opacity-70 italic">{meta.localTax?.note}</div>
        {meta.stateLocal.map((s) => (
          <div key={s.code} className={theme?.name === 'Sunrise' ? 'border border-slate-200/60 rounded-lg p-2.5 bg-white/40' : 'border border-white/5 rounded-lg p-2.5 bg-black/20'}>
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <div className="text-xs font-black uppercase tracking-wider">{s.label}</div>
              <div className="text-[10px] opacity-70">{s.kind}</div>
            </div>
            {s.kind === 'flat' && (
              <div className="text-xs">Flat <strong>{fmtPct(s.rate)}</strong>{s.stdDeduction ? ` · std deduction ${fmtMoney(s.stdDeduction, 'USD')}` : ''}{s.exemption ? ` · exemption ${fmtMoney(s.exemption, 'USD')}` : ''}</div>
            )}
            {s.kind === 'progressive' && (
              <BracketTable theme={theme} brackets={s.brackets} currency="USD" />
            )}
            {s.kind === 'none' && (
              <div className="text-xs italic opacity-70">No state income tax.</div>
            )}
            {s.note && <div className="text-[10px] italic opacity-70 mt-1">{s.note}</div>}
          </div>
        ))}
      </div>
    );
  }
  if (!meta.localTax) return null;
  const lt = meta.localTax;
  const groups = lt.cantons || lt.provinces || lt.regions;
  if (groups) {
    const currency = meta.countryCode === 'CH' ? 'CHF' : meta.countryCode === 'CA' ? 'CAD' : 'EUR';
    return (
      <div className="space-y-3">
        <div className="text-[11px] opacity-70 italic">{lt.label}</div>
        {groups.map((g) => (
          <div key={g.code} className={theme?.name === 'Sunrise' ? 'border border-slate-200/60 rounded-lg p-2.5 bg-white/40' : 'border border-white/5 rounded-lg p-2.5 bg-black/20'}>
            <div className="text-xs font-black uppercase tracking-wider mb-1">{g.label}</div>
            {g.multiplier && <div className="text-[11px] opacity-70 mb-1">Multiplier: {g.multiplier}</div>}
            {g.brackets && <BracketTable theme={theme} brackets={g.brackets} currency={currency} />}
            {g.communal != null && (
              <div className="text-[11px] mt-1 opacity-80">{g.communalLabel} communal: {fmtPct(g.communal)}</div>
            )}
            {g.note && <div className="text-[10px] italic opacity-70 mt-1">{g.note}</div>}
          </div>
        ))}
      </div>
    );
  }
  // JP-style flat local
  return (
    <div className="text-xs space-y-1">
      <div><strong>{lt.label}</strong></div>
      {lt.flatRate != null && <div>Flat rate: <strong>{fmtPct(lt.flatRate)}</strong></div>}
      {lt.perCapita != null && <div>Per-capita: ¥{lt.perCapita.toLocaleString()}</div>}
      {lt.note && <div className="italic opacity-70">{lt.note}</div>}
    </div>
  );
};

const CountryCard = ({ theme, code, side }) => {
  const meta = META[code];
  const isLight = theme?.name === 'Sunrise';
  const cardCls = isLight
    ? 'bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden'
    : 'bg-[#0F131D] border border-white/5 rounded-2xl shadow-2xl overflow-hidden';
  const titleCls = isLight
    ? 'px-4 py-3 border-b border-slate-200/60 bg-slate-50'
    : 'px-4 py-3 border-b border-white/5 bg-white/[0.03]';
  const sideAccent = side === 'source'
    ? (isLight ? 'text-orange-600' : 'text-indigo-300')
    : (isLight ? 'text-blue-600' : 'text-cyan-300');

  if (!meta) {
    return (
      <div className={cardCls}>
        <div className={titleCls}>
          <div className={`text-[10px] font-black uppercase tracking-widest ${sideAccent}`}>{side === 'source' ? 'Source' : 'Destination'}</div>
          <div className="text-base font-black">Unknown ({code})</div>
        </div>
        <div className="p-4 text-xs italic opacity-60">No methodology metadata available for this country yet.</div>
      </div>
    );
  }

  return (
    <div className={cardCls}>
      <div className={titleCls}>
        <div className={`text-[10px] font-black uppercase tracking-widest ${sideAccent}`}>{side === 'source' ? 'Source' : 'Destination'}</div>
        <div className="text-base font-black">{meta.countryName}</div>
        <div className="text-[10px] opacity-70 mt-0.5">Tax year {meta.taxYear} · Last updated {meta.lastUpdated}</div>
      </div>

      <Section theme={theme} title="Income Tax" defaultOpen>
        <div className="text-[11px] font-bold mb-2 opacity-80">{meta.incomeTax?.label}</div>
        <BracketTable theme={theme} brackets={meta.incomeTax?.brackets} currency={countryCurrency(meta.countryCode)} />
        <NotesList theme={theme} notes={meta.incomeTax?.notes} />
      </Section>

      <Section theme={theme} title="Social Security">
        <div className="text-[11px] font-bold mb-2 opacity-80">{meta.socialSecurity?.label}</div>
        <RatesTable theme={theme} rates={meta.socialSecurity?.rates} />
      </Section>

      <Section theme={theme} title="Deductions">
        <KeyValueList theme={theme} items={meta.deductions} defaultCurrency={countryCurrency(meta.countryCode)} />
      </Section>

      <Section theme={theme} title="Retirement caps">
        <KeyValueList theme={theme} items={meta.retirementCaps} defaultCurrency={countryCurrency(meta.countryCode)} />
      </Section>

      {(meta.localTax || meta.stateLocal) && (
        <Section theme={theme} title="State / local / regional tax">
          <LocalTaxBlock theme={theme} meta={meta} />
        </Section>
      )}

      {meta.simplifications && meta.simplifications.length > 0 && (
        <Section theme={theme} title="Simplifications">
          <NotesList theme={theme} notes={meta.simplifications} />
        </Section>
      )}

      <Section theme={theme} title={`Sources (${meta.sources?.length || 0})`} defaultOpen>
        <SourcesList theme={theme} sources={meta.sources} />
      </Section>

      <div className={isLight ? 'px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-500 bg-slate-50' : 'px-4 py-2 text-[10px] uppercase font-black tracking-widest text-slate-500 bg-white/[0.02]'}>
        Last updated: {meta.lastUpdated}
      </div>
    </div>
  );
};

const countryCurrency = (code) => {
  const cur = META[code]?.deductions?.[0]?.currency
    || META[code]?.retirementCaps?.[0]?.currency;
  // Fallback by code
  const map = { US: 'USD', IL: 'ILS', UK: 'GBP', IE: 'EUR', DE: 'EUR', FR: 'EUR', NL: 'EUR', CH: 'CHF', CA: 'CAD', AU: 'AUD', SG: 'SGD', JP: 'JPY', ES: 'EUR', IT: 'EUR', PT: 'EUR', SE: 'SEK', DK: 'DKK', NO: 'NOK', AE: 'AED', PL: 'PLN' };
  return cur && cur !== '%' ? cur : map[code] || 'USD';
};

const FxCard = ({ theme }) => {
  const isLight = theme?.name === 'Sunrise';
  const cardCls = isLight
    ? 'bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden'
    : 'bg-[#0F131D] border border-white/5 rounded-2xl shadow-2xl overflow-hidden';
  const titleCls = isLight
    ? 'px-4 py-3 border-b border-slate-200/60 bg-slate-50'
    : 'px-4 py-3 border-b border-white/5 bg-white/[0.03]';
  const accent = isLight ? 'text-emerald-600' : 'text-emerald-400';
  const cellCls = isLight ? 'text-xs text-slate-700 font-medium' : 'text-xs text-slate-300 font-medium';
  const headCls = 'text-[10px] uppercase font-black tracking-widest text-slate-500';
  return (
    <div className={cardCls}>
      <div className={titleCls}>
        <div className={`text-[10px] font-black uppercase tracking-widest ${accent}`}>Reference</div>
        <div className="text-base font-black">FX rates</div>
        <div className="text-[10px] opacity-70 mt-0.5">{fxSourceNote()}</div>
      </div>
      <div className="p-4">
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={`${headCls} py-1.5 pr-2`}>Currency</th>
              <th className={`${headCls} py-1.5 px-2`}>USD per 1 unit</th>
              <th className={`${headCls} py-1.5 pl-2`}>Local per 1 USD</th>
            </tr>
          </thead>
          <tbody className={isLight ? 'divide-y divide-slate-200/40' : 'divide-y divide-white/5'}>
            {Object.entries(FX_USD_PER_UNIT).map(([code, rate]) => (
              <tr key={code}>
                <td className={`${cellCls} py-1.5 pr-2 font-bold`}>{code}</td>
                <td className={`${cellCls} py-1.5 px-2`}>${rate.toFixed(rate < 0.01 ? 6 : 4)}</td>
                <td className={`${cellCls} py-1.5 pl-2`}>{(1 / rate).toFixed(rate < 0.01 ? 2 : 4)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={`text-[10px] mt-3 ${isLight ? 'text-slate-500' : 'text-slate-400'} italic`}>
          Used for cross-currency conversion. Cost-of-living differences are NOT reflected — see COL-adjusted delta.
        </div>
      </div>
    </div>
  );
};

// ── Trigger (footer link) ──────────────────────────────────────────────────

export const MethodologyTrigger = ({ theme, sourceCode, destCode, onOpen }) => {
  const sourceMeta = META[sourceCode];
  const destMeta = META[destCode];
  const totalSources = (sourceMeta?.sources?.length || 0) + (destMeta?.sources?.length || 0);
  const lastUpdated = [sourceMeta?.lastUpdated, destMeta?.lastUpdated].filter(Boolean).sort().reverse()[0];
  const isLight = theme?.name === 'Sunrise';

  const linkCls = isLight
    ? 'inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-orange-600 hover:underline transition-colors group'
    : 'inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-indigo-300 hover:underline transition-colors group';

  const popCls = isLight
    ? 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:group-hover:block w-[min(18rem,calc(100vw-1rem))] p-2.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl z-50 normal-case tracking-normal pointer-events-none'
    : 'absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden md:group-hover:block w-[min(18rem,calc(100vw-1rem))] p-2.5 bg-slate-900 border border-white/10 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl z-50 normal-case tracking-normal pointer-events-none';

  return (
    <span className="relative inline-block">
      <button type="button" onClick={onOpen} className={linkCls} aria-label="Open methodology details">
        <Info size={12} />
        <span>Details for nerds</span>
      </button>
      <span className={popCls}>
        {totalSources} source{totalSources === 1 ? '' : 's'} · last updated {lastUpdated || 'recently'} · click for full details
      </span>
    </span>
  );
};

// ── Drawer ─────────────────────────────────────────────────────────────────

const MethodologyDrawer = ({ theme, open, onClose, sourceCode, destCode }) => {
  const cardsRef = useRef(null);
  const [activeCard, setActiveCard] = useState(0);

  const isLight = theme?.name === 'Sunrise';

  // Reset state on open transition. Use a ref to avoid resetting on every render.
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      wasOpenRef.current = true;
      setActiveCard(0);
      if (cardsRef.current) cardsRef.current.scrollTo({ left: 0, behavior: 'auto' });
    } else if (!open && wasOpenRef.current) {
      wasOpenRef.current = false;
    }
  }, [open]);

  // Esc to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Track active card via scroll position (mobile horizontal scroll-snap)
  const onScroll = useCallback(() => {
    const rail = cardsRef.current;
    if (!rail) return;
    const w = rail.clientWidth;
    if (w === 0) return;
    const idx = Math.round(rail.scrollLeft / w);
    setActiveCard(Math.max(0, Math.min(2, idx)));
  }, []);

  const goToCard = (idx) => {
    const rail = cardsRef.current;
    if (!rail) return;
    rail.scrollTo({ left: idx * rail.clientWidth, behavior: 'smooth' });
  };

  if (!open || typeof document === 'undefined') return null;

  // Centered modal with backdrop-blurred page behind. Cards swipe horizontally
  // (mobile gesture) or via tabs/dots/arrow keys (desktop). All viewports use
  // the same centered card carousel — only the size adjusts.
  const backdropCls = 'fixed inset-0 z-[1000] bg-black/40 backdrop-blur-md transition-opacity animate-in fade-in duration-200';
  const cardCls = isLight
    ? 'relative z-[1001] flex flex-col w-full max-w-[480px] max-h-[85vh] rounded-3xl bg-slate-50 text-slate-800 shadow-2xl border border-slate-200/80 overflow-hidden pointer-events-auto'
    : 'relative z-[1001] flex flex-col w-full max-w-[480px] max-h-[85vh] rounded-3xl bg-[#0B0F19] text-slate-200 shadow-2xl border border-white/10 overflow-hidden pointer-events-auto';

  const headerCls = isLight
    ? 'flex items-center justify-between px-4 py-3 border-b border-slate-200/80 bg-slate-100/60'
    : 'flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03]';
  const closeBtnCls = isLight
    ? 'inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-slate-200 text-slate-700 transition-colors'
    : 'inline-flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/10 text-slate-300 transition-colors';

  const cards = [
    { key: 'source', label: 'Source', code: sourceCode, render: () => <CountryCard theme={theme} code={sourceCode} side="source" /> },
    { key: 'dest', label: 'Destination', code: destCode, render: () => <CountryCard theme={theme} code={destCode} side="dest" /> },
    { key: 'fx', label: 'FX', code: 'FX', render: () => <FxCard theme={theme} /> },
  ];

  const dotCls = (active) => active
    ? (isLight ? 'w-6 h-1.5 rounded-full bg-orange-500 transition-all' : 'w-6 h-1.5 rounded-full bg-indigo-400 transition-all')
    : (isLight ? 'w-1.5 h-1.5 rounded-full bg-slate-300 transition-all' : 'w-1.5 h-1.5 rounded-full bg-white/20 transition-all');

  const tabBtnCls = (active) => active
    ? (isLight ? 'px-3 py-1.5 rounded-md text-xs font-bold bg-orange-500 text-white shadow' : 'px-3 py-1.5 rounded-md text-xs font-bold bg-indigo-500 text-white shadow')
    : (isLight ? 'px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-800' : 'px-3 py-1.5 rounded-md text-xs font-bold text-slate-500 hover:text-slate-200');

  return createPortal(
    <>
      <div className={backdropCls} onClick={onClose} aria-hidden />
      <div
        className="fixed inset-0 z-[1001] flex items-center justify-center p-4 sm:p-6 pointer-events-none animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Methodology details"
      >
        <div className={cardCls}>
        <div className={headerCls}>
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-60">Methodology</div>
            <h2 className="text-base font-black">Details for nerds</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className={closeBtnCls}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-center gap-1 px-4 py-2 border-b border-slate-200/60 dark:border-white/5">
          {cards.map((c, i) => (
            <button key={c.key} type="button" className={tabBtnCls(activeCard === i)} onClick={() => goToCard(i)}>
              {c.label}
            </button>
          ))}
        </div>

        {/* Swipeable card rail */}
        <div
          ref={cardsRef}
          onScroll={onScroll}
          className="flex-1 overflow-x-auto overflow-y-auto snap-x snap-mandatory flex"
          style={{ scrollSnapType: 'x mandatory' }}
        >
          {cards.map((c) => (
            <div
              key={c.key}
              className="snap-center flex-shrink-0 w-full overflow-y-auto"
              style={{ scrollSnapAlign: 'center' }}
            >
              <div className="p-3 sm:p-4 space-y-3">
                {c.render()}
              </div>
            </div>
          ))}
        </div>

        {/* Dots indicator */}
        <div className="flex items-center justify-center gap-1.5 py-2 border-t border-slate-200/60 dark:border-white/5">
          {cards.map((c, i) => (
            <button key={c.key} type="button" aria-label={`Go to ${c.label}`} className={dotCls(activeCard === i)} onClick={() => goToCard(i)} />
          ))}
        </div>
        {/* Scope footer */}
        <div className="px-4 py-2 text-[10px] leading-snug text-slate-500 dark:text-slate-400 border-t border-slate-200/60 dark:border-white/5">
          Single filer, salary-only. Excludes RSUs, bonuses, AMT/NIIT, dependents, marital status, locality surtaxes, and HSA/FSA/ISA-style vehicles. COL indices may lag. Directional comparison, not tax planning.
        </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default MethodologyDrawer;
