import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const headerOffset = () =>
  parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--header-h")) || 72;

// Scrolls to top on route change, or to the #hash target. Homepage sections mount lazily and
// change height as they load, so we wait for the anchor and then correct the position once settled.
export default function ScrollToTop() {
  const { pathname, hash, key } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
      return undefined;
    }

    const id = decodeURIComponent(hash.slice(1));
    const timers = [];
    let attempts = 0;

    const correct = (el) => {
      const drift = el.getBoundingClientRect().top - headerOffset();
      if (Math.abs(drift) > 40) el.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const tryScroll = () => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
        timers.push(
          setTimeout(() => correct(el), 900),
          setTimeout(() => correct(el), 1800)
        );
      } else if (attempts < 20) {
        attempts += 1;
        timers.push(setTimeout(tryScroll, 100));
      }
    };
    tryScroll();
    return () => timers.forEach(clearTimeout);
  }, [pathname, hash, key]);

  return null;
}
