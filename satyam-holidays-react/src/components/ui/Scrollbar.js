import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/*
 * Overlay scrollbars. The native bar is hidden (see `.scrollbar-none` and the html rules in
 * index.css) so content uses the full width, and a slim thumb is drawn on top instead.
 *
 * - <PageScrollbar />  : mounted once in App, follows the window.
 * - <ScrollArea>       : drop-in for any vertically scrolling panel (menus, modals, sheets).
 */

const MIN_THUMB = 36;
const IDLE_MS = 1100;
const TRACK_PAD = 4;

const isScrollable = (el) => el && el.scrollHeight - el.clientHeight > 1;

/**
 * Shared thumb logic. `getScroller` returns the element whose scrollTop drives the bar.
 * `target` is what we listen to for scroll events (window for the page, the element otherwise).
 * Thumb geometry is written straight to the DOM to avoid a React render per scroll frame.
 */
function useScrollThumb({ getScroller, target, observe, disabled }) {
  const thumbRef = useRef(null);
  const trackRef = useRef(null);
  const [visible, setVisible] = useState(false); // content overflows
  const [active, setActive] = useState(false); // recently scrolled / hovered / dragging
  const idleTimer = useRef(null);
  const drag = useRef(null);
  const frame = useRef(0);

  const metrics = useCallback(() => {
    const el = getScroller();
    const track = trackRef.current;
    if (!el || !track) return null;
    const trackSize = track.clientHeight - TRACK_PAD * 2;
    const ratio = el.clientHeight / el.scrollHeight;
    const thumbSize = Math.max(MIN_THUMB, Math.round(trackSize * ratio));
    const maxScroll = el.scrollHeight - el.clientHeight;
    const maxOffset = trackSize - thumbSize;
    return { el, trackSize, thumbSize, maxScroll, maxOffset };
  }, [getScroller]);

  const paint = useCallback(() => {
    frame.current = 0;
    const el = getScroller();
    const scrollable = !disabled && isScrollable(el);
    setVisible(scrollable);
    const m = metrics();
    const thumb = thumbRef.current;
    if (!m || !thumb || !scrollable) return;
    const offset = m.maxScroll > 0 ? (el.scrollTop / m.maxScroll) * m.maxOffset : 0;
    thumb.style.height = `${m.thumbSize}px`;
    thumb.style.transform = `translate3d(0, ${TRACK_PAD + offset}px, 0)`;
  }, [getScroller, metrics, disabled]);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(paint);
  }, [paint]);

  const wake = useCallback(() => {
    setActive(true);
    clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      if (!drag.current) setActive(false);
    }, IDLE_MS);
  }, []);

  useLayoutEffect(() => {
    paint();
  }, [paint]);

  useEffect(() => {
    const scrollTarget = target();
    if (!scrollTarget) return undefined;
    const onScroll = () => {
      schedule();
      wake();
    };
    scrollTarget.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);

    // Content height changes (lazy sections, images, accordions) must resize the thumb
    let ro;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(schedule);
      observe().forEach((node) => node && ro.observe(node));
    }
    return () => {
      scrollTarget.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      ro?.disconnect();
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      clearTimeout(idleTimer.current);
    };
  }, [target, observe, schedule, wake]);

  // Scrollbar input must move the page immediately, like a native bar. html has
  // `scroll-behavior: smooth` (for anchor links), which would otherwise animate every write.
  const jumpTo = (el, top) => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    el.scrollTop = top;
    root.style.scrollBehavior = previous;
  };

  const startDrag = (e, startScroll) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    drag.current = { startY: e.clientY, startScroll };
    setActive(true);
  };

  const onThumbPointerDown = (e) => {
    const m = metrics();
    if (!m) return;
    e.stopPropagation(); // not a track click
    startDrag(e, m.el.scrollTop);
  };

  // Shared by thumb and track (thumb events bubble up to the track)
  const onDragMove = (e) => {
    if (!drag.current) return;
    const m = metrics();
    if (!m || m.maxOffset <= 0) return;
    const delta = ((e.clientY - drag.current.startY) * m.maxScroll) / m.maxOffset;
    jumpTo(m.el, drag.current.startScroll + delta);
  };

  const endDrag = (e) => {
    if (!drag.current) return;
    drag.current = null;
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch {
      // capture already released by the browser on pointerup
    }
    wake();
  };

  // Clicking the track jumps straight there (thumb centred on the pointer); keep holding to drag on
  const onTrackPointerDown = (e) => {
    if (e.target !== e.currentTarget || e.button !== 0) return;
    const m = metrics();
    if (!m) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const offset = e.clientY - rect.top - TRACK_PAD - m.thumbSize / 2;
    const ratio = Math.min(1, Math.max(0, offset / Math.max(1, m.maxOffset)));
    const top = ratio * m.maxScroll;
    jumpTo(m.el, top);
    startDrag(e, top);
  };

  return {
    trackRef,
    thumbRef,
    visible,
    active,
    wake,
    trackHandlers: {
      onPointerDown: onTrackPointerDown,
      onPointerMove: onDragMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onPointerEnter: wake,
    },
    thumbHandlers: { onPointerDown: onThumbPointerDown },
    refresh: schedule,
  };
}

