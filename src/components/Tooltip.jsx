import { useEffect, useLayoutEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle } from 'lucide-react';

// Portal-based tooltip. The bubble renders into document.body via a portal so
// it escapes any clipping/overflow/transform ancestor. Position is fixed in
// viewport coordinates, with a clamp so the bubble never spills off the edge.
// The arrow tracks the trigger horizontally even when the bubble is shifted.
const Tooltip = ({ theme, text, iconSize = 12, children }) => {
  const triggerRef = useRef(null);
  const bubbleRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, arrowLeft: 0, placement: 'top' });

  const recompute = useCallback(() => {
    const trigger = triggerRef.current;
    const bubble = bubbleRef.current;
    if (!trigger || !bubble) return;
    const t = trigger.getBoundingClientRect();
    const bw = bubble.offsetWidth;
    const bh = bubble.offsetHeight;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Default: above the trigger, centered.
    const triggerCenterX = t.left + t.width / 2;
    let left = triggerCenterX - bw / 2;
    let top = t.top - bh - 8;
    let placement = 'top';

    // Clamp horizontally inside viewport.
    if (left < margin) left = margin;
    if (left + bw > vw - margin) left = vw - margin - bw;

    // If above-trigger overflows the top, flip below.
    if (top < margin) {
      top = t.bottom + 8;
      placement = 'bottom';
      if (top + bh > vh - margin) top = Math.max(margin, vh - margin - bh);
    }

    // Arrow x = trigger center, but in bubble's local coordinates.
    const arrowLeft = Math.max(8, Math.min(bw - 8, triggerCenterX - left));

    setPos({ top, left, arrowLeft, placement });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
  }, [open, recompute]);

  useEffect(() => {
    if (!open) return;
    const onChange = () => recompute();
    window.addEventListener('resize', onChange);
    window.addEventListener('scroll', onChange, true);
    return () => {
      window.removeEventListener('resize', onChange);
      window.removeEventListener('scroll', onChange, true);
    };
  }, [open, recompute]);

  // Close on Escape or outside click.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    const onClickOutside = (e) => {
      if (triggerRef.current?.contains(e.target)) return;
      if (bubbleRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('touchstart', onClickOutside);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('touchstart', onClickOutside);
    };
  }, [open]);

  const isLight = theme?.name === 'Sunrise';
  const bubbleCls = isLight
    ? 'fixed z-[1000] w-[min(16rem,calc(100vw-1rem))] p-2.5 bg-slate-800 border border-slate-700 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl normal-case tracking-normal pointer-events-auto'
    : 'fixed z-[1000] w-[min(16rem,calc(100vw-1rem))] p-2.5 bg-slate-900 border border-white/10 text-slate-200 text-[10px] leading-relaxed rounded shadow-xl normal-case tracking-normal pointer-events-auto';

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        tabIndex={0}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((v) => !v); }}
        // Hover is ignored on touch devices to avoid the double-click bug
        // (touch fires mouseenter+mouseleave+click on a single tap, cancelling out).
        // Click-toggle works consistently across all input types.
        className={`inline-flex items-center justify-center align-middle ${theme?.tooltipIcon || ''}`}
        aria-label="More info"
        aria-expanded={open}
      >
        {children ?? <HelpCircle size={iconSize} />}
      </button>
      {open && createPortal(
        <span
          ref={bubbleRef}
          role="tooltip"
          className={bubbleCls}
          style={{ top: pos.top, left: pos.left }}
        >
          {text}
          <span
            className={`absolute w-0 h-0 border-4 border-transparent ${
              pos.placement === 'top'
                ? `top-full ${isLight ? 'border-t-slate-800' : 'border-t-slate-900'}`
                : `bottom-full ${isLight ? 'border-b-slate-800' : 'border-b-slate-900'}`
            }`}
            style={{ left: pos.arrowLeft - 4 }}
          />
        </span>,
        document.body
      )}
    </>
  );
};

export default Tooltip;
