import { useEffect, useRef, useState } from "react";

/**
 * Lightweight scroll-reveal hook using IntersectionObserver.
 * Returns a ref and an isVisible boolean. Once visible, stays visible (once: true).
 *
 * @param {number} threshold - 0-1, how much of the element must be visible
 * @param {string} rootMargin - margin around viewport for early/late triggering
 */
const useReveal = (threshold = 0.15, rootMargin = "0px 0px -40px 0px") => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, isVisible };
};

export default useReveal;
