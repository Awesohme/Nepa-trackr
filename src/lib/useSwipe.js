import { useRef } from 'react';

// Horizontal swipe detection for tab navigation.
//
// Fires `onSwipe('left' | 'right')` only when the gesture is mostly horizontal
// and travels past `threshold` px. Swipes that begin inside a horizontally
// scrollable element (e.g. the Timeline grid or the filter pills) are ignored so
// they scroll that element instead of changing tabs.
//
// Returns props to spread onto the swipe surface: {onTouchStart,onTouchMove,onTouchEnd}.
// `threshold` = min horizontal travel (px). The gesture must also be horizontally
// dominant (|dx| > |dy| * ratio) — a finger swipe always drifts vertically, so an
// absolute vertical cap is too strict on real devices; a ratio is what feels natural.
export function useSwipe(onSwipe, { threshold = 45, ratio = 1.3 } = {}) {
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
    // Resolve the element actually under the finger by coordinates — more reliable
    // than e.target across event sources — then check if it (or an ancestor) scrolls.
    const hit = document.elementFromPoint(t.clientX, t.clientY) || t.target;
    if (startsInScrollable(hit, e.currentTarget)) { start.current = null; return; }
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
    // Far enough horizontally AND horizontally dominant -> left = next, right = prev.
    if (Math.abs(dx) >= threshold && Math.abs(dx) > Math.abs(dy) * ratio) {
      onSwipe(dx < 0 ? 'left' : 'right');
    }
  }

  return { onTouchStart, onTouchMove, onTouchEnd };
}
