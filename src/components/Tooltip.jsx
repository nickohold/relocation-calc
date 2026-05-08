import React, { useLayoutEffect, useRef, useState, useCallback } from 'react';
import { HelpCircle } from 'lucide-react';

// Viewport-aware tooltip. Renders a help icon + bubble. The bubble is anchored
// above the trigger; on small screens the bubble is clamped to the viewport so
// it never spills off the left/right edge. The arrow stays centered on the
// trigger regardless of how far the bubble is shifted.
//
// Usage: <Tooltip theme={theme} text="Some hint" iconSize={12} />
const Tooltip = ({ theme, text, iconSize = 12, children }) => {
  const wrapRef = useRef(null);
  const bubbleRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [shift, setShift] = useState(0); // px; positive = bubble moved right
  const [arrowOffset, setArrowOffset] = useState(0); // arrow x correction

  const recompute = useCallback(() => {
    const wrap = wrapRef.current;
    const bubble = bubbleRef.current;
    if (!wrap || !bubble) return;
    // Reset before measuring so width reflects natural layout.
    bubble.style.transform = 'translateX(-50%)';
    const wrapRect = wrap.getBoundingClientRect();
    const bRect = bubble.getBoundingClientRect();
    const margin = 8;
    let s = 0;
    const leftEdge = bRect.left;
    const rightEdge = bRect.right;
    if (leftEdge < margin) s = margin - leftEdge;
    else if (rightEdge > window.innerWidth - margin) s = (window.innerWidth - margin) - rightEdge;
    setShift(s);
    // Arrow needs to stay centered on the trigger; counteract the shift.
    setArrowOffset(-s);
    void wrapRect;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    recompute();
    const onResize = () => recompute();
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
    };
  }, [open, recompute]);

  const show = () => setOpen(true);
  const hide = () => setOpen(false);

  return (
    <span
      ref={wrapRef}
      className="relative inline-block"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        tabIndex={0}
        onClick={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        className={`inline-flex items-center justify-center align-middle ${theme.tooltipIcon}`}
        aria-label="More info"
      >
        {children ?? <HelpCircle size={iconSize} />}
      </button>
      {open && (
        <span
          ref={bubbleRef}
          role="tooltip"
          className={theme.tooltipBox}
          style={{ display: 'block', transform: `translateX(calc(-50% + ${shift}px))` }}
        >
          {text}
          <span
            className={theme.tooltipArrow}
            style={{ transform: `translateX(calc(-50% + ${arrowOffset}px))` }}
          />
        </span>
      )}
    </span>
  );
};

export default Tooltip;
