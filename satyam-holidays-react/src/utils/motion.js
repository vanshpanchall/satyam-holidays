// ─── Professional reveal-on-scroll motion presets ───
// Inspired by Apple, Stripe, Linear — smooth, confident, immediate.
// Uses spring physics for natural feel; no harsh delays.

// Spring configs (used as `transition` values)
const snappy = { type: "spring", stiffness: 400, damping: 30, mass: 0.8 };
const gentle = { type: "spring", stiffness: 260, damping: 25, mass: 0.9 };
const smooth = { type: "spring", stiffness: 180, damping: 22, mass: 1 };

export const springs = { snappy, gentle, smooth };

// ─── Duration-based easing (fallback when springs feel wrong) ───
export const timings = {
  fast: 0.3,
  base: 0.5,
  slow: 0.7,
};

export const easing = {
  out: [0.16, 1, 0.3, 1],       // easeOutQuint — fast start, gentle stop
  inOut: [0.4, 0, 0.2, 1],     // Material standard
  spring: [0.22, 1, 0.36, 1],  // Stripe-style ease
};

// ─── Viewport trigger preset (shared across all whileInView) ───
export const viewport = { once: true, margin: "-60px 0px" };
// Negative margin means "trigger 60px before it enters the viewport"
// → content is already visible when animation starts = no blank space.

// ─── Fade + Translate Y (most common scroll reveal) ───
export const fadeUp = (distance = 24, duration = timings.base, ease = easing.spring) => ({
  hidden: { opacity: 0, y: distance },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration, ease },
  },
});

// ─── Fade from Right ───
export const fadeRight = (distance = 30, duration = timings.base, ease = easing.spring) => ({
  hidden: { opacity: 0, x: distance },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration, ease },
  },
});

// ─── Fade from Left ───
export const fadeLeft = (distance = 30, duration = timings.base, ease = easing.spring) => ({
  hidden: { opacity: 0, x: -distance },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration, ease },
  },
});

// ─── Scale-in (great for cards, images) ───
export const scaleIn = (duration = timings.base, ease = easing.spring) => ({
  hidden: { opacity: 0, scale: 0.92 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration, ease },
  },
});

// ─── Blur-in reveal (premium text reveal like Apple) ───
export const blurIn = (duration = timings.slow) => ({
  hidden: { opacity: 0, filter: "blur(8px)", y: 12 },
  show: {
    opacity: 1,
    filter: "blur(0px)",
    y: 0,
    transition: { duration, ease: easing.out },
  },
});

// ─── Stagger container ───
export const stagger = (staggerChildren = 0.06, delayChildren = 0) => ({
  hidden: { opacity: 1 },
  show: {
    opacity: 1,
    transition: { staggerChildren, delayChildren },
  },
});

// ─── Presence transitions (modals, overlays, drawers) ───
export const presence = {
  backdrop: {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: timings.fast, ease: easing.out } },
    exit: { opacity: 0, transition: { duration: 0.2, ease: easing.out } },
  },
  dialog: {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: gentle,
    },
    exit: {
      opacity: 0,
      y: 16,
      scale: 0.97,
      transition: { duration: timings.fast, ease: easing.out },
    },
  },
};
