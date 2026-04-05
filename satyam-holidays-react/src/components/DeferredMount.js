import React, { useEffect, useRef, useState } from "react";
import PropTypes from "prop-types";

const DeferredMount = ({
  children,
  fallback = null,
  rootMargin = "300px 0px",
  threshold = 0,
  once = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (isVisible && once) {
      return;
    }

    if (typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const element = ref.current;
    if (!element) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once) {
            observer.disconnect();
          }
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [isVisible, once, rootMargin, threshold]);

  return <div ref={ref}>{isVisible ? children : fallback}</div>;
};

DeferredMount.propTypes = {
  children: PropTypes.node.isRequired,
  fallback: PropTypes.node,
  rootMargin: PropTypes.string,
  threshold: PropTypes.number,
  once: PropTypes.bool,
};

export default DeferredMount;