const Track = ({ bar, className, tone = "default" }) => (
  <div
    ref={bar.trackRef}
    aria-hidden="true"
    {...bar.trackHandlers}
    className={`group/track absolute right-0 top-0 z-[5] w-3 touch-none transition-opacity duration-300 ${
      bar.visible ? "" : "pointer-events-none !opacity-0"
    } ${bar.active ? "opacity-100" : "opacity-0 hover:opacity-100"} ${className}`}
  >
    <div
      ref={bar.thumbRef}
      {...bar.thumbHandlers}
      className={`absolute right-[3px] top-0 w-[5px] cursor-grab rounded-full transition-[width,background-color] duration-200 will-change-transform active:cursor-grabbing group-hover/track:w-[7px] ${
        tone === "light"
          ? "bg-white/45 hover:bg-white/70 active:bg-white/80"
          : "bg-fg/30 hover:bg-saffron-500/80 active:bg-saffron-500"
      }`}
    />
  </div>
);

/** Window scrollbar. Hidden while a modal has locked the page. */
export const PageScrollbar = () => {
  const [locked, setLocked] = useState(false);

  useEffect(() => {
    const body = document.body;
    const update = () => setLocked(body.classList.contains("modal-open"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(body, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  const getScroller = useCallback(() => document.scrollingElement || document.documentElement, []);
  const target = useCallback(() => window, []);
  const observe = useCallback(() => [document.body], []);
  const bar = useScrollThumb({ getScroller, target, observe, disabled: locked });

  return <Track bar={bar} className="!fixed bottom-0 z-[90] h-screen" />;
};

/**
 * Vertical scroll container with the overlay scrollbar.
 * `className` styles the outer box (size/flex), `viewportClassName` the scrolling element (padding),
 * `contentClassName` the inner wrapper (use it for flex/space-y layouts of the children).
 */
export const ScrollArea = React.forwardRef(function ScrollArea(
  {
    children,
    className = "",
    viewportClassName = "",
    contentClassName = "",
    as: Viewport = "div",
    tone,
    viewportProps = {},
  },
  forwardedRef
) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);

  const setViewport = (node) => {
    viewportRef.current = node;
    if (typeof forwardedRef === "function") forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  const getScroller = useCallback(() => viewportRef.current, []);
  const target = useCallback(() => viewportRef.current, []);
  const observe = useCallback(() => [viewportRef.current, contentRef.current], []);
  const bar = useScrollThumb({ getScroller, target, observe });

  return (
    // Flex column so the viewport fills exactly the space the parent leaves it (works under max-height too)
    <div className={`relative flex min-h-0 flex-col overflow-hidden ${className}`}>
      <Viewport
        ref={setViewport}
        {...viewportProps}
        className={`min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-none ${viewportClassName}`}
      >
        <div ref={contentRef} className={contentClassName}>
          {children}
        </div>
      </Viewport>
      <Track bar={bar} className="h-full" tone={tone} />
    </div>
  );
});

export default ScrollArea;
