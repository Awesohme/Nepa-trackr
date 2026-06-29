import { useRef } from 'react';

// Horizontal swipe detection for tab navigation.
//
// Fires `onSwipe('left' | 'right')` only when the gesture is mostly horizontal
// and travels past `threshold` px. Swipes that begin inside a horizontally
// scrollable element (e.g. the Timeline grid or the filter pills) are ignored so
// they scroll that element instead of changing tabs.
//
// Returns props to spread onto the swipe surface: {onTouchStart,onTouchMove,onTouchEnd}.
export function useSwipe(onSwipe, { threshold = 60, restraint = 40 } = {}) {
  const start = useRef(null);

  // Walk up from the touch target; if any ancestor (up to the surface) can scroll
  // horizontally, the gesture belongs to it, not to tab navigation.
  function startsInScrollable(target, surface) {
    let el = target;
    while (el && el !== surface) {
      if (el.scrollWidth > el.clientWidth + 1) {
        const style = getComputedStyle(el);
        if (/(auto|scroll)/.test(style.overflowX)) return true;
      }
      el = el.parentElement;
    }
    return false;
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) { start.current = null; return; }
    const t = e.touches[0];
    if (startsInScrollable(t.target, e.currentTarget)) { start.current = null; return; }
    start.current = { x: t.clientX, y: t.clientY };
  }

  function onTouchMove(e) {
    // Multi-touch (e.g. pinch) cancels a pending swipe.
    if (start.current && e.touches.length > 1) start.current = null;
  }

  function onTouchEnd(e) {
    if (!start.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.current.x;
    const dy = t.clientY - start.current.y;
    start.current = null;
    // Mostly-horizontal and far enough: left swipe = next, right swipe = prev.
    if (Math.abs(dx) >= threshold && Math.abs(dy) <= restraint) {
      onSwipe(dx < 0 ? 'left' : 'right');
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}
