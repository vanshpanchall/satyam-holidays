import React, { useLayoutEffect, useRef, useState } from "react";

// reCAPTCHA v2 / hCaptcha render a fixed 304×78 iframe that can't be restyled
const WIDGET_W = 304;
const WIDGET_H = 78;

/**
 * Shrinks a fixed-size captcha widget to fit narrow containers (phone-width cards) instead of
 * letting it push the layout wider than the screen. The reserved height shrinks with it.
 */
const CaptchaFit = ({ children, className = "" }) => {
  const ref = useRef(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () => setScale(Math.min(1, el.clientWidth / WIDGET_W));
    update();
    if (typeof ResizeObserver === "undefined") return undefined;
    let frame = 0;
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    });
    observer.observe(el);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  // The widget is absolutely positioned so its fixed width never counts towards the min-content
  // width of the surrounding grid/flex layout (a transform alone doesn't change layout size).
  return (
    <div ref={ref} className={`relative w-full ${className}`} style={{ height: WIDGET_H * scale }}>
      <div
        className="absolute left-0 top-0"
        style={{ width: WIDGET_W, transform: `scale(${scale})`, transformOrigin: "0 0" }}
      >
        {children}
      </div>
    </div>
  );
};

export default CaptchaFit;
