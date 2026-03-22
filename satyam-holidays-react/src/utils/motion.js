// Centralized motion settings and helpers for consistent animations
// Brand vibe: smooth, confident, not flashy; easeOut and custom cubic-bezier aligned with UI

export const timings = {
  fast: 0.25,
  base: 0.4,
  slow: 0.55,
};

export const easing = {
  out: [0.16, 1, 0.3, 1], // easeOutQuint-like
  inOut: [0.4, 0, 0.2, 1], // standard material-like ease-in-out
};

// Basic fade + translate Y
export const fadeUp = (distance = 16, duration = timings.base, ease = easing.out) => ({
  hidden: { opacity: 0, y: distance },
  show: { opacity: 1, y: 0, transition: { duration, ease } },
});

export const fadeRight = (distance = 16, duration = timings.base, ease = easing.out) => ({
  hidden: { opacity: 0, x: distance },
  show: { opacity: 1, x: 0, transition: { duration, ease } },
});

export const fadeLeft = (distance = 16, duration = timings.base, ease = easing.out) => ({
  hidden: { opacity: 0, x: -distance },
  show: { opacity: 1, x: 0, transition: { duration, ease } },
});

// Stagger container
export const stagger = (staggerChildren = 0.08, delayChildren = 0) => ({
  hidden: { opacity: 1 },
  show: { opacity: 1, transition: { staggerChildren, delayChildren } },
});

// Simple presence transitions for modals/overlays
export const presence = {
  backdrop: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: timings.fast, ease: easing.out } },
    exit: { opacity: 0, transition: { duration: timings.fast, ease: easing.out } },
  },
  dialog: {
    hidden: { opacity: 0, y: 24, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: timings.base, ease: easing.out } },
    exit: {
      opacity: 0,
      y: 24,
      scale: 0.98,
      transition: { duration: timings.base, ease: easing.out },
    },
  },
};
