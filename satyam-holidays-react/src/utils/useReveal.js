import { useEffect, useRef, useState } from "react";

/**
 * Lightweight scroll-reveal using IntersectionObserver. Stays visible once revealed.
 * Pair the returned `className` with the `.reveal` styles in index.css.
 */
const useReveal = (threshold = 0.15, rootMargin = "0px 0px -60px 0px") => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return undefined;
    }

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

  return { ref, isVisible, className: `reveal${isVisible ? " is-visible" : ""}` };
};

export default useReveal;
