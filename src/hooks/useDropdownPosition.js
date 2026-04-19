import { useState, useLayoutEffect } from 'react';

/**
 * Keeps a fixed dropdown aligned to an anchor while scrolling (including nested scroll areas).
 */
export function useDropdownPosition(open, anchorRef) {
  const [rect, setRect] = useState(null);

  useLayoutEffect(() => {
    if (!open || !anchorRef?.current) {
      setRect(null);
      return;
    }
    const anchor = anchorRef.current;
    const update = () => {
      const r = anchor.getBoundingClientRect();
      const minW = Math.max(180, r.width);
      let left = r.left;
      if (left + minW > window.innerWidth - 8) {
        left = Math.max(8, window.innerWidth - minW - 8);
      }
      setRect({ top: r.bottom + 6, left, minWidth: minW });
    };
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open, anchorRef]);

  return rect;
}
