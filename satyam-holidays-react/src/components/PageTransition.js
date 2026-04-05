import React, { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";

const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
    scale: 0.98,
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
  },
  out: {
    opacity: 0,
    y: -20,
    scale: 1.02,
  },
};

const reducedVariants = {
  initial: { opacity: 0 },
  in: { opacity: 1 },
  out: { opacity: 0 },
};

const pageTransition = {
  type: "tween",
  ease: "easeInOut",
  duration: 0.4,
};

const reducedTransition = {
  duration: 0.15,
};

const PageTransition = ({ children }) => {
  const prefersReduced = useReducedMotion();
  const hasMounted = useRef(false);

  useEffect(() => {
    hasMounted.current = true;
  }, []);

  return (
    <motion.div
      initial={hasMounted.current ? "initial" : false}
      animate="in"
      exit="out"
      variants={prefersReduced ? reducedVariants : pageVariants}
      transition={prefersReduced ? reducedTransition : pageTransition}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

export default PageTransition;
